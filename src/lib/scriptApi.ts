import type { ScriptRequest, ScriptResponse } from "@/lib/types";

export async function requestScript(
  req: ScriptRequest
): Promise<{ ok: true; data: ScriptResponse } | { ok: false }> {
  try {
    const baseUrl = import.meta.env.VITE_SCRIPT_API_URL;
    const response = await fetch(`${baseUrl}/api/script`, {
      method: "POST",
      mode: "cors",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });

    if (!response.ok) {
      return { ok: false };
    }

    const data = (await response.json()) as ScriptResponse;
    return { ok: true, data };
  } catch {
    return { ok: false };
  }
}
