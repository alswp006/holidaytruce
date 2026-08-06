# HolidayTruce

앱인토스 (Vite + React + TDS) 명절증후군은 매년 언론·맘카페에 반복 등장하는 검증된 페인포인트지만, 연 2회뿐인 이벤트라 대기업들이 거들떠보지 않는 사각지대 — 그 좁은 틈을 시댁 응대 스크립트와 일정·예산 조율 도구로 공략. 명절마다 반복되는 시댁/처가 방문 일정 조율, 용돈·선물 예산 갈등, '며느리 우울증'으로 불리는 스트레스가 부부싸움과 이혼율 급증으로 이어지지만 이를 관리해주는 도구가 없고 정보는 커뮤니티에 파편화되어 있음.

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/Budget` | Budget |
| `/Home` | Home |
| `/Paywall` | Paywall |
| `/Schedule` | Schedule |
| `/Script` | Script |
| `/Stress` | Stress |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-08-06
