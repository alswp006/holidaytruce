import { Router, Request, Response } from "express";
import { generateScript, LlmError, Tone } from "../llm";

const ALLOWED_TONES: Tone[] = ["정중하게", "단호하게", "유머러스하게"];

const router = Router();

router.post("/script", async (req: Request, res: Response) => {
  const { situation, tone } = (req.body ?? {}) as { situation?: unknown; tone?: unknown };

  if (typeof situation !== "string" || situation.trim().length < 1 || situation.trim().length > 300) {
    return res.status(400).json({ error: "상황을 1자 이상 300자 이하로 입력해주세요" });
  }

  if (typeof tone !== "string" || !ALLOWED_TONES.includes(tone as Tone)) {
    return res.status(400).json({ error: "tone은 정중하게/단호하게/유머러스하게 중 하나여야 해요" });
  }

  try {
    const { result, model } = await generateScript(situation, tone as Tone);
    return res.status(200).json({ result, model });
  } catch (err) {
    const status = err instanceof LlmError ? err.status : 500;
    const message = err instanceof LlmError ? err.message : "스크립트 생성에 실패했어요. 잠시 후 다시 시도해주세요";
    return res.status(status).json({ error: message });
  }
});

export default router;
