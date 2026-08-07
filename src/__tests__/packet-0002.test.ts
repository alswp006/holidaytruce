import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type {
  Couple,
  Visit,
  BudgetItem,
  ChecklistItem,
  Script,
  MoodLog,
  AppFlags,
  Holiday,
} from "@/lib/types";

/**
 * Packet 0002: localStorage CRUD 헬퍼 + 명절 상수 테이블
 *
 * AC-1: CRUD helpers for all 7 entities (couple, visits, budget, checklist, scripts, moodlogs, flags)
 * AC-2: Graceful error handling — JSON.parse failure → default fallback, write failure → {ok:false, reason:'quota'}
 * AC-3: HOLIDAYS constant array with 2026 설날/추석 (no external API calls)
 */

describe("localStorage CRUD 헬퍼 + 명절 상수 테이블 (packet-0002)", () => {
  // Clean localStorage before each test
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-1: Couple (single entity — getCouple/saveCouple)
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-1.1: Couple (getCouple/saveCouple)", () => {
    it("should save and retrieve couple data with all fields intact", () => {
      // Import will happen from src/lib/storage.ts once implemented
      const { saveCouple, getCouple } = require("@/lib/storage");

      const couple: Couple = {
        id: "couple-uuid-001",
        myRole: "며느리",
        myFamilyLabel: "친정",
        partnerFamilyLabel: "시댁",
        createdAt: 1722000000000,
      };

      saveCouple(couple);
      const retrieved = getCouple();

      expect(retrieved).toEqual(couple);
      expect(retrieved?.id).toBe("couple-uuid-001");
      expect(retrieved?.myRole).toBe("며느리");
      expect(retrieved?.myFamilyLabel).toBe("친정");
      expect(retrieved?.partnerFamilyLabel).toBe("시댁");
      expect(retrieved?.createdAt).toBe(1722000000000);
    });

    it("should return null when no couple is saved", () => {
      const { getCouple } = require("@/lib/storage");
      expect(getCouple()).toBeNull();
    });

    it("should overwrite existing couple when saving", () => {
      const { saveCouple, getCouple } = require("@/lib/storage");

      const couple1: Couple = {
        id: "couple-1",
        myRole: "며느리",
        myFamilyLabel: "친정",
        partnerFamilyLabel: "시댁",
        createdAt: 1000,
      };

      const couple2: Couple = {
        id: "couple-2",
        myRole: "아내",
        myFamilyLabel: "고향",
        partnerFamilyLabel: "남편댁",
        createdAt: 2000,
      };

      saveCouple(couple1);
      expect(getCouple()?.id).toBe("couple-1");

      saveCouple(couple2);
      const retrieved = getCouple();
      expect(retrieved?.id).toBe("couple-2");
      expect(retrieved?.myRole).toBe("아내");
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-1: Visit (array entity — getVisits/addVisit/removeVisit)
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-1.2: Visit (getVisits/addVisit/removeVisit)", () => {
    it("should add visit and retrieve it from list", () => {
      const { addVisit, getVisits } = require("@/lib/storage");

      const visit: Visit = {
        id: "visit-uuid-001",
        family: "mine",
        date: "2026-02-03",
        startHour: 10,
        durationHours: 8,
        holidayId: "2026-lunar-new-year",
        memo: "설 연휴 본가 방문",
      };

      addVisit(visit);
      const visits = getVisits();

      expect(Array.isArray(visits)).toBe(true);
      expect(visits.length).toBe(1);
      expect(visits[0]).toEqual(visit);
      expect(visits[0].family).toBe("mine");
      expect(visits[0].date).toBe("2026-02-03");
      expect(visits[0].durationHours).toBe(8);
    });

    it("should add multiple visits to the list", () => {
      const { addVisit, getVisits } = require("@/lib/storage");

      const visit1: Visit = {
        id: "visit-1",
        family: "mine",
        date: "2026-02-03",
        startHour: 10,
        durationHours: 8,
        holidayId: "2026-lunar-new-year",
        memo: "본가",
      };

      const visit2: Visit = {
        id: "visit-2",
        family: "partner",
        date: "2026-02-04",
        startHour: 14,
        durationHours: 12,
        holidayId: "2026-lunar-new-year",
        memo: "시댁",
      };

      addVisit(visit1);
      addVisit(visit2);
      const visits = getVisits();

      expect(visits.length).toBe(2);
      expect(visits[0].id).toBe("visit-1");
      expect(visits[1].id).toBe("visit-2");
      expect(visits[0].family).toBe("mine");
      expect(visits[1].family).toBe("partner");
    });

    it("should remove visit by id", () => {
      const { addVisit, getVisits, removeVisit } = require("@/lib/storage");

      const visit1: Visit = {
        id: "visit-keep",
        family: "mine",
        date: "2026-02-03",
        startHour: 10,
        durationHours: 8,
        holidayId: "2026-lunar-new-year",
        memo: "본가",
      };

      const visit2: Visit = {
        id: "visit-remove",
        family: "partner",
        date: "2026-02-04",
        startHour: 14,
        durationHours: 12,
        holidayId: "2026-lunar-new-year",
        memo: "시댁",
      };

      addVisit(visit1);
      addVisit(visit2);
      expect(getVisits().length).toBe(2);

      removeVisit("visit-remove");
      const visits = getVisits();
      expect(visits.length).toBe(1);
      expect(visits[0].id).toBe("visit-keep");
    });

    it("should return empty array when no visits exist", () => {
      const { getVisits } = require("@/lib/storage");
      expect(getVisits()).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-1: Budget (array entity — getBudget/addBudgetItem)
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-1.3: Budget (getBudget/addBudgetItem)", () => {
    it("should add budget item and retrieve it from list", () => {
      const { addBudgetItem, getBudget } = require("@/lib/storage");

      const item: BudgetItem = {
        id: "budget-uuid-001",
        holidayId: "2026-lunar-new-year",
        target: "본가",
        category: "용돈",
        label: "부모님 용돈",
        amount: 300000,
      };

      addBudgetItem(item);
      const budget = getBudget();

      expect(Array.isArray(budget)).toBe(true);
      expect(budget.length).toBe(1);
      expect(budget[0]).toEqual(item);
      expect(budget[0].target).toBe("본가");
      expect(budget[0].category).toBe("용돈");
      expect(budget[0].amount).toBe(300000);
    });

    it("should add multiple budget items", () => {
      const { addBudgetItem, getBudget } = require("@/lib/storage");

      const item1: BudgetItem = {
        id: "budget-1",
        holidayId: "2026-lunar-new-year",
        target: "본가",
        category: "용돈",
        label: "부모님",
        amount: 300000,
      };

      const item2: BudgetItem = {
        id: "budget-2",
        holidayId: "2026-lunar-new-year",
        target: "시댁",
        category: "선물",
        label: "선물",
        amount: 150000,
      };

      const item3: BudgetItem = {
        id: "budget-3",
        holidayId: "2026-lunar-new-year",
        target: "기타",
        category: "교통",
        label: "기차표",
        amount: 50000,
      };

      addBudgetItem(item1);
      addBudgetItem(item2);
      addBudgetItem(item3);
      const budget = getBudget();

      expect(budget.length).toBe(3);
      expect(budget[0].target).toBe("본가");
      expect(budget[1].target).toBe("시댁");
      expect(budget[2].category).toBe("교통");
      expect(budget.reduce((sum: number, b: BudgetItem) => sum + b.amount, 0)).toBe(500000);
    });

    it("should return empty array when no budget items exist", () => {
      const { getBudget } = require("@/lib/storage");
      expect(getBudget()).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-1: Checklist (array entity — getChecklist/toggleChecklist)
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-1.4: Checklist (getChecklist/toggleChecklist)", () => {
    it("should toggle checklist item done status", () => {
      const { getChecklist, toggleChecklist } = require("@/lib/storage");

      // First add an item (via localStorage directly for test setup)
      const item: ChecklistItem = {
        id: "check-001",
        holidayId: "2026-lunar-new-year",
        text: "선물 준비",
        done: false,
      };
      localStorage.setItem("ht_checklist", JSON.stringify([item]));

      let checklist = getChecklist();
      expect(checklist[0].done).toBe(false);

      toggleChecklist("check-001");
      checklist = getChecklist();
      expect(checklist[0].done).toBe(true);
      expect(checklist[0].text).toBe("선물 준비");

      toggleChecklist("check-001");
      checklist = getChecklist();
      expect(checklist[0].done).toBe(false);
    });

    it("should return empty array when no checklist items exist", () => {
      const { getChecklist } = require("@/lib/storage");
      expect(getChecklist()).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-1: Script (array entity — getScripts/addScript)
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-1.5: Script (getScripts/addScript)", () => {
    it("should add script and retrieve it from list", () => {
      const { addScript, getScripts } = require("@/lib/storage");

      const script: Script = {
        id: "script-uuid-001",
        situation: "결혼계획질문",
        tone: "정중하게",
        question: "애는 언제 낳니?",
        resultText: "좋은 질문입니다. 계획을 세우고 있습니다.",
        createdAt: 1722000000000,
        isAi: true,
      };

      addScript(script);
      const scripts = getScripts();

      expect(Array.isArray(scripts)).toBe(true);
      expect(scripts.length).toBe(1);
      expect(scripts[0]).toEqual(script);
      expect(scripts[0].situation).toBe("결혼계획질문");
      expect(scripts[0].tone).toBe("정중하게");
      expect(scripts[0].isAi).toBe(true);
    });

    it("should return empty array when no scripts exist", () => {
      const { getScripts } = require("@/lib/storage");
      expect(getScripts()).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-1: MoodLog (array entity — getMoodLogs/addMoodLog)
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-1.6: MoodLog (getMoodLogs/addMoodLog)", () => {
    it("should add mood log and retrieve it from list", () => {
      const { addMoodLog, getMoodLogs } = require("@/lib/storage");

      const mood: MoodLog = {
        id: "mood-uuid-001",
        holidayId: "2026-lunar-new-year",
        exhaustionLevel: 4,
        stressTags: ["과한질문", "일정불균형"],
        note: "설 연휴 중 스트레스가 많았음",
        createdAt: 1722000000000,
      };

      addMoodLog(mood);
      const logs = getMoodLogs();

      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBe(1);
      expect(logs[0]).toEqual(mood);
      expect(logs[0].exhaustionLevel).toBe(4);
      expect(logs[0].stressTags).toContain("과한질문");
      expect(logs[0].stressTags.length).toBe(2);
    });

    it("should add multiple mood logs", () => {
      const { addMoodLog, getMoodLogs } = require("@/lib/storage");

      const mood1: MoodLog = {
        id: "mood-1",
        holidayId: "2026-lunar-new-year",
        exhaustionLevel: 3,
        stressTags: ["과한질문"],
        note: "첫날",
        createdAt: 1722000000000,
      };

      const mood2: MoodLog = {
        id: "mood-2",
        holidayId: "2026-lunar-new-year",
        exhaustionLevel: 5,
        stressTags: ["가사노동", "일정불균형"],
        note: "마지막날",
        createdAt: 1722000003600,
      };

      addMoodLog(mood1);
      addMoodLog(mood2);
      const logs = getMoodLogs();

      expect(logs.length).toBe(2);
      expect(logs[0].exhaustionLevel).toBe(3);
      expect(logs[1].exhaustionLevel).toBe(5);
    });

    it("should return empty array when no mood logs exist", () => {
      const { getMoodLogs } = require("@/lib/storage");
      expect(getMoodLogs()).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-1: AppFlags (single entity — getFlags/saveFlags)
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-1.7: AppFlags (getFlags/saveFlags)", () => {
    it("should save and retrieve flags with all fields", () => {
      const { saveFlags, getFlags } = require("@/lib/storage");

      const flags: AppFlags = {
        aiNoticeAcknowledged: true,
        activeHolidayId: "2026-lunar-new-year",
        purchasedHolidays: ["2026-lunar-new-year", "2026-chuseok"],
      };

      saveFlags(flags);
      const retrieved = getFlags();

      expect(retrieved).toEqual(flags);
      expect(retrieved?.aiNoticeAcknowledged).toBe(true);
      expect(retrieved?.activeHolidayId).toBe("2026-lunar-new-year");
      expect(retrieved?.purchasedHolidays).toContain("2026-lunar-new-year");
      expect(retrieved?.purchasedHolidays.length).toBe(2);
    });

    it("should return null when no flags are saved", () => {
      const { getFlags } = require("@/lib/storage");
      expect(getFlags()).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-2: Error Handling — JSON.parse failure (corrupted localStorage)
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-2.1: JSON.parse failure handling — return default without throw", () => {
    it("should return null for Couple when JSON is corrupted", () => {
      const { getCouple } = require("@/lib/storage");

      // Simulate corrupted JSON
      localStorage.setItem("ht_couple", "{ invalid json <<<");

      // Should NOT throw, should return null
      const result = getCouple();
      expect(result).toBeNull();
    });

    it("should return empty array for Visits when JSON is corrupted", () => {
      const { getVisits } = require("@/lib/storage");

      localStorage.setItem("ht_visits", "not-valid-json");

      // Should NOT throw, should return []
      const result = getVisits();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should return empty array for Budget when JSON is corrupted", () => {
      const { getBudget } = require("@/lib/storage");

      localStorage.setItem("ht_budget", "{ corrupted");

      const result = getBudget();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(0);
    });

    it("should return null for Flags when JSON is corrupted", () => {
      const { getFlags } = require("@/lib/storage");

      localStorage.setItem("ht_flags", "bad json <<<");

      const result = getFlags();
      expect(result).toBeNull();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-2: Error Handling — QuotaExceededError on write
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-2.2: QuotaExceededError handling — return {ok:false, reason:'quota'}", () => {
    it("should return {ok:false, reason:'quota'} when saveCouple exceeds quota", () => {
      const { saveCouple } = require("@/lib/storage");

      // Mock localStorage.setItem to throw QuotaExceededError
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        const err = new Error("QuotaExceededError");
        err.name = "QuotaExceededError";
        throw err;
      });

      const couple: Couple = {
        id: "test",
        myRole: "며느리",
        myFamilyLabel: "친정",
        partnerFamilyLabel: "시댁",
        createdAt: Date.now(),
      };

      const result = saveCouple(couple);

      expect(result).toEqual({ ok: false, reason: "quota" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("quota");

      // Restore
      localStorage.setItem = originalSetItem;
    });

    it("should return {ok:false, reason:'quota'} when addVisit exceeds quota", () => {
      const { addVisit } = require("@/lib/storage");

      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        const err = new Error("QuotaExceededError");
        err.name = "QuotaExceededError";
        throw err;
      });

      const visit: Visit = {
        id: "test",
        family: "mine",
        date: "2026-02-03",
        startHour: 10,
        durationHours: 8,
        holidayId: "2026-lunar-new-year",
        memo: "test",
      };

      const result = addVisit(visit);

      expect(result).toEqual({ ok: false, reason: "quota" });

      localStorage.setItem = originalSetItem;
    });

    it("should NOT call console.error when quota is exceeded", () => {
      const { saveCouple } = require("@/lib/storage");
      const consoleErrorSpy = vi.spyOn(console, "error");

      const originalSetItem = localStorage.setItem;
      localStorage.setItem = vi.fn(() => {
        const err = new Error("QuotaExceededError");
        err.name = "QuotaExceededError";
        throw err;
      });

      const couple: Couple = {
        id: "test",
        myRole: "며느리",
        myFamilyLabel: "친정",
        partnerFamilyLabel: "시댁",
        createdAt: Date.now(),
      };

      saveCouple(couple);

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      localStorage.setItem = originalSetItem;
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-3: HOLIDAYS constant array with 2026 dates
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-3: HOLIDAYS constant array with 2026 dates (no external API)", () => {
    it("should export HOLIDAYS array with 2026 설날 and 추석", () => {
      const { HOLIDAYS } = require("@/lib/holidays");

      expect(Array.isArray(HOLIDAYS)).toBe(true);
      expect(HOLIDAYS.length).toBeGreaterThanOrEqual(2);

      // Check for 2026 설날 (Lunar New Year: Feb 3)
      const lunarNewYear = HOLIDAYS.find((h: Holiday) => h.id.includes("lunar-new-year"));
      expect(lunarNewYear).toBeDefined();
      expect(lunarNewYear?.id).toMatch(/2026.*lunar-new-year/);

      // Check for 2026 추석 (Chuseok: Sep 25)
      const chuseok = HOLIDAYS.find((h: Holiday) => h.id.includes("chuseok"));
      expect(chuseok).toBeDefined();
      expect(chuseok?.id).toMatch(/2026.*chuseok/);
    });

    it("should have Holiday objects with id and name fields", () => {
      const { HOLIDAYS } = require("@/lib/holidays");

      expect(HOLIDAYS.length).toBeGreaterThan(0);

      HOLIDAYS.forEach((holiday: Holiday) => {
        expect(holiday).toHaveProperty("id");
        expect(holiday).toHaveProperty("name");
        expect(typeof holiday.id).toBe("string");
        expect(typeof holiday.name).toBe("string");
        expect(holiday.id.length).toBeGreaterThan(0);
        expect(holiday.name.length).toBeGreaterThan(0);
      });
    });

    it("should NOT call any external API to populate HOLIDAYS", async () => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      // Import holidays and check no fetch was called
      const { HOLIDAYS } = require("@/lib/holidays");

      expect(HOLIDAYS).toBeDefined();
      expect(fetchSpy).not.toHaveBeenCalled();

      fetchSpy.mockRestore();
    });

    it("should include 설날 with name containing Korean text", () => {
      const { HOLIDAYS } = require("@/lib/holidays");

      const lunarNewYear = HOLIDAYS.find((h: Holiday) =>
        h.id.includes("lunar-new-year") && h.id.includes("2026"),
      );

      expect(lunarNewYear?.name).toBeDefined();
      expect(lunarNewYear?.name.length).toBeGreaterThan(0);
      // Name should contain Korean characters or "설날"/"Lunar New Year"
      expect(
        lunarNewYear?.name.includes("설") ||
        lunarNewYear?.name.includes("New Year"),
      ).toBe(true);
    });

    it("should include 추석 with name containing Korean text", () => {
      const { HOLIDAYS } = require("@/lib/holidays");

      const chuseok = HOLIDAYS.find((h: Holiday) =>
        h.id.includes("chuseok") && h.id.includes("2026"),
      );

      expect(chuseok?.name).toBeDefined();
      expect(chuseok?.name.length).toBeGreaterThan(0);
      // Name should contain Korean characters or "추석"/"Chuseok"
      expect(
        chuseok?.name.includes("추") ||
        chuseok?.name.includes("Chuseok"),
      ).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Bonus: UUID utility function (mentioned in spec as "uuid 생성 유틸 포함")
  // ════════════════════════════════════════════════════════════════════════════

  describe("Bonus: UUID generation utility", () => {
    it("should provide a uuid() function that generates unique IDs", () => {
      const { uuid } = require("@/lib/storage");

      expect(typeof uuid).toBe("function");

      const id1 = uuid();
      const id2 = uuid();

      expect(typeof id1).toBe("string");
      expect(typeof id2).toBe("string");
      expect(id1.length).toBeGreaterThan(0);
      expect(id1).not.toBe(id2); // Should be unique
    });
  });
});
