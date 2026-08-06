import { AdSlot } from "./AdSlot";

export interface HomeBannerProps {
  adGroupId: string;
}

/**
 * 홈 배너 광고 슬롯 — 요약 Card 아래에 document flow로 배치(fixed/absolute 금지)해
 * 콘텐츠와 겹치지 않도록 한다.
 */
export function HomeBanner({ adGroupId }: HomeBannerProps) {
  return (
    <div
      data-testid="home-banner"
      style={{
        marginTop: 16,
        minHeight: 44,
        borderRadius: 16,
        backgroundColor: "var(--adaptiveLayeredBackground)",
      }}
    >
      <AdSlot adGroupId={adGroupId} />
    </div>
  );
}
