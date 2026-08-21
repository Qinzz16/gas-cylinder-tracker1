"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { REPLACEMENT_STATUSES, STATUSES } from "@/lib/constants";
import { assertCanSwap, assertCanTurnOff, assertCanTurnOn, calculateDurationSeconds } from "@/lib/rules";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const date = (form: FormData, key: string) => {
  const raw = text(form, key);
  const offset = process.env.APP_TIMEZONE_OFFSET ?? "+08:00";
  const value = new Date(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(raw) ? `${raw}:00${offset}` : raw);
  if (Number.isNaN(value.getTime())) throw new Error("A valid date and time is required.");
  return value;
};
const required = (form: FormData, key: string, label: string) => {
  const value = text(form, key);
  if (!value) throw new Error(`${label} is required.`);
  return value;
};
const pathWith = (path: string, kind: "success" | "error", message: string) =>
  `${path}?${kind}=${encodeURIComponent(message)}`;

async function run(path: string, work: () => Promise<void>, success: string) {
  try {
    await work();
  } catch (error) {
    const message = error instanceof Error ? error.message : "The action could not be completed.";
    redirect(pathWith(path, "error", message));
  }
  revalidatePath("/", "layout");
  redirect(pathWith(path, "success", success));
}

export async function turnOn(form: FormData) {
  const returnTo = text(form, "returnTo") || "/record";
  await run(returnTo, async () => {
    const cylinderId = required(form, "cylinderId", "Cylinder");
    const operatorId = required(form, "operatorId", "Operator");
    const side = required(form, "side", "Side").toUpperCase();
    const eventTime = date(form, "eventTime");
    const notes = text(form, "notes") || null;
    if (!["LEFT", "RIGHT"].includes(side)) throw new Error("Side must be Left or Right.");

    await prisma.$transaction(async (tx) => {
      const [cylinder, setting, activeCount] = await Promise.all([
        tx.cylinder.findUnique({ where: { id: cylinderId }, include: { position: true } }),
        tx.setting.findUnique({ where: { key: "max_active_cylinders" } }),
        tx.cylinder.count({ where: { isOn: true } }),
      ]);
      if (!cylinder) throw new Error("Cylinder not found.");
      const max = Number(setting?.value ?? 4);
      assertCanTurnOn({ isOn: cylinder.isOn, status: cylinder.currentStatus, activeCount, maxActive: max });

      await tx.cylinder.update({
        where: { id: cylinderId },
        data: { isOn: true, currentSide: side, currentStatus: "IN_USE", lastTurnedOnAt: eventTime },
      });
      await tx.usageSession.create({
        data: { cylinderId, side, turnedOnAt: eventTime, turnedOnById: operatorId, notes },
      });
      await tx.cylinderEvent.create({
        data: {
          cylinderId, eventType: "TURN_ON", operatorId, eventTime, side, notes,
          oldStatus: cylinder.currentStatus, newStatus: "IN_USE",
          oldPositionId: cylinder.positionId, oldPositionName: cylinder.position?.positionName,
          newPositionId: cylinder.positionId, newPositionName: cylinder.position?.positionName,
        },
      });
    });
  }, "Cylinder turned ON.");
}

export async function turnOff(form: FormData) {
  const returnTo = text(form, "returnTo") || "/record";
  await run(returnTo, async () => {
    const cylinderId = required(form, "cylinderId", "Cylinder");
    const operatorId = required(form, "operatorId", "Operator");
    const eventTime = date(form, "eventTime");
    const condition = required(form, "condition", "Condition");
    const notes = text(form, "notes") || null;
    const nextStatus: Record<string, string> = {
      STILL_HAS_GAS: "STANDBY", ALMOST_EMPTY: "ALMOST_EMPTY", EMPTY: "EMPTY",
    };
    if (!nextStatus[condition]) throw new Error("Select a valid cylinder condition.");

    await prisma.$transaction(async (tx) => {
      const cylinder = await tx.cylinder.findUnique({ where: { id: cylinderId }, include: { position: true } });
      if (!cylinder) throw new Error("Cylinder not found.");
      assertCanTurnOff(cylinder.isOn);
      const session = await tx.usageSession.findFirst({
        where: { cylinderId, turnedOffAt: null }, orderBy: { turnedOnAt: "desc" },
      });
      if (!session) throw new Error("No open usage session was found.");
      const durationSeconds = calculateDurationSeconds(session.turnedOnAt, eventTime);

      await tx.usageSession.update({
        where: { id: session.id },
        data: { turnedOffAt: eventTime, turnedOffById: operatorId, durationSeconds, finalStatus: nextStatus[condition], notes: notes || session.notes },
      });
      await tx.cylinder.update({
        where: { id: cylinderId },
        data: { isOn: false, currentSide: null, currentStatus: nextStatus[condition] },
      });
      await tx.cylinderEvent.create({
        data: {
          cylinderId, eventType: "TURN_OFF", operatorId, eventTime, side: cylinder.currentSide, notes,
          oldStatus: cylinder.currentStatus, newStatus: nextStatus[condition],
          oldPositionId: cylinder.positionId, oldPositionName: cylinder.position?.positionName,
          newPositionId: cylinder.positionId, newPositionName: cylinder.position?.positionName,
          changeData: JSON.stringify({ durationSeconds, condition }),
        },
      });
    });
  }, "Cylinder turned OFF and usage saved.");
}

export async function markAlmostEmpty(form: FormData) {
  const returnTo = text(form, "returnTo") || "/record";
  await run(returnTo, async () => {
    const cylinderId = required(form, "cylinderId", "Cylinder");
    const operatorId = required(form, "operatorId", "Operator");
    const eventTime = date(form, "eventTime");
    const notes = text(form, "notes") || null;
    await prisma.$transaction(async (tx) => {
      const cylinder = await tx.cylinder.findUnique({ where: { id: cylinderId }, include: { position: true } });
      if (!cylinder) throw new Error("Cylinder not found.");
      if (!cylinder.isOn) throw new Error("Only an active cylinder can be marked almost empty.");
      if (cylinder.currentStatus === "ALMOST_EMPTY") throw new Error("This cylinder is already marked Almost Empty.");
      await tx.cylinder.update({ where: { id: cylinderId }, data: { currentStatus: "ALMOST_EMPTY" } });
      await tx.cylinderEvent.create({ data: {
        cylinderId, eventType: "MARK_ALMOST_EMPTY", operatorId, eventTime, notes, side: cylinder.currentSide,
        oldStatus: cylinder.currentStatus, newStatus: "ALMOST_EMPTY",
        oldPositionId: cylinder.positionId, oldPositionName: cylinder.position?.positionName,
        newPositionId: cylinder.positionId, newPositionName: cylinder.position?.positionName,
      }});
    });
  }, "Cylinder marked Almost Empty; it remains ON.");
}

export async function swapCylinders(form: FormData) {
  await run("/swap", async () => {
    const outgoingId = required(form, "outgoingId", "Outgoing cylinder");
    const replacementId = required(form, "replacementId", "Replacement cylinder");
    const operatorId = required(form, "operatorId", "Operator");
    const eventTime = date(form, "eventTime");
    const notes = text(form, "notes") || null;
    if (outgoingId === replacementId) throw new Error("Choose two different cylinders.");
    const transactionId = crypto.randomUUID();

    await prisma.$transaction(async (tx) => {
      const [outgoing, replacement] = await Promise.all([
        tx.cylinder.findUnique({ where: { id: outgoingId }, include: { position: true } }),
        tx.cylinder.findUnique({ where: { id: replacementId }, include: { position: true } }),
      ]);
      if (!outgoing || !replacement) throw new Error("A selected cylinder was not found.");
      if (!outgoing.positionId || !replacement.positionId) throw new Error("Both cylinders must have positions.");
      assertCanSwap(
        { isOn: outgoing.isOn, status: outgoing.currentStatus, area: outgoing.position?.area },
        { isOn: replacement.isOn, status: replacement.currentStatus, area: replacement.position?.area },
      );

      await tx.cylinder.update({ where: { id: outgoing.id }, data: { positionId: null } });
      await tx.cylinder.update({ where: { id: replacement.id }, data: { positionId: null } });
      await tx.cylinder.update({
        where: { id: outgoing.id },
        data: { positionId: replacement.positionId, currentStatus: "WAITING_FOR_SUPPLIER" },
      });
      await tx.cylinder.update({
        where: { id: replacement.id },
        data: { positionId: outgoing.positionId, currentStatus: "STANDBY" },
      });
      await tx.cylinderEvent.createMany({ data: [
        {
          cylinderId: outgoing.id, eventType: "SWAP_CYLINDER", operatorId, eventTime, notes, relatedEntityId: transactionId,
          oldStatus: outgoing.currentStatus, newStatus: "WAITING_FOR_SUPPLIER",
          oldPositionId: outgoing.positionId, oldPositionName: outgoing.position?.positionName,
          newPositionId: replacement.positionId, newPositionName: replacement.position?.positionName,
          changeData: JSON.stringify({ swappedWith: replacement.cylinderCode }),
        },
        {
          cylinderId: replacement.id, eventType: "SWAP_CYLINDER", operatorId, eventTime, notes, relatedEntityId: transactionId,
          oldStatus: replacement.currentStatus, newStatus: "STANDBY",
          oldPositionId: replacement.positionId, oldPositionName: replacement.position?.positionName,
          newPositionId: outgoing.positionId, newPositionName: outgoing.position?.positionName,
          changeData: JSON.stringify({ swappedWith: outgoing.cylinderCode }),
        },
      ]});
    });
  }, "Cylinder swap recorded.");
}

export async function createSupplierReplacement(form: FormData) {
  await run("/supplier", async () => {
    const operatorId = required(form, "operatorId", "Requested by");
    const supplier = required(form, "supplier", "Supplier");
    const requestDate = date(form, "requestDate");
    const notes = text(form, "notes") || null;
    const cylinderIds = form.getAll("cylinderIds").map(String);
    if (!cylinderIds.length) throw new Error("Select at least one cylinder.");

    await prisma.$transaction(async (tx) => {
      const cylinders = await tx.cylinder.findMany({ where: { id: { in: cylinderIds } }, include: { position: true } });
      if (cylinders.length !== cylinderIds.length) throw new Error("A selected cylinder was not found.");
      if (cylinders.some((c) => c.isOn || !["EMPTY", "WAITING_FOR_SUPPLIER"].includes(c.currentStatus)))
        throw new Error("Only OFF, empty cylinders can be requested for replacement.");
      const replacement = await tx.supplierReplacement.create({ data: {
        requestDate, supplier, requestedById: operatorId, status: "REQUESTED", notes,
        items: { create: cylinders.map((c) => ({ cylinderId: c.id, previousStatus: c.currentStatus })) },
      }});
      for (const cylinder of cylinders) {
        await tx.cylinder.update({ where: { id: cylinder.id }, data: { currentStatus: "BEING_REPLACED" } });
        await tx.cylinderEvent.create({ data: {
          cylinderId: cylinder.id, eventType: "SUPPLIER_REPLACEMENT", operatorId, eventTime: requestDate, notes,
          oldStatus: cylinder.currentStatus, newStatus: "BEING_REPLACED",
          oldPositionId: cylinder.positionId, oldPositionName: cylinder.position?.positionName,
          newPositionId: cylinder.positionId, newPositionName: cylinder.position?.positionName,
          relatedEntityId: replacement.id,
        }});
      }
    });
  }, "Supplier replacement request created.");
}

export async function updateSupplierReplacement(form: FormData) {
  await run("/supplier", async () => {
    const replacementId = required(form, "replacementId", "Replacement");
    const operatorId = required(form, "operatorId", "Operator");
    const status = required(form, "status", "Status");
    const eventTime = date(form, "eventTime");
    if (!(REPLACEMENT_STATUSES as readonly string[]).includes(status)) throw new Error("Invalid replacement status.");
    await prisma.$transaction(async (tx) => {
      const replacement = await tx.supplierReplacement.findUnique({ where: { id: replacementId }, include: { items: { include: { cylinder: { include: { position: true } } } } } });
      if (!replacement) throw new Error("Replacement record not found.");
      await tx.supplierReplacement.update({ where: { id: replacementId }, data: {
        status, deliveryDate: ["DELIVERED", "COMPLETED"].includes(status) ? eventTime : replacement.deliveryDate,
      }});
      for (const item of replacement.items) {
        await tx.cylinderEvent.create({ data: {
          cylinderId: item.cylinderId, eventType: "SUPPLIER_REPLACEMENT", operatorId, eventTime,
          oldStatus: item.cylinder.currentStatus, newStatus: item.cylinder.currentStatus,
          oldPositionId: item.cylinder.positionId, oldPositionName: item.cylinder.position?.positionName,
          newPositionId: item.cylinder.positionId, newPositionName: item.cylinder.position?.positionName,
          relatedEntityId: replacement.id,
          notes: `Supplier batch changed from ${replacement.status} to ${status}`,
          changeData: JSON.stringify({ originalStatus: replacement.status, newStatus: status }),
        }});
      }
      if (["DELIVERED", "COMPLETED"].includes(status)) {
        for (const item of replacement.items) {
          await tx.cylinder.update({ where: { id: item.cylinderId }, data: { currentStatus: "FULL", isOn: false, currentSide: null } });
          await tx.supplierReplacementItem.update({ where: { id: item.id }, data: { completedAt: eventTime } });
          await tx.cylinderEvent.create({ data: {
            cylinderId: item.cylinderId, eventType: "MARK_FULL", operatorId, eventTime,
            oldStatus: item.cylinder.currentStatus, newStatus: "FULL",
            oldPositionId: item.cylinder.positionId, oldPositionName: item.cylinder.position?.positionName,
            newPositionId: item.cylinder.positionId, newPositionName: item.cylinder.position?.positionName,
            relatedEntityId: replacement.id, notes: `Supplier delivery: ${replacement.supplier}`,
          }});
        }
      }
    });
  }, "Supplier replacement updated.");
}

export async function saveOperator(form: FormData) {
  await run("/operators", async () => {
    const id = text(form, "id");
    const name = required(form, "name", "Name");
    const role = text(form, "role") === "ADMIN" ? "ADMIN" : "OPERATOR";
    const active = text(form, "active") !== "false";
    if (id) await prisma.operator.update({ where: { id }, data: { name, role, active } });
    else await prisma.operator.create({ data: { name, role, active } });
  }, "Operator saved.");
}

export async function saveSettings(form: FormData) {
  await run("/settings", async () => {
    const max = Number(required(form, "maxActive", "Maximum active cylinders"));
    if (!Number.isInteger(max) || max < 1 || max > 8) throw new Error("Maximum active cylinders must be between 1 and 8.");
    await prisma.setting.upsert({ where: { key: "max_active_cylinders" }, create: { key: "max_active_cylinders", value: String(max) }, update: { value: String(max) } });
  }, "Settings saved.");
}

export async function savePosition(form: FormData) {
  await run("/settings", async () => {
    const id = required(form, "id", "Position");
    const positionName = required(form, "positionName", "Position name");
    const area = required(form, "area", "Area");
    const sideRaw = text(form, "side");
    const side = sideRaw || null;
    const sortOrder = Number(required(form, "sortOrder", "Sort order"));
    if (!["UPPER", "BOTTOM"].includes(area)) throw new Error("Area must be Upper or Bottom.");
    if (side && !["LEFT", "RIGHT"].includes(side)) throw new Error("Side must be Left, Right, or blank.");
    if (!Number.isInteger(sortOrder) || sortOrder < 1) throw new Error("Sort order must be a positive number.");
    await prisma.position.update({ where: { id }, data: { positionName, area, side, sortOrder } });
  }, "Position configuration saved.");
}

export async function correctCylinder(form: FormData) {
  await run("/settings", async () => {
    const cylinderId = required(form, "cylinderId", "Cylinder");
    const operatorId = required(form, "operatorId", "Changed by");
    const reason = required(form, "reason", "Correction reason");
    const cylinderCode = required(form, "cylinderCode", "Cylinder ID").toUpperCase();
    const status = required(form, "status", "Status");
    const positionId = required(form, "positionId", "Position");
    if (!(STATUSES as readonly string[]).includes(status)) throw new Error("Invalid cylinder status.");
    const admin = await prisma.operator.findUnique({ where: { id: operatorId } });
    if (!admin || admin.role !== "ADMIN") throw new Error("Only an Admin can make corrections.");
    await prisma.$transaction(async (tx) => {
      const cylinder = await tx.cylinder.findUnique({ where: { id: cylinderId }, include: { position: true } });
      const position = await tx.position.findUnique({ where: { id: positionId } });
      if (!cylinder || !position) throw new Error("Cylinder or position not found.");
      if (cylinder.isOn && ["EMPTY", "WAITING_FOR_SUPPLIER", "BEING_REPLACED"].includes(status))
        throw new Error("Turn the cylinder OFF before assigning an unavailable status.");
      const original = { cylinderCode: cylinder.cylinderCode, status: cylinder.currentStatus, positionId: cylinder.positionId, position: cylinder.position?.positionName };
      const updated = { cylinderCode, status, positionId, position: position.positionName };
      await tx.cylinder.update({ where: { id: cylinderId }, data: { cylinderCode, currentStatus: status, positionId } });
      await tx.cylinderEvent.create({ data: {
        cylinderId, eventType: "EDIT_CORRECTION", operatorId, eventTime: new Date(), notes: reason,
        oldStatus: cylinder.currentStatus, newStatus: status,
        oldPositionId: cylinder.positionId, oldPositionName: cylinder.position?.positionName,
        newPositionId: positionId, newPositionName: position.positionName,
        changeData: JSON.stringify({ original, updated, reason }),
      }});
    });
  }, "Correction saved with an audit record.");
}

export async function correctUsageSession(form: FormData) {
  await run("/history", async () => {
    const sessionId = required(form, "sessionId", "Session");
    const changedById = required(form, "changedById", "Changed by");
    const reason = required(form, "reason", "Correction reason");
    const turnedOnAt = date(form, "turnedOnAt");
    const turnedOffRaw = text(form, "turnedOffAt");
    const turnedOffAt = turnedOffRaw ? new Date(`${turnedOffRaw}:00${process.env.APP_TIMEZONE_OFFSET ?? "+08:00"}`) : null;
    const turnedOnById = required(form, "turnedOnById", "ON operator");
    const turnedOffById = text(form, "turnedOffById") || null;
    const notes = text(form, "notes") || null;
    if (turnedOffAt && turnedOffAt < turnedOnAt) throw new Error("OFF time cannot be earlier than ON time.");
    const admin = await prisma.operator.findUnique({ where: { id: changedById } });
    if (!admin || admin.role !== "ADMIN") throw new Error("Only an Admin can make corrections.");
    await prisma.$transaction(async (tx) => {
      const session = await tx.usageSession.findUnique({ where: { id: sessionId }, include: { cylinder: true } });
      if (!session) throw new Error("Usage session not found.");
      const original = { turnedOnAt: session.turnedOnAt, turnedOffAt: session.turnedOffAt, turnedOnById: session.turnedOnById, turnedOffById: session.turnedOffById, notes: session.notes };
      const updated = { turnedOnAt, turnedOffAt, turnedOnById, turnedOffById, notes };
      await tx.usageSession.update({ where: { id: sessionId }, data: {
        ...updated,
        durationSeconds: turnedOffAt ? Math.floor((turnedOffAt.getTime() - turnedOnAt.getTime()) / 1000) : null,
      }});
      await tx.cylinderEvent.create({ data: {
        cylinderId: session.cylinderId, eventType: "EDIT_CORRECTION", operatorId: changedById,
        eventTime: new Date(), oldStatus: session.finalStatus, newStatus: session.finalStatus,
        notes: reason, relatedEntityId: session.id, changeData: JSON.stringify({ original, updated, reason }),
      }});
    });
  }, "Usage session corrected and audited.");
}
