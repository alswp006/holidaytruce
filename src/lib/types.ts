// Entity types
export interface VisitSchedule {
  id: string;
  side: "본가" | "처가";
  date: string;
  startTime?: string;
  endTime?: string;
  memo: string;
  holidayId: string;
  createdAt: number;
}

export interface BudgetItem {
  id: string;
  side: "본가" | "처가";
  category: "용돈" | "선물" | "차례비용" | "교통" | "기타";
  label: string;
  amount: number;
  paid: boolean;
  holidayId: string;
  createdAt: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  holidayId: string;
}

export interface ScriptRecord {
  id: string;
  situation: string;
  tone: "정중하게" | "단호하게" | "유머러스하게";
  result: string;
  createdAt: number;
}

export interface StressLog {
  id: string;
  holidayId: string;
  score: number;
  triggers: string[];
  memo: string;
  createdAt: number;
}

export interface AppMeta {
  aiNoticeAck: boolean;
  currentHolidayId: string;
  isPaid: boolean;
}

// API types
export interface ScriptRequest {
  situation: string;
  tone: "정중하게" | "단호하게" | "유머러스하게";
}

export interface ScriptResponse {
  result: string;
  id: string;
  createdAt: number;
}

export interface ApiError {
  code: number;
  message: string;
}

// Route state union
export type RouteState = {
  scriptData?: ScriptRecord;
  scheduleData?: VisitSchedule;
  budgetData?: BudgetItem;
  stressData?: StressLog;
  isPaid?: boolean;
  fromPage?: string;
};
