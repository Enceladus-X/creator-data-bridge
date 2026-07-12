export const appLocales = ["ko", "en"] as const;
export type AppLocale = (typeof appLocales)[number];

const messages = {
  neverCollected: { ko: "아직 수집 전", en: "Not collected yet" },
  pending: { ko: "대기", en: "Pending" },
  opening: { ko: "페이지 여는 중", en: "Opening page" },
  waiting: { ko: "페이지 준비 중", en: "Waiting for page" },
  collecting: { ko: "콘텐츠 읽는 중", en: "Reading content" },
  normalizing: { ko: "데이터 정리 중", en: "Normalizing data" },
  completed: { ko: "완료", en: "Completed" },
  needsAttention: { ko: "확인 필요", en: "Needs attention" },
  cancelled: { ko: "중단됨", en: "Cancelled" },
  runCollecting: { ko: "수집 중", en: "Collecting" },
  runCompleted: { ko: "수집 완료", en: "Collection complete" },
  runPartial: { ko: "일부 완료", en: "Partially complete" },
  runFailed: { ko: "수집 실패", en: "Collection failed" },
  runCancelled: { ko: "수집 중단", en: "Collection cancelled" },
  ready: { ko: "준비됨", en: "Ready" },
  excluded: { ko: "제외", en: "Excluded" },
  excludedDetail: { ko: "수집에서 제외됨", en: "Excluded from collection" },
  permissionPending: { ko: "권한 대기", en: "Permission needed" },
  permissionNextRun: {
    ko: "다음 수집 시 사이트 권한을 요청합니다",
    en: "Site permission will be requested on the next collection",
  },
  accountContent: { ko: "{account} · 콘텐츠 {count}개", en: "{account} · {count} content items" },
  retryCollection: { ko: "{platform} 다시 수집", en: "Retry {platform}" },
  platformCollectionSetting: { ko: "{platform} 수집 설정", en: "{platform} collection setting" },
  fullDashboard: { ko: "전체 대시보드", en: "Full dashboard" },
  collectionView: { ko: "수집 화면", en: "Collection view" },
  collectionSettings: { ko: "수집 설정", en: "Collection settings" },
  collectionPlatforms: { ko: "수집 플랫폼", en: "Collection platforms" },
  channelDataCollection: { ko: "채널 데이터 수집", en: "Channel data collection" },
  platformsEnabled: { ko: "{count}개 사용", en: "{count} enabled" },
  platformSelection: { ko: "플랫폼 선택", en: "Platform selection" },
  settingsSavedNextRun: {
    ko: "설정은 즉시 저장되며 다음 수집부터 적용됩니다.",
    en: "Changes are saved instantly and apply to the next collection.",
  },
  language: { ko: "언어", en: "Language" },
  languageDescription: {
    ko: "사이드패널과 대시보드에 사용할 언어입니다.",
    en: "Language used in the side panel and dashboard.",
  },
  korean: { ko: "한국어", en: "Korean" },
  english: { ko: "영어", en: "English" },
  collectAndExport: { ko: "수집 및 내보내기", en: "Collect and export" },
  stopCollection: { ko: "수집 중단", en: "Stop collection" },
  collect: { ko: "수집", en: "Collect" },
  csvDownload: { ko: "CSV 다운로드", en: "Download CSV" },
  readingPlatforms: { ko: "플랫폼 데이터를 읽고 있습니다", en: "Reading platform data" },
  progressStatus: { ko: "수집 진행 상태", en: "Collection progress" },
  resultSummary: { ko: "수집 결과 요약", en: "Collection summary" },
  content: { ko: "콘텐츠", en: "Content" },
  csvRows: { ko: "CSV 행", en: "CSV rows" },
  limitedMetrics: { ko: "제한 지표", en: "Limited metrics" },
  fullExecutionLog: { ko: "전체 실행 로그", en: "Full execution log" },
  logCount: { ko: "{count}건", en: "{count} entries" },
  copyLogs: { ko: "로그 복사", en: "Copy logs" },
  logsCopied: { ko: "복사됨", en: "Copied" },
  logsCopyFailed: { ko: "복사 실패", en: "Copy failed" },
  logEmpty: {
    ko: "수집을 실행하면 단계별 기록이 여기에 표시됩니다.",
    en: "Run a collection to see detailed steps here.",
  },
  localOnly: { ko: "로컬 저장 · 외부 전송 없음", en: "Stored locally · No external transfer" },
  deleteHistory: { ko: "수집 기록 삭제", en: "Delete collection history" },
  overview: { ko: "개요", en: "Overview" },
  compare: { ko: "플랫폼 비교", en: "Platform comparison" },
  exports: { ko: "내보내기", en: "Exports" },
  settings: { ko: "설정", en: "Settings" },
  noDataTitle: { ko: "표시할 수집 데이터가 없습니다", en: "No collection data to display" },
  noDataBody: {
    ko: "사이드패널에서 채널 데이터를 수집하면 이곳에 바로 표시됩니다.",
    en: "Collect channel data from the side panel to see it here.",
  },
  openCollectionPanel: { ko: "수집 패널 열기", en: "Open collection panel" },
  platformPerformance: { ko: "플랫폼 성과", en: "Platform performance" },
  latestSnapshot: { ko: "최신 로컬 스냅샷", en: "Latest local snapshot" },
  platform: { ko: "플랫폼", en: "Platform" },
  views: { ko: "조회", en: "Views" },
  likes: { ko: "좋아요", en: "Likes" },
  comments: { ko: "댓글", en: "Comments" },
  status: { ko: "상태", en: "Status" },
  accountUnknown: { ko: "계정 미확인", en: "Account not detected" },
  limitations: { ko: "제한 {count}", en: "{count} limited" },
  openUploadPage: { ko: "{platform} 업로드 페이지 열기", en: "Open {platform} upload page" },
  topContent: { ko: "조회 상위 콘텐츠", en: "Top content by views" },
  contentWithViews: { ko: "조회수가 제공된 콘텐츠 기준", en: "Content with available view counts" },
  noViewContent: { ko: "조회수가 제공된 콘텐츠가 없습니다.", en: "No content has view counts." },
  contentData: { ko: "콘텐츠 데이터", en: "Content data" },
  shownCount: { ko: "{count}개 표시", en: "{count} shown" },
  searchContent: { ko: "콘텐츠 검색", en: "Search content" },
  searchPlaceholder: { ko: "제목 또는 ID 검색", en: "Search title or ID" },
  platformFilter: { ko: "플랫폼 필터", en: "Platform filter" },
  allPlatforms: { ko: "전체 플랫폼", en: "All platforms" },
  sortBy: { ko: "정렬 기준", en: "Sort by" },
  sortViews: { ko: "조회순", en: "Views" },
  sortLikes: { ko: "좋아요순", en: "Likes" },
  sortComments: { ko: "댓글순", en: "Comments" },
  sortPublished: { ko: "게시일순", en: "Publish date" },
  publishedAt: { ko: "게시일", en: "Published" },
  noMatchingContent: {
    ko: "조건에 맞는 콘텐츠가 없습니다.",
    en: "No content matches the filters.",
  },
  viewsByPlatform: { ko: "플랫폼별 조회", en: "Views by platform" },
  knownViewsTotal: { ko: "조회수 제공 범위 내 합계", en: "Total within available view counts" },
  viewsChart: { ko: "플랫폼별 조회수 비교 막대그래프", en: "Views comparison by platform" },
  engagementByPlatform: { ko: "플랫폼별 반응", en: "Engagement by platform" },
  likesAndComments: { ko: "좋아요와 댓글 합계", en: "Likes and comments combined" },
  engagementChart: {
    ko: "플랫폼별 좋아요와 댓글 비교 막대그래프",
    en: "Likes and comments comparison by platform",
  },
  aiCsv: { ko: "AI 분석용 통합 CSV", en: "Unified CSV for AI analysis" },
  aiCsvBody: {
    ko: "대시보드와 동일한 최신 로컬 레코드를 UTF-8 BOM CSV로 저장합니다.",
    en: "Download the latest local dashboard records as a UTF-8 BOM CSV.",
  },
  rows: { ko: "행", en: "Rows" },
  columns: { ko: "열", en: "Columns" },
  accounts: { ko: "계정", en: "Accounts" },
  collectionCompleted: { ko: "수집 완료", en: "Collection completed" },
  sharedSettings: {
    ko: "사이드패널과 동일한 설정이 즉시 저장됩니다.",
    en: "These settings are shared with the side panel and saved instantly.",
  },
  collectionDashboard: { ko: "수집 데이터 대시보드", en: "Collection data dashboard" },
  collectionInProgress: { ko: "수집 진행 중", en: "Collection in progress" },
  localData: { ko: "로컬 데이터", en: "Local data" },
  refreshData: { ko: "데이터 새로고침", en: "Refresh data" },
  saveCsv: { ko: "CSV 저장", en: "Save CSV" },
  newCollection: { ko: "새 데이터 수집", en: "Collect new data" },
  dataStatus: { ko: "수집 데이터 상태", en: "Collection data status" },
  lastCollection: { ko: "마지막 수집 {date}", en: "Last collection {date}" },
  csvRowCount: { ko: "{count}개 CSV 행", en: "{count} CSV rows" },
  noExternalTransfer: { ko: "외부 전송 없음", en: "No external transfer" },
  keyMetrics: { ko: "최신 수집 핵심 지표", en: "Latest collection metrics" },
  latestTotal: { ko: "최신 스냅샷 합계", en: "Latest snapshot total" },
} as const;

export type MessageKey = keyof typeof messages;

export function localeTag(locale: AppLocale) {
  return locale === "en" ? "en-US" : "ko-KR";
}

export function defaultLocaleForLanguage(language: string): AppLocale {
  return language.toLowerCase().startsWith("ko") ? "ko" : "en";
}

export function t(
  locale: AppLocale,
  key: MessageKey,
  values: Record<string, string | number> = {},
) {
  return Object.entries(values).reduce(
    (message, [name, value]) => message.replaceAll(`{${name}}`, String(value)),
    messages[key][locale] as string,
  );
}

const englishLogMessages: Record<string, string> = {
  "수집 실행을 생성했습니다.": "Created a collection run.",
  "수집 페이지를 열고 있습니다.": "Opening the collection page.",
  "페이지가 준비되기를 기다리고 있습니다.": "Waiting for the page to be ready.",
  "페이지에서 콘텐츠를 읽기 시작했습니다.": "Started reading content from the page.",
  "수집 데이터를 CSV 형식으로 정리하고 있습니다.": "Normalizing collected data for CSV.",
  "플랫폼 수집을 완료했습니다.": "Platform collection completed.",
  "플랫폼 수집에 실패했습니다.": "Platform collection failed.",
  "플랫폼 수집을 중단했습니다.": "Platform collection was cancelled.",
  "수집 계정을 확인했습니다.": "Detected the collection account.",
  "전체 수집을 완료했습니다.": "All platform collections completed.",
  "전체 수집이 중단됐습니다.": "Collection was cancelled.",
  "수집된 플랫폼이 없습니다.": "No platforms were collected.",
  "일부 플랫폼 수집을 완료했습니다.": "Some platform collections completed.",
  "사이트 권한을 확인하고 수집을 시작합니다.": "Checking site permissions and starting collection.",
  "사이트 권한 확인을 마쳤습니다.": "Finished checking site permissions.",
  "사용자가 수집 중단을 요청했습니다.": "The user requested collection cancellation.",
  "플랫폼 수집을 다시 시도합니다.": "Retrying platform collection.",
  "브라우저 중단으로 실행을 복구했습니다.": "Recovered the run after a browser interruption.",
};

export function localizeLogMessage(locale: AppLocale, message: string) {
  if (locale === "ko") return message;
  const discovered = message.match(/^콘텐츠 ([\d,]+)개를 확인했습니다\.$/);
  if (discovered) return `Found ${discovered[1]} content items.`;
  return englishLogMessages[message] ?? message;
}

export function localizeLogDetail(locale: AppLocale, detail: string | null) {
  if (!detail || locale === "ko") return detail;
  return detail
    .replace(/계정 ([^·]+)/g, "Account $1")
    .replace(/저장 ([\d,]+)행/g, "$1 rows saved")
    .replace(/경고 /g, "Warnings: ")
    .replace(/원인 미상/g, "Unknown cause")
    .replace(/이전 확인 ([\d,]+)개/g, "Previously found $1")
    .replace(/완료 (\d+)\/(\d+)개 플랫폼/g, "$1/$2 platforms completed")
    .replace(/허용 (\d+)\/(\d+)개 플랫폼/g, "$1/$2 platforms permitted")
    .replace(
      /완료되지 않은 플랫폼은 다시 수집해야 합니다\./g,
      "Incomplete platforms must be collected again.",
    );
}

const englishErrors: Record<string, string> = {
  "Chrome 확장프로그램에서만 수집할 수 있습니다.":
    "Collection is available only in the Chrome extension.",
  "확장프로그램 요청에 실패했습니다.": "The extension request failed.",
  "수집 설정을 읽지 못했습니다.": "Could not load collection settings.",
  "수집 상태를 읽지 못했습니다.": "Could not load collection status.",
  "수집을 시작하지 못했습니다.": "Could not start collection.",
  "수집을 중단하지 못했습니다.": "Could not stop collection.",
  "다시 수집하지 못했습니다.": "Could not retry collection.",
  "CSV를 저장하지 못했습니다.": "Could not save the CSV.",
  "수집 기록을 삭제하지 못했습니다.": "Could not delete collection history.",
  "수집 설정을 저장하지 못했습니다.": "Could not save collection settings.",
  "YouTube Studio 채널 정보를 읽지 못했습니다.":
    "Could not read the YouTube Studio channel information.",
  "YouTube Studio 콘텐츠를 읽지 못했습니다.": "Could not read YouTube Studio content.",
  "TikTok Studio를 읽지 못했습니다.": "Could not read TikTok Studio.",
  "X 로그인 계정을 찾지 못했습니다.": "Could not detect the signed-in X account.",
  "X 프로필을 읽지 못했습니다.": "Could not read the X profile.",
  "X 프로필 요약을 읽지 못했습니다.": "Could not read the X profile summary.",
  "Instagram 로그인 계정을 찾지 못했습니다.": "Could not detect the signed-in Instagram account.",
  "Instagram 프로필을 읽지 못했습니다.": "Could not read the Instagram profile.",
  "Instagram 프로필 요약을 읽지 못했습니다.": "Could not read the Instagram profile summary.",
  "내보낼 수집 데이터가 없습니다.": "There is no collection data to export.",
};

export function localizeError(locale: AppLocale, error: string | null) {
  if (!error || locale === "ko") return error;
  const permission = error.match(/^(youtube|tiktok|instagram|x) 사이트 권한이 필요합니다\.$/i);
  if (permission) return `${permission[1]} site permission is required.`;
  return englishErrors[error] ?? error;
}
