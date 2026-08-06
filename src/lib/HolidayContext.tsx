import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { AlertDialog } from '@toss/tds-mobile';
import type { AppMeta } from './types';
import { getMeta, setMeta } from './meta';

/**
 * 현재 명절 컨텍스트 + 전역 quota 알림.
 *
 * - `currentHolidayId`를 전역 관리하고 `ht.meta`에 영속화한다(기본값: 다가오는 가장 가까운 명절).
 * - `isPaid`·`aiNoticeAck` 플래그 getter/setter 제공.
 * - localStorage 용량 초과(QuotaExceededError) 시 `reportQuotaExceeded()`가 호출되면
 *   Provider 레벨에서 AlertDialog를 렌더한다(어느 페이지에 있든 크래시 없이 안내).
 */

export type HolidayContextValue = {
  currentHolidayId: string;
  setCurrentHoliday: (id: string) => void;
  isPaid: boolean;
  setIsPaid: (paid: boolean) => void;
  aiNoticeAck: boolean;
  setAiNoticeAck: (ack: boolean) => void;
  reportQuotaExceeded: () => void;
};

const HolidayContext = createContext<HolidayContextValue | null>(null);

// storage 계층(다른 패킷)이 QuotaExceededError를 만나면 이 핸들러를 호출해
// 컨텍스트를 몰라도 Provider의 AlertDialog를 띄울 수 있게 한다.
let quotaHandler: (() => void) | null = null;
export function reportQuotaExceeded(): void {
  quotaHandler?.();
}

export function HolidayProvider({ children }: { children: ReactNode }) {
  const [meta, setMetaState] = useState<AppMeta>(() => getMeta());
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const persist = useCallback((next: AppMeta) => {
    setMetaState(next);
    setMeta(next);
  }, []);

  const setCurrentHoliday = useCallback(
    (id: string) => persist({ ...meta, currentHolidayId: id }),
    [meta, persist],
  );
  const setIsPaid = useCallback(
    (paid: boolean) => persist({ ...meta, isPaid: paid }),
    [meta, persist],
  );
  const setAiNoticeAck = useCallback(
    (ack: boolean) => persist({ ...meta, aiNoticeAck: ack }),
    [meta, persist],
  );

  const reportQuota = useCallback(() => setQuotaExceeded(true), []);

  useEffect(() => {
    quotaHandler = reportQuota;
    return () => {
      if (quotaHandler === reportQuota) quotaHandler = null;
    };
  }, [reportQuota]);

  const value = useMemo<HolidayContextValue>(
    () => ({
      currentHolidayId: meta.currentHolidayId,
      setCurrentHoliday,
      isPaid: meta.isPaid,
      setIsPaid,
      aiNoticeAck: meta.aiNoticeAck,
      setAiNoticeAck,
      reportQuotaExceeded: reportQuota,
    }),
    [meta, setCurrentHoliday, setIsPaid, setAiNoticeAck, reportQuota],
  );

  return (
    <HolidayContext.Provider value={value}>
      {children}
      <AlertDialog
        open={quotaExceeded}
        title="저장 공간 부족"
        description="저장 공간이 부족합니다. 이전 명절 기록을 삭제해주세요"
        alertButton={
          <AlertDialog.AlertButton onClick={() => setQuotaExceeded(false)}>
            닫기
          </AlertDialog.AlertButton>
        }
        onClose={() => setQuotaExceeded(false)}
      />
    </HolidayContext.Provider>
  );
}

export function useHoliday(): HolidayContextValue {
  const ctx = useContext(HolidayContext);
  if (!ctx) throw new Error('useHoliday must be used within HolidayProvider');
  return ctx;
}
