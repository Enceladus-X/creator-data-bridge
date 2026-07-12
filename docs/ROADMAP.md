# 구현 로드맵

기준일: 2026-07-12

기간은 개발자 1명이 집중해서 진행하는 대략적인 구현 시간이며 플랫폼 앱 심사 대기 시간은 제외한다.

## 전략

제품을 세 개의 수직 슬라이스로 발전시킨다.

1. **수집**: 로그인된 Chrome 세션에서 TikTok, Instagram, X의 표시 데이터를 로컬로 읽어 CSV를 만든다.
2. **추이**: 같은 콘텐츠의 스냅샷을 누적하고 플랫폼별 초기 반응과 증가량을 비교한다.
3. **게시**: 사용자가 검토한 영상 하나를 공식 API로 여러 플랫폼에 게시한다.

읽기와 쓰기의 기술 경계를 분리한다. 로컬 수집은 DOM과 IndexedDB를 사용하고, 게시에는 OAuth 백엔드, 작업 저장소와 임시 object storage를 사용한다. YouTube 분석은 이미 구현된 공식 API 경로를 유지한다.

## 현재 상태

완료:

- pnpm TypeScript 모노레포, 공통 Zod 계약, Chrome MV3 확장 셸, Fastify API, CI
- YouTube OAuth, AES-256-GCM token vault, Data/Analytics API 동기화
- YouTube 일별 추이, 상위 콘텐츠, JSON 내보내기
- loorbit Chrome 프로필의 YouTube, TikTok, Instagram, X 실계정 수집 검증
- 네 플랫폼 20행, 24열 UTF-8 CSV 생성과 재가져오기 검증
- Instagram 좋아요와 댓글 0 판별 검증
- 로컬 수집 및 공식 API 게시 설계
- 브라우저 수집 계약, 숫자·날짜 정규화와 29열 CSV exporter
- TikTok Studio, Instagram Reel, X 프로필 DOM 수집기와 스크롤 수집
- 비활성 임시 탭 오케스트레이터, IndexedDB 실행·레코드 저장과 부분 성공
- 플랫폼 토글·수집 한도 영구 설정과 원클릭 자동 CSV 다운로드
- 개인정보 제거 DOM fixture, CSV와 설정 회귀 테스트

다음 구현은 **설치된 Chrome 프로필에서 원클릭 전체 수집을 반복 smoke test하고 selector 진단을 강화하는 단계**다. 이후 누적 스냅샷의 콘텐츠별 변화량과 인기도 추이로 진행한다.

CSV MVP의 화면 흐름, 메시지 계약, IndexedDB schema, 플랫폼 알고리즘과 PR 단위는 [CSV 추출 확장프로그램 MVP 실행 계획](CSV_EXTENSION_MVP_PLAN.md)을 따른다.

## Phase 1: 브라우저 수집 기반

상태: 완료

예상: 2~3일

- 브라우저 수집 Zod 계약
- 실행, 플랫폼, 콘텐츠, metric coverage 모델
- 숫자·날짜·URL 공통 parser
- IndexedDB snapshot repository
- UTF-8 BOM CSV exporter
- 최신 스냅샷과 이력 export 모드
- `0`과 미제공/부분 실패 계약 테스트

완료 기준:

- 수동 검증 CSV와 같은 열을 코드로 생성한다.
- 빈 값과 숫자 0이 왕복 import 후에도 구분된다.
- 같은 실행을 재개해도 콘텐츠 행이 중복되지 않는다.

## Phase 2: 탭 오케스트레이터

상태: MVP 완료. 서비스 워커 중단 시 자동 이어받기는 후속 보강

예상: 2~3일

- 플랫폼별 선택적 host permission
- 열린 탭의 계정 핸들 탐색과 전용 임시 탭 수집
- 비활성 임시 탭 생성과 확장 소유권 기록
- 페이지 준비 감지와 활성 탭 fallback
- 취소, timeout, 부분 성공
- `chrome.storage.session` 체크포인트
- MV3 서비스 워커 재시작 후 이어하기
- 확장 소유 탭만 정리하는 cleanup

완료 기준:

- 사용자가 플랫폼 탭을 미리 열지 않아도 실행된다.
- 사용자 탭을 닫거나 다른 URL로 이동시키지 않는다.
- 브라우저 중단 후 결과를 잃지 않고 이어할 수 있다.

## Phase 3: TikTok 수직 슬라이스

상태: 완료

예상: 2~3일

- TikTok Studio 로그인과 계정 감지
- 프로필 및 콘텐츠 표 parser
- pagination/가상 스크롤과 ID 중복 제거
- 조회, 좋아요, 댓글, 길이, 게시 시각, 공개 범위 정규화
- 개인정보 제거 DOM fixture
- 사이드 패널 진행 상태와 TikTok CSV

완료 기준:

- loorbit의 현재 TikTok 콘텐츠가 수동 검증 결과와 일치한다.
- 새 게시물이 추가돼도 latest 100 한도 안에서 자동 발견한다.
- selector 불일치는 잘못된 0 대신 명시적 오류가 된다.

## Phase 4: X collector

상태: 완료

예상: 2일

- 프로필 요약과 타임라인 article parser
- 조회, 좋아요, 답글, 재게시와 영상 길이 추출
- 가상 스크롤 안정화와 게시물 ID 병합
- 상대/절대 게시 시각 처리
- fixture와 실계정 smoke test

완료 기준:

- loorbit의 네 게시물 조회수 `2, 3, 4, 5` 검증 fixture를 통과한다.
- 오래된 게시물 로딩이 중단되면 partial coverage를 남긴다.

## Phase 5: Instagram collector

상태: 완료. Professional Dashboard 조회수는 후속 조사

예상: 3일

- 프로필 요약과 Reel URL 발견
- 개별 Reel 상세 수집과 지연 재시도
- 좋아요 숫자 추출
- `댓글`을 0, `댓글 N`을 N으로 정규화
- 조회수 `unavailable` coverage
- Professional Dashboard/Insights 조회수 surface 스파이크

완료 기준:

- loorbit Reel 좋아요와 댓글이 수동 검증과 일치한다.
- 로딩 실패 Reel만 재시도할 수 있다.
- 조회수 미제공을 0으로 내보내지 않는다.

## Phase 6: 통합 수집 UX와 추이

상태: 원클릭 수집·자동 CSV·재시도 완료, 스냅샷 delta와 추이 UI 미구현

예상: 3~4일

- `수집하고 CSV 다운로드`와 플랫폼별 진행 상태
- 발견 콘텐츠 수, elapsed time, 취소
- 성공/부분 실패/누락 지표 요약
- 최신 결과 미리보기와 자동 CSV 저장
- 플랫폼별 재시도
- 동일 콘텐츠 수동 묶기
- 스냅샷 delta와 시간당 증가량

완료 기준:

- TikTok → X → Instagram을 원클릭으로 순차 수집한다.
- 한 플랫폼 실패가 다른 결과를 제거하지 않는다.
- 두 번 이상 수집하면 콘텐츠별 변화량이 표시된다.

## Phase 7: 게시 작성기와 미디어 파이프라인

예상: 4~6일

- 영상 파일 선택, 미리보기와 공통 캡션
- 플랫폼별 계정, 문구, 공개 범위와 옵션
- 최종 게시 검토 화면
- SHA-256과 중복 게시 경고
- S3 호환 object storage multipart upload
- signed URL과 24시간 lifecycle 삭제
- `publish_job`, `publish_target`, `publish_event`
- 부분 성공과 플랫폼별 재시도

완료 기준:

- 파일을 한 번 선택해 네 플랫폼용 게시 초안을 만든다.
- 브라우저를 닫아도 업로드 작업 상태가 보존된다.
- 임시 영상이 보존 정책에 따라 자동 삭제된다.

## Phase 8: 공식 게시 어댑터

예상: 8~12일 + 외부 심사

구현 순서:

1. YouTube `videos.insert` 비공개 resumable upload
2. TikTok Content Posting API unaudited 비공개 Direct Post
3. Instagram Professional Reel container와 `media_publish`
4. X chunked media upload와 Post 생성

완료 기준:

- 각 플랫폼 테스트 계정에서 비공개 또는 제한 모드 게시를 완료한다.
- 처리 상태와 최종 게시 URL을 기록한다.
- 이미 성공한 플랫폼은 전체 재시도에서 건너뛴다.
- 플랫폼 review/audit 전 제한을 UI에 명시한다.

## Phase 9: 공개 배포 준비

예상: 4~6일 + 심사 대기

- TikTok Content Posting API audit
- Meta Advanced Access/App Review
- YouTube OAuth 검증과 upload audit
- X access tier와 비용 상한 검증
- Chrome Web Store 개인정보 공개
- 데이터 흐름표, 이용약관, 개인정보처리방침
- E2E와 실계정 회귀 테스트

완료 기준:

- 공개 범위 게시가 승인된 플랫폼에서만 활성화된다.
- 사용자가 수집 데이터와 게시용 미디어를 각각 삭제할 수 있다.
- 확장 권한 설명이 실제 데이터 흐름과 일치한다.

## 후속 기능

- 게시 후 1/6/24/72시간 스냅샷 알림
- 예약 게시와 캘린더
- AI 캡션·해시태그 초안
- 같은 원본 영상 자동 묶기 후보
- `summary.md + content.csv + data_dictionary.md` AI 패키지
- selector fixture 상태 검사와 업데이트 알림
- 팀 승인과 다중 사용자

## 위험과 대응

| 위험 | 영향 | 대응 |
| --- | --- | --- |
| 플랫폼 DOM 변경 | 수집 중단 또는 잘못된 값 | selector 버전, fixture 계약 테스트, fail closed |
| background tab 미로딩 | 일부 콘텐츠 누락 | 준비 detector, 제한 재시도, active fallback |
| MV3 서비스 워커 중단 | 실행 상태 유실 | session checkpoint, IndexedDB append, 재실행 가능한 단계 |
| 플랫폼 앱 심사 지연 | 공개 게시 지연 | 비공개 테스트 모드와 보조 게시 fallback |
| Instagram 영상 URL 요구 | 로컬 전용 게시 불가 | 짧게 만료되는 object storage pull URL |
| 중복 게시 | 채널 신뢰도 손상 | media/caption hash idempotency와 최종 경고 |
| 토큰 또는 원본 영상 유출 | 계정·콘텐츠 사고 | 서버 암호화, signed URL, 로그 redaction, lifecycle 삭제 |
| X 사용량 비용 | 예산 초과 | 계정별 게시 상한과 access tier 표시 |
| 지표 의미 혼합 | 잘못된 AI 결론 | provenance, coverage, 플랫폼 내부 순위 우선 |

## 테스트 기준

- 단위: 숫자/날짜 parser, coverage, CSV, idempotency
- 계약: 개인정보 제거 DOM/API fixture → 공통 스키마
- 통합: 권한 → 탭 → 수집 → 저장 → CSV
- 게시: 파일 → object storage → provider → 상태 → URL
- 중단: 서비스 워커/브라우저 재시작 후 이어하기
- 안전: 사용자 탭 보존, 임시 탭 정리, 토큰/원본 로그 부재
- 실계정: loorbit 수동 검증 CSV와 정기 비교
- 시각: 사이드 패널과 게시 작성기 desktop 폭 검증

## 재사용 워크플로우 후보

플랫폼 수집기 추가와 selector 갱신 작업을 다음 구조로 분리할 후보로 둔다.

```text
skills/social-browser-collector/
  SKILL.md
  scripts/validate-fixture.ts
  references/collector-contract.md
  assets/redacted-fixtures/
```

각 플랫폼의 감지, fixture redaction, parser 검증, 실계정 smoke test와 coverage 보고 절차를 반복 가능하게 만든다.
