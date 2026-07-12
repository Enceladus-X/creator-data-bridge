# 플랫폼 데이터 및 게시 가용성

조사 기준일: 2026-07-11

`지원`은 공식 API에서 직접 제공, `부분`은 일부 계정·기간·지표만 제공, `스냅샷`은 제품이 주기적으로 저장해야 변화량을 계산, `미지원`은 MVP에서 공식적으로 가져올 수 없음을 뜻한다.

수집 MVP는 공식 API만으로 제한하지 않는다. 사용자가 명시적으로 시작한 실행에서 로그인된 Chrome 탭의 표시 데이터를 읽되 쿠키, 토큰, DM과 댓글 본문은 읽지 않는다. 게시 기능은 쓰기 작업이므로 공식 API만 사용한다.

## 실계정 브라우저 수집 검증

검증일: 2026-07-12

| 플랫폼 | 검증 화면 | 확인된 데이터 | 미확인/미제공 |
| --- | --- | --- | --- |
| TikTok | TikTok Studio content | 프로필, 영상 URL/제목/시각/길이, 조회, 좋아요, 댓글 | 심층 유지율 |
| Instagram | 프로필과 Reel | 프로필, Reel URL/캡션, 좋아요, 댓글 | 현재 surface의 조회수 |
| X | 프로필 타임라인 | 프로필, 게시물 URL/본문/시각/길이, 조회, 좋아요, 답글, 재게시 | 심층 분석 |
| YouTube | Studio와 공식 API | 채널, Shorts, 조회, 기간 분석 | 브라우저 수집은 MVP 제외 |

자세한 수집 동작은 [확장프로그램 로컬 수집 설계](EXTENSION_COLLECTION_SPEC.md)를 따른다.

## 공식 게시 API 요약

| 플랫폼 | 게시 방식 | 주요 제약 |
| --- | --- | --- |
| YouTube | `videos.insert` resumable upload | `youtube.upload`, 미검증 프로젝트 비공개 제한 |
| TikTok | Content Posting API Direct Post | `video.publish`, 명시적 동의, audit 전 비공개 제한 |
| Instagram | Reel container 생성 후 `media_publish` | Professional 계정, publish 권한, 접근 가능한 `video_url` |
| X | chunked media upload 후 Post 생성 | 사용자 OAuth, access tier와 사용량 제한 |

게시 제품 설계는 [교차 플랫폼 자동 업로드 설계](AUTOMATED_PUBLISHING_SPEC.md)를 따른다.

## 요약표

| 기능 | YouTube | Instagram | TikTok | X |
| --- | --- | --- | --- | --- |
| 본인 계정 OAuth | 지원 | 지원 | 지원 | 지원 |
| 개인/일반 계정 분석 | 채널 지원 | 미지원 | 부분 | 부분 |
| 계정 현재 통계 | 지원 | 지원 | 지원 | 지원 |
| 게시물 목록과 공개 성과 | 지원 | 지원 | 지원 | 지원 |
| 기간별 계정 분석 | 지원 | 부분 | 스냅샷 중심 | 부분 |
| 시청 시간/평균 시청 | 지원 | 미디어별 일부 | Display API 미지원 | 미디어별 일부 |
| 유입 경로/기기/국가 | 지원 | 일부 | Display API 미지원 | 제한적 |
| 수익 | 별도 권한으로 부분 | MVP 제외 | MVP 제외 | MVP 제외 |
| 주요 이력 제한 | 쿼리별 제약 | 사용자 지표 최대 90일 | 공개 영상 중심 | 비공개 지표 최근 30일 |
| 공개 서비스 심사 | Google OAuth 검증 가능 | Advanced Access/App Review | App Review | 개발자 요금·권한 정책 |

## YouTube

가장 완전한 첫 커넥터다. YouTube Data API v3로 채널과 영상 메타데이터를, YouTube Analytics API로 기간별 성과를 가져온다. 대량 일별 보고서가 필요해지면 YouTube Reporting API를 추가한다.

MVP 수집 후보:

- 채널: 제목, 채널 ID, 구독자, 누적 조회, 공개 영상 수
- 영상: 제목, 설명, 게시 시각, 길이, 공개 상태, 썸네일
- 성과: 조회, engaged views, 좋아요, 댓글, 공유, 구독자 획득·이탈
- 시청: 시청 시간, 평균 시청 지속 시간, 평균 시청 비율
- 분해: 날짜, 영상, 국가, 기기, 구독 상태, 유입 유형
- 선택 권한: 추정 수익과 광고 성과

권한은 기본적으로 `youtube.readonly`와 `yt-analytics.readonly`만 요청한다. 수익은 사용자가 명시적으로 켤 때 `yt-analytics-monetary.readonly`를 점진적으로 요청한다. 서비스 계정으로 개인 채널을 대신 조회할 수 없으므로 사용자 OAuth가 필수다.

주의 사항:

- Analytics API의 기간 끝값은 모든 요청 지표가 확정된 마지막 날짜까지만 반환될 수 있다.
- 일부 차원은 개인정보 보호 임계치 때문에 누락될 수 있다.
- Data API 메타데이터는 정책상 주기적 갱신·삭제 요구를 반영해야 한다.

공식 문서:

- https://developers.google.com/youtube/analytics/reference
- https://developers.google.com/youtube/analytics/channel_reports
- https://developers.google.com/youtube/reporting/guides/authorization

## Instagram

Instagram Professional 계정인 Business 또는 Creator만 공식 Insights 대상이다. 개인 계정은 지원하지 않는다. 새 Instagram Login 경로와 Facebook Login 경로가 공존하므로 MVP는 Facebook Page 연결이 필요 없는 Instagram Login 경로를 우선 검증한다.

MVP 수집 후보:

- 계정 프로필과 미디어 목록
- 계정 Insights: reach, impressions, profile views 등 API 버전에서 허용된 지표
- 미디어 Insights: 조회/재생, 도달, 좋아요, 댓글, 공유, 저장 등 미디어 유형별 허용 지표
- 게시물, Reel, Story를 서로 다른 콘텐츠 유형으로 보존

권한 후보:

- Instagram Login: `instagram_business_basic`, `instagram_business_manage_insights`
- Facebook Login 대안: `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement`

주의 사항:

- 일부 계정 지표는 팔로워 100명 미만에서 제공되지 않는다.
- 사용자 지표 데이터는 최대 90일 범위 제약이 있다.
- 지표 이름과 지원 여부가 API 버전 및 미디어 유형에 따라 달라진다.
- 본인 또는 앱 역할 계정은 Standard Access로 시험할 수 있지만 타 사용자 대상 서비스는 Advanced Access와 심사가 필요하다.
- API가 빈 데이터셋을 반환한 경우 실제 0과 구분해야 한다.

공식 참고:

- https://developers.facebook.com/docs/instagram-platform/
- https://www.postman.com/meta/instagram/folder/23987686-f659d7d1-d74c-44e4-9192-9b1e8694c511

## TikTok

Display API는 연결한 사용자의 프로필 통계와 공개 영상 목록·성과를 제공한다. 유튜브 Studio 같은 심층 시청자 분석 전체를 제공하는 API로 보아서는 안 된다.

MVP 수집 후보:

- 계정: 팔로워, 팔로잉, 전체 좋아요, 공개 영상 수
- 영상: 제목/설명, 게시 시각, 길이, 공유 URL, 커버 이미지
- 영상 성과: 조회, 좋아요, 댓글, 공유

권한 후보:

- `user.info.basic`
- `user.info.profile`
- `user.info.stats`
- `video.list`

주의 사항:

- Display API에는 대시보드의 유지율, 시청자 유입, 팔로워 활동 시간 같은 심층 분석이 없다.
- 팔로워 순증과 계정 추이는 주기적 스냅샷을 저장한 이후부터 계산한다.
- Data Portability API는 별도 목적과 지역·승인 조건이 있으므로 MVP에 넣지 않는다.
- 앱 검토 전에는 승인된 테스트 사용자 중심으로 동작할 수 있다.

공식 문서:

- https://developers.tiktok.com/doc/tiktok-api-v2-get-user-info/
- https://developers.tiktok.com/doc/tiktok-api-v2-video-list/
- https://developers.tiktok.com/doc/tiktok-api-v2-video-query/

## X

X API v2로 사용자 프로필, 본인 게시물, 공개 성과를 조회한다. 사용자 컨텍스트 인증을 사용하면 소유 게시물의 non-public 또는 organic 지표를 요청할 수 있다.

MVP 수집 후보:

- 계정: 팔로워, 팔로잉, 게시물 수
- 게시물: 본문, 게시 시각, 대화/답글 여부, 미디어 메타데이터
- 공개 성과: 노출, 좋아요, 재게시, 답글, 인용, 북마크
- 본인 지표: 클릭, 상세 열기 등 사용 요금제와 엔드포인트가 허용하는 항목

주의 사항:

- non-public, organic, promoted 지표는 게시 후 최근 30일 범위 제한이 있다.
- API는 사용량 기반 과금이므로 동기화 빈도와 페이지 수에 비용 상한을 둬야 한다.
- 역사적 팔로워 순증은 제품 스냅샷을 쌓은 이후 계산한다.
- 사용자 컨텍스트 OAuth와 게시물 소유권이 필요한 지표를 공개 지표와 구분한다.

공식 문서:

- https://docs.x.com/x-api/fundamentals/metrics
- https://docs.x.com/x-api/users/get-posts
- https://docs.x.com/x-api/posts/get-post-analytics

## 제품 정책

- YouTube 분석과 모든 플랫폼 게시에는 공식 API를 사용한다.
- TikTok, Instagram, X 공개 성과는 사용자 동작으로 시작한 로컬 DOM 수집을 허용한다.
- DOM 수집은 쿠키와 토큰을 읽지 않고 댓글 본문, DM, 팔로워 목록을 제외한다.
- API 버전 또는 selector 버전, 권한, 수집 화면, 수집 시각과 경고를 실행마다 기록한다.
- 지원하지 않는 지표는 0으로 만들지 않고 coverage와 빈 값으로 남긴다.
- 각 API 어댑터와 브라우저 수집기에는 개인정보 제거 fixture 계약 테스트와 실계정 smoke test를 둔다.
