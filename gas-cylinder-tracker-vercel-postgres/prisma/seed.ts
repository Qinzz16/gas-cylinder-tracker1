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
    where: {
      NOT: { id: { in: createdPositions.map((position) => position.id) } },
    },
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

  await prisma.cylinder.updateMany({
    where: { cylinderCode: { in: ["G05", "G06", "G07", "G08"] } },
    data: { positionId: null, isOn: false, currentSide: null },
  });

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
