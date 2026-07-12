# Contributing

## 개발 환경

1. Node.js 22.12 이상과 pnpm 10 이상을 준비합니다.
2. `.env.example`을 `.env`로 복사합니다.
3. `pnpm install` 후 `pnpm dev`를 실행합니다.
4. 커밋 전에 `pnpm check`를 통과시킵니다.

## 브랜치와 커밋

- 기능 브랜치는 짧고 목적이 드러나는 이름을 사용합니다.
- 한 PR에는 하나의 제품 또는 기술 목적만 담습니다.
- 계약 변경은 관련 fixture와 테스트를 함께 갱신합니다.
- 비밀값, 실제 OAuth token, 개인 채널 원본 응답은 커밋하지 않습니다.

## Pull request

PR에는 변경 이유, 사용자 영향, 검증 명령, 남은 제한을 적습니다. UI 변경은 가능한 경우 사이드 패널과 전체 대시보드 캡처를 첨부합니다.

## 플랫폼 커넥터

새 데이터 수집기는 다음 경계를 지켜야 합니다.

- 로그인된 플랫폼 탭에서 읽기 전용 DOM 접근만 수행
- 쿠키, 세션 토큰, DM, 댓글 본문, 팔로워 목록 수집 금지
- 좋아요, 팔로우, 댓글, 게시 같은 쓰기 동작 금지
- redacted DOM 또는 API fixture
- 원본 응답에서 공통 계약으로의 mapping
- 지원하지 않는 지표의 명시적 coverage
- pagination 또는 가상 스크롤 종료 조건 테스트
- selector version과 필수 anchor 누락 테스트

YouTube 분석과 모든 플랫폼 게시 기능은 공식 API를 사용합니다. 게시 어댑터는 최소 OAuth scope, rate limit, token refresh, idempotency와 사용자 최종 확인을 포함해야 합니다.

## Fixture와 개인정보

- 실제 계정에서 얻은 fixture는 필요한 DOM 조각만 남기고 이메일, 토큰, 추천 계정과 불필요한 본문을 제거합니다.
- 숫자 0과 미제공, 로딩 실패, selector 불일치를 구분합니다.
- 실제 creator export와 `.data/` 파일은 커밋하지 않습니다.
- 공개 이슈에는 계정 식별 정보가 포함된 스크린샷을 올리지 않습니다.
