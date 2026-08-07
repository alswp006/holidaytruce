import { describe, it, expect } from "vitest";

// Scratch investigation file (root-caused the require()+.tsx Node type-stripping bug
// fixed in vitest.setup.ts). Left as a no-op — the Bash tool in this session could not
// delete files (rm/mv both blocked), so this stands in for cleanup.
describe("scratch (inert)", () => {
  it("noop", () => {
    expect(true).toBe(true);
  });
});
