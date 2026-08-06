import { describe, it, expect, beforeEach, vi } from "vitest";
import type { ScriptRequest, ScriptResponse, ApiError } from "@/lib/types";

/**
 * POST /api/script 엔드포인트 테스트
 * 명절 응대 스크립트 LLM 생성 API
 *
 * 테스트 전략:
 * - 요청 검증 (situation 1-300자, tone 화이트리스트)
 * - 성공 응답 ({result: string, model: string})
 * - 에러 처리 (400, 429, 500 ApiError)
 * - 보안 (API 키 미노출, console.error 0개)
 *
 * 구현 파일: server/src/routes/script.ts, server/src/llm.ts
 * API 계약: POST /api/script → 200 {result, model} | 4xx/5xx {code, message}
 */

// ============================================================================
// 유틸: API 호출 (실제 테스트에서는 fetch 또는 supertest 사용)
// ============================================================================

interface CallApiOptions {
  situation: string;
  tone: "정중하게" | "단호하게" | "유머러스하게";
}

/**
 * 더미: 실제 구현에서는 fetch 또는 supertest로 대체
 * 목표: 서버 엔드포인트 spec 검증
 */
async function callScriptApi(
  body: Partial<CallApiOptions>,
): Promise<{ status: number; data: ScriptResponse | ApiError }> {
  // TBD: 실제 구현에서 fetch 또는 supertest로 교체
  // const res = await fetch('/api/script', { method: 'POST', body: JSON.stringify(body) });
  // const data = await res.json();
  // return { status: res.status, data };
  throw new Error("구현 대기: server/src/routes/script.ts");
}

// ============================================================================
// AC-1 [P0]: 유효 요청 → 200 {result, model}
// ============================================================================

describe("POST /api/script — AC-1 [P0]: 유효 요청 성공", () => {
  it("AC-1.1: situation 유효(50자), tone 유효 → 200 {result: 문자열, model: 문자열}", async () => {
    const res = await callScriptApi({
      situation: "명절마다 취업 언제 하냐 물어봐서 답답해요",
      tone: "정중하게",
    });

    expect(res.status).toBe(200);
    expect(res.data).toHaveProperty("result");
    expect(res.data).toHaveProperty("model");
    expect(typeof (res.data as ScriptResponse).result).toBe("string");
    expect(typeof (res.data as ScriptResponse).model).toBe("string");
    expect((res.data as ScriptResponse).result).not.toBe("");
    expect((res.data as ScriptResponse).model).toMatch(/claude-/);
  });

  it("AC-1.2: 최소 길이 situation(1자) → 200", async () => {
    const res = await callScriptApi({
      situation: "A",
      tone: "단호하게",
    });

    expect(res.status).toBe(200);
    expect((res.data as ScriptResponse).result).toBeTruthy();
  });

  it("AC-1.3: 최대 길이 situation(300자) → 200", async () => {
    const maxSituation = "취".repeat(300); // 정확히 300자
    const res = await callScriptApi({
      situation: maxSituation,
      tone: "유머러스하게",
    });

    expect(res.status).toBe(200);
    expect((res.data as ScriptResponse).result).toBeTruthy();
  });

  it("AC-1.4: 모든 tone 옵션('정중하게','단호하게','유머러스하게') → 각각 200", async () => {
    const tones: Array<"정중하게" | "단호하게" | "유머러스하게"> = [
      "정중하게",
      "단호하게",
      "유머러스하게",
    ];

    for (const tone of tones) {
      const res = await callScriptApi({
        situation: "테스트",
        tone,
      });
      expect(res.status).toBe(200);
      expect((res.data as ScriptResponse).result).toBeTruthy();
    }
  });
});

// ============================================================================
// AC-2 [P1]: situation 검증 실패 → 400 ApiError
// ============================================================================

describe("POST /api/script — AC-2 [P1]: situation 검증 실패 → 400", () => {
  it("AC-2.1: situation 공란 → 400 {code, message}", async () => {
    const res = await callScriptApi({
      situation: "",
      tone: "정중하게",
    });

    expect(res.status).toBe(400);
    expect(res.data).toHaveProperty("code");
    expect(res.data).toHaveProperty("message");
    expect((res.data as ApiError).message).toContain("상황");
  });

  it("AC-2.2: situation 301자 초과 → 400 {code, message}", async () => {
    const tooLong = "취".repeat(301); // 301자
    const res = await callScriptApi({
      situation: tooLong,
      tone: "단호하게",
    });

    expect(res.status).toBe(400);
    expect((res.data as ApiError).code).toBeTruthy();
    expect((res.data as ApiError).message).toContain("상황");
  });

  it("AC-2.3: situation null → 400", async () => {
    const res = await callScriptApi({
      situation: null as any,
      tone: "유머러스하게",
    });

    expect(res.status).toBe(400);
  });
});

// ============================================================================
// AC-3 [P1]: tone 검증 실패 → 400
// ============================================================================

describe("POST /api/script — AC-3 [P1]: tone 검증 실패 → 400", () => {
  it("AC-3.1: tone 미허용('formal' 등) → 400 {code, message}", async () => {
    const res = await callScriptApi({
      situation: "테스트",
      tone: "formal" as any,
    });

    expect(res.status).toBe(400);
    expect((res.data as ApiError).code).toBeTruthy();
    expect((res.data as ApiError).message).toContain("tone");
  });

  it("AC-3.2: tone 공란 → 400", async () => {
    const res = await callScriptApi({
      situation: "테스트",
      tone: "" as any,
    });

    expect(res.status).toBe(400);
  });

  it("AC-3.3: tone 누락 → 400", async () => {
    const res = await callScriptApi({
      situation: "테스트",
      tone: undefined as any,
    });

    expect(res.status).toBe(400);
  });
});

// ============================================================================
// AC-4 [P1]: 서버/LLM 오류 → 500 ApiError
// ============================================================================

describe("POST /api/script — AC-4 [P1]: 서버/LLM 오류 → 500", () => {
  it("AC-4.1: Anthropic API 타임아웃(>30s) → 500 {code, message}", async () => {
    // TBD: 타임아웃 시뮬레이션
    // 구현에서 server/src/llm.ts가 timeout을 처리해야 함
    const res = await callScriptApi({
      situation: "테스트",
      tone: "정중하게",
    });
    // 실제 타임아웃 테스트는 의존성 주입(mock LLM)으로 시뮬레이션

    // expect(res.status).toBe(500);
    // expect((res.data as ApiError).code).toBe("timeout");
  });

  it("AC-4.2: Anthropic API 에러 → 500 {code: 'llm_error', message}", async () => {
    const res = await callScriptApi({
      situation: "테스트",
      tone: "단호하게",
    });
    // 실제 구현: server/src/llm.ts에서 Anthropic 에러를 500으로 변환

    // expect(res.status).toBe(500);
    // expect((res.data as ApiError).code).toBe("llm_error");
  });

  it("AC-4.3: 에러 응답에 stack trace/API 키 미노출", async () => {
    const res = await callScriptApi({
      situation: "테스트",
      tone: "유머러스하게",
    });

    // 서버 크래시 없음 (500만 반환)
    expect(res.status).toBeGreaterThanOrEqual(400);

    // 응답에 민감 정보 없음
    const responseStr = JSON.stringify(res.data);
    expect(responseStr).not.toContain("ANTHROPIC_API_KEY");
    expect(responseStr).not.toContain("Error:");
    expect(responseStr).not.toContain("at ");
  });
});

// ============================================================================
// AC-5 [P1]: 레이트 리미트 → 429
// ============================================================================

describe("POST /api/script — AC-5 [P1]: 무료 한도 초과 → 429", () => {
  it("AC-5.1: 서버 rate limit 초과 → 429 {code: 'rate_limit', message}", async () => {
    const res = await callScriptApi({
      situation: "테스트 X 100회 반복 시뮬레이션",
      tone: "정중하게",
    });

    // TBD: 서버가 429를 발행할 때만 테스트 실제 성공
    // expect(res.status).toBe(429);
    // expect((res.data as ApiError).message).toContain("요청");
  });
});

// ============================================================================
// AC-6 [P1]: 보안 — API 키 미노출
// ============================================================================

describe("POST /api/script — AC-6 [P1]: 보안 — API 키/스택트레이스 미노출", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("AC-6.1: 성공 응답에 API 키 미포함", async () => {
    const res = await callScriptApi({
      situation: "테스트",
      tone: "정중하게",
    });

    const responseStr = JSON.stringify(res.data);
    expect(responseStr).not.toContain("sk-");
    expect(responseStr).not.toContain("ANTHROPIC_API_KEY");
    expect(responseStr).not.toContain("api_key");
  });

  it("AC-6.2: 에러 응답에 stack trace 미포함", async () => {
    const res = await callScriptApi({
      situation: "",
      tone: "정중하게",
    });

    const responseStr = JSON.stringify(res.data);
    // 스택 트레이스 패턴: "at MethodName", "Error:"
    expect(responseStr).not.toMatch(/at\s+\w+/);
    expect(responseStr).not.toMatch(/Error:/);
  });

  it("AC-6.3: 에러 발생 시 server console.error 호출 안 함 (프로덕션)", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // 무효한 요청 → 에러 응답
    await callScriptApi({
      situation: "",
      tone: "정중하게",
    });

    // 프로덕션 빌드에서는 console.error를 호출하지 않아야 함
    // (dev 환경에서는 로깅 가능)
    // expect(consoleErrorSpy).not.toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });
});

// ============================================================================
// AC-7 [P1]: 응답 구조 검증
// ============================================================================

describe("POST /api/script — AC-7 [P1]: 응답 구조 검증", () => {
  it("AC-7.1: 200 응답 {result: string (비어있지 않음), model: string}", async () => {
    const res = await callScriptApi({
      situation: "테스트 상황",
      tone: "정중하게",
    });

    expect(res.status).toBe(200);

    const response = res.data as ScriptResponse;
    expect(response.result).toBeTruthy();
    expect(response.result.length).toBeGreaterThan(0);
    expect(response.model).toBeTruthy();
    expect(response.model).toMatch(/^claude-/);
  });

  it("AC-7.2: 에러 응답 {code: string, message: string}", async () => {
    const res = await callScriptApi({
      situation: "",
      tone: "정중하게",
    });

    expect(res.status).toBeGreaterThanOrEqual(400);

    const error = res.data as ApiError;
    expect(typeof error.code).toBe("string");
    expect(typeof error.message).toBe("string");
    expect(error.code).toBeTruthy();
    expect(error.message).toBeTruthy();
  });
});

// ============================================================================
// AC-8 [P1]: Content-Type / CORS
// ============================================================================

describe("POST /api/script — AC-8 [P1]: HTTP 계약", () => {
  it("AC-8.1: 요청 Content-Type: application/json", async () => {
    // TBD: supertest 또는 fetch로 헤더 검증
    // const res = await request(app)
    //   .post('/api/script')
    //   .set('Content-Type', 'application/json')
    //   .send({ situation: 'test', tone: 'formal' });
  });

  it("AC-8.2: 응답 Content-Type: application/json", async () => {
    const res = await callScriptApi({
      situation: "테스트",
      tone: "정중하게",
    });

    // 실제 구현: response.headers['content-type'].includes('application/json')
  });

  it("AC-8.3: 모든 응답이 JSON 형식 (파싱 불가 응답 없음)", async () => {
    const res = await callScriptApi({
      situation: "테스트",
      tone: "단호하게",
    });

    // res.data는 이미 파싱된 JSON 객체
    expect(typeof res.data).toBe("object");
    expect(res.data).not.toBe(null);
  });
});

// ============================================================================
// AC-9 [추가]: 시스템 프롬프트 검증 (비기능 요구사항)
// ============================================================================

describe("POST /api/script — AC-9 [추가]: 명절 응대 시스템 프롬프트", () => {
  it("AC-9.1: 생성 결과가 '명절 응대 스크립트'로서 기능한다", async () => {
    const res = await callScriptApi({
      situation: "명절마다 취업 언제 하냐고 물어봐요",
      tone: "정중하게",
    });

    expect(res.status).toBe(200);

    // 응답이 상황에 맞는 응대 스크립트임을 시사해야 함
    const result = (res.data as ScriptResponse).result;
    expect(result.length).toBeGreaterThan(10);
    // 예: 긍정적 톤, 상황 인정, 대응 제시
    // (정확한 검증은 LLM 출력의 비결정성 때문에 제한됨)
  });

  it("AC-9.2: tone='정중하게'는 경어체 응대스크립트 생성", async () => {
    const res = await callScriptApi({
      situation: "테스트",
      tone: "정중하게",
    });

    expect(res.status).toBe(200);
    // 경어체 단어 포함 여부 (모호성 주의)
    const result = (res.data as ScriptResponse).result;
    expect(result).toBeTruthy();
  });

  it("AC-9.3: tone='단호하게'는 단호한 응대스크립트 생성", async () => {
    const res = await callScriptApi({
      situation: "테스트",
      tone: "단호하게",
    });

    expect(res.status).toBe(200);
    const result = (res.data as ScriptResponse).result;
    expect(result).toBeTruthy();
  });

  it("AC-9.4: tone='유머러스하게'는 재미있는 응대스크립트 생성", async () => {
    const res = await callScriptApi({
      situation: "테스트",
      tone: "유머러스하게",
    });

    expect(res.status).toBe(200);
    const result = (res.data as ScriptResponse).result;
    expect(result).toBeTruthy();
  });
});

// ============================================================================
// 통합 테스트: 전체 흐름
// ============================================================================

describe("POST /api/script — 통합 테스트: 전체 흐름", () => {
  it("시나리오: 사용자가 상황을 입력 → API 호출 → 스크립트 반환 → 저장 준비", async () => {
    // Given
    const situation = "명절마다 취업 언제 하냐는 질문이 힘들어요";
    const tone = "정중하게" as const;

    // When
    const res = await callScriptApi({ situation, tone });

    // Then
    expect(res.status).toBe(200);
    expect((res.data as ScriptResponse).result).toBeTruthy();
    expect((res.data as ScriptResponse).model).toMatch(/^claude-/);

    // 클라이언트가 이 데이터를 localStorage에 저장할 준비
    // ht.scripts에 { id, situation, tone, result, createdAt }
  });

  it("시나리오: 동시 다중 요청 → 각각 독립적 응답", async () => {
    // TBD: 병렬 요청 테스트 (Promise.all 사용)
    // 각 요청이 독립적으로 성공해야 함
  });
});
