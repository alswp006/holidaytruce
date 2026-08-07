/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

export type User = { id: string; name: string; email?: string };

export type FamilyMember = { id: string; name: string; relationship?: string };

export type Schedule = { id: string; date: string; memberId: string; notes?: string };

export type Mood = { id: string; date: string; level: number; notes?: string };

export type Budget = { id: string; month: string; category: string; amount: number; spent?: number };

export type getUserFn = () => User | null;

export type saveUserFn = (user: User) => void;

export type getFamilyMembersFn = () => FamilyMember[];

export type saveFamilyMembersFn = (members: FamilyMember[]) => void;

export type getSchedulesFn = (date?: string) => Schedule[];

export type saveSchedulesFn = (schedules: Schedule[]) => void;

export type getMoodsFn = () => Mood[];

export type saveMoodsFn = (moods: Mood[]) => void;

export type getBudgetsFn = () => Budget[];

export type saveBudgetsFn = (budgets: Budget[]) => void;

export type getHolidaysFn = (year: number) => { date: string; name: string }[];

export type useAppDataFn = () => { user: User | null; familyMembers: FamilyMember[]; schedules: Schedule[]; moods: Mood[]; budgets: Budget[] };

export type getTossSessionFn = () => string | null;

export type setTossSessionFn = (token: string) => void;

export type createScriptFn = (params: any) => Promise<{ scriptId: string; content: string }>;
