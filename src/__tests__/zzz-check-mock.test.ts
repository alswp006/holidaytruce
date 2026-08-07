import { describe, it, expect } from "vitest";

// Scratch investigation file (confirmed require()-loaded pages bypass vi.mock for
// react-router-dom/@/lib/storage — Node's native require() doesn't go through Vitest's
// ESM module graph). rm is blocked in this sandbox — left as a no-op, matching the
// pattern in zzz-scratch.test.ts.
describe("scratch (inert)", () => {
  it("noop", () => {
    expect(true).toBe(true);
  });
});
