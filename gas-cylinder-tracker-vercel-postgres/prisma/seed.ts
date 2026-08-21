import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const positions = [
    { area: "UPPER", sortOrder: 1, positionName: "Upper Left", side: "LEFT", active: true },
    { area: "UPPER", sortOrder: 2, positionName: "Upper Right", side: "RIGHT", active: true },
    { area: "BOTTOM", sortOrder: 1, positionName: "Bottom Left", side: "LEFT", active: true },
    { area: "BOTTOM", sortOrder: 2, positionName: "Bottom Right", side: "RIGHT", active: true },
  ];

  const createdPositions = [];
  for (const position of positions) {
    createdPositions.push(await prisma.position.upsert({
      where: { area_sortOrder: { area: position.area, sortOrder: position.sortOrder } },
      update: position,
      create: position,
    }));
  }

  await prisma.position.updateMany({
    where: { NOT: { id: { in: createdPositions.map((position) => position.id) } } },
    data: { active: false },
  });

  for (const operator of [
    { name: "Admin", role: "ADMIN" },
    { name: "Operator 1", role: "OPERATOR" },
    { name: "Operator 2", role: "OPERATOR" },
    { name: "Dashboard", role: "OPERATOR" },
  ]) {
    await prisma.operator.upsert({ where: { name: operator.name }, update: operator, create: operator });
  }

  const dashboard = await prisma.operator.findUniqueOrThrow({ where: { name: "Dashboard" } });
  const retired = await prisma.cylinder.findMany({
    where: { cylinderCode: { in: ["G05", "G06", "G07", "G08"] } },
  });
  const retiredIds = retired.map((cylinder) => cylinder.id);
  const retiredAt = new Date();

  if (retiredIds.length) {
    await prisma.usageSession.updateMany({
      where: { cylinderId: { in: retiredIds }, turnedOffAt: null },
      data: { turnedOffAt: retiredAt, turnedOffById: dashboard.id, finalStatus: "STANDBY" },
    });
    await prisma.cylinder.updateMany({
      where: { id: { in: retiredIds } },
      data: { positionId: null, isOn: false, currentSide: null, currentStatus: "STANDBY" },
    });
  }

  for (let index = 0; index < 4; index++) {
    const code = `G${String(index + 1).padStart(2, "0")}`;
    await prisma.cylinder.upsert({
      where: { cylinderCode: code },
      update: { positionId: createdPositions[index].id },
      create: {
        cylinderCode: code,
        currentStatus: "STANDBY",
        positionId: createdPositions[index].id,
      },
    });
  }

  await prisma.setting.upsert({
    where: { key: "max_active_cylinders" },
    update: { value: "4" },
    create: { key: "max_active_cylinders", value: "4" },
  });
}

main().finally(() => prisma.$disconnect());
