import { describe, expect, it } from "vitest";
import { assertCanSwap, assertCanTurnOff, assertCanTurnOn, calculateDurationSeconds } from "../lib/rules";

describe("cylinder workflow rules", () => {
  it("allows a fourth active cylinder but rejects a fifth", () => {
    expect(() => assertCanTurnOn({ isOn: false, status: "FULL", activeCount: 3, maxActive: 4 })).not.toThrow();
    expect(() => assertCanTurnOn({ isOn: false, status: "FULL", activeCount: 4, maxActive: 4 })).toThrow("Maximum configured active cylinders reached");
  });

  it("rejects duplicate ON and duplicate OFF actions", () => {
    expect(() => assertCanTurnOn({ isOn: true, status: "IN_USE", activeCount: 1, maxActive: 4 })).toThrow("already ON");
    expect(() => assertCanTurnOff(false)).toThrow("already OFF");
  });

  it("keeps almost-empty active cylinders eligible to remain ON", () => {
    expect(() => assertCanTurnOff(true)).not.toThrow();
    expect(() => assertCanTurnOn({ isOn: false, status: "ALMOST_EMPTY", activeCount: 2, maxActive: 4 })).not.toThrow();
  });

  it("calculates multi-day usage duration and rejects reversed timestamps", () => {
    const on = new Date("2026-08-20T08:30:00+08:00");
    const off = new Date("2026-08-25T16:15:00+08:00");
    expect(calculateDurationSeconds(on, off)).toBe(459_900);
    expect(() => calculateDurationSeconds(off, on)).toThrow("OFF time cannot be earlier");
  });

  it("allows only an OFF empty upper cylinder to swap with an OFF full bottom reserve", () => {
    expect(() => assertCanSwap({ isOn:false, status:"EMPTY", area:"UPPER" }, { isOn:false, status:"FULL", area:"BOTTOM" })).not.toThrow();
    expect(() => assertCanSwap({ isOn:true, status:"ALMOST_EMPTY", area:"UPPER" }, { isOn:false, status:"FULL", area:"BOTTOM" })).toThrow("Turn both cylinders OFF");
    expect(() => assertCanSwap({ isOn:false, status:"EMPTY", area:"BOTTOM" }, { isOn:false, status:"FULL", area:"UPPER" })).toThrow("upper outgoing");
  });
});
