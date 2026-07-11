# YouTube 연결 설정

Creator Data Bridge는 YouTube 비밀번호나 브라우저 쿠키를 사용하지 않는다. Google OAuth 2.0으로 사용자가 승인한 읽기 권한만 받고, refresh token은 로컬 `.data`에 AES-256-GCM으로 암호화해 저장한다.

## 1. Google Cloud 준비

1. [Google Cloud Console](https://console.cloud.google.com/)에서 프로젝트를 만든다.
2. API Library에서 다음 API를 활성화한다.
   - YouTube Data API v3
   - YouTube Analytics API
3. OAuth consent screen을 구성하고 테스트 사용자에 연결할 Google 계정을 추가한다.
4. OAuth Client를 `Web application` 유형으로 만든다.
5. Authorized redirect URI에 다음 값을 정확히 추가한다.

```text
http://127.0.0.1:8787/v1/oauth/youtube/callback
```

## 2. 로컬 환경변수

저장소 루트에서 다음 명령을 실행한다.

```powershell
Copy-Item .env.example .env
pnpm secrets:generate
```

출력된 `TOKEN_ENCRYPTION_KEY=...` 한 줄과 Google OAuth 값을 `.env`에 입력한다.

```dotenv
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8787/v1/oauth/youtube/callback
TOKEN_ENCRYPTION_KEY=64-character-hex-value
```

`.env`, 암호화 token, 수집 snapshot은 Git에 포함되지 않는다.

## 3. 실행

```powershell
pnpm dev
```

대시보드에서 `YouTube 연결`을 누르고 Google 동의를 완료한 뒤 `모두 동기화`를 실행한다. 기본 수집 기간은 28일이며 7일과 90일을 선택할 수 있다.

## 수집 데이터

- 채널 제목, 썸네일, 현재 구독자, 누적 조회, 공개 영상 수
- 기간 조회, 시청 시간, 평균 시청 지속 시간
- 구독자 획득·이탈, 좋아요, 댓글, 공유
- 일별 조회·시청 시간·구독자 순증
- 기간 상위 영상과 영상별 성과

YouTube Analytics의 최신 날짜는 모든 요청 지표가 확정된 마지막 날짜까지만 반환될 수 있다. 구현은 불완전한 당일 대신 전날까지를 요청한다.

## 공식 문서

- https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps
- https://developers.google.com/youtube/v3/docs/channels/list
- https://developers.google.com/youtube/analytics/reference/reports/query
