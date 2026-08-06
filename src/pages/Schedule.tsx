import { Top, Asset } from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState } from '../components/StateView';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { TABS } from '../lib/nav';

// 골격 스텁 — 본가/처가 방문 일정(/schedule). 일정 CRUD·균형 비교는 후속 패킷에서 채운다.
export default function Schedule() {
  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>방문 일정</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      <EmptyState
        icon={<Asset.ContentIcon name="iconCalendarRegular" alt="일정" />}
        title="아직 등록된 방문 일정이 없어요"
        description="본가·처가 방문 일정을 추가해 양가 균형을 맞춰요"
      />
    </ScreenScaffold>
  );
}
