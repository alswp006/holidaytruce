import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ScriptRequest, ScriptResponse } from "@/lib/types";

/**
 * Packet 0005: 스크립트 생성 API 클라이언트
 *
 * AC-1: requestScript(req:ScriptRequest): Promise<{ok:true;data:ScriptResponse}|{ok:false}> 구현
 * AC-2: 400/429/500 및 네트워크 오류를 모두 {ok:false}로 정규화하고 throw 없음
 * AC-3: URL은 VITE_SCRIPT_API_URL(https) 사용, CORS 기본 모드
 *
 * API Contract:
 * POST {VITE_SCRIPT_API_URL}/api/script
 * Request: {situation:string, tone:string, question:string}
 * 200 Response: {reply:string, disclaimer:string}
 * Error: 400/429/500/network → {ok:false}
 */

describe("스크립트 생성 API 클라이언트 (requestScript)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set default env for testing
    import.meta.env.VITE_SCRIPT_API_URL = "https://api.example.com";
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  async function callRequestScript(req: ScriptRequest) {
    const mod = await import("@/lib/scriptApi");
    return mod.requestScript(req);
  }

  // ════════════════════════════════════════════════════════════════════════════
  // AC-1[P0]: Happy path — 200 응답 + {ok:true;data:ScriptResponse} 반환
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-1[P0]: Happy path — 200 응답에서 {ok:true;data} 반환", () => {
    it("should return {ok:true;data:ScriptResponse} when POST returns 200", async () => {
      const mockResponse: ScriptResponse = {
        reply: "안녕하세요. 가족계획에 대해 이야기하는 것도 좋은 방법입니다.",
        disclaimer: "이는 AI가 생성한 제안입니다.",
      };

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const request: ScriptRequest = {
        situation: "결혼계획질문",
        tone: "정중하게",
        question: "애는 언제 낳니?",
      };

      const result = await callRequestScript(request);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.reply).toBe(
          "안녕하세요. 가족계획에 대해 이야기하는 것도 좋은 방법입니다."
        );
        expect(result.data.disclaimer).toBe("이는 AI가 생성한 제안입니다.");
      }
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it("should call fetch with correct URL from VITE_SCRIPT_API_URL", async () => {
      const mockResponse: ScriptResponse = {
        reply: "테스트 응답",
        disclaimer: "테스트 고지",
      };

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const request: ScriptRequest = {
        situation: "기타",
        tone: "단호하게",
        question: "뭐하는 거야?",
      };

      await callRequestScript(request);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://api.example.com/api/script",
        expect.any(Object)
      );
    });

    it("should POST with ScriptRequest body as JSON", async () => {
      const mockResponse: ScriptResponse = {
        reply: "응답",
        disclaimer: "고지",
      };

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const request: ScriptRequest = {
        situation: "외모지적",
        tone: "유머러스하게",
        question: "내가 뚱뚱해 보여?",
      };

      await callRequestScript(request);

      const [, options] = (global.fetch as any).mock.calls[0];
      expect(options.method).toBe("POST");
      expect(options.headers["Content-Type"]).toBe("application/json");
      expect(options.body).toBe(JSON.stringify(request));
      expect(JSON.parse(options.body)).toEqual(request);
    });

    it("should parse response body correctly when 200 OK", async () => {
      const mockResponse: ScriptResponse = {
        reply: "가족과의 대화는 서로를 이해하는 기회입니다.",
        disclaimer: "AI 생성 텍스트",
      };

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const request: ScriptRequest = {
        situation: "취업질문",
        tone: "정중하게",
        question: "뭐해, 결혼은?",
      };

      const result = await callRequestScript(request);

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data).toHaveProperty("reply");
        expect(result.data).toHaveProperty("disclaimer");
        expect(typeof result.data.reply).toBe("string");
        expect(typeof result.data.disclaimer).toBe("string");
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-1[P0]: Error case — 네트워크 오류 + {ok:false} 반환 (throw 없음)
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-1[P0]: Network error — {ok:false} 반환, throw 없음", () => {
    it("should return {ok:false} when fetch throws (network error)", async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(
        new Error("Network error: Failed to fetch")
      );

      const request: ScriptRequest = {
        situation: "결혼계획질문",
        tone: "정중하게",
        question: "언제 낳을 거야?",
      };

      const result = await callRequestScript(request);

      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty("data");
    });

    it("should NOT throw when network error occurs", async () => {
      global.fetch = vi.fn().mockRejectedValueOnce(
        new Error("Network timeout")
      );

      const request: ScriptRequest = {
        situation: "기타",
        tone: "단호하게",
        question: "?",
      };

      // Should not throw
      const result = await callRequestScript(request);
      expect(result).toBeDefined();
    });

    it("should NOT call console.error on network error", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      global.fetch = vi.fn().mockRejectedValueOnce(
        new Error("Network connection lost")
      );

      const request: ScriptRequest = {
        situation: "명절노동분담",
        tone: "유머러스하게",
        question: "누가 설거지?",
      };

      await callRequestScript(request);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-2[P1]: Error normalization — 400 Bad Request
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-2[P1]: 400 Bad Request 정규화 → {ok:false}", () => {
    it("should return {ok:false} for 400 Bad Request status", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Invalid request format" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      );

      const request: ScriptRequest = {
        situation: "결혼계획질문",
        tone: "정중하게",
        question: "",
      };

      const result = await callRequestScript(request);

      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty("data");
    });

    it("should NOT throw on 400 error", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Bad request" }), { status: 400 })
      );

      const request: ScriptRequest = {
        situation: "외모지적",
        tone: "정중하게",
        question: "어떻게 생각해?",
      };

      const result = await callRequestScript(request);
      expect(result).toBeDefined();
    });

    it("should NOT call console.error on 400 error", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Bad request" }), { status: 400 })
      );

      const request: ScriptRequest = {
        situation: "기타",
        tone: "단호하게",
        question: "?",
      };

      await callRequestScript(request);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-2[P1]: Error normalization — 429 Too Many Requests (Rate limit)
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-2[P1]: 429 Too Many Requests 정규화 → {ok:false}", () => {
    it("should return {ok:false} for 429 Too Many Requests status", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { "Retry-After": "60" },
        })
      );

      const request: ScriptRequest = {
        situation: "취업질문",
        tone: "정중하게",
        question: "취직했니?",
      };

      const result = await callRequestScript(request);

      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty("data");
    });

    it("should NOT throw on 429 rate limit error", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Rate limit" }), { status: 429 })
      );

      const request: ScriptRequest = {
        situation: "명절노동분담",
        tone: "유머러스하게",
        question: "누가 할 거?",
      };

      const result = await callRequestScript(request);
      expect(result).toBeDefined();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-2[P1]: Error normalization — 500 Internal Server Error
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-2[P1]: 500 Internal Server Error 정규화 → {ok:false}", () => {
    it("should return {ok:false} for 500 Internal Server Error status", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Server error" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        })
      );

      const request: ScriptRequest = {
        situation: "결혼계획질문",
        tone: "정중하게",
        question: "결혼하고 싶니?",
      };

      const result = await callRequestScript(request);

      expect(result.ok).toBe(false);
      expect(result).not.toHaveProperty("data");
    });

    it("should NOT throw on 500 server error", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Internal server error" }), {
          status: 500,
        })
      );

      const request: ScriptRequest = {
        situation: "기타",
        tone: "단호하게",
        question: "?",
      };

      const result = await callRequestScript(request);
      expect(result).toBeDefined();
    });

    it("should NOT call console.error on 500 error", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ error: "Server error" }), { status: 500 })
      );

      const request: ScriptRequest = {
        situation: "외모지적",
        tone: "유머러스하게",
        question: "뭐하냐고?",
      };

      await callRequestScript(request);

      expect(consoleErrorSpy).not.toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // AC-3[P1]: URL 및 CORS 기본 모드
  // ════════════════════════════════════════════════════════════════════════════

  describe("AC-3[P1]: VITE_SCRIPT_API_URL 및 CORS 기본 모드 사용", () => {
    it("should use VITE_SCRIPT_API_URL environment variable for API endpoint", async () => {
      import.meta.env.VITE_SCRIPT_API_URL = "https://custom-script-api.toss.com";

      const mockResponse: ScriptResponse = {
        reply: "응답",
        disclaimer: "고지",
      };

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const request: ScriptRequest = {
        situation: "기타",
        tone: "정중하게",
        question: "뭐해?",
      };

      await callRequestScript(request);

      expect(global.fetch).toHaveBeenCalledWith(
        "https://custom-script-api.toss.com/api/script",
        expect.any(Object)
      );
    });

    it("should use POST method with Content-Type: application/json", async () => {
      const mockResponse: ScriptResponse = {
        reply: "응답",
        disclaimer: "고지",
      };

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const request: ScriptRequest = {
        situation: "결혼계획질문",
        tone: "정중하게",
        question: "언제?",
      };

      await callRequestScript(request);

      const [, options] = (global.fetch as any).mock.calls[0];
      expect(options.method).toBe("POST");
      expect(options.headers).toHaveProperty("Content-Type");
      expect(options.headers["Content-Type"]).toBe("application/json");
    });

    it("should use CORS basic mode (default)", async () => {
      const mockResponse: ScriptResponse = {
        reply: "응답",
        disclaimer: "고지",
      };

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const request: ScriptRequest = {
        situation: "취업질문",
        tone: "단호하게",
        question: "취직했니?",
      };

      await callRequestScript(request);

      const [, options] = (global.fetch as any).mock.calls[0];
      // Basic CORS mode means mode property is 'cors' or undefined (default is 'cors')
      expect(
        options.mode === "cors" || options.mode === undefined
      ).toBe(true);
    });

    it("should NOT include Authorization or sensitive headers (basic CORS)", async () => {
      const mockResponse: ScriptResponse = {
        reply: "응답",
        disclaimer: "고지",
      };

      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify(mockResponse), { status: 200 })
      );

      const request: ScriptRequest = {
        situation: "명절노동분담",
        tone: "유머러스하게",
        question: "누가?",
      };

      await callRequestScript(request);

      const [, options] = (global.fetch as any).mock.calls[0];
      expect(options.headers).not.toHaveProperty("Authorization");
      // Only Content-Type should be set
      const headerKeys = Object.keys(options.headers);
      expect(headerKeys).toContain("Content-Type");
      expect(headerKeys.length).toBe(1);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // Additional: Edge cases and robustness
  // ════════════════════════════════════════════════════════════════════════════

  describe("Additional: Edge cases and robustness", () => {
    it("should handle malformed JSON response on 200 status gracefully", async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(
        new Response("not valid json {{{", {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );

      const request: ScriptRequest = {
        situation: "기타",
        tone: "정중하게",
        question: "?",
      };

      // Should return {ok:false} instead of throwing
      const result = await callRequestScript(request);
      expect(result.ok).toBe(false);
    });

    it("should handle different error status codes consistently", async () => {
      const errorStatuses = [401, 403, 404, 502, 503];

      for (const status of errorStatuses) {
        global.fetch = vi.fn().mockResolvedValueOnce(
          new Response(JSON.stringify({ error: `Error ${status}` }), {
            status,
          })
        );

        const request: ScriptRequest = {
          situation: "기타",
          tone: "정중하게",
          question: "?",
        };

        const result = await callRequestScript(request);

        expect(result.ok).toBe(false);
        expect(result).not.toHaveProperty("data");
      }
    });

    it("should handle abort errors gracefully", async () => {
      const abortError = new Error("AbortError");
      abortError.name = "AbortError";

      global.fetch = vi.fn().mockRejectedValueOnce(abortError);

      const request: ScriptRequest = {
        situation: "기타",
        tone: "정중하게",
        question: "?",
      };

      const result = await callRequestScript(request);

      expect(result.ok).toBe(false);
    });
  });
});
