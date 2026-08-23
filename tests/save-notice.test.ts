import { describe, expect, it } from "vitest";

import { getAutoPostNotice } from "../lib/save-notice";

describe("Auto-Post save notices", () => {
  it("returns a success notice when memory and history are saved", () => {
    expect(getAutoPostNotice({ saved: true, historySaved: true })).toContain("stored the workflow");
  });

  it("returns a partial-save warning when history is unavailable", () => {
    expect(getAutoPostNotice({ saved: true, historySaved: false })).toContain("history could not be updated");
  });

  it("returns no completion notice when the primary save fails", () => {
    expect(getAutoPostNotice({ saved: false, historySaved: false })).toBeNull();
  });
});
