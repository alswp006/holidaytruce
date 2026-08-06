import type { TabItem } from '../components/FloatingTabBar';

/**
 * 하단 탭 네비게이션 구성 (5탭) — 모든 탭-루트 페이지가 공유.
 * spec S1~S6: 홈(/) · 일정(/schedule) · 예산(/budget) · 스크립트(/script) · 기록(/stress)
 * 각 페이지가 ScreenScaffold의 bottom 슬롯에 <FloatingTabBar items={TABS} />로 렌더한다.
 */
export const TABS: TabItem[] = [
  { label: '홈', path: '/' },
  { label: '일정', path: '/schedule' },
  { label: '예산', path: '/budget' },
  { label: '스크립트', path: '/script' },
  { label: '기록', path: '/stress' },
];
