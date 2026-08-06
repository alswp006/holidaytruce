import type { ScriptRequest, ScriptResponse } from "@/lib/types";

/**
 * 스크립트 생성 API 클라이언트
 *
 * POST {VITE_API_BASE}/api/script 호출
 * - 클라이언트 검증: situation 1~300자
 * - 서버 응답 200: {result, model} 반환
 * - 4xx/5xx/network/timeout: 통일 에러 throw (호출부가 Toast 처리)
 * - 타임아웃: 15초
 * - SDK error 가드로 조용히 처리 (에러 UI 상태로 전환)
 */

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function generateScript(req: ScriptRequest): Promise<ScriptResponse> {
  // ── 클라이언트 검증: situation 1~300자 ──
  const situation = req.situation?.trim() ?? "";

  if (!situation) {
    throw new ApiError("상황을 입력해 주세요. (필수, 1~300자)");
  }

  if (situation.length > 300) {
    throw new ApiError("상황은 최대 300자까지 입력할 수 있습니다.");
  }

  // ── fetch 요청 ──
  const apiBase = import.meta.env.VITE_API_BASE || "http://localhost:3000";
  const url = `${apiBase}/api/script`;

  // 타임아웃 15초로 설정
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        situation: req.situation,
        tone: req.tone,
      }),
      signal: controller.signal,
    });

    // 타임아웃 후 응답이 온 경우 대비
    clearTimeout(timeoutId);

    // 4xx/5xx 에러 처리
    if (!response.ok) {
      let errorMessage = `요청 실패: ${response.status}`;

      try {
        const errorData = await response.json();
        if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch {
        // JSON 파싱 실패 시 기본 메시지 사용
      }

      throw new ApiError(errorMessage, response.status);
    }

    // 200 응답 파싱
    const data = await response.json();

    // 응답 검증
    if (!data.result || !data.model) {
      throw new ApiError("응답 형식이 올바르지 않습니다.");
    }

    return data as ScriptResponse;
  } catch (error) {
    clearTimeout(timeoutId);

    // 타임아웃 처리
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError("요청 시간 초과 (15초)");
    }

    // ApiError는 그대로 throw
    if (error instanceof ApiError) {
      throw error;
    }

    // 네트워크 에러 등
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.";
    throw new ApiError(message);
  }
}
