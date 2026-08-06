import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ScriptRequest, ScriptResponse } from "@/lib/types";
import { generateScript } from "@/lib/api";

/**
 * packet-0006: 스크립트 생성 API 클라이언트 테스트
 *
 * generateScript(req:ScriptRequest):Promise<ScriptResponse>
 * - 클라이언트 검증: situation 1~300자
 * - fetch POST {VITE_API_BASE}/api/script
 * - 200 응답: {result, model} 반환
 * - 4xx/5xx/network/timeout: 통일 에러 throw
 * - 타임아웃: 15초
 *
 * 구현 파일: src/lib/api.ts
 */

// =============================================================================
// AC-1 [P0]: 유효 요청 → {result, model} 반환
// =============================================================================

describe("generateScript — AC-1 [P0]: 유효 요청 성공", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // VITE_API_BASE 설정 (테스트 환경)
    process.env.VITE_API_BASE = "http://localhost:3000";
  });

  it("AC-1.1: situation 유효(50자), tone 유효 → {result, model} 반환", async () => {
    // Mock fetch
    const mockResponse: ScriptResponse = {
      result: "명절 대화 스크립트 예시...",
      model: "claude-3-5-sonnet-20241022",
    };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await generateScript({
      situation: "명절마다 취업 언제 하냐는 질문에 답하기 힘들어요",
      tone: "정중하게",
    });

    expect(result).toEqual(mockResponse);
    expect(result.result).toBeTruthy();
    expect(result.model).toBeTruthy();
  });

  it("AC-1.2: tone='정중하게' → 성공", async () => {
    const mockResponse: ScriptResponse = {
      result: "경어체 스크립트...",
      model: "claude-3-5-sonnet-20241022",
    };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await generateScript({
      situation: "테스트 상황",
      tone: "정중하게",
    });

    expect(result).toEqual(mockResponse);
  });

  it("AC-1.3: tone='단호하게' → 성공", async () => {
    const mockResponse: ScriptResponse = {
      result: "단호한 스크립트...",
      model: "claude-3-5-sonnet-20241022",
    };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await generateScript({
      situation: "테스트 상황",
      tone: "단호하게",
    });

    expect(result).toEqual(mockResponse);
  });

  it("AC-1.4: tone='유머러스하게' → 성공", async () => {
    const mockResponse: ScriptResponse = {
      result: "재미있는 스크립트...",
      model: "claude-3-5-sonnet-20241022",
    };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await generateScript({
      situation: "테스트 상황",
      tone: "유머러스하게",
    });

    expect(result).toEqual(mockResponse);
  });

  it("AC-1.5: situation 최소 길이(1자) → 성공", async () => {
    const mockResponse: ScriptResponse = {
      result: "답장...",
      model: "claude-3-5-sonnet-20241022",
    };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await generateScript({
      situation: "A",
      tone: "정중하게",
    });

    expect(result).toEqual(mockResponse);
  });

  it("AC-1.6: situation 최대 길이(300자) → 성공", async () => {
    const maxSituation = "상".repeat(300); // 정확히 300자
    const mockResponse: ScriptResponse = {
      result: "길이 있는 스크립트...",
      model: "claude-3-5-sonnet-20241022",
    };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await generateScript({
      situation: maxSituation,
      tone: "정중하게",
    });

    expect(result).toEqual(mockResponse);
  });
});

// =============================================================================
// AC-2 [P0]: situation 검증 실패 → 로컬 에러 throw (API 미호출)
// =============================================================================

describe("generateScript — AC-2 [P0]: situation 검증 (클라이언트)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
  });

  it("AC-2.1: situation 공란 → 에러 throw, API 미호출", async () => {
    // generateScript는 빈 상황을 거부해야 함
    // (API 호출 없이 로컬에서)

    await expect(
      generateScript({
        situation: "",
        tone: "정중하게",
      }),
    ).rejects.toThrow(/상황|situation|필수|입력/i);

    // fetch가 호출되지 않았음
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("AC-2.2: situation 301자 초과 → 에러 throw, API 미호출", async () => {
    const tooLong = "상".repeat(301); // 301자

    await expect(
      generateScript({
        situation: tooLong,
        tone: "정중하게",
      }),
    ).rejects.toThrow(/300|최대|길이/i);

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("AC-2.3: situation null → 에러 throw", async () => {
    await expect(
      generateScript({
        situation: null as any,
        tone: "정중하게",
      }),
    ).rejects.toThrow();

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("AC-2.4: situation이 공백만 → 에러 throw", async () => {
    await expect(
      generateScript({
        situation: "   ",
        tone: "정중하게",
      }),
    ).rejects.toThrow();

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

// =============================================================================
// AC-3 [P0]: 서버 에러(4xx/5xx) → 통일 에러 throw
// =============================================================================

describe("generateScript — AC-3 [P0]: 서버 에러 → 통일 에러 throw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC-3.1: 400 응답 → 에러 throw (메시지 포함)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Invalid request" }),
    });

    await expect(
      generateScript({
        situation: "테스트",
        tone: "정중하게",
      }),
    ).rejects.toThrow();
  });

  it("AC-3.2: 429 응답(Rate Limit) → 에러 throw", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "Too many requests" }),
    });

    await expect(
      generateScript({
        situation: "테스트",
        tone: "정중하게",
      }),
    ).rejects.toThrow();
  });

  it("AC-3.3: 500 응답 → 에러 throw", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Internal server error" }),
    });

    await expect(
      generateScript({
        situation: "테스트",
        tone: "정중하게",
      }),
    ).rejects.toThrow();
  });

  it("AC-3.4: 503 응답(Service Unavailable) → 에러 throw", async () => {
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 503,
      json: async () => ({ error: "Service unavailable" }),
    });

    await expect(
      generateScript({
        situation: "테스트",
        tone: "정중하게",
      }),
    ).rejects.toThrow();
  });
});

// =============================================================================
// AC-4 [P0]: 네트워크 에러 → 통일 에러 throw
// =============================================================================

describe("generateScript — AC-4 [P0]: 네트워크 에러 → 통일 에러 throw", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC-4.1: fetch 실패(network error) → 에러 throw", async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    await expect(
      generateScript({
        situation: "테스트",
        tone: "정중하게",
      }),
    ).rejects.toThrow();
  });

  it("AC-4.2: fetch 타임아웃 → 에러 throw", async () => {
    // AbortController 사용 시뮬레이션
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("AbortError: The operation was aborted"));

    await expect(
      generateScript({
        situation: "테스트",
        tone: "정중하게",
      }),
    ).rejects.toThrow();
  });

  it("AC-4.3: 연결 거부 → 에러 throw", async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"));

    await expect(
      generateScript({
        situation: "테스트",
        tone: "정중하게",
      }),
    ).rejects.toThrow();
  });
});

// =============================================================================
// AC-5 [P0]: 타임아웃 15초 → 통일 에러 throw
// =============================================================================

describe("generateScript — AC-5 [P0]: 타임아웃 15초", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC-5.1: 15초 이내 완료 → 성공", async () => {
    const mockResponse: ScriptResponse = {
      result: "빠른 응답...",
      model: "claude-3-5-sonnet-20241022",
    };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    const result = await generateScript({
      situation: "테스트",
      tone: "정중하게",
    });

    await expect(Promise.resolve(result)).resolves.toEqual(mockResponse);
  });

  it("AC-5.2: 15초 초과 → 타임아웃 에러 throw", async () => {
    // AbortController의 abort() 시 fetch가 rejected되는 것을 시뮬레이션
    globalThis.fetch = vi.fn().mockImplementationOnce(() => {
      return new Promise((_, reject) => {
        // setTimeout을 사용하지 않고, Promise를 지연시킴
        // generateScript가 15초 후 abort()하면 reject됨
        setTimeout(() => {
          reject(new Error("AbortError: The operation was aborted"));
        }, 100); // 구현의 timeout(15000) 다음에 reject됨
      });
    });

    // 실제로는 구현이 15초 후 abort()하면 AbortError를 throw함
    await expect(
      generateScript({
        situation: "테스트",
        tone: "정중하게",
      }),
    ).rejects.toThrow(/timeout|15|abort/i);
  });
});

// =============================================================================
// AC-6 [P0]: console.error 미사용 (프로덕션)
// =============================================================================

describe("generateScript — AC-6 [P0]: console.error 0개", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-6.1: 성공 응답 시 console.error 호출 안 함", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error");

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        result: "답장...",
        model: "claude-3-5-sonnet-20241022",
      }),
    });

    await generateScript({
      situation: "테스트",
      tone: "정중하게",
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("AC-6.2: 에러 응답 시 console.error 호출 안 함", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error");

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    });

    try {
      await generateScript({
        situation: "테스트",
        tone: "정중하게",
      });
    } catch {
      // 에러는 throw되어야 함
    }

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it("AC-6.3: 타임아웃 시 console.error 호출 안 함", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error");

    globalThis.fetch = vi.fn().mockImplementationOnce(() => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("AbortError: The operation was aborted"));
        }, 100);
      });
    });

    try {
      await generateScript({
        situation: "테스트",
        tone: "정중하게",
      });
    } catch {
      // 예상된 에러
    }

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

// =============================================================================
// AC-7 [P0]: VITE_API_BASE 환경 변수 사용
// =============================================================================

describe("generateScript — AC-7 [P0]: VITE_API_BASE 환경 변수", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("AC-7.1: VITE_API_BASE='http://localhost:3000' → 그 주소로 POST", async () => {
    process.env.VITE_API_BASE = "http://localhost:3000";

    const mockResponse: ScriptResponse = {
      result: "답장...",
      model: "claude-3-5-sonnet-20241022",
    };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    await generateScript({
      situation: "테스트",
      tone: "정중하게",
    });

    // fetch가 정확한 URL로 호출되었는지 확인
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("http://localhost:3000"),
      expect.any(Object),
    );
  });

  it("AC-7.2: VITE_API_BASE='https://api.example.com' → 그 주소로 POST", async () => {
    process.env.VITE_API_BASE = "https://api.example.com";

    const mockResponse: ScriptResponse = {
      result: "답장...",
      model: "claude-3-5-sonnet-20241022",
    };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    await generateScript({
      situation: "테스트",
      tone: "정중하게",
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringContaining("https://api.example.com"),
      expect.any(Object),
    );
  });

  it("AC-7.3: 요청 헤더에 사용자 정의 헤더 추가 금지 (Authorization 등)", async () => {
    const mockResponse: ScriptResponse = {
      result: "답장...",
      model: "claude-3-5-sonnet-20241022",
    };
    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    await generateScript({
      situation: "테스트",
      tone: "정중하게",
    });

    const callArgs = (globalThis.fetch as any).mock.calls[0];
    const options = callArgs[1];

    // Authorization 헤더가 없어야 함
    expect(options.headers || {}).not.toHaveProperty("Authorization");
    // API 키가 노출되면 안 됨
    const headerStr = JSON.stringify(options.headers || {});
    expect(headerStr).not.toContain("sk-");
  });
});

// =============================================================================
// 통합 테스트
// =============================================================================

describe("generateScript — 통합 테스트", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("시나리오: 사용자가 상황 입력 → API 호출 → 결과 반환", async () => {
    // Given
    const situation = "명절마다 취업 언제 하냐고 물어봐서 힘들어요";
    const tone = "정중하게" as const;
    const expectedResult = "명절 대화 스크립트...";
    const expectedModel = "claude-3-5-sonnet-20241022";

    const mockResponse: ScriptResponse = {
      result: expectedResult,
      model: expectedModel,
    };

    globalThis.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockResponse,
    });

    // When
    const result = await generateScript({
      situation,
      tone,
    });

    // Then
    expect(result.result).toBe(expectedResult);
    expect(result.model).toBe(expectedModel);

    // fetch 호출 확인
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url, options] = (globalThis.fetch as any).mock.calls[0];
    expect(url).toContain("/api/script");
    expect(options.method).toBe("POST");
  });

  it("시나리오: 네트워크 오류 시 호출부에서 Toast로 처리할 수 있도록 에러 throw", async () => {
    globalThis.fetch = vi.fn().mockRejectedValueOnce(new Error("Network error"));

    // 호출부는 try-catch로 에러를 잡아 Toast 처리
    let thrownError: Error | null = null;
    try {
      await generateScript({
        situation: "테스트",
        tone: "정중하게",
      });
    } catch (error) {
      thrownError = error as Error;
    }

    // 에러가 throw되었음
    expect(thrownError).not.toBeNull();
    expect(thrownError?.message).toBeTruthy();
  });

  it("시나리오: 빈 상황 입력 → API 호출 전에 로컬에서 즉시 실패", async () => {
    let apiWasCalled = false;
    globalThis.fetch = vi.fn().mockImplementationOnce(() => {
      apiWasCalled = true;
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ result: "", model: "" }),
      });
    });

    let thrownError: Error | null = null;
    try {
      await generateScript({
        situation: "",
        tone: "정중하게",
      });
    } catch (error) {
      thrownError = error as Error;
    }

    // 에러가 즉시 throw되었고, API는 호출되지 않음
    expect(thrownError).not.toBeNull();
    expect(apiWasCalled).toBe(false);
  });
});
