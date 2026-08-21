export function assertCanTurnOn(input: { isOn: boolean; status: string; activeCount: number; maxActive: number }) {
  if (input.isOn) throw new Error("This cylinder is already ON.");
  if (input.activeCount >= input.maxActive) throw new Error("Maximum configured active cylinders reached.");
  if (["EMPTY", "WAITING_FOR_SUPPLIER", "BEING_REPLACED"].includes(input.status))
    throw new Error(`Cannot turn ON a cylinder marked ${input.status.toLowerCase().replaceAll("_", " ")}.`);
}

export function assertCanTurnOff(isOn: boolean) {
  if (!isOn) throw new Error("This cylinder is already OFF.");
}

export function calculateDurationSeconds(on: Date, off: Date) {
  if (off < on) throw new Error("OFF time cannot be earlier than ON time.");
  return Math.floor((off.getTime() - on.getTime()) / 1000);
}

export function assertCanSwap(outgoing: { isOn: boolean; status: string; area?: string }, replacement: { isOn: boolean; status: string; area?: string }) {
  if (outgoing.isOn || replacement.isOn) throw new Error("Turn both cylinders OFF before swapping positions.");
  if (!["EMPTY", "ALMOST_EMPTY"].includes(outgoing.status)) throw new Error("Outgoing cylinder must be Empty or Almost Empty.");
  if (!["FULL", "STANDBY"].includes(replacement.status)) throw new Error("Replacement cylinder must be Full or Standby.");
  if (outgoing.area !== "UPPER" || replacement.area !== "BOTTOM") throw new Error("Swap an upper outgoing cylinder with a bottom reserve cylinder.");
}
