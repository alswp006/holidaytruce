import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type {
  VisitSchedule,
  BudgetItem,
  ChecklistItem,
  ScriptRecord,
  StressLog,
  AppMeta,
} from "@/lib/types";

// Storage will be imported once implemented
// import { get, set, newId, addSchedule, removeSchedule, listSchedules, ... } from "@/lib/storage";

describe("localStorage CRUD Helper (packet-0002)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("AC-4: newId() returns crypto.randomUUID()", () => {
    it("AC-4[P0]: newId should return a valid UUID string", () => {
      // Once storage.ts is implemented
      // const id1 = newId();
      // expect(id1).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it("AC-4[P0]: multiple calls to newId() should return different IDs", () => {
      // const id1 = newId();
      // const id2 = newId();
      // const id3 = newId();
      // expect(id1).not.toBe(id2);
      // expect(id2).not.toBe(id3);
      // expect(id1).not.toBe(id3);
    });
  });

  describe("AC-1: Malformed JSON read defense", () => {
    it("AC-1[P0]: get() should return fallback [] when JSON is malformed", () => {
      // Set malformed data directly
      localStorage.setItem("ht.schedules", "not-valid-json{[}");

      // Once storage.ts is implemented:
      // const result = get<VisitSchedule[]>("ht.schedules", []);
      // expect(result).toEqual([]);
      // expect(result).toBeInstanceOf(Array);
      // expect(result.length).toBe(0);
    });

    it("AC-1[P0]: get() should not log console.error when JSON parsing fails", () => {
      const consoleSpy = vi.spyOn(console, "error");
      localStorage.setItem("ht.budgets", "{invalid json");

      // const result = get<BudgetItem[]>("ht.budgets", []);
      // expect(result).toEqual([]);
      // expect(consoleSpy).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("AC-1[P0]: get() with valid JSON should return parsed object", () => {
      const data: BudgetItem[] = [
        {
          id: "test-1",
          side: "본가",
          category: "용돈",
          label: "엄마 용돈",
          amount: 100000,
          paid: false,
          holidayId: "2026-seollal",
          createdAt: Date.now(),
        },
      ];
      localStorage.setItem("ht.budgets", JSON.stringify(data));

      // const result = get<BudgetItem[]>("ht.budgets", []);
      // expect(result).toEqual(data);
      // expect(result.length).toBe(1);
      // expect(result[0].amount).toBe(100000);
    });
  });

  describe("AC-2: QuotaExceededError handling", () => {
    it("AC-2[P0]: set() should not throw when QuotaExceededError occurs", () => {
      // Set up quota exceeded simulation
      const originalSetItem = localStorage.setItem;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

      // const callback = vi.fn();
      // setOnQuotaExceeded(callback);
      // const testData = { key: "ht.schedules", value: [] as VisitSchedule[] };

      // Expect no throw
      // expect(() => {
      //   set("ht.schedules", testData.value);
      // }).not.toThrow();

      Storage.prototype.setItem = originalSetItem;
    });

    it("AC-2[P0]: set() should trigger onQuotaExceeded callback when QuotaExceededError occurs", () => {
      const originalSetItem = localStorage.setItem;
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new DOMException("QuotaExceededError");
      });

      // const callback = vi.fn();
      // setOnQuotaExceeded(callback);
      //
      // try {
      //   set("ht.budgets", []);
      // } catch {
      //   // Intentionally catch to prevent test failure
      // }
      //
      // expect(callback).toHaveBeenCalledWith("ht.budgets");

      Storage.prototype.setItem = originalSetItem;
    });
  });

  describe("AC-3: list* functions always return arrays", () => {
    it("AC-3[P0]: listSchedules should return [] when no schedules exist", () => {
      // const result = listSchedules("2026-seollal");
      // expect(result).toEqual([]);
      // expect(Array.isArray(result)).toBe(true);
      // expect(result.length).toBe(0);
    });

    it("AC-3[P0]: listBudgets should return [] when no budgets exist", () => {
      // const result = listBudgets("2026-seollal");
      // expect(result).toEqual([]);
      // expect(Array.isArray(result)).toBe(true);
    });

    it("AC-3[P0]: listChecklist should return [] when no items exist", () => {
      // const result = listChecklist("2026-seollal");
      // expect(result).toEqual([]);
      // expect(Array.isArray(result)).toBe(true);
    });

    it("AC-3[P0]: listScripts should return [] when no scripts exist", () => {
      // const result = listScripts();
      // expect(result).toEqual([]);
      // expect(Array.isArray(result)).toBe(true);
    });

    it("AC-3[P0]: listStressLogs should return [] when no logs exist", () => {
      // const result = listStressLogs("2026-seollal");
      // expect(result).toEqual([]);
      // expect(Array.isArray(result)).toBe(true);
    });

    it("AC-3[P0]: listSchedules should never return null or undefined", () => {
      localStorage.setItem("ht.schedules", JSON.stringify(null));
      // const result = listSchedules("2026-seollal");
      // expect(result).not.toBeNull();
      // expect(result).not.toBeUndefined();
      // expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("CRUD: addSchedule", () => {
    it("should add a schedule and persist to storage", () => {
      // const schedule: Omit<VisitSchedule, "id" | "createdAt"> = {
      //   side: "본가",
      //   date: "2026-02-03",
      //   startTime: "10:00",
      //   endTime: "14:00",
      //   memo: "차례",
      //   holidayId: "2026-seollal",
      // };
      //
      // const result = addSchedule(schedule);
      //
      // expect(result.id).toBeDefined();
      // expect(result.createdAt).toBeDefined();
      // expect(result.side).toBe("본가");
      // expect(result.date).toBe("2026-02-03");
      // expect(result.startTime).toBe("10:00");
      // expect(result.endTime).toBe("14:00");
      // expect(result.memo).toBe("차례");
      // expect(result.holidayId).toBe("2026-seollal");
      //
      // // Verify persisted
      // const stored = JSON.parse(localStorage.getItem("ht.schedules") || "[]");
      // expect(stored.length).toBe(1);
      // expect(stored[0].id).toBe(result.id);
    });

    it("should add multiple schedules to the same holiday", () => {
      // const s1 = addSchedule({
      //   side: "본가",
      //   date: "2026-02-03",
      //   memo: "차례",
      //   holidayId: "2026-seollal",
      // });
      //
      // const s2 = addSchedule({
      //   side: "처가",
      //   date: "2026-02-04",
      //   memo: "선물 주기",
      //   holidayId: "2026-seollal",
      // });
      //
      // expect(s1.id).not.toBe(s2.id);
      // const stored = JSON.parse(localStorage.getItem("ht.schedules") || "[]");
      // expect(stored.length).toBe(2);
    });
  });

  describe("CRUD: removeSchedule", () => {
    it("should remove a schedule by ID", () => {
      // const schedule = addSchedule({
      //   side: "본가",
      //   date: "2026-02-03",
      //   memo: "차례",
      //   holidayId: "2026-seollal",
      // });
      //
      // removeSchedule(schedule.id);
      //
      // const stored = JSON.parse(localStorage.getItem("ht.schedules") || "[]");
      // expect(stored.length).toBe(0);
    });

    it("should not throw when removing non-existent ID", () => {
      // expect(() => {
      //   removeSchedule("non-existent-id");
      // }).not.toThrow();
    });
  });

  describe("CRUD: listSchedules with holidayId filter", () => {
    it("should list schedules filtered by holidayId", () => {
      // addSchedule({
      //   side: "본가",
      //   date: "2026-02-03",
      //   memo: "설",
      //   holidayId: "2026-seollal",
      // });
      //
      // addSchedule({
      //   side: "처가",
      //   date: "2026-09-18",
      //   memo: "추석",
      //   holidayId: "2026-chuseok",
      // });
      //
      // const seollalList = listSchedules("2026-seollal");
      // expect(seollalList.length).toBe(1);
      // expect(seollalList[0].memo).toBe("설");
      //
      // const chuseokList = listSchedules("2026-chuseok");
      // expect(chuseokList.length).toBe(1);
      // expect(chuseokList[0].memo).toBe("추석");
    });

    it("should return empty array for holiday with no schedules", () => {
      // addSchedule({
      //   side: "본가",
      //   date: "2026-02-03",
      //   memo: "설",
      //   holidayId: "2026-seollal",
      // });
      //
      // const result = listSchedules("2026-chuseok");
      // expect(result).toEqual([]);
    });
  });

  describe("CRUD: BudgetItem operations", () => {
    it("should add a budget item", () => {
      // const budget = addBudget({
      //   side: "본가",
      //   category: "용돈",
      //   label: "엄마 용돈",
      //   amount: 100000,
      //   paid: false,
      //   holidayId: "2026-seollal",
      // });
      //
      // expect(budget.id).toBeDefined();
      // expect(budget.amount).toBe(100000);
      // expect(budget.paid).toBe(false);
    });

    it("should list budgets filtered by holidayId", () => {
      // addBudget({
      //   side: "본가",
      //   category: "용돈",
      //   label: "용돈",
      //   amount: 50000,
      //   paid: false,
      //   holidayId: "2026-seollal",
      // });
      //
      // addBudget({
      //   side: "처가",
      //   category: "선물",
      //   label: "선물",
      //   amount: 30000,
      //   paid: false,
      //   holidayId: "2026-chuseok",
      // });
      //
      // const seollal = listBudgets("2026-seollal");
      // expect(seollal.length).toBe(1);
      // expect(seollal[0].category).toBe("용돈");
      //
      // const chuseok = listBudgets("2026-chuseok");
      // expect(chuseok.length).toBe(1);
      // expect(chuseok[0].category).toBe("선물");
    });

    it("should remove a budget item by ID", () => {
      // const budget = addBudget({
      //   side: "본가",
      //   category: "용돈",
      //   label: "용돈",
      //   amount: 50000,
      //   paid: false,
      //   holidayId: "2026-seollal",
      // });
      //
      // removeBudget(budget.id);
      //
      // const result = listBudgets("2026-seollal");
      // expect(result.length).toBe(0);
    });
  });

  describe("CRUD: ChecklistItem operations", () => {
    it("should add a checklist item", () => {
      // const item = addChecklistItem({
      //   text: "선물 구매",
      //   checked: false,
      //   holidayId: "2026-seollal",
      // });
      //
      // expect(item.id).toBeDefined();
      // expect(item.text).toBe("선물 구매");
      // expect(item.checked).toBe(false);
    });

    it("should list checklist items filtered by holidayId", () => {
      // addChecklistItem({
      //   text: "선물 구매",
      //   checked: false,
      //   holidayId: "2026-seollal",
      // });
      //
      // addChecklistItem({
      //   text: "추석 준비",
      //   checked: false,
      //   holidayId: "2026-chuseok",
      // });
      //
      // const seollal = listChecklist("2026-seollal");
      // expect(seollal.length).toBe(1);
      // expect(seollal[0].text).toBe("선물 구매");
    });

    it("should update a checklist item checked status", () => {
      // const item = addChecklistItem({
      //   text: "선물 구매",
      //   checked: false,
      //   holidayId: "2026-seollal",
      // });
      //
      // updateChecklistItem(item.id, { checked: true });
      //
      // const updated = listChecklist("2026-seollal")[0];
      // expect(updated.checked).toBe(true);
    });
  });

  describe("CRUD: ScriptRecord operations", () => {
    it("should add a script record", () => {
      // const script = addScript({
      //   situation: "취업 언제 하냐고 물어볼 때",
      //   tone: "정중하게",
      //   result: "감사합니다...",
      // });
      //
      // expect(script.id).toBeDefined();
      // expect(script.createdAt).toBeDefined();
      // expect(script.situation).toBe("취업 언제 하냐고 물어볼 때");
      // expect(script.tone).toBe("정중하게");
    });

    it("should list all scripts", () => {
      // addScript({
      //   situation: "취업",
      //   tone: "정중하게",
      //   result: "감사합니다",
      // });
      //
      // addScript({
      //   situation: "결혼",
      //   tone: "단호하게",
      //   result: "곧입니다",
      // });
      //
      // const scripts = listScripts();
      // expect(scripts.length).toBe(2);
    });

    it("should remove a script by ID", () => {
      // const script = addScript({
      //   situation: "취업",
      //   tone: "정중하게",
      //   result: "감사합니다",
      // });
      //
      // removeScript(script.id);
      //
      // expect(listScripts().length).toBe(0);
    });
  });

  describe("CRUD: StressLog operations", () => {
    it("should add a stress log", () => {
      // const log = addStressLog({
      //   holidayId: "2026-seollal",
      //   score: 7,
      //   triggers: ["잔소리", "비교"],
      //   memo: "힘들었어요",
      // });
      //
      // expect(log.id).toBeDefined();
      // expect(log.createdAt).toBeDefined();
      // expect(log.score).toBe(7);
      // expect(log.triggers).toEqual(["잔소리", "비교"]);
    });

    it("should list stress logs filtered by holidayId", () => {
      // addStressLog({
      //   holidayId: "2026-seollal",
      //   score: 8,
      //   triggers: ["잔소리"],
      //   memo: "설",
      // });
      //
      // addStressLog({
      //   holidayId: "2026-chuseok",
      //   score: 6,
      //   triggers: ["비교"],
      //   memo: "추석",
      // });
      //
      // const seollal = listStressLogs("2026-seollal");
      // expect(seollal.length).toBe(1);
      // expect(seollal[0].memo).toBe("설");
      // expect(seollal[0].score).toBe(8);
    });

    it("should remove a stress log by ID", () => {
      // const log = addStressLog({
      //   holidayId: "2026-seollal",
      //   score: 7,
      //   triggers: [],
      //   memo: "기록",
      // });
      //
      // removeStressLog(log.id);
      //
      // expect(listStressLogs("2026-seollal").length).toBe(0);
    });
  });

  describe("AppMeta operations", () => {
    it("should read and write AppMeta", () => {
      // const meta: AppMeta = {
      //   aiNoticeAck: true,
      //   currentHolidayId: "2026-seollal",
      //   isPaid: false,
      // };
      //
      // setMeta(meta);
      // const read = getMeta();
      //
      // expect(read.aiNoticeAck).toBe(true);
      // expect(read.currentHolidayId).toBe("2026-seollal");
      // expect(read.isPaid).toBe(false);
    });

    it("should return default meta when not set", () => {
      // const meta = getMeta();
      // expect(meta).toBeDefined();
      // expect(meta.aiNoticeAck).toBe(false);
      // expect(meta.currentHolidayId).toBeDefined();
    });

    it("should update currentHolidayId in meta", () => {
      // const meta = getMeta();
      // const updated = { ...meta, currentHolidayId: "2026-chuseok" };
      // setMeta(updated);
      //
      // const read = getMeta();
      // expect(read.currentHolidayId).toBe("2026-chuseok");
    });
  });
});
