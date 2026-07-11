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

새 커넥터는 공식 API만 사용해야 하며 다음을 포함합니다.

- 최소 OAuth scope 목록
- redacted API fixture
- 원본 응답에서 공통 계약으로의 mapping
- 지원하지 않는 지표의 명시적 coverage
- pagination, rate limit, token refresh 테스트
