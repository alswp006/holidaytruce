import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  readKey,
  writeKey,
  withCreate,
  withUpdate,
  validateRelation,
  validateTone,
  validateSeason,
  validateCauses,
} from "@/lib/storage";
import type { Relation, ToneKey, Season, Cause } from "@/lib/types";

describe("localStorage 코어 엔진 (read/write/봉투/검증)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // AC-1: readKey — missing key returns fallback
  // ============================================================================
  describe("readKey — missing key", () => {
    it("AC-1: should return fallback when key does not exist", () => {
      const fallback = { value: "default", count: 0 };
      const result = readKey("nonexistent-key", fallback);

      expect(result).toEqual(fallback);
      expect(result.value).toBe("default");
      expect(result.count).toBe(0);
    });

    it("should preserve fallback object identity when key missing", () => {
      const fallback = { name: "test" };
      const result = readKey("missing", fallback);

      expect(result).toBe(fallback); // same reference
    });
  });

  // ============================================================================
  // AC-2: readKey — corrupted JSON returns fallback without console.error
  // ============================================================================
  describe("readKey — corrupted JSON", () => {
    it("AC-2: should return fallback for corrupted JSON and NOT call console.error", () => {
      // Set corrupted data
      localStorage.setItem("corrupted-key", "{invalid json}");

      const fallback = { value: "default" };
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const result = readKey("corrupted-key", fallback);

      expect(result).toEqual(fallback);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });

    it("should handle malformed JSON gracefully", () => {
      localStorage.setItem("bad", '{"incomplete": ');
      const fallback = { safe: true };
      expect(readKey("bad", fallback)).toEqual(fallback);
    });

    it("should handle non-JSON strings", () => {
      localStorage.setItem("text", "plain text, not JSON");
      const fallback = { default: true };
      expect(readKey("text", fallback)).toEqual(fallback);
    });
  });

  describe("readKey — valid JSON", () => {
    it("should return parsed value when key exists and JSON is valid", () => {
      const data = { name: "test", count: 42 };
      localStorage.setItem("valid-key", JSON.stringify(data));

      const result = readKey("valid-key", { name: "fallback", count: 0 });

      expect(result).toEqual(data);
      expect(result.name).toBe("test");
      expect(result.count).toBe(42);
    });

    it("should parse arrays correctly", () => {
      const data = [1, 2, 3];
      localStorage.setItem("array-key", JSON.stringify(data));

      const result = readKey("array-key", []);

      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([1, 2, 3]);
    });

    it("should parse nested objects", () => {
      const data = { user: { name: "test", age: 30 } };
      localStorage.setItem("nested", JSON.stringify(data));

      const result = readKey("nested", { user: { name: "", age: 0 } });

      expect(result.user.name).toBe("test");
      expect(result.user.age).toBe(30);
    });
  });

  // ============================================================================
  // AC-3: writeKey — quota exceeded returns {ok:false}, no throw, preserve state
  // ============================================================================
  describe("writeKey — quota exceeded", () => {
    it("AC-3a: should return {ok: true} on successful write", () => {
      const data = { value: "test", id: "123" };
      const result = writeKey("test-key", data);

      expect(result).toEqual({ ok: true });
      expect(result.ok).toBe(true);
      expect(localStorage.getItem("test-key")).toBe(JSON.stringify(data));
    });

    it("AC-3b: should return {ok: false} when quota is exceeded, without throwing", () => {
      const mockSetItem = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new DOMException("QuotaExceededError", "QuotaExceededError");
        });

      const largeData = { value: "x".repeat(10000) };
      const result = writeKey("quota-test", largeData);

      expect(result).toEqual({ ok: false });
      expect(result.ok).toBe(false);

      // Verify no exception is thrown
      expect(() => writeKey("quota-test", largeData)).not.toThrow();

      mockSetItem.mockRestore();
    });

    it("AC-3c: should preserve previous state when quota is exceeded", () => {
      const oldData = { version: 1, name: "old" };
      localStorage.setItem("preserve-key", JSON.stringify(oldData));

      const mockSetItem = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new DOMException("QuotaExceededError", "QuotaExceededError");
        });

      const newData = { version: 2, name: "new" };
      const result = writeKey("preserve-key", newData);

      // Verify write failed
      expect(result.ok).toBe(false);

      // Verify old data is still there
      const preserved = JSON.parse(localStorage.getItem("preserve-key") || "{}");
      expect(preserved.version).toBe(1);
      expect(preserved.name).toBe("old");

      mockSetItem.mockRestore();
    });

    it("should handle other storage errors gracefully", () => {
      const mockSetItem = vi
        .spyOn(Storage.prototype, "setItem")
        .mockImplementation(() => {
          throw new Error("Storage access denied");
        });

      const result = writeKey("denied", { value: "test" });

      expect(result.ok).toBe(false);
      expect(() => writeKey("denied", { value: "test" })).not.toThrow();

      mockSetItem.mockRestore();
    });
  });

  // ============================================================================
  // AC-4a: withCreate — sets id, createdAt, updatedAt
  // ============================================================================
  describe("withCreate — envelope helper", () => {
    it("AC-4a: should set id (UUID), createdAt, updatedAt on new entity", () => {
      const data = { name: "test", count: 0 };
      const before = Date.now();
      const result = withCreate(data);
      const after = Date.now();

      // Check id exists and looks like UUID
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("string");
      expect(result.id.length).toBeGreaterThan(0);

      // Check timestamps
      expect(result.createdAt).toBeGreaterThanOrEqual(before);
      expect(result.createdAt).toBeLessThanOrEqual(after);
      expect(result.updatedAt).toBeGreaterThanOrEqual(before);
      expect(result.updatedAt).toBeLessThanOrEqual(after);

      // Check createdAt and updatedAt are the same at creation
      expect(result.createdAt).toBe(result.updatedAt);

      // Check original data is preserved
      expect(result.name).toBe("test");
      expect(result.count).toBe(0);
    });

    it("should generate UUID v4 format", () => {
      const result = withCreate({ name: "test" });
      const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

      expect(result.id).toMatch(uuidPattern);
    });

    it("should generate unique IDs for multiple entities", () => {
      const data1 = withCreate({ name: "entity1" });
      const data2 = withCreate({ name: "entity2" });
      const data3 = withCreate({ name: "entity3" });

      expect(data1.id).not.toBe(data2.id);
      expect(data2.id).not.toBe(data3.id);
      expect(data1.id).not.toBe(data3.id);
    });

    it("should preserve all original fields in the envelope", () => {
      const original = {
        name: "test",
        value: 42,
        nested: { key: "value" },
        arr: [1, 2, 3],
      };
      const result = withCreate(original);

      expect(result.name).toBe("test");
      expect(result.value).toBe(42);
      expect(result.nested.key).toBe("value");
      expect(result.arr).toEqual([1, 2, 3]);
    });
  });

  // ============================================================================
  // AC-4c: withUpdate — updates only updatedAt, preserves id and createdAt
  // ============================================================================
  describe("withUpdate — envelope helper", () => {
    it("AC-4c: should update only updatedAt, preserve id and createdAt", async () => {
      const original = withCreate({ name: "test", count: 5 });
      const originalId = original.id;
      const originalCreatedAt = original.createdAt;
      const originalUpdatedAt = original.updatedAt;

      // Wait to ensure time difference
      await new Promise((resolve) => setTimeout(resolve, 5));

      const updated = withUpdate(original);

      // Verify id and createdAt unchanged
      expect(updated.id).toBe(originalId);
      expect(updated.createdAt).toBe(originalCreatedAt);

      // Verify updatedAt is newer
      expect(updated.updatedAt).toBeGreaterThan(originalUpdatedAt);

      // Verify other fields unchanged
      expect(updated.name).toBe("test");
      expect(updated.count).toBe(5);
    });

    it("should not modify other fields during update", () => {
      const original = withCreate({ name: "test", value: 100, status: "active" });
      const updated = withUpdate(original);

      expect(updated.name).toBe("test");
      expect(updated.value).toBe(100);
      expect(updated.status).toBe("active");
    });

    it("should work on multiple sequential updates", async () => {
      let entity = withCreate({ version: 1 });
      const idSnapshot = entity.id;
      const createdSnapshot = entity.createdAt;

      await new Promise((resolve) => setTimeout(resolve, 5));
      entity = withUpdate(entity);
      const firstUpdate = entity.updatedAt;

      await new Promise((resolve) => setTimeout(resolve, 5));
      entity = withUpdate(entity);
      const secondUpdate = entity.updatedAt;

      expect(entity.id).toBe(idSnapshot);
      expect(entity.createdAt).toBe(createdSnapshot);
      expect(firstUpdate).toBeGreaterThan(createdSnapshot);
      expect(secondUpdate).toBeGreaterThan(firstUpdate);
    });
  });

  // ============================================================================
  // AC-4d: validateRelation — catalog validation
  // ============================================================================
  describe("validateRelation", () => {
    it("AC-4d: should return true for valid relations", () => {
      expect(validateRelation("시댁")).toBe(true);
      expect(validateRelation("처가")).toBe(true);
    });

    it("should return false for invalid relations", () => {
      expect(validateRelation("친구")).toBe(false);
      expect(validateRelation("친척")).toBe(false);
      expect(validateRelation("")).toBe(false);
      expect(validateRelation("시댁  ")).toBe(false); // extra space
      expect(validateRelation(" 시댁")).toBe(false); // leading space
    });

    it("should return false for non-string values", () => {
      expect(validateRelation(null)).toBe(false);
      expect(validateRelation(undefined)).toBe(false);
      expect(validateRelation(123)).toBe(false);
      expect(validateRelation({})).toBe(false);
      expect(validateRelation([])).toBe(false);
    });

    it("should be case-sensitive", () => {
      expect(validateRelation("시댁")).toBe(true);
      expect(validateRelation("시댁")).toBe(true); // exact match
    });
  });

  // ============================================================================
  // AC-4e: validateTone — catalog validation
  // ============================================================================
  describe("validateTone", () => {
    it("AC-4e: should return true for valid tones", () => {
      expect(validateTone("정중")).toBe(true);
      expect(validateTone("단호")).toBe(true);
      expect(validateTone("유머")).toBe(true);
    });

    it("should return false for invalid tones", () => {
      expect(validateTone("무례")).toBe(false);
      expect(validateTone("친절")).toBe(false);
      expect(validateTone("")).toBe(false);
      expect(validateTone("정중  ")).toBe(false); // extra space
    });

    it("should return false for non-string values", () => {
      expect(validateTone(null)).toBe(false);
      expect(validateTone(undefined)).toBe(false);
      expect(validateTone(123)).toBe(false);
      expect(validateTone(true)).toBe(false);
      expect(validateTone({})).toBe(false);
    });
  });

  // ============================================================================
  // AC-4f: validateSeason — catalog validation
  // ============================================================================
  describe("validateSeason", () => {
    it("AC-4f: should return true for valid seasons", () => {
      expect(validateSeason("2026-설")).toBe(true);
      expect(validateSeason("2026-추석")).toBe(true);
      expect(validateSeason("2027-설")).toBe(true);
      expect(validateSeason("2027-추석")).toBe(true);
    });

    it("should return false for invalid seasons", () => {
      expect(validateSeason("2025-설")).toBe(false);
      expect(validateSeason("2028-설")).toBe(false);
      expect(validateSeason("2026-여름")).toBe(false);
      expect(validateSeason("2026-설 ")).toBe(false); // trailing space
      expect(validateSeason("")).toBe(false);
    });

    it("should return false for non-string values", () => {
      expect(validateSeason(null)).toBe(false);
      expect(validateSeason(undefined)).toBe(false);
      expect(validateSeason(2026)).toBe(false);
      expect(validateSeason({})).toBe(false);
    });
  });

  // ============================================================================
  // AC-4g: validateCauses — catalog validation for arrays
  // ============================================================================
  describe("validateCauses", () => {
    it("AC-4g: should return true for valid cause arrays", () => {
      expect(validateCauses(["과도한 질문", "가사 부담"])).toBe(true);
      expect(validateCauses(["비교·잔소리"])).toBe(true);
      expect(validateCauses(["경제적 부담", "음식 준비", "형제·친척 갈등"])).toBe(
        true
      );
      expect(validateCauses([])).toBe(true); // empty is valid
    });

    it("should return false for invalid causes in array", () => {
      expect(validateCauses(["과도한 질문", "존재하지않는원인"])).toBe(false);
      expect(validateCauses(["무효한값"])).toBe(false);
      expect(validateCauses(["휴식 부족", "잘못된"])).toBe(false);
    });

    it("should return false when not an array", () => {
      expect(validateCauses("과도한 질문")).toBe(false); // string instead of array
      expect(validateCauses(null)).toBe(false);
      expect(validateCauses(undefined)).toBe(false);
      expect(validateCauses({ cause: "과도한 질문" })).toBe(false);
    });

    it("should return false for non-string items in array", () => {
      expect(validateCauses([123])).toBe(false); // number
      expect(validateCauses(["과도한 질문", 456])).toBe(false); // mixed
      expect(validateCauses([null])).toBe(false);
      expect(validateCauses([{}])).toBe(false);
    });

    it("should validate all items in the array", () => {
      // All valid
      expect(
        validateCauses(["과도한 질문", "가사 부담", "장거리 이동", "비교·잔소리"])
      ).toBe(true);

      // One invalid among many
      expect(
        validateCauses([
          "과도한 질문",
          "가사 부담",
          "장거리 이동",
          "잘못된값",
          "비교·잔소리",
        ])
      ).toBe(false);
    });
  });

  // ============================================================================
  // Integration: envelope helpers + storage work together
  // ============================================================================
  describe("integration: envelope + storage", () => {
    it("should write entity with envelope and read it back correctly", () => {
      interface TestEntity {
        name: string;
        count: number;
        id?: string;
        createdAt?: number;
        updatedAt?: number;
      }

      const original: TestEntity = { name: "integration-test", count: 42 };
      const withEnv = withCreate(original);

      const writeResult = writeKey("entity-key", withEnv);
      expect(writeResult.ok).toBe(true);

      const readResult = readKey<typeof withEnv>("entity-key", withEnv);
      expect(readResult.id).toBe(withEnv.id);
      expect(readResult.name).toBe("integration-test");
      expect(readResult.count).toBe(42);
      expect(readResult.createdAt).toBe(withEnv.createdAt);
      expect(readResult.updatedAt).toBe(withEnv.updatedAt);
    });

    it("should read fallback when storage is cleared", () => {
      const entity = withCreate({ name: "test" });
      writeKey("temp-key", entity);

      localStorage.clear();

      const newDefault = withCreate({ name: "fallback" });
      const result = readKey("temp-key", newDefault);

      expect(result.name).toBe("fallback");
      expect(result.id).toBe(newDefault.id);
    });
  });

  // ============================================================================
  // Edge cases and robustness
  // ============================================================================
  describe("edge cases", () => {
    it("should handle empty strings as keys", () => {
      const data = { value: "test" };
      writeKey("", data);
      const result = readKey("", { value: "fallback" });
      expect(result.value).toBe("test");
    });

    it("should handle special characters in keys", () => {
      const data = { value: "special" };
      const key = "key:with:colons:and:special-chars_123";
      writeKey(key, data);
      const result = readKey(key, { value: "fallback" });
      expect(result.value).toBe("special");
    });

    it("should handle null values in data", () => {
      const data = { name: "test", value: null };
      writeKey("null-value", data);
      const result = readKey("null-value", { name: "", value: undefined });
      expect(result.value).toBe(null);
    });

    it("should handle very large data structures", () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `item-${i}`,
        })),
      };
      const result = writeKey("large", largeData);
      expect(result.ok).toBe(true);

      const read = readKey("large", { items: [] });
      expect(read.items.length).toBe(1000);
    });

    it("should handle deeply nested objects", () => {
      const nested = {
        a: { b: { c: { d: { e: { value: "deep" } } } } },
      };
      writeKey("nested-deep", nested);
      const result = readKey("nested-deep", { a: {} } as any);
      expect(result.a.b.c.d.e.value).toBe("deep");
    });

    it("should validate empty causes array as valid", () => {
      expect(validateCauses([])).toBe(true);
    });

    it("should preserve numeric precision in envelope timestamps", () => {
      const entity = withCreate({ value: 1 });
      expect(Number.isInteger(entity.createdAt)).toBe(true);
      expect(Number.isInteger(entity.updatedAt)).toBe(true);
    });
  });
});
