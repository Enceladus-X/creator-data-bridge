import type { Platform } from "@creator-data-bridge/contracts";

export interface SetupStep {
  title: string;
  detail: string;
  value?: string;
}

export interface PlatformSetupGuide {
  id: Platform;
  title: string;
  summary: string;
  accountRequirement: string;
  availability: "available" | "connector_planned";
  availabilityLabel: string;
  availabilityDetail: string;
  scopes: string[];
  outputs: string[];
  steps: SetupStep[];
  developerUrl: string;
  documentationUrl: string;
  environmentTemplate: string;
}

export const platformSetupGuides: PlatformSetupGuide[] = [
  {
    id: "youtube",
    title: "YouTube 연결 준비",
    summary: "채널 기본 정보와 YouTube Analytics 기간 지표를 가져옵니다.",
    accountRequirement: "YouTube 채널이 있는 Google 계정",
    availability: "available",
    availabilityLabel: "지금 연결 가능",
    availabilityDetail: "Google OAuth 자격증명을 입력하면 현재 구현된 커넥터를 사용할 수 있습니다.",
    scopes: ["youtube.readonly", "yt-analytics.readonly"],
    outputs: ["채널·영상", "조회·시청 시간", "구독자 증감", "일별 추이"],
    steps: [
      {
        title: "Google Cloud 프로젝트 만들기",
        detail: "본인 Google 계정으로 프로젝트를 만들고 OAuth 동의 화면을 구성합니다.",
      },
      {
        title: "YouTube API 2개 활성화",
        detail: "API Library에서 YouTube Data API v3와 YouTube Analytics API를 활성화합니다.",
      },
      {
        title: "테스트 사용자와 읽기 권한 준비",
        detail: "테스트 모드라면 연결할 Google 계정을 테스트 사용자로 추가합니다.",
        value: "youtube.readonly · yt-analytics.readonly",
      },
      {
        title: "Web application OAuth 클라이언트 만들기",
        detail: "승인된 리디렉션 URI에 아래 주소를 정확히 등록합니다.",
        value: "http://127.0.0.1:8787/v1/oauth/youtube/callback",
      },
      {
        title: ".env 입력 후 API 재시작",
        detail: "Client ID, Client Secret과 암호화 키를 저장한 뒤 pnpm dev를 다시 실행합니다.",
        value: "pnpm secrets:generate",
      },
    ],
    developerUrl: "https://console.cloud.google.com/apis/credentials",
    documentationUrl: "https://developers.google.com/youtube/v3/guides/auth/server-side-web-apps",
    environmentTemplate: `GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8787/v1/oauth/youtube/callback
TOKEN_ENCRYPTION_KEY=64-character-hex-value`,
  },
  {
    id: "instagram",
    title: "Instagram 연결 준비",
    summary: "Professional 계정의 프로필, 미디어와 Insights를 가져오는 경로입니다.",
    accountRequirement: "Business 또는 Creator 유형의 Instagram Professional 계정",
    availability: "connector_planned",
    availabilityLabel: "커넥터 구현 전",
    availabilityDetail:
      "Meta 설정을 준비할 수 있지만 이 저장소의 OAuth와 수집 코드는 아직 구현 전입니다.",
    scopes: ["instagram_business_basic", "instagram_business_manage_insights"],
    outputs: ["프로필·미디어", "도달·조회", "좋아요·댓글", "공유·저장"],
    steps: [
      {
        title: "계정을 Professional로 전환",
        detail:
          "개인 계정은 공식 Insights 대상이 아니므로 Business 또는 Creator 계정이 필요합니다.",
      },
      {
        title: "Meta 개발자 앱 만들기",
        detail:
          "Meta for Developers에서 앱을 만들고 Instagram API with Instagram Login을 추가합니다.",
      },
      {
        title: "Insights 읽기 권한 요청",
        detail:
          "본인 테스트 계정은 앱 역할로 시험하고, 외부 사용자 연결은 Advanced Access 심사가 필요합니다.",
        value: "instagram_business_basic · instagram_business_manage_insights",
      },
      {
        title: "OAuth 리디렉션과 앱 정보를 등록",
        detail:
          "앱 도메인, 개인정보처리방침과 공개 HTTPS OAuth callback을 Meta 앱 설정에 등록합니다.",
        value: "https://YOUR_PUBLIC_HOST/v1/oauth/instagram/callback",
      },
      {
        title: "자격증명을 보관하고 커넥터 구현 대기",
        detail:
          "환경변수를 준비한 뒤 Instagram OAuth, token 갱신과 Insights adapter를 구현해야 연결할 수 있습니다.",
      },
    ],
    developerUrl: "https://developers.facebook.com/apps/",
    documentationUrl: "https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api",
    environmentTemplate: `META_CLIENT_ID=your-meta-app-id
META_CLIENT_SECRET=your-meta-app-secret
META_REDIRECT_URI=https://YOUR_PUBLIC_HOST/v1/oauth/instagram/callback`,
  },
  {
    id: "tiktok",
    title: "TikTok 연결 준비",
    summary: "연결한 사용자의 프로필과 공개 영상 성과를 Display API로 가져오는 경로입니다.",
    accountRequirement: "TikTok 계정과 TikTok for Developers 앱",
    availability: "connector_planned",
    availabilityLabel: "커넥터 구현 전",
    availabilityDetail:
      "TikTok은 앱 심사와 HTTPS 공개 주소가 필요하며 수집 코드는 아직 구현 전입니다.",
    scopes: ["user.info.basic", "user.info.profile", "user.info.stats", "video.list"],
    outputs: ["프로필 통계", "공개 영상", "조회·좋아요", "댓글·공유"],
    steps: [
      {
        title: "TikTok 개발자 앱 등록",
        detail:
          "TikTok for Developers에서 조직과 앱을 만들고 Client key와 Client secret을 발급받습니다.",
      },
      {
        title: "Login Kit과 Display API 추가",
        detail:
          "Products에서 Login Kit을 추가하고 공개 영상 조회에 필요한 Display API 범위를 구성합니다.",
      },
      {
        title: "프로필과 영상 읽기 권한 요청",
        detail: "각 scope는 개발자 앱 승인과 최종 사용자의 동의가 모두 필요합니다.",
        value: "user.info.basic · user.info.profile · user.info.stats · video.list",
      },
      {
        title: "HTTPS 주소와 리디렉션 URI 준비",
        detail:
          "TikTok Web OAuth callback은 공개 HTTPS 주소여야 하므로 배포 도메인 또는 개발용 HTTPS 터널이 필요합니다.",
        value: "https://YOUR_PUBLIC_HOST/v1/oauth/tiktok/callback",
      },
      {
        title: "앱 정보와 데모를 제출해 심사",
        detail:
          "웹사이트, 개인정보처리방침, 이용약관, 제품·scope 사용 설명과 전체 흐름 데모 영상을 제출합니다.",
      },
      {
        title: "자격증명을 보관하고 커넥터 구현 대기",
        detail:
          "환경변수를 준비한 뒤 Login Kit OAuth, token 갱신과 Display API adapter를 구현해야 합니다.",
      },
    ],
    developerUrl: "https://developers.tiktok.com/apps/",
    documentationUrl: "https://developers.tiktok.com/doc/display-api-overview/",
    environmentTemplate: `TIKTOK_CLIENT_KEY=your-client-key
TIKTOK_CLIENT_SECRET=your-client-secret
TIKTOK_REDIRECT_URI=https://YOUR_PUBLIC_HOST/v1/oauth/tiktok/callback`,
  },
  {
    id: "x",
    title: "X 연결 준비",
    summary: "본인 프로필, 게시물과 공개·소유자 참여 지표를 X API v2로 가져오는 경로입니다.",
    accountRequirement: "X 개발자 계정, Project와 App, API 사용 예산",
    availability: "connector_planned",
    availabilityLabel: "커넥터 구현 전",
    availabilityDetail:
      "X API는 사용량 기반 과금과 호출 상한 설계가 필요하며 수집 코드는 아직 구현 전입니다.",
    scopes: ["tweet.read", "users.read", "offline.access"],
    outputs: ["프로필·게시물", "노출·좋아요", "답글·재게시", "일부 소유자 지표"],
    steps: [
      {
        title: "X 개발자 Project와 App 만들기",
        detail: "Developer Console에서 Project와 App을 만들고 현재 요금·사용량 한도를 확인합니다.",
      },
      {
        title: "OAuth 2.0 Web App 활성화",
        detail:
          "Web App 유형에서 Authorization Code Flow with PKCE를 사용하도록 인증 설정을 구성합니다.",
      },
      {
        title: "읽기와 장기 연결 scope 설정",
        detail:
          "offline.access가 있어야 refresh token을 받아 재로그인 없이 데이터를 갱신할 수 있습니다.",
        value: "tweet.read · users.read · offline.access",
      },
      {
        title: "Callback URL 정확히 등록",
        detail:
          "Developer Console의 Callback URI와 프로그램의 redirect URI가 완전히 같아야 합니다.",
        value: "http://127.0.0.1:8787/v1/oauth/x/callback",
      },
      {
        title: "비용 상한과 수집 기간 결정",
        detail:
          "비공개·organic 지표의 기간 제약과 API 비용을 고려해 페이지 수와 새로고침 빈도 상한을 정합니다.",
      },
      {
        title: "자격증명을 보관하고 커넥터 구현 대기",
        detail:
          "환경변수를 준비한 뒤 PKCE OAuth, token 갱신, 게시물 pagination과 metrics adapter를 구현해야 합니다.",
      },
    ],
    developerUrl: "https://developer.x.com/en/portal/dashboard",
    documentationUrl: "https://docs.x.com/fundamentals/authentication/oauth-2-0/authorization-code",
    environmentTemplate: `X_CLIENT_ID=your-client-id
X_CLIENT_SECRET=your-client-secret
X_REDIRECT_URI=http://127.0.0.1:8787/v1/oauth/x/callback`,
  },
];

export function getSetupGuide(platform: Platform): PlatformSetupGuide {
  const guide =
    platformSetupGuides.find((item) => item.id === platform) ??
    platformSetupGuides.find((item) => item.id === "youtube");
  if (!guide) {
    throw new Error("YouTube setup guide is missing.");
  }
  return guide;
}
