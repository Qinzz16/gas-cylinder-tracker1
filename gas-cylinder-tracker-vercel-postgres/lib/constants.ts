export const STATUSES = [
  "FULL",
  "STANDBY",
  "IN_USE",
  "ALMOST_EMPTY",
  "EMPTY",
  "WAITING_FOR_SUPPLIER",
  "BEING_REPLACED",
] as const;

export const STATUS_LABELS: Record<string, string> = {
  FULL: "Full",
  STANDBY: "Standby",
  IN_USE: "In Use",
  ALMOST_EMPTY: "Almost Empty",
  EMPTY: "Empty",
  WAITING_FOR_SUPPLIER: "Waiting for Supplier",
  BEING_REPLACED: "Being Replaced",
};

export const REPLACEMENT_STATUSES = [
  "NOT_REQUESTED",
  "REQUESTED",
  "SCHEDULED",
  "DELIVERED",
  "COMPLETED",
] as const;

export const prettyEnum = (value: string) =>
  value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
