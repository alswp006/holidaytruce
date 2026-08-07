import { describe, it, expect, vi } from "vitest";
describe("systime", () => {
  it("sets system time without useFakeTimers", () => {
    vi.setSystemTime(new Date(2026, 7, 8, 12, 0, 0));
    const now = new Date();
    expect(now.getFullYear()).toBe(2026);
    expect(now.getMonth()).toBe(7);
    expect(now.getDate()).toBe(8);
    vi.useRealTimers();
  });
});
