# AI 내보내기 계약

## 1. 목표

AI가 숫자만 받아 임의로 의미를 추측하지 않도록 지표 정의, 기간, 출처, 누락 범위, 파생 계산식을 같은 패키지에 넣는다. 포맷은 특정 AI 공급자에 종속되지 않는다.

## 2. 패키지 구성

```text
creator-data-bridge_2026-07-11_28d/
  manifest.json
  summary.md
  metrics.json
  content.csv
  data_dictionary.md
  raw/                 # 사용자가 선택한 경우만
    youtube.json
    instagram.json
    tiktok.json
    x.json
```

### `manifest.json`

- 스키마 버전과 생성 시각
- 선택 기간과 표준 시간대
- 연결 계정과 플랫폼
- 각 플랫폼의 마지막 동기화 시각
- 파일 목록과 SHA-256 checksum
- coverage 요약과 경고
- 원본 데이터 포함 여부

### `summary.md`

- 채널 및 계정 개요
- 기간 핵심 지표
- 플랫폼 간 비교 가능한 지표
- 상위 콘텐츠
- 주요 추이와 이상치 후보
- 데이터 해석 주의사항
- AI에게 요청할 수 있는 분석 질문 템플릿

### `metrics.json`

계정 지표, 시계열, 플랫폼 고유 분해, provenance를 손실 없이 담는 주 데이터다.

### `content.csv`

한 행이 하나의 콘텐츠다. 플랫폼, 콘텐츠 유형, 제목/본문 일부, 게시 시각, URL, 조회/노출, 참여, 시청 지표, 데이터 최신성을 포함한다.

## 3. JSON 예시

```json
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-07-11T12:00:00+09:00",
  "period": {
    "start": "2026-06-13",
    "end": "2026-07-10",
    "timezone": "Asia/Seoul"
  },
  "accounts": [
    {
      "platform": "youtube",
      "platformAccountId": "UC_example",
      "displayName": "Example Channel",
      "lastSyncedAt": "2026-07-11T02:55:00Z"
    }
  ],
  "metrics": [
    {
      "metricId": "views",
      "value": 993,
      "unit": "count",
      "scope": "account_period",
      "platform": "youtube",
      "source": "youtube_analytics_api",
      "method": "provider_reported",
      "coverage": "complete"
    }
  ],
  "warnings": [
    {
      "code": "PLATFORM_METRIC_UNAVAILABLE",
      "platform": "tiktok",
      "metricId": "average_view_duration",
      "message": "TikTok Display API does not provide this metric."
    }
  ]
}
```

## 4. Coverage 값

| 값 | 의미 |
| --- | --- |
| `complete` | 요청 기간과 범위가 제공됨 |
| `partial` | 일부 콘텐츠, 일부 날짜 또는 페이지가 누락됨 |
| `delayed` | 플랫폼 처리 지연으로 최신 날짜가 미확정 |
| `thresholded` | 개인정보 보호 또는 최소 팔로워 임계치로 숨김 |
| `snapshot_derived` | 제품이 저장한 두 스냅샷의 차이로 계산 |
| `unsupported` | 공식 API에서 제공하지 않음 |
| `unavailable` | 일시 오류 또는 권한 부족으로 이번 실행에서 없음 |

숫자 `0`, JSON `null`, 필드 누락은 서로 다른 의미다. `unsupported`나 `unavailable`을 `0`으로 변환하지 않는다.

## 5. AI용 기본 지시문

```text
이 패키지는 여러 소셜 플랫폼의 내 계정 성과 데이터다.
manifest.json과 warnings를 먼저 읽고 데이터 범위를 확인하라.
서로 정의가 다른 views, plays, impressions를 임의로 합산하지 마라.
provider_reported와 snapshot_derived를 구분하라.
근거가 되는 플랫폼, 기간, metricId를 각 결론에 표시하라.
먼저 관찰 사실, 그다음 가능한 해석, 마지막에 다음 실험을 제안하라.
데이터가 부족한 결론은 추정이라고 명시하라.
```

## 6. 개인정보 기본값

- 댓글 본문, DM, 팔로워 목록은 MVP export에 넣지 않는다.
- 이메일, 토큰, 내부 사용자 ID, OAuth 응답은 절대 넣지 않는다.
- 게시물 본문은 분석에 필요한 범위에서 포함하고 사용자가 제외할 수 있다.
- 원본 응답은 기본 비활성화한다.
- 직접 AI 전송 기능을 추가할 때는 전송 대상, 보존 정책, 선택 필드를 확인받는다.

## 7. 버전 정책

- 필드 추가처럼 기존 소비자가 무시할 수 있는 변경은 minor 버전을 올린다.
- 필드 의미 변경과 삭제는 major 버전을 올린다.
- exporter에는 이전 한 개 major 버전으로 내보내는 호환 모드를 유지한다.
- 샘플 fixture를 두고 JSON Schema 및 CSV header 계약 테스트를 실행한다.
