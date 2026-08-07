import { describe, it, expect } from "vitest";

// Regression test for the "@/" alias support added to vitest.setup.ts —
// packet-0002's tests use require("@/lib/...") inside test bodies, which
// needs this shim to resolve (Node's native require has no Vite alias knowledge).
describe("require() alias shim (vitest.setup.ts)", () => {
  it("resolves @/ imports via require()", () => {
    const { cn } = require("@/lib/utils");
    expect(typeof cn).toBe("function");
  });
});
