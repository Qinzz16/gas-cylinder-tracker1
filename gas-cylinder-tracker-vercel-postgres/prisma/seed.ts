import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const positions = [
    { positionName: "Upper Left 1", area: "UPPER", side: "LEFT", sortOrder: 1 },
    { positionName: "Upper Right 1", area: "UPPER", side: "RIGHT", sortOrder: 2 },
    { positionName: "Upper Left 2", area: "UPPER", side: "LEFT", sortOrder: 3 },
    { positionName: "Upper Right 2", area: "UPPER", side: "RIGHT", sortOrder: 4 },
    { positionName: "Bottom Reserve 1", area: "BOTTOM", side: null, sortOrder: 1 },
    { positionName: "Bottom Reserve 2", area: "BOTTOM", side: null, sortOrder: 2 },
    { positionName: "Bottom Reserve 3", area: "BOTTOM", side: null, sortOrder: 3 },
    { positionName: "Bottom Reserve 4", area: "BOTTOM", side: null, sortOrder: 4 },
  ];
  const createdPositions = [];
  for (const position of positions) {
    createdPositions.push(await prisma.position.upsert({ where: { positionName: position.positionName }, update: position, create: position }));
  }
  for (const operator of [
    { name: "Admin", role: "ADMIN" },
    { name: "Operator 1", role: "OPERATOR" },
    { name: "Operator 2", role: "OPERATOR" },
  ]) {
    await prisma.operator.upsert({ where: { name: operator.name }, update: operator, create: operator });
  }
  for (let index = 0; index < 8; index++) {
    const code = `G${String(index + 1).padStart(2, "0")}`;
    await prisma.cylinder.upsert({
      where: { cylinderCode: code },
      update: {},
      create: {
        cylinderCode: code,
        currentStatus: index < 4 ? "STANDBY" : "FULL",
        positionId: createdPositions[index].id,
      },
    });
  }
  await prisma.setting.upsert({ where: { key: "max_active_cylinders" }, update: {}, create: { key: "max_active_cylinders", value: "4" } });
}

main().finally(() => prisma.$disconnect());
