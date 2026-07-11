# 구현 로드맵

기간은 개발자 1명이 집중해서 진행하는 대략적인 구현 시간이며, 각 플랫폼 앱 심사 대기 시간은 제외한다.

## 전략

네 플랫폼을 얕게 동시에 연결하지 않는다. 공통 계약을 먼저 만든 뒤 유튜브로 연결부터 AI export까지 한 번 완주한다. 이후 connector 인터페이스를 유지하며 Instagram, TikTok, X를 차례로 붙인다.

우선순위는 다음과 같다.

1. 유튜브: 분석 깊이가 가장 높고 제품 가치를 검증하기 좋다.
2. Instagram: Professional 계정 제약과 앱 심사를 일찍 확인해야 한다.
3. TikTok: Display API로 가능한 범위를 명확히 보여준다.
4. X: 사용량 과금과 최근 30일 private metric 제한을 비용 모델과 함께 검증한다.

## 현재 상태

2026-07-11 기준으로 pnpm TypeScript 모노레포, 공통 Zod 계약, Chrome MV3 확장 셸, Fastify API, CI가 구성되었다.

YouTube OAuth, 로컬 암호화 token vault, Data/Analytics API 동기화, 일별 추이, 상위 콘텐츠, JSON 내보내기까지 구현되었다. 실제 Google OAuth 자격증명을 통한 실계정 smoke test와 redacted fixture 수집이 다음 검증 단계다.

## Phase 0: 기획과 API 스파이크

예상: 2~3일

- 제품 요구사항과 공통 지표 레지스트리 확정
- 네 플랫폼 개발자 앱 생성 조건 확인
- OAuth redirect와 심사 준비 체크리스트 작성
- 각 플랫폼에서 최소 1회 실제 API 응답 저장
- API 응답을 기반으로 fixture와 redaction 규칙 작성

완료된 기반 작업:

- [x] 제품 요구사항과 공통 coverage 정의
- [x] pnpm TypeScript 모노레포
- [x] 공통 metric observation 계약과 테스트
- [x] MV3 사이드 패널 및 전체 대시보드 셸
- [x] Fastify health/platform endpoint
- [x] GitHub Actions CI와 공개 저장소 운영 템플릿
- [x] YouTube Web OAuth callback과 CSRF state 검증
- [x] AES-256-GCM token vault와 snapshot 저장
- [x] YouTube Data/Analytics API 수집 서비스
- [x] 실데이터 대시보드, 추이, 콘텐츠, JSON 내보내기

완료 기준:

- 테스트 계정과 앱 등록 경로가 준비됨
- 계획한 핵심 지표의 실제 지원 여부가 표에 반영됨
- client secret이 필요한 흐름과 PKCE 가능 흐름이 확정됨

## Phase 1: 유튜브 수직 슬라이스

예상: 7~10일

- pnpm TypeScript 모노레포 구성
- MV3 확장 action, side panel, dashboard shell
- API 세션, OAuth Broker, 암호화 토큰 저장
- YouTube Data/Analytics connector
- 동기화 실행, pagination, retry, checkpoint
- 계정 개요, 일별 추이, 상위 영상 화면
- 연결 해제와 데이터 삭제

완료 기준:

- 확장 아이콘에서 채널 연결과 28일 동기화를 완료함
- 확장 서비스 워커가 중단되어도 서버 작업이 계속됨
- Studio 대표 지표와 차이가 있을 때 coverage 또는 날짜 지연으로 설명됨

## Phase 2: AI 패키지와 품질 기준

예상: 4~6일

- 공통 metric registry와 provenance 구현
- Markdown, JSON, CSV export builder
- export 미리보기와 민감 데이터 토글
- JSON Schema, fixture, redaction 테스트
- AI 평가 질문 세트 작성

완료 기준:

- 같은 입력은 의미상 같은 export를 생성함
- 토큰과 비밀값 탐지 테스트를 통과함
- AI가 warning을 무시하거나 지표를 잘못 합산하는 사례를 테스트로 포착함

## Phase 3: Instagram connector

예상: 5~8일 + 외부 심사

- Instagram Login 기반 OAuth 스파이크
- Professional 계정과 media insights 수집
- 미디어 유형별 metric mapping
- 90일 범위와 팔로워 임계치 경고
- Meta App Review 자료와 개인정보처리방침 준비

완료 기준:

- Business와 Creator 테스트 계정의 지원 지표를 동기화함
- 개인 계정 연결 시 명확한 전환 안내를 제공함
- 빈 데이터와 실제 0을 구분함

## Phase 4: TikTok 및 X connector

예상: 7~10일 + 외부 심사/요금 검증

- TikTok Login Kit, user info, video list/query 연결
- 스냅샷 기반 팔로워 변화 계산
- X OAuth user context, user posts, metrics 연결
- X 최근 30일 제한 및 사용량 비용 보호장치
- 플랫폼별 partial success와 rate limit UX

완료 기준:

- 두 플랫폼의 현재 프로필과 콘텐츠 성과가 공통 목록에 표시됨
- 미지원 심층 지표가 0으로 보이지 않음
- 호출량 상한과 예상 비용을 설정할 수 있음

## Phase 5: 교차 플랫폼 분석

예상: 5~8일

- 같은 원본 콘텐츠의 플랫폼별 변형을 사용자가 묶는 기능
- 플랫폼별 게시 후 24시간/7일 성과 비교
- 공통 참여율 계산식 선택
- 주간 자동 스냅샷과 변화 알림
- 접근성, 한국어/영어, Chrome Web Store 패키징

## 첫 개발 백로그

| 순서 | 작업 | 산출물 |
| --- | --- | --- |
| 1 | 실제 YouTube API 응답 스파이크 | redacted fixtures와 metric 표 |
| 2 | 공통 계약 정의 | Zod schema와 JSON Schema |
| 3 | monorepo 및 CI | extension/api/packages 기본 구조 |
| 4 | OAuth Broker | 연결, callback, refresh, revoke |
| 5 | YouTube connector | account/content/analytics adapter |
| 6 | sync run | checkpoint와 부분 실패 모델 |
| 7 | side panel | 연결 상태와 모두 동기화 |
| 8 | dashboard | 개요, 추이, 콘텐츠 |
| 9 | export builder | md/json/csv 패키지 |
| 10 | 보안·E2E 검증 | secret scan, Playwright 흐름 |

## 결정 게이트

개발 착수 전에 다음 기본값을 사용하고 필요할 때만 바꾼다.

| 항목 | 기본 결정 | 바꿀 시점 |
| --- | --- | --- |
| 사용자 범위 | 우선 본인 1명, 구조는 다중 사용자 | 외부 베타 시작 전 |
| 백엔드 | 호스팅된 API + PostgreSQL | 완전 로컬 제품이 필수일 때 |
| AI 연결 | 파일 생성과 복사 | 사용자가 반복 자동 전송을 원할 때 |
| 원본 보존 | 짧은 기간, export 기본 제외 | 감사·재처리 요구가 확인될 때 |
| 수익 지표 | 기본 제외, 점진 권한 | 유튜브 비수익 지표 MVP 후 |
| 동기화 | 사용자 클릭 | 주간 사용성이 검증된 후 예약 추가 |

## 주요 위험과 대응

| 위험 | 영향 | 대응 |
| --- | --- | --- |
| 플랫폼 앱 심사 지연 | 외부 사용자 연결 지연 | 본인 앱 역할 계정으로 기능 개발, 심사 자료를 Phase 0부터 준비 |
| API 지표 변경 | 잘못된 매핑 | 버전 기록, fixture 계약 테스트, metric registry |
| 서로 다른 지표 의미 | AI의 잘못된 결론 | provenance, coverage, 명시적 formula ID |
| 토큰 유출 | 계정 보안 사고 | 서버 암호화, 최소 scope, 로그 redaction, revoke |
| MV3 서비스 워커 중단 | 동기화 중단 | 장기 작업은 백엔드 job으로 실행 |
| X 호출 비용 | 예산 초과 | 계정별 호출 상한, 캐시, 증분 동기화, 비용 표시 |
| TikTok 분석 깊이 부족 | 기대 불일치 | 연결 전 가용 범위 표시, 미지원 지표를 명확히 표기 |

## 검증 계획

- 단위 테스트: metric mapping, 파생식, 날짜 경계, redaction
- 계약 테스트: 플랫폼별 redacted API fixture를 공통 스키마로 변환
- 통합 테스트: OAuth callback, token refresh, partial retry, revoke
- E2E 테스트: 연결 → 모두 동기화 → 대시보드 → AI export
- 시각 테스트: 사이드 패널과 전체 탭을 데스크톱 주요 폭에서 캡처
- 보안 테스트: 확장 번들 및 로그에서 secret 패턴 검색
- AI 평가: 같은 패키지를 여러 모델에 주고 근거, 누락 인식, 잘못된 합산을 채점
