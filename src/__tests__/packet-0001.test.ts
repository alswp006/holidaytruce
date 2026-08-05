import { describe, it, expect } from "vitest";
import {
  RELATIONS,
  TONES,
  SEASONS,
  CAUSES,
  STORAGE_KEYS,
} from "@/lib/types";
import type {
  Relation,
  ToneKey,
  Season,
  Cause,
  AppMeta,
  ScriptRequest,
  ScriptResult,
  VisitPlan,
  BudgetItem,
  BudgetPlan,
  BurnoutLog,
  ScriptApiRequest,
  ScriptApiResponse,
  ApiError,
  RouteState,
} from "@/lib/types";

describe("엔티티 타입·참조 카탈로그·RouteState 정의", () => {
  // AC-1: tsc --noEmit 통과, 런타임 코드 0줄(상수+타입만)
  it("AC-1: RELATIONS가 as const로 정의되어 있다", () => {
    const relations: typeof RELATIONS = ["시댁", "처가"];
    expect(relations).toHaveLength(2);
    expect(relations[0]).toBe("시댁");
    expect(relations[1]).toBe("처가");
  });

  it("AC-1: TONES가 as const로 정의되어 있다", () => {
    const tones: typeof TONES = ["정중", "단호", "유머"];
    expect(tones).toHaveLength(3);
    expect(tones[0]).toBe("정중");
    expect(tones[1]).toBe("단호");
    expect(tones[2]).toBe("유머");
  });

  it("AC-1: SEASONS가 as const로 정의되어 있다", () => {
    const seasons: typeof SEASONS = [
      "2026-설",
      "2026-추석",
      "2027-설",
      "2027-추석",
    ];
    expect(seasons).toHaveLength(4);
    expect(seasons[0]).toBe("2026-설");
    expect(seasons[3]).toBe("2027-추석");
  });

  it("AC-1: CAUSES가 as const로 8개 정의되어 있다", () => {
    const causes: typeof CAUSES = [
      "과도한 질문",
      "가사 부담",
      "장거리 이동",
      "비교·잔소리",
      "경제적 부담",
      "음식 준비",
      "형제·친척 갈등",
      "휴식 부족",
    ];
    expect(causes).toHaveLength(8);
    expect(causes).toContain("과도한 질문");
    expect(causes).toContain("휴식 부족");
  });

  // AC-2: RELATIONS/TONES/SEASONS/CAUSES가 as const로 리터럴 유니온 타입 추출
  it("AC-2: Relation 타입이 리터럴 유니온으로 추출된다", () => {
    const relation: Relation = "시댁";
    expect(relation).toBe("시댁");
    const relation2: Relation = "처가";
    expect(relation2).toBe("처가");
  });

  it("AC-2: ToneKey 타입이 리터럴 유니온으로 추출된다", () => {
    const tone: ToneKey = "정중";
    expect(tone).toBe("정중");
    const tone2: ToneKey = "단호";
    expect(tone2).toBe("단호");
    const tone3: ToneKey = "유머";
    expect(tone3).toBe("유머");
  });

  it("AC-2: Season 타입이 리터럴 유니온으로 추출된다", () => {
    const season: Season = "2026-설";
    expect(season).toBe("2026-설");
    const season2: Season = "2027-추석";
    expect(season2).toBe("2027-추석");
  });

  it("AC-2: Cause 타입이 리터럴 유니온으로 추출된다", () => {
    const cause: Cause = "과도한 질문";
    expect(cause).toBe("과도한 질문");
    const cause2: Cause = "휴식 부족";
    expect(cause2).toBe("휴식 부족");
  });

  // AC-3: RouteState["/script/result"]가 {resultId:string}|undefined 타입
  it("AC-3: RouteState['/script/result']은 {resultId: string} | undefined이다", () => {
    const resultState: RouteState["/script/result"] = {
      resultId: "test-result-123",
    };
    expect(resultState).toEqual({ resultId: "test-result-123" });
    expect(resultState.resultId).toBe("test-result-123");
  });

  it("AC-3: RouteState['/script/result']은 undefined를 허용한다", () => {
    const resultState: RouteState["/script/result"] = undefined;
    expect(resultState).toBeUndefined();
  });

  it("AC-3: RouteState['/'] 는 undefined이다", () => {
    const homeState: RouteState["/"] = undefined;
    expect(homeState).toBeUndefined();
  });

  it("AC-3: RouteState['/script']는 undefined이다", () => {
    const scriptState: RouteState["/script"] = undefined;
    expect(scriptState).toBeUndefined();
  });

  it("AC-3: RouteState['/calendar']는 undefined이다", () => {
    const calendarState: RouteState["/calendar"] = undefined;
    expect(calendarState).toBeUndefined();
  });

  it("AC-3: RouteState['/budget']는 undefined이다", () => {
    const budgetState: RouteState["/budget"] = undefined;
    expect(budgetState).toBeUndefined();
  });

  it("AC-3: RouteState['/report']는 undefined이다", () => {
    const reportState: RouteState["/report"] = undefined;
    expect(reportState).toBeUndefined();
  });

  it("AC-3: RouteState['/premium']는 undefined이다", () => {
    const premiumState: RouteState["/premium"] = undefined;
    expect(premiumState).toBeUndefined();
  });

  // AC-4: STORAGE_KEYS에 meta/scripts/visits/budget/burnout 5개 holidaytruce:* 키 포함
  it("AC-4: STORAGE_KEYS가 5개 키를 가진다", () => {
    expect(Object.keys(STORAGE_KEYS)).toHaveLength(5);
  });

  it("AC-4: STORAGE_KEYS.meta가 'holidaytruce:meta'이다", () => {
    expect(STORAGE_KEYS.meta).toBe("holidaytruce:meta");
  });

  it("AC-4: STORAGE_KEYS.scripts가 'holidaytruce:scripts'이다", () => {
    expect(STORAGE_KEYS.scripts).toBe("holidaytruce:scripts");
  });

  it("AC-4: STORAGE_KEYS.visits가 'holidaytruce:visits'이다", () => {
    expect(STORAGE_KEYS.visits).toBe("holidaytruce:visits");
  });

  it("AC-4: STORAGE_KEYS.budget이 'holidaytruce:budget'이다", () => {
    expect(STORAGE_KEYS.budget).toBe("holidaytruce:budget");
  });

  it("AC-4: STORAGE_KEYS.burnout이 'holidaytruce:burnout'이다", () => {
    expect(STORAGE_KEYS.burnout).toBe("holidaytruce:burnout");
  });

  // Data Model Interfaces — AppMeta
  it("AppMeta 인터페이스: aiNoticeAck boolean", () => {
    const meta: AppMeta = {
      aiNoticeAck: false,
      premiumUnlocked: false,
      premiumSeason: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(typeof meta.aiNoticeAck).toBe("boolean");
    expect(meta.aiNoticeAck).toBe(false);
  });

  it("AppMeta 인터페이스: premiumUnlocked boolean", () => {
    const meta: AppMeta = {
      aiNoticeAck: false,
      premiumUnlocked: true,
      premiumSeason: "2026-설",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(typeof meta.premiumUnlocked).toBe("boolean");
    expect(meta.premiumUnlocked).toBe(true);
  });

  it("AppMeta 인터페이스: premiumSeason Season | null", () => {
    const meta1: AppMeta = {
      aiNoticeAck: false,
      premiumUnlocked: false,
      premiumSeason: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(meta1.premiumSeason).toBeNull();

    const meta2: AppMeta = {
      aiNoticeAck: false,
      premiumUnlocked: true,
      premiumSeason: "2026-추석",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(meta2.premiumSeason).toBe("2026-추석");
  });

  it("AppMeta 인터페이스: createdAt/updatedAt number", () => {
    const now = Date.now();
    const meta: AppMeta = {
      aiNoticeAck: false,
      premiumUnlocked: false,
      premiumSeason: null,
      createdAt: now,
      updatedAt: now,
    };
    expect(typeof meta.createdAt).toBe("number");
    expect(typeof meta.updatedAt).toBe("number");
    expect(meta.createdAt).toBe(now);
    expect(meta.updatedAt).toBe(now);
  });

  // ScriptRequest / ScriptResult
  it("ScriptRequest 인터페이스: relation Relation", () => {
    const request: ScriptRequest = {
      relation: "시댁",
      situation: "아이 언제 낳냐는 질문",
      tone: "정중",
    };
    expect(request.relation).toBe("시댁");
  });

  it("ScriptRequest 인터페이스: situation string (max 200)", () => {
    const request: ScriptRequest = {
      relation: "처가",
      situation: "x".repeat(200),
      tone: "유머",
    };
    expect(request.situation).toHaveLength(200);
  });

  it("ScriptRequest 인터페이스: tone ToneKey", () => {
    const request: ScriptRequest = {
      relation: "시댁",
      situation: "test",
      tone: "단호",
    };
    expect(request.tone).toBe("단호");
  });

  it("ScriptResult 인터페이스: id string", () => {
    const result: ScriptResult = {
      id: "result-123",
      request: {
        relation: "시댁",
        situation: "test",
        tone: "정중",
      },
      scripts: ["문장1", "문장2", "문장3"],
      aiGenerated: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(typeof result.id).toBe("string");
    expect(result.id).toBe("result-123");
  });

  it("ScriptResult 인터페이스: scripts string[]", () => {
    const result: ScriptResult = {
      id: "result-123",
      request: {
        relation: "처가",
        situation: "test",
        tone: "유머",
      },
      scripts: ["스크립트1", "스크립트2", "스크립트3"],
      aiGenerated: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(Array.isArray(result.scripts)).toBe(true);
    expect(result.scripts).toHaveLength(3);
    expect(result.scripts[0]).toBe("스크립트1");
  });

  it("ScriptResult 인터페이스: aiGenerated true", () => {
    const result: ScriptResult = {
      id: "result-123",
      request: {
        relation: "시댁",
        situation: "test",
        tone: "정중",
      },
      scripts: ["문장1", "문장2", "문장3"],
      aiGenerated: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(result.aiGenerated).toBe(true);
  });

  // VisitPlan
  it("VisitPlan 인터페이스: id, relation, date, hours, memo, createdAt, updatedAt", () => {
    const plan: VisitPlan = {
      id: "visit-123",
      relation: "처가",
      date: "2026-09-25",
      hours: 6,
      memo: "차례",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(plan.id).toBe("visit-123");
    expect(plan.relation).toBe("처가");
    expect(plan.date).toBe("2026-09-25");
    expect(plan.hours).toBe(6);
    expect(plan.memo).toBe("차례");
    expect(typeof plan.createdAt).toBe("number");
    expect(typeof plan.updatedAt).toBe("number");
  });

  // BudgetItem / BudgetPlan
  it("BudgetItem 인터페이스: id, relation, label, amount, checked, createdAt, updatedAt", () => {
    const item: BudgetItem = {
      id: "budget-item-123",
      relation: "시댁",
      label: "시부모 용돈",
      amount: 300000,
      checked: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(item.id).toBe("budget-item-123");
    expect(item.relation).toBe("시댁");
    expect(item.label).toBe("시부모 용돈");
    expect(item.amount).toBe(300000);
    expect(item.checked).toBe(false);
  });

  it("BudgetPlan 인터페이스: items[], createdAt, updatedAt (no id)", () => {
    const plan: BudgetPlan = {
      items: [
        {
          id: "item-1",
          relation: "시댁",
          label: "용돈",
          amount: 500000,
          checked: true,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(Array.isArray(plan.items)).toBe(true);
    expect(plan.items).toHaveLength(1);
    expect(typeof plan.createdAt).toBe("number");
    expect(typeof plan.updatedAt).toBe("number");
  });

  // BurnoutLog
  it("BurnoutLog 인터페이스: id, season, score, causes[], note, createdAt, updatedAt", () => {
    const log: BurnoutLog = {
      id: "burnout-123",
      season: "2026-추석",
      score: 8,
      causes: ["과도한 질문", "휴식 부족"],
      note: "힘들었음",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    expect(log.id).toBe("burnout-123");
    expect(log.season).toBe("2026-추석");
    expect(log.score).toBe(8);
    expect(log.causes).toHaveLength(2);
    expect(log.causes[0]).toBe("과도한 질문");
    expect(log.note).toBe("힘들었음");
  });

  // API Contracts
  it("ScriptApiRequest 인터페이스: relation, situation, tone", () => {
    const request: ScriptApiRequest = {
      relation: "시댁",
      situation: "아이 언제 낳냐는 질문",
      tone: "정중",
    };
    expect(request.relation).toBe("시댁");
    expect(request.situation).toBe("아이 언제 낳냐는 질문");
    expect(request.tone).toBe("정중");
  });

  it("ScriptApiResponse 인터페이스: scripts[]", () => {
    const response: ScriptApiResponse = {
      scripts: ["문장1", "문장2", "문장3"],
    };
    expect(Array.isArray(response.scripts)).toBe(true);
    expect(response.scripts).toHaveLength(3);
  });

  it("ApiError 인터페이스: error string", () => {
    const error: ApiError = {
      error: "invalid_situation",
    };
    expect(error.error).toBe("invalid_situation");
  });
});
