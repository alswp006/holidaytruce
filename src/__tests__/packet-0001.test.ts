import { describe, it, expect } from "vitest";
import type {
  VisitSchedule,
  BudgetItem,
  ChecklistItem,
  ScriptRecord,
  StressLog,
  AppMeta,
  RouteState,
  ScriptRequest,
  ScriptResponse,
  ApiError,
} from "@/lib/types";
import { STORAGE_KEYS, HOLIDAYS } from "@/lib/constants";

describe("AC-1: types.ts에 7개 엔티티 인터페이스 정의", () => {
  it("AC-1.1[P0]: VisitSchedule 엔티티 타입 검증", () => {
    const visitSchedule: VisitSchedule = {
      id: "vs-001",
      side: "본가",
      date: "2026-02-10",
      startTime: "10:00",
      endTime: "18:00",
      memo: "설날 인사",
      holidayId: "2026-seollal",
      createdAt: 1707558000000,
    };

    expect(visitSchedule.id).toBe("vs-001");
    expect(visitSchedule.side).toBe("본가");
    expect(visitSchedule.date).toBe("2026-02-10");
    expect(visitSchedule.holidayId).toBe("2026-seollal");
  });

  it("AC-1.2[P0]: VisitSchedule side 필드는 본가|처가 중 하나", () => {
    const v1: VisitSchedule = {
      id: "vs-002",
      side: "처가",
      date: "2026-02-10",
      memo: "",
      holidayId: "2026-seollal",
      createdAt: Date.now(),
    };

    expect(["본가", "처가"]).toContain(v1.side);
  });

  it("AC-1.3[P0]: BudgetItem 엔티티 타입 검증", () => {
    const budgetItem: BudgetItem = {
      id: "bi-001",
      side: "본가",
      category: "용돈",
      label: "할머니 용돈",
      amount: 100000,
      paid: false,
      holidayId: "2026-seollal",
      createdAt: 1707558000000,
    };

    expect(budgetItem.id).toBe("bi-001");
    expect(budgetItem.category).toBe("용돈");
    expect(budgetItem.amount).toBe(100000);
    expect(budgetItem.paid).toBe(false);
  });

  it("AC-1.4[P0]: BudgetItem category는 용돈|선물|차례비용|교통|기타 중 하나", () => {
    const categories: BudgetItem["category"][] = [
      "용돈",
      "선물",
      "차례비용",
      "교통",
      "기타",
    ];
    categories.forEach((cat) => {
      const item: BudgetItem = {
        id: `bi-${cat}`,
        side: "본가",
        category: cat,
        label: "test",
        amount: 0,
        paid: false,
        holidayId: "2026-seollal",
        createdAt: Date.now(),
      };
      expect(item.category).toBeDefined();
    });
  });

  it("AC-1.5[P0]: ChecklistItem 엔티티 타입 검증", () => {
    const checklistItem: ChecklistItem = {
      id: "cl-001",
      text: "선물 사기",
      checked: false,
      holidayId: "2026-seollal",
    };

    expect(checklistItem.id).toBe("cl-001");
    expect(checklistItem.text).toBe("선물 사기");
    expect(checklistItem.checked).toBe(false);
  });

  it("AC-1.6[P0]: ScriptRecord 엔티티 타입 검증", () => {
    const scriptRecord: ScriptRecord = {
      id: "sr-001",
      situation: "직장 상황 설명",
      tone: "정중하게",
      result: "어떻게든 잘 설명하세요",
      createdAt: 1707558000000,
    };

    expect(scriptRecord.id).toBe("sr-001");
    expect(scriptRecord.situation).toBe("직장 상황 설명");
    expect(scriptRecord.tone).toBe("정중하게");
  });

  it("AC-1.7[P0]: ScriptRecord tone은 정중하게|단호하게|유머러스하게 중 하나", () => {
    const tones: ScriptRecord["tone"][] = ["정중하게", "단호하게", "유머러스하게"];
    tones.forEach((tone) => {
      const record: ScriptRecord = {
        id: `sr-${tone}`,
        situation: "test",
        tone: tone,
        result: "test result",
        createdAt: Date.now(),
      };
      expect(record.tone).toBeDefined();
    });
  });

  it("AC-1.8[P0]: StressLog 엔티티 타입 검증", () => {
    const stressLog: StressLog = {
      id: "sl-001",
      holidayId: "2026-seollal",
      score: 7,
      triggers: ["가족 갈등", "경제 압박"],
      memo: "설날 스트레스 기록",
      createdAt: 1707558000000,
    };

    expect(stressLog.id).toBe("sl-001");
    expect(stressLog.score).toBe(7);
    expect(stressLog.triggers).toContain("가족 갈등");
  });

  it("AC-1.9[P0]: AppMeta 엔티티 타입 검증", () => {
    const appMeta: AppMeta = {
      aiNoticeAck: true,
      currentHolidayId: "2026-seollal",
      isPaid: false,
    };

    expect(appMeta.aiNoticeAck).toBe(true);
    expect(appMeta.currentHolidayId).toBe("2026-seollal");
    expect(appMeta.isPaid).toBe(false);
  });
});

describe("AC-2: ScriptRequest/ScriptResponse/ApiError API 타입 정의", () => {
  it("AC-2.1[P0]: ScriptRequest 타입 검증", () => {
    const request: ScriptRequest = {
      situation: "회사에서 명절 휴무 중인데 직업을 물어봤다",
      tone: "정중하게",
    };

    expect(request.situation).toBeDefined();
    expect(request.tone).toBe("정중하게");
  });

  it("AC-2.2[P0]: ScriptResponse 타입 검증", () => {
    const response: ScriptResponse = {
      result: "직종을 구체적으로 설명하고 현재 프로젝트에 대해 얘기하세요",
      model: "claude-opus-4",
    };

    expect(response.result).toBeDefined();
    expect(response.model).toBeDefined();
    expect(response.model).toMatch(/^claude-/);
  });

  it("AC-2.3[P0]: ApiError 타입 검증 - 4xx 에러", () => {
    const error: ApiError = {
      error: "상황 입력이 올바르지 않습니다",
    };

    expect(error.error).toBeDefined();
    expect(typeof error.error).toBe("string");
  });

  it("AC-2.4[P0]: ApiError 타입 검증 - 5xx 에러", () => {
    const error: ApiError = {
      error: "스크립트 생성에 실패했습니다",
    };

    expect(error.error).toBeDefined();
    expect(typeof error.error).toBe("string");
  });
});

describe("AC-3: RouteState 유니온 타입 정의 (all routes)", () => {
  it("AC-3.1[P0]: RouteState 홈(/) 경로 - empty state", () => {
    const homeState: RouteState = {};
    expect(Object.keys(homeState).length).toBe(0);
  });

  it("AC-3.2[P0]: RouteState /script 경로 - scriptData", () => {
    const scriptState: RouteState = {
      scriptData: {
        id: "sr-001",
        situation: "직장 질문",
        tone: "정중하게",
        result: "답변",
        createdAt: 1707558000000,
      },
    };

    expect(scriptState.scriptData).toBeDefined();
    expect(scriptState.scriptData?.id).toBe("sr-001");
  });

  it("AC-3.3[P0]: RouteState /schedule 경로 - scheduleData", () => {
    const scheduleState: RouteState = {
      scheduleData: {
        id: "vs-001",
        side: "본가",
        date: "2026-02-10",
        memo: "설날 방문",
        holidayId: "2026-seollal",
        createdAt: 1707558000000,
      },
    };

    expect(scheduleState.scheduleData).toBeDefined();
    expect(scheduleState.scheduleData?.holidayId).toBe("2026-seollal");
  });

  it("AC-3.4[P0]: RouteState /budget 경로 - budgetData", () => {
    const budgetState: RouteState = {
      budgetData: {
        id: "bi-001",
        side: "본가",
        category: "용돈",
        label: "할머니",
        amount: 100000,
        paid: true,
        holidayId: "2026-seollal",
        createdAt: 1707558000000,
      },
    };

    expect(budgetState.budgetData).toBeDefined();
    expect(budgetState.budgetData?.amount).toBe(100000);
  });

  it("AC-3.5[P0]: RouteState /stress 경로 - stressData", () => {
    const stressState: RouteState = {
      stressData: {
        id: "sl-001",
        holidayId: "2026-seollal",
        score: 8,
        triggers: ["가족"],
        memo: "스트레스",
        createdAt: 1707558000000,
      },
    };

    expect(stressState.stressData).toBeDefined();
    expect(stressState.stressData?.score).toBe(8);
  });

  it("AC-3.6[P0]: RouteState /paywall 경로 - 결제 상태", () => {
    const paywallState: RouteState = {
      isPaid: true,
      fromPage: "/script",
    };

    expect(paywallState.isPaid).toBe(true);
    expect(paywallState.fromPage).toBe("/script");
  });

  it("AC-3.7[P1]: RouteState는 선택적 필드로 구성 (부분 상태 허용)", () => {
    const partialState: RouteState = {
      isPaid: false,
    };

    expect(partialState.isPaid).toBe(false);
    expect(partialState.scriptData).toBeUndefined();
  });
});

describe("AC-4: STORAGE_KEYS 상수 정의", () => {
  it("AC-4.1[P0]: STORAGE_KEYS 객체 존재 및 필수 키 확인", () => {
    expect(STORAGE_KEYS).toBeDefined();
    expect(typeof STORAGE_KEYS).toBe("object");
  });

  it("AC-4.2[P0]: STORAGE_KEYS에 ht.schedules 포함", () => {
    expect(STORAGE_KEYS.schedules).toBeDefined();
    expect(typeof STORAGE_KEYS.schedules).toBe("string");
    expect(STORAGE_KEYS.schedules).toContain("ht.");
  });

  it("AC-4.3[P0]: STORAGE_KEYS에 ht.budgets 포함", () => {
    expect(STORAGE_KEYS.budgets).toBeDefined();
    expect(typeof STORAGE_KEYS.budgets).toBe("string");
  });

  it("AC-4.4[P0]: STORAGE_KEYS에 ht.checklist 포함", () => {
    expect(STORAGE_KEYS.checklist).toBeDefined();
    expect(typeof STORAGE_KEYS.checklist).toBe("string");
  });

  it("AC-4.5[P0]: STORAGE_KEYS에 ht.scripts 포함", () => {
    expect(STORAGE_KEYS.scripts).toBeDefined();
    expect(typeof STORAGE_KEYS.scripts).toBe("string");
  });

  it("AC-4.6[P0]: STORAGE_KEYS에 ht.stressLogs 포함", () => {
    expect(STORAGE_KEYS.stressLogs).toBeDefined();
    expect(typeof STORAGE_KEYS.stressLogs).toBe("string");
  });

  it("AC-4.7[P0]: STORAGE_KEYS에 ht.meta 포함", () => {
    expect(STORAGE_KEYS.meta).toBeDefined();
    expect(typeof STORAGE_KEYS.meta).toBe("string");
  });

  it("AC-4.8[P1]: 모든 STORAGE_KEYS 값이 고유함", () => {
    const keys = Object.values(STORAGE_KEYS);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });
});

describe("AC-5: HOLIDAYS 상수 배열 정의", () => {
  it("AC-5.1[P0]: HOLIDAYS는 배열", () => {
    expect(Array.isArray(HOLIDAYS)).toBe(true);
  });

  it("AC-5.2[P0]: HOLIDAYS에 설날 2026-seollal 포함", () => {
    const seollal = HOLIDAYS.find((h: typeof HOLIDAYS[0]) => h.id === "2026-seollal");
    expect(seollal).toBeDefined();
    expect(seollal?.label).toBeDefined();
    expect(seollal?.date).toBeDefined();
  });

  it("AC-5.3[P0]: HOLIDAYS에 추석 2026-chuseok 포함", () => {
    const chuseok = HOLIDAYS.find((h: typeof HOLIDAYS[0]) => h.id === "2026-chuseok");
    expect(chuseok).toBeDefined();
    expect(chuseok?.label).toBeDefined();
    expect(chuseok?.date).toBeDefined();
  });

  it("AC-5.4[P0]: 각 HOLIDAYS 항목은 id, label, date 필드 포함", () => {
    HOLIDAYS.forEach((holiday: typeof HOLIDAYS[0]) => {
      expect(holiday.id).toBeDefined();
      expect(typeof holiday.id).toBe("string");
      expect(holiday.label).toBeDefined();
      expect(typeof holiday.label).toBe("string");
      expect(holiday.date).toBeDefined();
      expect(typeof holiday.date).toBe("string");
    });
  });

  it("AC-5.5[P0]: HOLIDAYS 날짜는 YYYY-MM-DD 형식", () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    HOLIDAYS.forEach((holiday: typeof HOLIDAYS[0]) => {
      expect(holiday.date).toMatch(dateRegex);
    });
  });

  it("AC-5.6[P1]: 설날 2026-seollal의 label이 한글 설명", () => {
    const seollal = HOLIDAYS.find((h: typeof HOLIDAYS[0]) => h.id === "2026-seollal");
    expect(seollal?.label).toMatch(/설/);
  });

  it("AC-5.7[P1]: 추석 2026-chuseok의 label이 한글 설명", () => {
    const chuseok = HOLIDAYS.find((h: typeof HOLIDAYS[0]) => h.id === "2026-chuseok");
    expect(chuseok?.label).toMatch(/추석/);
  });

  it("AC-5.8[P1]: HOLIDAYS 항목들이 고유한 id 보유", () => {
    const ids = HOLIDAYS.map((h: typeof HOLIDAYS[0]) => h.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

describe("Integration: 타입과 상수의 일관성 검증", () => {
  it("INT-1[P0]: 모든 엔티티가 holidayId를 가지고 있고, HOLIDAYS의 id와 일치 가능", () => {
    const validHolidayIds = HOLIDAYS.map((h) => h.id);

    const schedule: VisitSchedule = {
      id: "vs-001",
      side: "본가",
      date: "2026-02-10",
      memo: "",
      holidayId: "2026-seollal",
      createdAt: Date.now(),
    };

    expect(validHolidayIds).toContain(schedule.holidayId);
  });

  it("INT-2[P0]: STORAGE_KEYS의 값들이 실제 localStorage 키로 사용 가능한 문자열", () => {
    Object.values(STORAGE_KEYS).forEach((key: string) => {
      expect(typeof key).toBe("string");
      expect(key.length).toBeGreaterThan(0);
      // 유효한 localStorage 키는 공백이나 특수문자 많지 않음
      expect(/^[a-zA-Z0-9._\-]+$/.test(key)).toBe(true);
    });
  });

  it("INT-3[P1]: RouteState의 데이터 필드들이 실제 엔티티 타입과 일치", () => {
    const state: RouteState = {
      scriptData: {
        id: "test",
        situation: "test",
        tone: "정중하게",
        result: "result",
        createdAt: Date.now(),
      },
    };

    // scriptData의 모양이 ScriptRecord와 일치
    expect(state.scriptData?.id).toBeDefined();
    expect(state.scriptData?.situation).toBeDefined();
    expect(state.scriptData?.tone).toBeDefined();
  });
});
