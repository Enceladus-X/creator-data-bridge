# Creator Data Bridge

[![CI](https://github.com/Enceladus-X/creator-data-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/Enceladus-X/creator-data-bridge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

YouTube, TikTok, Instagram, X의 내 계정 성과 데이터를 한 번에 수집해 AI가 읽을 수 있는 CSV로 저장하는 로컬 우선 Chrome 확장프로그램입니다.

현재 `0.2.0` 확장프로그램은 로그인된 Chrome 세션을 이용해 플랫폼 탭을 직접 열고, 공개 프로필·콘텐츠 지표를 읽은 뒤 임시 탭을 정리합니다. 쿠키와 비밀번호는 읽지 않으며 수집 결과는 IndexedDB에 로컬 저장됩니다.

## 사용 흐름

1. Chrome에서 YouTube Studio, TikTok, Instagram, X에 로그인합니다.
2. 확장프로그램 사이드 패널의 `수집 설정`에서 사용할 플랫폼을 켭니다.
3. 플랫폼별 최대 콘텐츠 수를 `50`, `100`, `250`, `500` 중 선택합니다.
4. `수집하고 CSV 다운로드`를 누릅니다.
5. 최초 실행이면 선택한 사이트의 접근 권한을 한 번에 허용합니다.
6. 수집이 끝나면 UTF-8 BOM CSV가 자동으로 다운로드됩니다.

플랫폼 프로필 탭을 미리 열 필요는 없습니다. 열려 있는 프로필 탭은 첫 계정 탐색에 참고하고, 없으면 확장프로그램이 로그인된 홈 화면이나 이전에 저장한 핸들에서 계정을 찾습니다. 플랫폼 하나가 실패해도 성공한 플랫폼의 행은 보존되어 부분 결과 CSV가 생성됩니다.

사이드 패널 상단의 대시보드 아이콘을 누르면 최신 로컬 수집 데이터를 시각화한 전체 대시보드가 열립니다. 대시보드는 플랫폼별 조회·좋아요·댓글 합계, 조회 상위 콘텐츠, 검색·필터·정렬 가능한 콘텐츠 표, 플랫폼 비교 막대그래프와 CSV 재다운로드를 제공합니다. 설정 화면의 플랫폼 토글과 수집 한도는 사이드 패널과 공유됩니다.

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
| `pnpm test` | 계약, API, 수집기 및 CSV 테스트 |
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

브라우저 수집 경로는 OAuth 비밀키, 갱신 토큰, 쿠키를 저장하지 않습니다. YouTube Studio, TikTok, Instagram, X의 화면 성과 수집은 로그인된 Chrome 세션에서 로컬로 수행하고, 기존 YouTube 공식 API와 향후 게시 API는 선택적인 별도 백엔드 경로로 분리합니다.

## 제품 원칙

- 읽기 전용 로컬 수집은 사용자 동작으로 시작한 플랫폼 탭에서만 수행합니다.
- 최종 게시에는 화면 자동 클릭이 아니라 공식 API와 OAuth를 사용합니다.
- 원본 응답과 플랫폼 간 비교용 공통 지표를 분리합니다.
- `0`, `unsupported`, `unavailable`, `thresholded`를 서로 다른 상태로 취급합니다.
- AI 전송은 사용자가 검토할 수 있는 내보내기부터 시작합니다.
- 비밀값은 `.env` 또는 관리형 secret store에만 두고 Git에 커밋하지 않습니다.

## 문서

- [제품 요구사항](docs/PRODUCT_SPEC.md)
- [확장프로그램 로컬 수집 설계](docs/EXTENSION_COLLECTION_SPEC.md)
- [CSV 추출 확장프로그램 MVP 실행 계획](docs/CSV_EXTENSION_MVP_PLAN.md)
- [교차 플랫폼 자동 업로드 설계](docs/AUTOMATED_PUBLISHING_SPEC.md)
- [플랫폼 API 가용성](docs/PLATFORM_CAPABILITIES.md)
- [기술 아키텍처](docs/ARCHITECTURE.md)
- [AI 내보내기 계약](docs/AI_EXPORT_CONTRACT.md)
- [구현 로드맵](docs/ROADMAP.md)
- [YouTube 연결 설정](docs/YOUTUBE_SETUP.md)
- [기여 가이드](CONTRIBUTING.md)
- [커뮤니티 행동강령](CODE_OF_CONDUCT.md)
- [보안 정책](SECURITY.md)

## 현재 범위

Chrome MV3 사이드 패널, 선택적 사이트 권한, 플랫폼 토글 설정, 임시 탭 오케스트레이터, YouTube Studio·TikTok Studio·Instagram Reel·X 프로필 수집기, IndexedDB 저장, 부분 성공, 재시도와 자동 CSV 다운로드가 구현되어 있습니다. 전체 대시보드는 같은 로컬 레코드를 플랫폼·콘텐츠 단위로 시각화하고 CSV 재다운로드를 지원합니다. `0`과 미제공 지표를 구분하며 개인정보를 제거한 DOM fixture와 CSV 계약 테스트를 포함합니다. 댓글 작성, DM 관리와 자동 업로드는 현재 CSV MVP 범위에 포함하지 않습니다.
