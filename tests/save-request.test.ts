import { describe, expect, it } from "vitest";

import { createSaveRequestGate } from "../lib/save-request";

describe("save request gate", () => {
  it("allows one save and blocks a duplicate while pending", () => {
    const gate = createSaveRequestGate();

    expect(gate.tryStart()).toBe(true);
    expect(gate.isPending()).toBe(true);
    expect(gate.tryStart()).toBe(false);
  });

  it("blocks duplicate archive export preparation until sharing finishes", () => {
    const exportGate = createSaveRequestGate();

    expect(exportGate.tryStart()).toBe(true);
    expect(exportGate.tryStart()).toBe(false);
    exportGate.finish();
    expect(exportGate.tryStart()).toBe(true);
  });

  it("allows a new save after the previous save finishes", () => {
    const gate = createSaveRequestGate();

    expect(gate.tryStart()).toBe(true);
    gate.finish();

    expect(gate.isPending()).toBe(false);
    expect(gate.tryStart()).toBe(true);
  });

  it("allows export gate cleanup to be repeated during unmount and completion", () => {
    const exportGate = createSaveRequestGate();

    expect(exportGate.tryStart()).toBe(true);
    exportGate.finish();
    exportGate.finish();
    expect(exportGate.tryStart()).toBe(true);
  });

  it("keeps repeated finish calls harmless", () => {
    const gate = createSaveRequestGate();

    gate.finish();
    gate.finish();

    expect(gate.tryStart()).toBe(true);
  });
});
