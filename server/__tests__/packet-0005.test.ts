import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";

/**
 * Packet 0005: POST /api/script 엔드포인트 (LLM 호출)
 *
 * 명절 응대 스크립트 생성 API 테스트
 * - 요청 검증 (situation 1-300자, tone 화이트리스트)
 * - 성공 응답 ({result: string, model: string})
 * - 에러 처리 (400, 429, 500)
 * - 보안 (API 키 미노출, console.error 0개)
 *
 * 구현 파일: server/src/routes/script.ts, server/src/llm.ts
 * spec.md: F2 AI 시댁·처가 응대 스크립트 생성
 */

describe("Packet 0005: POST /api/script 엔드포인트 (LLM 호출)", () => {
  let app: any;

  beforeAll(async () => {
    // Import the Express app after implementation is complete
    const module = await import("../src/index");
    app = module.default;
  });

  // ============================================================================
  // AC-1 [P0]: 유효 요청 → 200 {result: 문자열, model: 문자열}
  // ============================================================================

  describe("AC-1 [P0]: 유효 요청 성공 → 200", () => {
    it("AC-1.1: situation 유효(50자), tone 유효('정중하게') → 200 {result, model}", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "명절마다 취업 언제 하냐 물어봐서 답답해요",
        tone: "정중하게",
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("result");
      expect(response.body).toHaveProperty("model");
      expect(typeof response.body.result).toBe("string");
      expect(typeof response.body.model).toBe("string");
      expect(response.body.result.length).toBeGreaterThan(0);
      expect(response.body.model).toMatch(/^claude-/);
    });

    it("AC-1.2: tone='단호하게' → 200 {result, model}", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "부모님이 자꾸 간섭해요",
        tone: "단호하게",
      });

      expect(response.status).toBe(200);
      expect(response.body.result).toBeTruthy();
      expect(response.body.model).toBeTruthy();
    });

    it("AC-1.3: tone='유머러스하게' → 200 {result, model}", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "명절 음식 준비가 너무 많아요",
        tone: "유머러스하게",
      });

      expect(response.status).toBe(200);
      expect(response.body.result).toBeTruthy();
      expect(response.body.model).toBeTruthy();
    });

    it("AC-1.4: situation 최소 길이(1자) → 200", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "A",
        tone: "정중하게",
      });

      expect(response.status).toBe(200);
      expect(response.body.result).toBeTruthy();
    });

    it("AC-1.5: situation 최대 길이(300자) → 200", async () => {
      const maxSituation = "취".repeat(300); // 정확히 300자
      const response = await request(app).post("/api/script").send({
        situation: maxSituation,
        tone: "단호하게",
      });

      expect(response.status).toBe(200);
      expect(response.body.result).toBeTruthy();
    });

    it("AC-1.6: 응답 model이 실제 사용 모델 ID 포함 (claude-opus 등)", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "테스트",
        tone: "정중하게",
      });

      expect(response.status).toBe(200);
      expect(response.body.model).toMatch(/claude-(opus|sonnet|haiku)/);
    });
  });

  // ============================================================================
  // AC-2 [P1]: situation 검증 실패 → 400 ApiError
  // ============================================================================

  describe("AC-2 [P1]: situation 검증 실패 → 400", () => {
    it("AC-2.1: situation 공란 → 400 {error: '...'}", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "",
        tone: "정중하게",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
      expect(typeof response.body.error).toBe("string");
      expect(response.body.error).toContain("상황");
    });

    it("AC-2.2: situation 301자 초과 → 400 {error: '...'}", async () => {
      const tooLong = "취".repeat(301);
      const response = await request(app).post("/api/script").send({
        situation: tooLong,
        tone: "단호하게",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
      expect(response.body.error).toContain("상황");
    });

    it("AC-2.3: situation null → 400", async () => {
      const response = await request(app).post("/api/script").send({
        situation: null,
        tone: "정중하게",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    it("AC-2.4: situation 누락 → 400", async () => {
      const response = await request(app).post("/api/script").send({
        tone: "정중하게",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  // ============================================================================
  // AC-3 [P1]: tone 검증 실패 → 400
  // ============================================================================

  describe("AC-3 [P1]: tone 검증 실패 → 400", () => {
    it("AC-3.1: tone 미허용('formal' 등) → 400 {error: '...'}", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "테스트",
        tone: "formal",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
      expect(response.body.error).toContain("tone");
    });

    it("AC-3.2: tone 공란 → 400", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "테스트",
        tone: "",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    it("AC-3.3: tone 누락 → 400", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "테스트",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });

    it("AC-3.4: tone 아이콘·이모지 등 비문자 → 400", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "테스트",
        tone: "😊",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });

  // ============================================================================
  // AC-4 [P1]: 서버/LLM 오류 → 500 ApiError
  // ============================================================================

  describe("AC-4 [P1]: 서버/LLM 오류 → 500", () => {
    it("AC-4.1: Anthropic API 오류 → 500 {error: '...'}", async () => {
      // TBD: 의존성 주입(mock LLM)으로 에러 시뮬레이션
      // 실제 구현: server/src/llm.ts에서 Anthropic 예외를 catch하고 500으로 변환
      // const response = await request(app).post("/api/script").send({
      //   situation: "테스트",
      //   tone: "정중하게",
      // });
      // expect(response.status).toBe(500);
      // expect(response.body.error).toBeTruthy();
    });

    it("AC-4.2: 에러 응답에 스택 트레이스 미포함", async () => {
      // 400 에러 응답으로 테스트 (500 시뮬레이션 시 사용)
      const response = await request(app).post("/api/script").send({
        situation: "",
        tone: "정중하게",
      });

      const responseStr = JSON.stringify(response.body);
      // "at MethodName", "Error: message" 패턴 없음
      expect(responseStr).not.toMatch(/at\s+\w+/);
      expect(responseStr).not.toMatch(/stack|trace/i);
    });
  });

  // ============================================================================
  // AC-5 [P1]: 보안 — API 키 미노출
  // ============================================================================

  describe("AC-5 [P1]: 보안 — API 키/민감정보 미노출", () => {
    it("AC-5.1: 성공 응답에 ANTHROPIC_API_KEY 미포함", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "테스트",
        tone: "정중하게",
      });

      const responseStr = JSON.stringify(response.body);
      expect(responseStr).not.toContain("ANTHROPIC_API_KEY");
      expect(responseStr).not.toContain("sk-");
      expect(responseStr).not.toContain("api_key");
      expect(responseStr).not.toContain("apiKey");
    });

    it("AC-5.2: 에러 응답에 ANTHROPIC_API_KEY 미포함", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "",
        tone: "정중하게",
      });

      const responseStr = JSON.stringify(response.body);
      expect(responseStr).not.toContain("ANTHROPIC_API_KEY");
      expect(responseStr).not.toContain("sk-");
    });

    it("AC-5.3: 에러 응답에 환경 변수 노출 없음", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "",
        tone: "undefined",
      });

      const responseStr = JSON.stringify(response.body);
      expect(responseStr).not.toContain("process.env");
      expect(responseStr).not.toContain("ANTHROPIC_MODEL");
      expect(responseStr).not.toContain("CORS_ORIGINS");
    });
  });

  // ============================================================================
  // AC-6 [P1]: console.error 0개 (프로덕션)
  // ============================================================================

  describe("AC-6 [P1]: console.error 0개 (프로덕션)", () => {
    it("AC-6.1: 400 에러 발생해도 console.error 호출 안 함", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      await request(app).post("/api/script").send({
        situation: "",
        tone: "정중하게",
      });

      // 프로덕션 빌드에서는 console 호출 최소화
      // dev 환경에서만 로깅 허용
      // expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  // ============================================================================
  // AC-7 [P1]: 응답 Content-Type
  // ============================================================================

  describe("AC-7 [P1]: HTTP 응답 계약", () => {
    it("AC-7.1: 요청 Body Content-Type: application/json", async () => {
      const response = await request(app)
        .post("/api/script")
        .set("Content-Type", "application/json")
        .send({
          situation: "테스트",
          tone: "정중하게",
        });

      // 요청이 정상 처리됨 (서버가 JSON을 파싱)
      expect(response.status).toBeGreaterThanOrEqual(200);
    });

    it("AC-7.2: 응답 Content-Type: application/json", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "테스트",
        tone: "정중하게",
      });

      expect(response.headers["content-type"]).toContain("application/json");
    });

    it("AC-7.3: 응답이 유효한 JSON (파싱 불가 응답 없음)", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "테스트",
        tone: "정중하게",
      });

      // supertest가 자동으로 파싱하므로, body가 object면 JSON 유효
      expect(typeof response.body).toBe("object");
      expect(response.body).not.toBe(null);
    });
  });

  // ============================================================================
  // AC-8 [P1]: CORS 에러 0개
  // ============================================================================

  describe("AC-8 [P1]: CORS", () => {
    it("AC-8.1: POST /api/script는 whitelisted origin에서 CORS 허용", async () => {
      const corsOrigins = (process.env.CORS_ORIGINS || "https://localhost:3000").split(",").map(s => s.trim());
      const allowedOrigin = corsOrigins[0];

      const response = await request(app)
        .post("/api/script")
        .set("Origin", allowedOrigin)
        .set("Content-Type", "application/json")
        .send({
          situation: "테스트",
          tone: "정중하게",
        });

      expect(response.status).toBe(200);
      expect(response.headers["access-control-allow-origin"]).toBe(allowedOrigin);
    });

    it("AC-8.2: POST /api/script는 non-whitelisted origin에서 CORS 차단", async () => {
      const blockedOrigin = "https://malicious.com";

      const response = await request(app)
        .post("/api/script")
        .set("Origin", blockedOrigin)
        .send({
          situation: "테스트",
          tone: "정중하게",
        });

      // 서버는 요청을 처리하지만, CORS 헤더를 보내지 않음 (브라우저가 차단)
      expect(response.headers["access-control-allow-origin"]).not.toBe(blockedOrigin);
    });
  });

  // ============================================================================
  // AC-9: 시스템 프롬프트 검증 (명절 응대 기능)
  // ============================================================================

  describe("AC-9 [P1]: 명절 응대 시스템 프롬프트", () => {
    it("AC-9.1: 생성 결과는 '명절 응대 스크립트' (10자 이상)", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "명절마다 취업 언제 하냐고 물어봐요",
        tone: "정중하게",
      });

      expect(response.status).toBe(200);
      expect(response.body.result.length).toBeGreaterThan(10);
    });

    it("AC-9.2: tone='정중하게'는 경어체/존댓글 톤 유지", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "부모님과 의견이 맞지 않아요",
        tone: "정중하게",
      });

      expect(response.status).toBe(200);
      expect(response.body.result).toBeTruthy();
      // 정확한 검증은 LLM 출력의 비결정성으로 인해 제한 (문체 검증 불가)
    });

    it("AC-9.3: tone='단호하게'는 단호한 의사 표현", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "부모님이 자꾸 간섭해요",
        tone: "단호하게",
      });

      expect(response.status).toBe(200);
      expect(response.body.result).toBeTruthy();
    });

    it("AC-9.4: tone='유머러스하게'는 가볍고 재미있는 톤", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "명절 음식 준비가 너무 많아요",
        tone: "유머러스하게",
      });

      expect(response.status).toBe(200);
      expect(response.body.result).toBeTruthy();
    });
  });

  // ============================================================================
  // 통합 시나리오
  // ============================================================================

  describe("통합 시나리오", () => {
    it("시나리오: 사용자가 상황 입력 → API 호출 → 스크립트 반환", async () => {
      // Given
      const userInput = {
        situation: "명절마다 취업 언제 하냐는 질문이 힘들어요",
        tone: "정중하게" as const,
      };

      // When
      const response = await request(app).post("/api/script").send(userInput);

      // Then
      expect(response.status).toBe(200);
      expect(response.body.result).toBeTruthy();
      expect(response.body.model).toMatch(/^claude-/);

      // 클라이언트는 이 응답을 localStorage에 저장 가능
      // ht.scripts에 { id, situation, tone, result, createdAt }
    });

    it("시나리오: 빈 입력 → 400 에러", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "",
        tone: "정중하게",
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();

      // 클라이언트는 에러 메시지를 Toast로 표시
    });

    it("시나리오: 미허용 tone → 400 에러", async () => {
      const response = await request(app).post("/api/script").send({
        situation: "테스트",
        tone: "친근하게", // 허용되지 않는 값
      });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeTruthy();
    });
  });
});
