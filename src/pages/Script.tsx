import { Top, Asset } from '@toss/tds-mobile';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { EmptyState } from '../components/StateView';
import { FloatingTabBar } from '../components/FloatingTabBar';
import { TABS } from '../lib/nav';

// 골격 스텁 — AI 응대 스크립트 화면(/script). 상세 폼·생성 로직은 후속 패킷에서 채운다.
export default function Script() {
  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>응대 스크립트</Top.TitleParagraph>} />}
      bottom={<FloatingTabBar items={TABS} />}
    >
      <EmptyState
        icon={<Asset.ContentIcon name="iconChatBubbleRegular" alt="스크립트" />}
        title="곤란한 질문, 미리 준비해요"
        description="상황과 톤을 고르면 응대 스크립트를 만들어 드려요"
      />
    </ScreenScaffold>
  );
}
