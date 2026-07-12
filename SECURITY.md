# Security Policy

## 신고

보안 문제는 공개 이슈로 등록하지 마세요. GitHub 저장소의 **Security advisories**에서 비공개로 신고해 주세요.

신고에는 재현 절차, 영향 범위, 관련 파일 또는 endpoint를 포함해 주세요. 실제 access token, refresh token, client secret은 첨부하지 마세요.

## 지원 범위

현재는 최신 `main` 브랜치만 보안 수정 대상입니다.

## 비밀정보 원칙

- OAuth client secret과 refresh token은 확장프로그램 번들에 포함하지 않습니다.
- 로그와 AI export에는 token, authorization code, 이메일을 포함하지 않습니다.
- `.env`는 로컬 개발용이며 저장소에 커밋하지 않습니다.
