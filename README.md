# Creator Data Bridge

[![CI](https://github.com/Enceladus-X/creator-data-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/Enceladus-X/creator-data-bridge/actions/workflows/ci.yml)

유튜브, 인스타그램, 틱톡, X의 내 계정 성과 데이터를 한 번에 동기화하고 AI가 바로 읽을 수 있는 형태로 내보내는 Chrome 확장프로그램입니다.

현재 저장소에는 Chrome Manifest V3 확장프로그램, Fastify API, 공통 Zod 데이터 계약이 함께 빌드되는 초기 모노레포가 구성되어 있습니다. 첫 실제 커넥터는 YouTube입니다.

## 시작하기

필요한 도구:

- Node.js 22.12 이상
- pnpm 10 이상
- Chrome 최신 안정 버전

```powershell
git clone https://github.com/Enceladus-X/creator-data-bridge.git
cd creator-data-bridge
Copy-Item .env.example .env
pnpm install
pnpm dev
```

개발 중인 확장프로그램은 Chrome의 `chrome://extensions`에서 개발자 모드를 켠 뒤 `apps/extension/dist`를 압축 해제된 확장프로그램으로 불러옵니다.

## 명령

| 명령 | 용도 |
| --- | --- |
| `pnpm dev` | API와 확장프로그램 개발 모드 실행 |
| `pnpm lint` | Biome 정적 검사 |
| `pnpm secrets:generate` | 로컬 token 암호화 키 생성 |
| `pnpm typecheck` | 모든 workspace TypeScript 검사 |
| `pnpm test` | 계약 및 API 테스트 |
| `pnpm build` | 모든 workspace 프로덕션 빌드 |
| `pnpm check` | lint, typecheck, test, build 전체 실행 |

## 구조

```text
apps/
  api/                    Fastify API와 connector endpoint
  extension/              Chrome MV3 사이드 패널과 대시보드
packages/
  contracts/              플랫폼, 지표, 동기화 공통 Zod 계약
docs/                     제품, API 가용성, 아키텍처, 로드맵
```

확장프로그램은 OAuth 비밀키나 갱신 토큰을 저장하지 않습니다. 장기 토큰과 실제 플랫폼 수집은 별도 API가 담당하며, 확장은 연결·동기화·확인·내보내기의 조작면을 담당합니다.

## 제품 원칙

- 공식 API와 OAuth만 사용하고 Studio/대시보드 화면을 스크래핑하지 않습니다.
- 원본 응답과 플랫폼 간 비교용 공통 지표를 분리합니다.
- `0`, `unsupported`, `unavailable`, `thresholded`를 서로 다른 상태로 취급합니다.
- AI 전송은 사용자가 검토할 수 있는 내보내기부터 시작합니다.
- 비밀값은 `.env` 또는 관리형 secret store에만 두고 Git에 커밋하지 않습니다.

## 문서

- [제품 요구사항](docs/PRODUCT_SPEC.md)
- [플랫폼 API 가용성](docs/PLATFORM_CAPABILITIES.md)
- [기술 아키텍처](docs/ARCHITECTURE.md)
- [AI 내보내기 계약](docs/AI_EXPORT_CONTRACT.md)
- [구현 로드맵](docs/ROADMAP.md)
- [YouTube 연결 설정](docs/YOUTUBE_SETUP.md)
- [기여 가이드](CONTRIBUTING.md)
- [보안 정책](SECURITY.md)

## 현재 범위

YouTube OAuth, 암호화 token 저장, Data API와 Analytics API 동기화가 구현되어 있습니다. Google Cloud 자격증명을 설정하면 본인 채널의 실제 데이터를 수집할 수 있습니다. Instagram, TikTok, X connector와 PostgreSQL 저장소는 다음 단계입니다. 게시·댓글·DM 관리와 비공식 스크래핑은 MVP 범위에 포함하지 않습니다.
