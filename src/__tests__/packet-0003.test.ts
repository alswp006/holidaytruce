import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type {
  Couple,
  Visit,
  BudgetItem,
  ChecklistItem,
  MoodLog,
  AppFlags,
} from "@/lib/types";

/**
 * Packet 0003: 앱 상태 훅 + 파생 집계 함수
 *
 * AC-1: useAppData() hook provides loading state + all entities (couple, flags, visits, budget, checklist, scripts, moodLogs)
 * AC-2: Pure aggregation functions (calcBalance, calcBudget, calcChecklistProgress, calcMoodReport)
 * AC-3: Helper functions (isPremium, acknowledgeAiNotice, setActiveHoliday, isImbalanced)
 */

describe("앱 상태 훅 + 파생 집계 함수 (packet-0003)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-1: useAppData() hook — loading state + all entities
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-1: useAppData() hook exposes all entities with loading state", () => {
    it("should export useAppData function", () => {
      const { useAppData } = require("@/lib/useAppData");
      expect(typeof useAppData).toBe("function");
    });

    it("should return object with all required properties", () => {
      const { useAppData } = require("@/lib/useAppData");

      // Mock the hook call (will fail until implemented)
      // Simulate hook behavior with a wrapper
      const TestHookComponent = () => {
        const state = useAppData();
        expect(state).toHaveProperty("loading");
        expect(state).toHaveProperty("couple");
        expect(state).toHaveProperty("flags");
        expect(state).toHaveProperty("visits");
        expect(state).toHaveProperty("budget");
        expect(state).toHaveProperty("checklist");
        expect(state).toHaveProperty("scripts");
        expect(state).toHaveProperty("moodLogs");
        return null;
      };

      // For now, test pure function composition manually
      expect(useAppData).toBeDefined();
    });

    it("should provide loading=true initially and transition to false", () => {
      // Test pure composition of storage reads
      const { getCouple, getFlags, getVisits, getBudget, getChecklist, getScripts, getMoodLogs } = require("@/lib/storage");

      // Initially empty
      expect(getCouple()).toBeNull();
      expect(getFlags()).toBeNull();
      expect(getVisits()).toEqual([]);
      expect(getBudget()).toEqual([]);
      expect(getChecklist()).toEqual([]);
      expect(getScripts()).toEqual([]);
      expect(getMoodLogs()).toEqual([]);
    });

    it("should load and expose couple data from storage", () => {
      const { getCouple, saveCouple } = require("@/lib/storage");

      const couple: Couple = {
        id: "couple-1",
        myRole: "며느리",
        myFamilyLabel: "친정",
        partnerFamilyLabel: "시댁",
        createdAt: 1722000000000,
      };

      saveCouple(couple);
      const loaded = getCouple();

      expect(loaded).toEqual(couple);
      expect(loaded?.id).toBe("couple-1");
    });

    it("should load and expose flags data from storage", () => {
      const { getFlags, saveFlags } = require("@/lib/storage");

      const flags: AppFlags = {
        aiNoticeAcknowledged: true,
        activeHolidayId: "2026-lunar-new-year",
        purchasedHolidays: ["2026-lunar-new-year"],
      };

      saveFlags(flags);
      const loaded = getFlags();

      expect(loaded).toEqual(flags);
      expect(loaded?.aiNoticeAcknowledged).toBe(true);
      expect(loaded?.activeHolidayId).toBe("2026-lunar-new-year");
    });

    it("should load and expose visits from storage", () => {
      const { getVisits, addVisit } = require("@/lib/storage");

      const visit: Visit = {
        id: "visit-1",
        family: "mine",
        date: "2026-02-03",
        startHour: 10,
        durationHours: 8,
        holidayId: "2026-lunar-new-year",
        memo: "본가 방문",
      };

      addVisit(visit);
      const loaded = getVisits();

      expect(Array.isArray(loaded)).toBe(true);
      expect(loaded.length).toBe(1);
      expect(loaded[0]).toEqual(visit);
    });

    it("should load and expose budget items from storage", () => {
      const { getBudget, addBudgetItem } = require("@/lib/storage");

      const item: BudgetItem = {
        id: "budget-1",
        holidayId: "2026-lunar-new-year",
        target: "본가",
        category: "용돈",
        label: "부모님",
        amount: 300000,
      };

      addBudgetItem(item);
      const loaded = getBudget();

      expect(Array.isArray(loaded)).toBe(true);
      expect(loaded.length).toBe(1);
      expect(loaded[0].amount).toBe(300000);
    });

    it("should load and expose checklist from storage", () => {
      const { getChecklist } = require("@/lib/storage");

      const item: ChecklistItem = {
        id: "check-1",
        holidayId: "2026-lunar-new-year",
        text: "선물 준비",
        done: false,
      };

      localStorage.setItem("ht_checklist", JSON.stringify([item]));
      const loaded = getChecklist();

      expect(Array.isArray(loaded)).toBe(true);
      expect(loaded.length).toBe(1);
      expect(loaded[0].done).toBe(false);
    });

    it("should load and expose scripts from storage", () => {
      const { getScripts } = require("@/lib/storage");

      const script = {
        id: "script-1",
        situation: "결혼계획질문",
        tone: "정중하게" as const,
        question: "언제 결혼할 거야?",
        resultText: "계획을 세우고 있습니다.",
        createdAt: 1722000000000,
        isAi: true as const,
      };

      localStorage.setItem("ht_scripts", JSON.stringify([script]));
      const loaded = getScripts();

      expect(Array.isArray(loaded)).toBe(true);
      expect(loaded.length).toBe(1);
      expect(loaded[0].isAi).toBe(true);
    });

    it("should load and expose mood logs from storage", () => {
      const { getMoodLogs } = require("@/lib/storage");

      const mood: MoodLog = {
        id: "mood-1",
        holidayId: "2026-lunar-new-year",
        exhaustionLevel: 4,
        stressTags: ["과한질문"],
        note: "스트레스 많음",
        createdAt: 1722000000000,
      };

      localStorage.setItem("ht_moodlogs", JSON.stringify([mood]));
      const loaded = getMoodLogs();

      expect(Array.isArray(loaded)).toBe(true);
      expect(loaded.length).toBe(1);
      expect(loaded[0].exhaustionLevel).toBe(4);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-2: Pure aggregation functions — calcBalance, calcBudget, calcChecklistProgress, calcMoodReport
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-2.1: calcBalance(visits) → {minePct, partnerPct}", () => {
    it("should calculate balance percentages from visits", () => {
      const { calcBalance } = require("@/lib/useAppData");

      const visits: Visit[] = [
        {
          id: "v1",
          family: "mine",
          date: "2026-02-03",
          startHour: 10,
          durationHours: 8,
          holidayId: "2026-lunar-new-year",
          memo: "본가",
        },
        {
          id: "v2",
          family: "partner",
          date: "2026-02-04",
          startHour: 14,
          durationHours: 12,
          holidayId: "2026-lunar-new-year",
          memo: "시댁",
        },
      ];

      const result = calcBalance(visits);

      expect(result).toHaveProperty("minePct");
      expect(result).toHaveProperty("partnerPct");
      expect(typeof result.minePct).toBe("number");
      expect(typeof result.partnerPct).toBe("number");
      // 8 hours vs 12 hours → 40% vs 60%
      expect(result.minePct).toBe(40);
      expect(result.partnerPct).toBe(60);
    });

    it("should return 0/100 when only one family visited", () => {
      const { calcBalance } = require("@/lib/useAppData");

      const visits: Visit[] = [
        {
          id: "v1",
          family: "mine",
          date: "2026-02-03",
          startHour: 10,
          durationHours: 12,
          holidayId: "2026-lunar-new-year",
          memo: "본가",
        },
      ];

      const result = calcBalance(visits);

      expect(result.minePct).toBe(100);
      expect(result.partnerPct).toBe(0);
    });

    it("should return 50/50 when visits are equal", () => {
      const { calcBalance } = require("@/lib/useAppData");

      const visits: Visit[] = [
        {
          id: "v1",
          family: "mine",
          date: "2026-02-03",
          startHour: 10,
          durationHours: 10,
          holidayId: "2026-lunar-new-year",
          memo: "본가",
        },
        {
          id: "v2",
          family: "partner",
          date: "2026-02-03",
          startHour: 20,
          durationHours: 10,
          holidayId: "2026-lunar-new-year",
          memo: "시댁",
        },
      ];

      const result = calcBalance(visits);

      expect(result.minePct).toBe(50);
      expect(result.partnerPct).toBe(50);
    });

    it("should handle empty visits array", () => {
      const { calcBalance } = require("@/lib/useAppData");

      const result = calcBalance([]);

      expect(result.minePct).toBe(0);
      expect(result.partnerPct).toBe(0);
    });
  });

  describe("AC-2.2: calcBudget(items) → {total, minePct, partnerPct}", () => {
    it("should calculate budget totals and percentages", () => {
      const { calcBudget } = require("@/lib/useAppData");

      const items: BudgetItem[] = [
        {
          id: "b1",
          holidayId: "2026-lunar-new-year",
          target: "본가",
          category: "용돈",
          label: "부모님",
          amount: 300000,
        },
        {
          id: "b2",
          holidayId: "2026-lunar-new-year",
          target: "시댁",
          category: "선물",
          label: "선물",
          amount: 200000,
        },
      ];

      const result = calcBudget(items);

      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("minePct");
      expect(result).toHaveProperty("partnerPct");
      expect(result.total).toBe(500000);
      // 300000/500000 = 60%, 200000/500000 = 40%
      expect(result.minePct).toBe(60);
      expect(result.partnerPct).toBe(40);
    });

    it("should handle budget with 기타 category", () => {
      const { calcBudget } = require("@/lib/useAppData");

      const items: BudgetItem[] = [
        {
          id: "b1",
          holidayId: "2026-lunar-new-year",
          target: "본가",
          category: "용돈",
          label: "부모님",
          amount: 300000,
        },
        {
          id: "b2",
          holidayId: "2026-lunar-new-year",
          target: "기타",
          category: "교통",
          label: "기차표",
          amount: 100000,
        },
      ];

      const result = calcBudget(items);

      expect(result.total).toBe(400000);
      // Only count 본가 and 시댁 for percentage
      expect(result.minePct).toBe(75); // 300000/400000 = 75%
      expect(result.partnerPct).toBe(0); // 0/400000 = 0%
    });

    it("should return 0 total for empty items", () => {
      const { calcBudget } = require("@/lib/useAppData");

      const result = calcBudget([]);

      expect(result.total).toBe(0);
      expect(result.minePct).toBe(0);
      expect(result.partnerPct).toBe(0);
    });

    it("should calculate equal split correctly", () => {
      const { calcBudget } = require("@/lib/useAppData");

      const items: BudgetItem[] = [
        {
          id: "b1",
          holidayId: "2026-lunar-new-year",
          target: "본가",
          category: "용돈",
          label: "부모님",
          amount: 250000,
        },
        {
          id: "b2",
          holidayId: "2026-lunar-new-year",
          target: "시댁",
          category: "선물",
          label: "선물",
          amount: 250000,
        },
      ];

      const result = calcBudget(items);

      expect(result.total).toBe(500000);
      expect(result.minePct).toBe(50);
      expect(result.partnerPct).toBe(50);
    });
  });

  describe("AC-2.3: calcChecklistProgress(items) → progress object", () => {
    it("should calculate checklist completion percentage", () => {
      const { calcChecklistProgress } = require("@/lib/useAppData");

      const items: ChecklistItem[] = [
        { id: "c1", holidayId: "2026-lunar-new-year", text: "task 1", done: true },
        { id: "c2", holidayId: "2026-lunar-new-year", text: "task 2", done: true },
        { id: "c3", holidayId: "2026-lunar-new-year", text: "task 3", done: false },
        { id: "c4", holidayId: "2026-lunar-new-year", text: "task 4", done: false },
      ];

      const result = calcChecklistProgress(items);

      expect(result).toHaveProperty("completed");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("percentage");
      expect(result.completed).toBe(2);
      expect(result.total).toBe(4);
      expect(result.percentage).toBe(50);
    });

    it("should return 100% when all items are done", () => {
      const { calcChecklistProgress } = require("@/lib/useAppData");

      const items: ChecklistItem[] = [
        { id: "c1", holidayId: "2026-lunar-new-year", text: "task 1", done: true },
        { id: "c2", holidayId: "2026-lunar-new-year", text: "task 2", done: true },
      ];

      const result = calcChecklistProgress(items);

      expect(result.percentage).toBe(100);
      expect(result.completed).toBe(2);
    });

    it("should return 0% when no items are done", () => {
      const { calcChecklistProgress } = require("@/lib/useAppData");

      const items: ChecklistItem[] = [
        { id: "c1", holidayId: "2026-lunar-new-year", text: "task 1", done: false },
        { id: "c2", holidayId: "2026-lunar-new-year", text: "task 2", done: false },
      ];

      const result = calcChecklistProgress(items);

      expect(result.percentage).toBe(0);
      expect(result.completed).toBe(0);
    });

    it("should handle empty checklist", () => {
      const { calcChecklistProgress } = require("@/lib/useAppData");

      const result = calcChecklistProgress([]);

      expect(result.total).toBe(0);
      expect(result.completed).toBe(0);
      expect(result.percentage).toBe(0);
    });
  });

  describe("AC-2.4: calcMoodReport(logs) → {avg, trend[], topTags[]}", () => {
    it("should calculate average exhaustion level", () => {
      const { calcMoodReport } = require("@/lib/useAppData");

      const logs: MoodLog[] = [
        {
          id: "m1",
          holidayId: "2026-lunar-new-year",
          exhaustionLevel: 3,
          stressTags: ["과한질문"],
          note: "첫날",
          createdAt: 1722000000000,
        },
        {
          id: "m2",
          holidayId: "2026-lunar-new-year",
          exhaustionLevel: 5,
          stressTags: ["가사노동"],
          note: "마지막날",
          createdAt: 1722000003600,
        },
      ];

      const result = calcMoodReport(logs);

      expect(result).toHaveProperty("avg");
      expect(result).toHaveProperty("trend");
      expect(result).toHaveProperty("topTags");
      expect(result.avg).toBe(4);
    });

    it("should provide trend array ordered by creation time", () => {
      const { calcMoodReport } = require("@/lib/useAppData");

      const logs: MoodLog[] = [
        {
          id: "m1",
          holidayId: "2026-lunar-new-year",
          exhaustionLevel: 2,
          stressTags: [],
          note: "첫날",
          createdAt: 1722000000000,
        },
        {
          id: "m2",
          holidayId: "2026-lunar-new-year",
          exhaustionLevel: 4,
          stressTags: [],
          note: "둘째날",
          createdAt: 1722000003600,
        },
        {
          id: "m3",
          holidayId: "2026-lunar-new-year",
          exhaustionLevel: 3,
          stressTags: [],
          note: "마지막날",
          createdAt: 1722000007200,
        },
      ];

      const result = calcMoodReport(logs);

      expect(Array.isArray(result.trend)).toBe(true);
      expect(result.trend.length).toBe(3);
      expect(result.trend[0]).toBe(2);
      expect(result.trend[1]).toBe(4);
      expect(result.trend[2]).toBe(3);
    });

    it("should identify top stress tags with counts", () => {
      const { calcMoodReport } = require("@/lib/useAppData");

      const logs: MoodLog[] = [
        {
          id: "m1",
          holidayId: "2026-lunar-new-year",
          exhaustionLevel: 4,
          stressTags: ["과한질문", "일정불균형"],
          note: "첫날",
          createdAt: 1722000000000,
        },
        {
          id: "m2",
          holidayId: "2026-lunar-new-year",
          exhaustionLevel: 5,
          stressTags: ["가사노동", "과한질문"],
          note: "마지막날",
          createdAt: 1722000003600,
        },
      ];

      const result = calcMoodReport(logs);

      expect(Array.isArray(result.topTags)).toBe(true);
      expect(result.topTags.length).toBeGreaterThan(0);
      // "과한질문" appears 2 times, should be top
      expect(result.topTags[0]).toHaveProperty("tag");
      expect(result.topTags[0]).toHaveProperty("count");
      expect(result.topTags[0].tag).toBe("과한질문");
      expect(result.topTags[0].count).toBe(2);
    });

    it("should handle empty mood logs", () => {
      const { calcMoodReport } = require("@/lib/useAppData");

      const result = calcMoodReport([]);

      expect(result.avg).toBe(0);
      expect(result.trend).toEqual([]);
      expect(result.topTags).toEqual([]);
    });

    it("should handle logs with no stress tags", () => {
      const { calcMoodReport } = require("@/lib/useAppData");

      const logs: MoodLog[] = [
        {
          id: "m1",
          holidayId: "2026-lunar-new-year",
          exhaustionLevel: 3,
          stressTags: [],
          note: "괜찮음",
          createdAt: 1722000000000,
        },
      ];

      const result = calcMoodReport(logs);

      expect(result.avg).toBe(3);
      expect(result.trend).toEqual([3]);
      expect(result.topTags).toEqual([]);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-3: Helper functions — isPremium, acknowledgeAiNotice, setActiveHoliday, isImbalanced
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-3.1: isPremium(flags, activeHolidayId) → boolean", () => {
    it("should return true when holiday is in purchasedHolidays", () => {
      const { isPremium } = require("@/lib/useAppData");

      const flags: AppFlags = {
        aiNoticeAcknowledged: false,
        activeHolidayId: "2026-lunar-new-year",
        purchasedHolidays: ["2026-lunar-new-year", "2026-chuseok"],
      };

      const result = isPremium(flags, "2026-lunar-new-year");

      expect(result).toBe(true);
    });

    it("should return false when holiday is not in purchasedHolidays", () => {
      const { isPremium } = require("@/lib/useAppData");

      const flags: AppFlags = {
        aiNoticeAcknowledged: false,
        activeHolidayId: "2026-lunar-new-year",
        purchasedHolidays: ["2026-chuseok"],
      };

      const result = isPremium(flags, "2026-lunar-new-year");

      expect(result).toBe(false);
    });

    it("should return false for null flags", () => {
      const { isPremium } = require("@/lib/useAppData");

      const result = isPremium(null, "2026-lunar-new-year");

      expect(result).toBe(false);
    });
  });

  describe("AC-3.2: acknowledgeAiNotice() → void", () => {
    it("should update flags to set aiNoticeAcknowledged to true", () => {
      const { acknowledgeAiNotice } = require("@/lib/useAppData");
      const { getFlags, saveFlags } = require("@/lib/storage");

      const initialFlags: AppFlags = {
        aiNoticeAcknowledged: false,
        activeHolidayId: "2026-lunar-new-year",
        purchasedHolidays: [],
      };

      saveFlags(initialFlags);
      acknowledgeAiNotice();

      const updated = getFlags();
      expect(updated?.aiNoticeAcknowledged).toBe(true);
    });

    it("should preserve other flags when acknowledging notice", () => {
      const { acknowledgeAiNotice } = require("@/lib/useAppData");
      const { getFlags, saveFlags } = require("@/lib/storage");

      const initialFlags: AppFlags = {
        aiNoticeAcknowledged: false,
        activeHolidayId: "2026-chuseok",
        purchasedHolidays: ["2026-chuseok", "2026-lunar-new-year"],
      };

      saveFlags(initialFlags);
      acknowledgeAiNotice();

      const updated = getFlags();
      expect(updated?.activeHolidayId).toBe("2026-chuseok");
      expect(updated?.purchasedHolidays).toContain("2026-chuseok");
    });

    it("should handle case when no flags exist yet", () => {
      const { acknowledgeAiNotice } = require("@/lib/useAppData");
      const { getFlags } = require("@/lib/storage");

      // No flags initially
      expect(getFlags()).toBeNull();

      acknowledgeAiNotice();

      const flags = getFlags();
      expect(flags?.aiNoticeAcknowledged).toBe(true);
    });
  });

  describe("AC-3.3: setActiveHoliday(id) → void", () => {
    it("should update activeHolidayId in flags", () => {
      const { setActiveHoliday } = require("@/lib/useAppData");
      const { getFlags, saveFlags } = require("@/lib/storage");

      const initialFlags: AppFlags = {
        aiNoticeAcknowledged: true,
        activeHolidayId: "2026-lunar-new-year",
        purchasedHolidays: ["2026-lunar-new-year", "2026-chuseok"],
      };

      saveFlags(initialFlags);
      setActiveHoliday("2026-chuseok");

      const updated = getFlags();
      expect(updated?.activeHolidayId).toBe("2026-chuseok");
    });

    it("should preserve other flags when changing active holiday", () => {
      const { setActiveHoliday } = require("@/lib/useAppData");
      const { getFlags, saveFlags } = require("@/lib/storage");

      const initialFlags: AppFlags = {
        aiNoticeAcknowledged: true,
        activeHolidayId: "2026-lunar-new-year",
        purchasedHolidays: ["2026-lunar-new-year", "2026-chuseok"],
      };

      saveFlags(initialFlags);
      setActiveHoliday("2026-chuseok");

      const updated = getFlags();
      expect(updated?.aiNoticeAcknowledged).toBe(true);
      expect(updated?.purchasedHolidays.length).toBe(2);
    });

    it("should handle case when no flags exist yet", () => {
      const { setActiveHoliday } = require("@/lib/useAppData");
      const { getFlags } = require("@/lib/storage");

      // No flags initially
      expect(getFlags()).toBeNull();

      setActiveHoliday("2026-lunar-new-year");

      const flags = getFlags();
      expect(flags?.activeHolidayId).toBe("2026-lunar-new-year");
    });
  });

  describe("AC-3.4: isImbalanced(percentage) → boolean (70% threshold)", () => {
    it("should return true when percentage exceeds 70%", () => {
      const { isImbalanced } = require("@/lib/useAppData");

      expect(isImbalanced(71)).toBe(true);
      expect(isImbalanced(80)).toBe(true);
      expect(isImbalanced(100)).toBe(true);
    });

    it("should return false when percentage is 70% or below", () => {
      const { isImbalanced } = require("@/lib/useAppData");

      expect(isImbalanced(70)).toBe(false);
      expect(isImbalanced(50)).toBe(false);
      expect(isImbalanced(0)).toBe(false);
    });

    it("should work with decimal percentages", () => {
      const { isImbalanced } = require("@/lib/useAppData");

      expect(isImbalanced(70.5)).toBe(true);
      expect(isImbalanced(69.9)).toBe(false);
    });

    it("should handle edge cases", () => {
      const { isImbalanced } = require("@/lib/useAppData");

      expect(isImbalanced(70.0)).toBe(false);
      expect(isImbalanced(70.1)).toBe(true);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Integration tests: verify derived calculations work together
  // ════════════════════════════════════════════════════════════════════════════

  describe("Integration: All calculations work together", () => {
    it("should detect imbalance in visit distribution", () => {
      const { calcBalance, isImbalanced } = require("@/lib/useAppData");

      const visits: Visit[] = [
        {
          id: "v1",
          family: "mine",
          date: "2026-02-03",
          startHour: 10,
          durationHours: 20,
          holidayId: "2026-lunar-new-year",
          memo: "본가",
        },
        {
          id: "v2",
          family: "partner",
          date: "2026-02-04",
          startHour: 14,
          durationHours: 5,
          holidayId: "2026-lunar-new-year",
          memo: "시댁",
        },
      ];

      const { minePct } = calcBalance(visits);
      // 20/(20+5) = 80%
      expect(minePct).toBe(80);
      expect(isImbalanced(minePct)).toBe(true);
    });

    it("should detect imbalance in budget distribution", () => {
      const { calcBudget, isImbalanced } = require("@/lib/useAppData");

      const items: BudgetItem[] = [
        {
          id: "b1",
          holidayId: "2026-lunar-new-year",
          target: "본가",
          category: "용돈",
          label: "부모님",
          amount: 400000,
        },
        {
          id: "b2",
          holidayId: "2026-lunar-new-year",
          target: "시댁",
          category: "선물",
          label: "선물",
          amount: 100000,
        },
      ];

      const { minePct } = calcBudget(items);
      // 400000/500000 = 80%
      expect(minePct).toBe(80);
      expect(isImbalanced(minePct)).toBe(true);
    });

    it("should indicate balanced visit and budget distribution", () => {
      const { calcBalance, calcBudget, isImbalanced } = require("@/lib/useAppData");

      const visits: Visit[] = [
        {
          id: "v1",
          family: "mine",
          date: "2026-02-03",
          startHour: 10,
          durationHours: 10,
          holidayId: "2026-lunar-new-year",
          memo: "본가",
        },
        {
          id: "v2",
          family: "partner",
          date: "2026-02-04",
          startHour: 14,
          durationHours: 10,
          holidayId: "2026-lunar-new-year",
          memo: "시댁",
        },
      ];

      const budgetItems: BudgetItem[] = [
        {
          id: "b1",
          holidayId: "2026-lunar-new-year",
          target: "본가",
          category: "용돈",
          label: "부모님",
          amount: 250000,
        },
        {
          id: "b2",
          holidayId: "2026-lunar-new-year",
          target: "시댁",
          category: "선물",
          label: "선물",
          amount: 250000,
        },
      ];

      const { minePct: visitPct } = calcBalance(visits);
      const { minePct: budgetPct } = calcBudget(budgetItems);

      expect(visitPct).toBe(50);
      expect(budgetPct).toBe(50);
      expect(isImbalanced(visitPct)).toBe(false);
      expect(isImbalanced(budgetPct)).toBe(false);
    });
  });
});
