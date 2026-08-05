// Reference Catalogs (as const) — Single Source of Truth for all domains
export const RELATIONS = ["시댁", "처가"] as const;
export type Relation = typeof RELATIONS[number];

export const TONES = ["정중", "단호", "유머"] as const;
export type ToneKey = typeof TONES[number];

export const SEASONS = ["2026-설", "2026-추석", "2027-설", "2027-추석"] as const;
export type Season = typeof SEASONS[number];

export const CAUSES = [
  "과도한 질문",
  "가사 부담",
  "장거리 이동",
  "비교·잔소리",
  "경제적 부담",
  "음식 준비",
  "형제·친척 갈등",
  "휴식 부족",
] as const;
export type Cause = typeof CAUSES[number];

// Data Models

// AppMeta — Global app flags (singleton, no id)
export interface AppMeta {
  aiNoticeAck: boolean;
  premiumUnlocked: boolean;
  premiumSeason: Season | null;
  createdAt: number;
  updatedAt: number;
}

// ScriptRequest — AI script generation request (value object, embedded in ScriptResult)
export interface ScriptRequest {
  relation: Relation;
  situation: string; // max 200 chars
  tone: ToneKey;
}

// ScriptResult — AI-generated script response (collection entity)
export interface ScriptResult {
  id: string; // crypto.randomUUID()
  request: ScriptRequest;
  scripts: string[]; // array of 3 generated sentences
  aiGenerated: true; // label flag for UI
  createdAt: number; // epoch ms
  updatedAt: number; // epoch ms
}

// VisitPlan — Holiday visit schedule (collection entity)
export interface VisitPlan {
  id: string; // crypto.randomUUID()
  relation: Relation;
  date: string; // "YYYY-MM-DD"
  hours: number; // 0.5~48 hours
  memo: string; // max 100 chars
  createdAt: number;
  updatedAt: number;
}

// BudgetItem — Budget item (embedded in BudgetPlan)
export interface BudgetItem {
  id: string; // crypto.randomUUID()
  relation: Relation;
  label: string; // max 40 chars
  amount: number; // ₩, 0~10,000,000
  checked: boolean; // preparation complete flag
  createdAt: number;
  updatedAt: number;
}

// BudgetPlan — Holiday budget plan (singleton, no id)
export interface BudgetPlan {
  items: BudgetItem[];
  createdAt: number;
  updatedAt: number;
}

// BurnoutLog — Emotional burnout record (collection entity)
export interface BurnoutLog {
  id: string; // crypto.randomUUID()
  season: Season;
  score: number; // 1~10
  causes: Cause[]; // subset of CAUSES catalog
  note: string; // max 300 chars
  createdAt: number;
  updatedAt: number;
}

// API Contracts

// ScriptApiRequest — External AI API request shape
export interface ScriptApiRequest {
  relation: Relation;
  situation: string; // 1~200 chars
  tone: ToneKey;
}

// ScriptApiResponse — External AI API response shape
export interface ScriptApiResponse {
  scripts: string[]; // exactly 3 sentences
}

// ApiError — Standard error response shape
export interface ApiError {
  error: string; // error code (e.g., "invalid_situation", "rate_limited", "internal_error")
}

// RouteState — Type-safe screen-to-screen navigation state
export type RouteState = {
  "/": undefined;
  "/script": undefined;
  "/script/result": { resultId: string } | undefined;
  "/calendar": undefined;
  "/budget": undefined;
  "/report": undefined;
  "/premium": undefined;
};

// localStorage Key Constants
export const STORAGE_KEYS = {
  meta: "holidaytruce:meta",
  scripts: "holidaytruce:scripts",
  visits: "holidaytruce:visits",
  budget: "holidaytruce:budget",
  burnout: "holidaytruce:burnout",
} as const;
