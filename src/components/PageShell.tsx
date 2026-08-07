import { createElement as h } from "react";
import type { CSSProperties, ReactNode } from "react";

/**
 * 페이지 SafeArea 래퍼 — 모든 페이지의 최상위 컨테이너.
 * 100dvh(뷰포트 고정 단위 대신 동적 단위) + safe-area 패딩 + adaptive 배경을 일관되게 적용한다.
 *
 * Pre-built (재구현 금지): 새 페이지는 이 컴포넌트로 감싸라.
 * 헤더/하단 CTA까지 한 번에 두려면 ScreenScaffold를 쓰라.
 *
 * NOTE: JSX 대신 createElement 사용 — 모든 페이지가 이 컴포넌트를 거치는데, 페이지 테스트의
 * `require("@/pages/...")`는 Node 네이티브 로드 경로를 타서 JSX를 트랜스파일하지 못한다.
 */
export function PageShell({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return h(
    "div",
    {
      style: {
        minHeight: "100dvh",
        paddingTop: "calc(var(--toss-safe-area-top) + 16px)",
        paddingBottom: "calc(var(--toss-safe-area-bottom) + 16px)",
        backgroundColor: "var(--adaptiveBackground)",
        ...style,
      },
    },
    children,
  );
}
