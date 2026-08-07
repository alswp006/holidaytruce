// ============================================================================
// Entity Types (from SPEC Data Models)
// ============================================================================

export interface Couple {
  id: string;
  myRole: "며느리" | "사위" | "아내" | "남편";
  myFamilyLabel: string;
  partnerFamilyLabel: string;
  createdAt: number;
}

export interface Visit {
  id: string;
  family: "mine" | "partner";
  date: string;
  startHour: number;
  durationHours: number;
  holidayId: string;
  memo: string;
}

export interface BudgetItem {
  id: string;
  holidayId: string;
  target: "본가" | "시댁" | "기타";
  category: "용돈" | "선물" | "교통" | "기타";
  label: string;
  amount: number;
}

export interface ChecklistItem {
  id: string;
  holidayId: string;
  text: string;
  done: boolean;
}

export interface Script {
  id: string;
  situation: string;
  tone: "정중하게" | "단호하게" | "유머러스하게";
  question: string;
  resultText: string;
  createdAt: number;
  isAi: true;
}

export interface MoodLog {
  id: string;
  holidayId: string;
  exhaustionLevel: number;
  stressTags: string[];
  note: string;
  createdAt: number;
}

export interface AppFlags {
  aiNoticeAcknowledged: boolean;
  activeHolidayId: string;
  purchasedHolidays: string[];
}

export interface Holiday {
  id: string;
  name: string;
}

// ============================================================================
// API Contract Types
// ============================================================================

export interface ScriptRequest {
  situation: Situation;
  tone: Tone;
  question: string;
}

export interface ScriptResponse {
  reply: string;
  disclaimer: string;
}

export interface ApiError {
  error: string;
}

// ============================================================================
// Constants & Union Types
// ============================================================================

export const SITUATIONS = [
  "결혼계획질문",
  "취업질문",
  "외모지적",
  "명절노동분담",
  "기타",
] as const;

export type Situation = typeof SITUATIONS[number];

export const TONES = ["정중하게", "단호하게", "유머러스하게"] as const;

export type Tone = typeof TONES[number];

export const STRESS_TAGS = [
  "과한질문",
  "가사노동",
  "일정불균형",
] as const;

export type StressTag = typeof STRESS_TAGS[number];

// ============================================================================
// Route State Type (location.state contracts for all routes)
// ============================================================================

export type RouteState = {
  "/": undefined;
  "/setup": undefined;
  "/script": undefined;
  "/script/result": { scriptId: string };
  "/calendar": undefined;
  "/budget": undefined;
  "/report": undefined;
  "/report/new": undefined;
};
