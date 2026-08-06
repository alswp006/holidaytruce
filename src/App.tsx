import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { HolidayProvider } from './lib/HolidayContext';
import Home from './pages/Home';
import Script from './pages/Script';
import Schedule from './pages/Schedule';
import Budget from './pages/Budget';
import Stress from './pages/Stress';
import Paywall from './pages/Paywall';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

/**
 * 앱 진입점 — 유일한 라우팅/Provider 소유자 (main.tsx는 @AI:ANCHOR, 수정 금지).
 * HolidayProvider가 라우트 트리 전체를 감싸며 quota AlertDialog를 Provider 레벨에서 렌더한다.
 * 하단 탭 네비(FloatingTabBar)는 각 페이지가 ScreenScaffold의 bottom 슬롯에서 소유한다.
 * 알 수 없는 경로는 홈(/)으로 리다이렉트해 흰 화면/스모크 타임아웃을 방지한다.
 */
export default function App() {
  return (
    <HolidayProvider>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/script" element={<Script />} />
        <Route path="/schedule" element={<Schedule />} />
        <Route path="/budget" element={<Budget />} />
        <Route path="/stress" element={<Stress />} />
        <Route path="/paywall" element={<Paywall />} />
        {DevTdsGallery && (
          <Route
            path="/__tds-gallery"
            element={
              <Suspense fallback={null}>
                <DevTdsGallery />
              </Suspense>
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HolidayProvider>
  );
}
