import { Top, Asset } from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState } from '../components/StateView';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { TABS } from '../lib/nav';

// 골격 스텁 — 감정소진 기록·리포트(/stress). 점수 입력·추이 리포트는 후속 패킷에서 채운다.
export default function Stress() {
  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>감정 기록</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      <EmptyState
        icon={<Asset.ContentIcon name="iconHeartRegular" alt="감정 기록" />}
        title="명절 후 감정을 기록해보세요"
        description="소진도를 남기면 다음 명절 대비 리포트로 정리해 드려요"
      />
    </ScreenScaffold>
  );
}
