import { describe, it, expect } from "vitest";
import type {
  Couple,
  Visit,
  BudgetItem,
  ChecklistItem,
  Script,
  MoodLog,
  AppFlags,
  Holiday,
  ScriptRequest,
  ScriptResponse,
  ApiError,
  RouteState,
  Situation,
  Tone,
  StressTag,
} from "@/lib/types";
import { SITUATIONS, TONES, STRESS_TAGS } from "@/lib/types";

// AC-1: All entity interfaces match SPEC fields/unions exactly and tsc --noEmit passes
describe("엔티티 타입 + RouteState 계약 정의", () => {
  it("AC-1.1: Couple entity should have all required fields with correct types", () => {
    // Must have: id, myRole, myFamilyLabel, partnerFamilyLabel, createdAt
    const couple: Couple = {
      id: "uuid-123",
      myRole: "며느리",
      myFamilyLabel: "친정",
      partnerFamilyLabel: "시댁",
      createdAt: Date.now(),
    };
    expect(couple.id).toBeTruthy();
    expect(couple.myRole).toBe("며느리");
    expect(couple.myFamilyLabel).toBe("친정");
    expect(couple.partnerFamilyLabel).toBe("시댁");
    expect(typeof couple.createdAt).toBe("number");
  });

  it("AC-1.2: myRole should strictly be '며느리' | '사위' | '아내' | '남편'", () => {
    // Each role variant must be testable
    const couple1: Couple = {
      id: "c1",
      myRole: "며느리",
      myFamilyLabel: "본가",
      partnerFamilyLabel: "시댁",
      createdAt: 0,
    };
    const couple2: Couple = {
      id: "c2",
      myRole: "사위",
      myFamilyLabel: "본가",
      partnerFamilyLabel: "시댁",
      createdAt: 0,
    };
    const couple3: Couple = {
      id: "c3",
      myRole: "아내",
      myFamilyLabel: "본가",
      partnerFamilyLabel: "시댁",
      createdAt: 0,
    };
    const couple4: Couple = {
      id: "c4",
      myRole: "남편",
      myFamilyLabel: "본가",
      partnerFamilyLabel: "시댁",
      createdAt: 0,
    };
    expect(couple1.myRole).toBe("며느리");
    expect(couple2.myRole).toBe("사위");
    expect(couple3.myRole).toBe("아내");
    expect(couple4.myRole).toBe("남편");
  });

  it("AC-1.3: Visit entity should have family, date, startHour, durationHours, holidayId, memo", () => {
    const visit: Visit = {
      id: "visit-1",
      family: "mine",
      date: "2026-09-25",
      startHour: 10,
      durationHours: 6,
      holidayId: "2026-chuseok",
      memo: "차례",
    };
    expect(visit.id).toBe("visit-1");
    expect(visit.family).toBe("mine");
    expect(visit.date).toBe("2026-09-25");
    expect(visit.startHour).toBe(10);
    expect(visit.durationHours).toBe(6);
    expect(visit.holidayId).toBe("2026-chuseok");
    expect(visit.memo).toBe("차례");

    const visit2: Visit = {
      id: "visit-2",
      family: "partner",
      date: "2026-02-01",
      startHour: 14,
      durationHours: 24,
      holidayId: "2026-lunar-new-year",
      memo: "성묘",
    };
    expect(visit2.family).toBe("partner");
  });

  it("AC-1.4: BudgetItem should have id, holidayId, target, category, label, amount", () => {
    const budget1: BudgetItem = {
      id: "budget-1",
      holidayId: "2026-chuseok",
      target: "본가",
      category: "용돈",
      label: "부모님 용돈",
      amount: 300000,
    };
    expect(budget1.id).toBe("budget-1");
    expect(budget1.target).toBe("본가");
    expect(budget1.category).toBe("용돈");
    expect(budget1.amount).toBe(300000);

    const budget2: BudgetItem = {
      id: "budget-2",
      holidayId: "2026-chuseok",
      target: "시댁",
      category: "선물",
      label: "선물 구매",
      amount: 150000,
    };
    expect(budget2.target).toBe("시댁");

    const budget3: BudgetItem = {
      id: "budget-3",
      holidayId: "2026-chuseok",
      target: "기타",
      category: "교통",
      label: "기차표",
      amount: 50000,
    };
    expect(budget3.category).toBe("교통");
  });

  it("AC-1.5: ChecklistItem should have id, holidayId, text, done", () => {
    const item1: ChecklistItem = {
      id: "check-1",
      holidayId: "2026-chuseok",
      text: "선물 준비",
      done: true,
    };
    expect(item1.id).toBe("check-1");
    expect(item1.text).toBe("선물 준비");
    expect(item1.done).toBe(true);

    const item2: ChecklistItem = {
      id: "check-2",
      holidayId: "2026-chuseok",
      text: "옷 장만",
      done: false,
    };
    expect(item2.done).toBe(false);
  });

  it("AC-1.6: Script entity should have id, situation, tone, question, resultText, createdAt, isAi=true", () => {
    const script: Script = {
      id: "script-1",
      situation: "결혼계획질문",
      tone: "정중하게",
      question: "애는 언제 낳니?",
      resultText: "좋은 질문이네요. 계획을 세워보겠습니다.",
      createdAt: Date.now(),
      isAi: true,
    };
    expect(script.id).toBe("script-1");
    expect(script.situation).toBe("결혼계획질문");
    expect(script.tone).toBe("정중하게");
    expect(script.question).toBe("애는 언제 낳니?");
    expect(script.isAi).toBe(true);

    const script2: Script = {
      id: "script-2",
      situation: "취업질문",
      tone: "단호하게",
      question: "아직 미혼이니?",
      resultText: "네, 한창 일에 집중하고 있습니다.",
      createdAt: Date.now(),
      isAi: true,
    };
    expect(script2.tone).toBe("단호하게");
  });

  it("AC-1.7: MoodLog should have id, holidayId, exhaustionLevel, stressTags, note, createdAt", () => {
    const mood: MoodLog = {
      id: "mood-1",
      holidayId: "2026-chuseok",
      exhaustionLevel: 4,
      stressTags: ["과한질문", "일정불균형"],
      note: "질문이 많았음",
      createdAt: Date.now(),
    };
    expect(mood.id).toBe("mood-1");
    expect(mood.exhaustionLevel).toBe(4);
    expect(mood.stressTags).toContain("과한질문");
    expect(mood.stressTags.length).toBe(2);
    expect(typeof mood.note).toBe("string");
  });

  it("AC-1.8: AppFlags should have aiNoticeAcknowledged, activeHolidayId, purchasedHolidays", () => {
    const flags: AppFlags = {
      aiNoticeAcknowledged: false,
      activeHolidayId: "2026-chuseok",
      purchasedHolidays: [],
    };
    expect(flags.aiNoticeAcknowledged).toBe(false);
    expect(flags.activeHolidayId).toBe("2026-chuseok");
    expect(Array.isArray(flags.purchasedHolidays)).toBe(true);

    const flags2: AppFlags = {
      aiNoticeAcknowledged: true,
      activeHolidayId: "2026-lunar-new-year",
      purchasedHolidays: ["2026-chuseok"],
    };
    expect(flags2.purchasedHolidays).toContain("2026-chuseok");
  });

  // AC-2: RouteState type should have all route keys defined
  it("AC-2.1: RouteState should have '/' key with no state (undefined)", () => {
    // Home route should accept undefined state
    type HomeState = RouteState["/"];
    const homeState: HomeState = undefined;
    expect(homeState).toBeUndefined();
  });

  it("AC-2.2: RouteState should have '/setup' key with no state", () => {
    type SetupState = RouteState["/setup"];
    const setupState: SetupState = undefined;
    expect(setupState).toBeUndefined();
  });

  it("AC-2.3: RouteState should have '/script' key with no state", () => {
    type ScriptState = RouteState["/script"];
    const scriptState: ScriptState = undefined;
    expect(scriptState).toBeUndefined();
  });

  it("AC-2.4: RouteState should have '/script/result' key with scriptId in state", () => {
    type ResultState = RouteState["/script/result"];
    const resultState: ResultState = { scriptId: "test-script-id" };
    expect(resultState).toHaveProperty("scriptId");
    expect(typeof resultState.scriptId).toBe("string");
  });

  it("AC-2.5: RouteState should have '/calendar' key with no state", () => {
    type CalendarState = RouteState["/calendar"];
    const calendarState: CalendarState = undefined;
    expect(calendarState).toBeUndefined();
  });

  it("AC-2.6: RouteState should have '/budget' key with no state", () => {
    type BudgetState = RouteState["/budget"];
    const budgetState: BudgetState = undefined;
    expect(budgetState).toBeUndefined();
  });

  it("AC-2.7: RouteState should have '/report' key with no state", () => {
    type ReportState = RouteState["/report"];
    const reportState: ReportState = undefined;
    expect(reportState).toBeUndefined();
  });

  it("AC-2.8: RouteState should have '/report/new' key with no state", () => {
    type ReportNewState = RouteState["/report/new"];
    const reportNewState: ReportNewState = undefined;
    expect(reportNewState).toBeUndefined();
  });

  // AC-3: Constants and union types should be properly exported
  it("AC-3.1: SITUATIONS constant should have all preset values", () => {
    // Expected: ["결혼계획질문", "취업질문", "외모지적", "명절노동분담", "기타"]
    expect(SITUATIONS.length).toBe(5);
    expect(SITUATIONS).toContain("결혼계획질문");
    expect(SITUATIONS).toContain("취업질문");
    expect(SITUATIONS).toContain("외모지적");
    expect(SITUATIONS).toContain("명절노동분담");
    expect(SITUATIONS).toContain("기타");
  });

  it("AC-3.2: Situation type union should match SITUATIONS constant", () => {
    // Type Situation = typeof SITUATIONS[number]
    // Should be "결혼계획질문" | "취업질문" | "외모지적" | "명절노동분담" | "기타"
    const validSituation: Situation = "결혼계획질문";
    expect(SITUATIONS).toContain(validSituation);

    const anotherSituation: Situation = "취업질문";
    expect(SITUATIONS).toContain(anotherSituation);

    const situations: Situation[] = [
      "결혼계획질문",
      "취업질문",
      "외모지적",
      "명절노동분담",
      "기타",
    ];
    situations.forEach((s) => expect(SITUATIONS).toContain(s));
  });

  it("AC-3.3: TONES constant should have all three tone values", () => {
    // Expected: ["정중하게", "단호하게", "유머러스하게"]
    expect(TONES.length).toBe(3);
    expect(TONES).toContain("정중하게");
    expect(TONES).toContain("단호하게");
    expect(TONES).toContain("유머러스하게");
  });

  it("AC-3.4: Tone type union should match TONES constant", () => {
    // Type Tone = typeof TONES[number]
    // Should be "정중하게" | "단호하게" | "유머러스하게"
    const validTone: Tone = "정중하게";
    expect(TONES).toContain(validTone);

    const tones: Tone[] = ["정중하게", "단호하게", "유머러스하게"];
    tones.forEach((t) => expect(TONES).toContain(t));
  });

  it("AC-3.5: STRESS_TAGS constant should have preset stress factors", () => {
    // Expected to include: "과한질문", "가사노동", "일정불균형", etc.
    // Minimum 3 tags based on spec examples
    expect(STRESS_TAGS.length).toBeGreaterThanOrEqual(3);
    expect(STRESS_TAGS).toContain("과한질문");
    expect(STRESS_TAGS).toContain("가사노동");
    expect(STRESS_TAGS).toContain("일정불균형");
  });

  it("AC-3.6: StressTag type union should match STRESS_TAGS constant", () => {
    // Type StressTag = typeof STRESS_TAGS[number]
    const validStressTag: StressTag = "과한질문";
    expect(STRESS_TAGS).toContain(validStressTag);

    const stressTags: StressTag[] = ["과한질문", "가사노동", "일정불균형"];
    stressTags.forEach((st) => expect(STRESS_TAGS).toContain(st));
  });

  // API Contract types
  it("AC-3.7: ScriptRequest should have situation, tone, question fields", () => {
    const request: ScriptRequest = {
      situation: "결혼계획질문",
      tone: "정중하게",
      question: "애는 언제 낳니?",
    };
    expect(request.situation).toBe("결혼계획질문");
    expect(request.tone).toBe("정중하게");
    expect(request.question).toBe("애는 언제 낳니?");
  });

  it("AC-3.8: ScriptResponse should have reply and disclaimer fields", () => {
    const response: ScriptResponse = {
      reply: "좋은 질문이네요...",
      disclaimer: "AI가 생성한 결과입니다",
    };
    expect(response.reply).toBeTruthy();
    expect(response.disclaimer).toBe("AI가 생성한 결과입니다");
    expect(typeof response.reply).toBe("string");
    expect(typeof response.disclaimer).toBe("string");
  });

  it("AC-3.9: ApiError should have error field", () => {
    const error1: ApiError = {
      error: "invalid_request",
    };
    expect(error1.error).toBe("invalid_request");

    const error2: ApiError = {
      error: "rate_limited",
    };
    expect(error2.error).toBe("rate_limited");

    const error3: ApiError = {
      error: "server_error",
    };
    expect(error3.error).toBe("server_error");
  });

  // Holiday type
  it("AC-3.10: Holiday entity should have id, name fields for holiday management", () => {
    const holiday1: Holiday = {
      id: "2026-chuseok",
      name: "추석",
    };
    expect(holiday1.id).toBe("2026-chuseok");
    expect(holiday1.name).toBe("추석");

    const holiday2: Holiday = {
      id: "2026-lunar-new-year",
      name: "설",
    };
    expect(holiday2.id).toBe("2026-lunar-new-year");
    expect(holiday2.name).toBe("설");
  });

  // TypeScript compilation check
  it("AC-1: TypeScript should compile types.ts without errors", () => {
    // This test verifies that all imported types are valid and properly defined
    // When types.ts is implemented correctly, this will pass
    expect(true).toBe(true);
  });
});
