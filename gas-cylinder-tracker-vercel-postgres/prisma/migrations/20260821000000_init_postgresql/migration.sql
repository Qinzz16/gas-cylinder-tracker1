-- CreateTable
CREATE TABLE "Cylinder" (
    "id" TEXT NOT NULL,
    "cylinderCode" TEXT NOT NULL,
    "currentStatus" TEXT NOT NULL DEFAULT 'FULL',
    "isOn" BOOLEAN NOT NULL DEFAULT false,
    "currentSide" TEXT,
    "lastTurnedOnAt" TIMESTAMP(3),
    "positionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cylinder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Position" (
    "id" TEXT NOT NULL,
    "positionName" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "side" TEXT,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Operator" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Operator_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageSession" (
    "id" TEXT NOT NULL,
    "cylinderId" TEXT NOT NULL,
    "side" TEXT NOT NULL,
    "turnedOnAt" TIMESTAMP(3) NOT NULL,
    "turnedOnById" TEXT NOT NULL,
    "turnedOffAt" TIMESTAMP(3),
    "turnedOffById" TEXT,
    "durationSeconds" INTEGER,
    "finalStatus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UsageSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CylinderEvent" (
    "id" TEXT NOT NULL,
    "cylinderId" TEXT,
    "eventType" TEXT NOT NULL,
    "operatorId" TEXT,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "oldPositionId" TEXT,
    "oldPositionName" TEXT,
    "newPositionId" TEXT,
    "newPositionName" TEXT,
    "side" TEXT,
    "notes" TEXT,
    "changeData" TEXT,
    "relatedEntityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CylinderEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierReplacement" (
    "id" TEXT NOT NULL,
    "requestDate" TIMESTAMP(3) NOT NULL,
    "deliveryDate" TIMESTAMP(3),
    "supplier" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'REQUESTED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SupplierReplacement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SupplierReplacementItem" (
    "id" TEXT NOT NULL,
    "replacementId" TEXT NOT NULL,
    "cylinderId" TEXT NOT NULL,
    "previousStatus" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "SupplierReplacementItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

CREATE UNIQUE INDEX "Cylinder_cylinderCode_key" ON "Cylinder"("cylinderCode");
CREATE UNIQUE INDEX "Cylinder_positionId_key" ON "Cylinder"("positionId");
CREATE INDEX "Cylinder_currentStatus_idx" ON "Cylinder"("currentStatus");
CREATE INDEX "Cylinder_isOn_idx" ON "Cylinder"("isOn");
CREATE UNIQUE INDEX "Position_positionName_key" ON "Position"("positionName");
CREATE UNIQUE INDEX "Position_area_sortOrder_key" ON "Position"("area", "sortOrder");
CREATE UNIQUE INDEX "Operator_name_key" ON "Operator"("name");
CREATE INDEX "UsageSession_cylinderId_turnedOnAt_idx" ON "UsageSession"("cylinderId", "turnedOnAt");
CREATE INDEX "UsageSession_turnedOnById_idx" ON "UsageSession"("turnedOnById");
CREATE INDEX "UsageSession_turnedOffById_idx" ON "UsageSession"("turnedOffById");
CREATE INDEX "CylinderEvent_cylinderId_eventTime_idx" ON "CylinderEvent"("cylinderId", "eventTime");
CREATE INDEX "CylinderEvent_eventType_eventTime_idx" ON "CylinderEvent"("eventType", "eventTime");
CREATE INDEX "SupplierReplacement_status_requestDate_idx" ON "SupplierReplacement"("status", "requestDate");
CREATE UNIQUE INDEX "SupplierReplacementItem_replacementId_cylinderId_key" ON "SupplierReplacementItem"("replacementId", "cylinderId");

ALTER TABLE "Cylinder" ADD CONSTRAINT "Cylinder_positionId_fkey" FOREIGN KEY ("positionId") REFERENCES "Position"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageSession" ADD CONSTRAINT "UsageSession_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsageSession" ADD CONSTRAINT "UsageSession_turnedOnById_fkey" FOREIGN KEY ("turnedOnById") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsageSession" ADD CONSTRAINT "UsageSession_turnedOffById_fkey" FOREIGN KEY ("turnedOffById") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CylinderEvent" ADD CONSTRAINT "CylinderEvent_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CylinderEvent" ADD CONSTRAINT "CylinderEvent_operatorId_fkey" FOREIGN KEY ("operatorId") REFERENCES "Operator"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SupplierReplacement" ADD CONSTRAINT "SupplierReplacement_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "Operator"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SupplierReplacementItem" ADD CONSTRAINT "SupplierReplacementItem_replacementId_fkey" FOREIGN KEY ("replacementId") REFERENCES "SupplierReplacement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SupplierReplacementItem" ADD CONSTRAINT "SupplierReplacementItem_cylinderId_fkey" FOREIGN KEY ("cylinderId") REFERENCES "Cylinder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
