"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertCanTurnOff, assertCanTurnOn, calculateDurationSeconds } from "@/lib/rules";

const text = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const pathWith = (kind: "success" | "error", message: string) =>
  `/?${kind}=${encodeURIComponent(message)}`;

async function run(work: () => Promise<void>, success: string) {
  try {
    await work();
  } catch (error) {
    const message = error instanceof Error ? error.message : "The action could not be completed.";
    redirect(pathWith("error", message));
  }
  revalidatePath("/", "layout");
  redirect(pathWith("success", success));
}

async function dashboardOperatorId() {
  const operator = await prisma.operator.upsert({
    where: { name: "Dashboard" },
    update: { active: true },
    create: { name: "Dashboard", role: "OPERATOR", active: true },
  });
  return operator.id;
}

export async function quickTurnOn(form: FormData) {
  await run(async () => {
    const cylinderId = text(form, "cylinderId");
    if (!cylinderId) throw new Error("Cylinder is required.");
    const eventTime = new Date();
    const operatorId = await dashboardOperatorId();

    await prisma.$transaction(async (tx) => {
      const [cylinder, setting, activeCount] = await Promise.all([
        tx.cylinder.findUnique({ where: { id: cylinderId }, include: { position: true } }),
        tx.setting.findUnique({ where: { key: "max_active_cylinders" } }),
        tx.cylinder.count({ where: { isOn: true } }),
      ]);
      if (!cylinder) throw new Error("Cylinder not found.");
      const side = cylinder.position?.side;
      if (!side || !["LEFT", "RIGHT"].includes(side)) throw new Error("This cylinder does not have a Left or Right position.");
      const max = Number(setting?.value ?? 4);
      assertCanTurnOn({ isOn: cylinder.isOn, status: cylinder.currentStatus, activeCount, maxActive: max });

      await tx.cylinder.update({
        where: { id: cylinderId },
        data: { isOn: true, currentSide: side, currentStatus: "IN_USE", lastTurnedOnAt: eventTime },
      });
      await tx.usageSession.create({
        data: { cylinderId, side, turnedOnAt: eventTime, turnedOnById: operatorId },
      });
      await tx.cylinderEvent.create({
        data: {
          cylinderId,
          eventType: "TURN_ON",
          operatorId,
          eventTime,
          side,
          oldStatus: cylinder.currentStatus,
          newStatus: "IN_USE",
          oldPositionId: cylinder.positionId,
          oldPositionName: cylinder.position?.positionName,
          newPositionId: cylinder.positionId,
          newPositionName: cylinder.position?.positionName,
          notes: "One-click dashboard action",
        },
      });
    });
  }, "Gas turned ON.");
}

export async function quickTurnOff(form: FormData) {
  await run(async () => {
    const cylinderId = text(form, "cylinderId");
    if (!cylinderId) throw new Error("Cylinder is required.");
    const eventTime = new Date();
    const operatorId = await dashboardOperatorId();

    await prisma.$transaction(async (tx) => {
      const cylinder = await tx.cylinder.findUnique({ where: { id: cylinderId }, include: { position: true } });
      if (!cylinder) throw new Error("Cylinder not found.");
      assertCanTurnOff(cylinder.isOn);
      const session = await tx.usageSession.findFirst({
        where: { cylinderId, turnedOffAt: null },
        orderBy: { turnedOnAt: "desc" },
      });
      if (!session) throw new Error("No open usage session was found.");

      const durationSeconds = calculateDurationSeconds(session.turnedOnAt, eventTime);
      const nextStatus = cylinder.currentStatus === "ALMOST_EMPTY" ? "ALMOST_EMPTY" : "STANDBY";

      await tx.usageSession.update({
        where: { id: session.id },
        data: {
          turnedOffAt: eventTime,
          turnedOffById: operatorId,
          durationSeconds,
          finalStatus: nextStatus,
        },
      });
      await tx.cylinder.update({
        where: { id: cylinderId },
        data: { isOn: false, currentSide: null, currentStatus: nextStatus },
      });
      await tx.cylinderEvent.create({
        data: {
          cylinderId,
          eventType: "TURN_OFF",
          operatorId,
          eventTime,
          side: cylinder.currentSide,
          oldStatus: cylinder.currentStatus,
          newStatus: nextStatus,
          oldPositionId: cylinder.positionId,
          oldPositionName: cylinder.position?.positionName,
          newPositionId: cylinder.positionId,
          newPositionName: cylinder.position?.positionName,
          notes: "One-click dashboard action",
          changeData: JSON.stringify({ durationSeconds, condition: "AUTO_STANDBY" }),
        },
      });
    });
  }, "Gas turned OFF.");
}
