import type { Platform, YouTubeDashboardSnapshot } from "@creator-data-bridge/contracts";
import {
  BarChart3,
  Check,
  Clipboard,
  DatabaseZap,
  ExternalLink,
  FileDown,
  FileJson,
  Info,
  LayoutDashboard,
  Link2,
  RefreshCw,
  Rows3,
  Settings,
  Unlink,
} from "lucide-react";
import { useState } from "react";
import { useApiHealth, useYouTubeDashboard } from "../shared/api";
import { copyText, downloadJson } from "../shared/chrome";
import { platforms } from "../shared/platforms";
import { getSetupGuide, platformSetupGuides } from "../shared/setup-guides";

const ranges = [7, 28, 90] as const;
const views = [
  { id: "overview", label: "개요", icon: LayoutDashboard },
  { id: "content", label: "콘텐츠", icon: Rows3 },
  { id: "trends", label: "추이", icon: BarChart3 },
  { id: "exports", label: "내보내기", icon: FileDown },
] as const;

type ViewId = (typeof views)[number]["id"] | "connections" | "settings";

function viewLabel(view: ViewId) {
  if (view === "connections") return "연결 관리";
  if (view === "settings") return "설정";
  return views.find((item) => item.id === view)?.label;
}

const numberFormatter = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : numberFormatter.format(value);
}

function formatDuration(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "—";
  }
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatSyncedAt(value: string | undefined) {
  return value
    ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(value),
      )
    : "—";
}

function ContentPanel({ snapshot }: { snapshot: YouTubeDashboardSnapshot | null }) {
  if (!snapshot?.topContent.length) {
    return <div className="data-empty">가져온 YouTube 콘텐츠가 없습니다.</div>;
  }

  return (
    <div className="content-list">
      <div className="content-header">
        <span>콘텐츠</span>
        <span>조회</span>
        <span>평균 시청</span>
      </div>
      {snapshot.topContent.map((content) => (
        <a
          className="content-row"
          href={content.url}
          target="_blank"
          rel="noreferrer"
          key={content.id}
        >
          <span className="content-title">
            {content.thumbnailUrl ? <img src={content.thumbnailUrl} alt="" /> : <span />}
            <strong>{content.title}</strong>
          </span>
          <span>{formatNumber(content.views)}</span>
          <span>{formatDuration(content.averageViewDurationSeconds)}</span>
        </a>
      ))}
    </div>
  );
}

function TrendPanel({ snapshot }: { snapshot: YouTubeDashboardSnapshot | null }) {
  const points = snapshot?.daily.slice(-28) ?? [];
  if (points.length === 0) {
    return <div className="data-empty">가져온 YouTube 추이 데이터가 없습니다.</div>;
  }
  const maximum = Math.max(...points.map((point) => point.views), 1);

  return (
    <div className="trend-panel">
      <div className="trend-chart" role="img" aria-label="일별 조회수">
        {points.map((point) => (
          <span
            key={point.day}
            className="trend-bar"
            style={{ height: `${Math.max(4, (point.views / maximum) * 100)}%` }}
            title={`${point.day}: ${point.views.toLocaleString("ko-KR")}`}
          />
        ))}
      </div>
      <div className="trend-axis">
        <span>{points[0]?.day}</span>
        <span>{points.at(-1)?.day}</span>
      </div>
    </div>
  );
}

function ExportPanel({
  snapshot,
  onSetup,
}: {
  snapshot: YouTubeDashboardSnapshot | null;
  onSetup: () => void;
}) {
  if (!snapshot) {
    return (
      <div className="data-empty actionable-empty">
        <span>내보낼 YouTube 데이터가 없습니다.</span>
        <button className="secondary-button" type="button" onClick={onSetup}>
          <Settings size={15} />
          YouTube 설정
        </button>
      </div>
    );
  }

  return (
    <div className="export-panel">
      <FileJson size={28} />
      <div>
        <strong>AI 분석용 JSON</strong>
        <span>
          {snapshot.account.title} · {snapshot.periodStart}–{snapshot.periodEnd}
        </span>
      </div>
      <button
        className="primary-button"
        type="button"
        onClick={() =>
          downloadJson(`youtube-${snapshot.periodEnd}-${snapshot.rangeDays}d.json`, snapshot)
        }
      >
        <FileDown size={16} />
        JSON 저장
      </button>
    </div>
  );
}

function SetupPanel({ onRetry }: { onRetry: () => void }) {
  const initialPlatform = window.location.hash.split("/")[1] as Platform | undefined;
  const [activePlatform, setActivePlatform] = useState<Platform>(
    initialPlatform && platformSetupGuides.some((guide) => guide.id === initialPlatform)
      ? initialPlatform
      : "youtube",
  );
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const guide = getSetupGuide(activePlatform);
  const platform = platforms.find((item) => item.id === activePlatform);
  if (!platform) {
    throw new Error(`Platform metadata is missing for ${activePlatform}.`);
  }
  const PlatformIcon = platform.icon;

  const selectPlatform = (nextPlatform: Platform) => {
    setActivePlatform(nextPlatform);
    setCopyState("idle");
    window.history.replaceState(null, "", `#settings/${nextPlatform}`);
  };

  const copyEnvironment = async () => {
    const copied = await copyText(guide.environmentTemplate);
    setCopyState(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1800);
  };

  return (
    <div className="setup-panel">
      <div className="setup-intro">
        <Settings size={22} />
        <div>
          <strong>플랫폼 연결 준비</strong>
          <span>계정 조건부터 권한, 심사, 환경변수까지 플랫폼별 순서대로 안내합니다.</span>
        </div>
      </div>

      <div className="setup-platform-tabs" role="tablist" aria-label="설정할 플랫폼">
        {platformSetupGuides.map((item) => {
          const platformItem = platforms.find((candidate) => candidate.id === item.id);
          if (!platformItem) return null;
          const Icon = platformItem.icon;
          return (
            <button
              id={`setup-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={activePlatform === item.id}
              aria-controls={`setup-panel-${item.id}`}
              className={activePlatform === item.id ? "active" : ""}
              onClick={() => selectPlatform(item.id)}
              key={item.id}
            >
              <span style={{ color: platformItem.color, backgroundColor: platformItem.tint }}>
                <Icon size={18} />
              </span>
              <strong>{platformItem.label}</strong>
              <small>{item.availability === "available" ? "사용 가능" : "구현 전"}</small>
            </button>
          );
        })}
      </div>

      <section
        id={`setup-panel-${guide.id}`}
        role="tabpanel"
        aria-labelledby={`setup-tab-${guide.id}`}
        className="setup-guide"
      >
        <div className="setup-guide-heading">
          <span
            className="platform-icon"
            style={{ color: platform.color, backgroundColor: platform.tint }}
          >
            <PlatformIcon size={20} />
          </span>
          <div>
            <h3>{guide.title}</h3>
            <p>{guide.summary}</p>
          </div>
          <span className={`setup-availability ${guide.availability}`}>
            {guide.availabilityLabel}
          </span>
        </div>

        <div className={`scope-note ${guide.availability}`}>
          <Info size={17} />
          <div>
            <strong>{guide.availabilityLabel}</strong>
            <span>{guide.availabilityDetail}</span>
          </div>
        </div>

        <dl className="setup-facts">
          <div>
            <dt>계정 조건</dt>
            <dd>{guide.accountRequirement}</dd>
          </div>
          <div>
            <dt>필요 권한</dt>
            <dd className="setup-chips">
              {guide.scopes.map((scope) => (
                <code key={scope}>{scope}</code>
              ))}
            </dd>
          </div>
          <div>
            <dt>가져올 데이터</dt>
            <dd className="setup-chips outputs">
              {guide.outputs.map((output) => (
                <span key={output}>{output}</span>
              ))}
            </dd>
          </div>
        </dl>

        <ol className="setup-steps">
          {guide.steps.map((step, index) => (
            <li key={step.title}>
              <span>{index + 1}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
                {step.value && <code className="setup-value">{step.value}</code>}
              </div>
            </li>
          ))}
        </ol>

        <div className="setup-actions">
          <a
            className="secondary-button"
            href={guide.developerUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} />
            개발자 콘솔
          </a>
          <a
            className="secondary-button"
            href={guide.documentationUrl}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink size={15} />
            공식 문서
          </a>
          <button className="secondary-button" type="button" onClick={() => void copyEnvironment()}>
            {copyState === "copied" ? <Check size={15} /> : <Clipboard size={15} />}
            {copyState === "copied"
              ? "복사됨"
              : copyState === "failed"
                ? "복사 실패"
                : ".env 템플릿 복사"}
          </button>
          {guide.id === "youtube" && (
            <button className="primary-button" type="button" onClick={onRetry}>
              <RefreshCw size={15} />
              OAuth 상태 확인
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export function App() {
  const [range, setRange] = useState<(typeof ranges)[number]>(28);
  const [activeView, setActiveView] = useState<ViewId>(() =>
    window.location.hash.startsWith("#settings") ? "settings" : "overview",
  );
  const apiState = useApiHealth();
  const { data, loading, syncing, connecting, error, refresh, connect, sync, disconnect } =
    useYouTubeDashboard();
  const connection = data?.connection;
  const snapshot = data?.snapshot ?? null;
  const engagement = snapshot?.summary
    ? (snapshot.summary.likes ?? 0) +
      (snapshot.summary.comments ?? 0) +
      (snapshot.summary.shares ?? 0)
    : null;
  const connectionLabel = !connection?.configured
    ? "설정 필요"
    : connection.connected
      ? "연결됨"
      : "연결 대기";

  const primaryAction = () => {
    if (!connection?.configured) {
      window.history.replaceState(null, "", "#settings/youtube");
      setActiveView("settings");
      return;
    }
    if (connection?.connected) {
      void sync(range);
    } else {
      void connect();
    }
  };

  const openPlatformSetup = (platform: Platform) => {
    window.history.replaceState(null, "", `#settings/${platform}`);
    setActiveView("settings");
  };

  const sectionSubtitle =
    activeView === "settings"
      ? "플랫폼별 API 연결 준비"
      : activeView === "connections"
        ? "플랫폼별 계정 연결"
        : snapshot
          ? `${snapshot.periodStart}–${snapshot.periodEnd}`
          : "아직 가져온 데이터 없음";

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            <DatabaseZap size={20} />
          </div>
          <div>
            <strong>Creator Data Bridge</strong>
            <span>{snapshot?.account.title ?? "Workspace"}</span>
          </div>
        </div>

        <nav aria-label="대시보드">
          {views.map((view) => {
            const Icon = view.icon;
            return (
              <button
                key={view.id}
                type="button"
                className={`nav-button ${activeView === view.id ? "active" : ""}`}
                onClick={() => setActiveView(view.id)}
              >
                <Icon size={17} />
                {view.label}
              </button>
            );
          })}
        </nav>

        <div className="sidebar-bottom">
          <button
            className="utility-button"
            type="button"
            onClick={() => setActiveView("connections")}
          >
            <Link2 size={17} />
            연결 관리
          </button>
          <button
            className={`utility-button ${activeView === "settings" ? "active" : ""}`}
            type="button"
            title="로컬 설정"
            onClick={() => setActiveView("settings")}
          >
            <Settings size={17} />
            설정
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">{snapshot?.account.title ?? "Workspace"}</span>
            <h1>{viewLabel(activeView)}</h1>
          </div>
          <div className="header-actions">
            {activeView !== "settings" && (
              <>
                <fieldset className="segmented range-control" aria-label="YouTube 데이터 수집 기간">
                  {ranges.map((days) => (
                    <button
                      key={days}
                      type="button"
                      aria-pressed={range === days}
                      onClick={() => setRange(days)}
                    >
                      {days}일
                    </button>
                  ))}
                </fieldset>
                <button
                  className="primary-button sync-button"
                  type="button"
                  disabled={loading || syncing || connecting}
                  onClick={primaryAction}
                >
                  {!connection?.configured ? (
                    <Settings size={17} />
                  ) : (
                    <RefreshCw size={17} className={syncing ? "spinning" : ""} />
                  )}
                  {syncing
                    ? "YouTube 데이터 가져오는 중"
                    : connecting
                      ? "YouTube 연결 확인 중"
                      : !connection?.configured
                        ? "Google OAuth 설정"
                        : connection.connected
                          ? "YouTube 데이터 새로고침"
                          : "YouTube 연결"}
                </button>
              </>
            )}
          </div>
        </header>

        {(!connection?.configured || error) && activeView !== "settings" && (
          <div className={`notice-band ${error ? "error" : ""}`}>
            <span>{error ?? "Google OAuth 설정이 필요합니다."}</span>
            <button type="button" onClick={() => openPlatformSetup("youtube")}>
              설정 열기
            </button>
          </div>
        )}

        <section className="health-band" aria-label="시스템 상태">
          <div>
            <span className={`status-dot ${apiState}`} />
            API{" "}
            {apiState === "online" ? "온라인" : apiState === "checking" ? "확인 중" : "오프라인"}
          </div>
          <div>YouTube {connectionLabel}</div>
          <div>YouTube 마지막 수집 {formatSyncedAt(snapshot?.lastSyncedAt)}</div>
        </section>

        <section className="metric-strip" aria-label="핵심 지표">
          {[
            ["조회·재생", formatNumber(snapshot?.summary.views)],
            ["참여", formatNumber(engagement)],
            ["구독자 순증", formatNumber(snapshot?.summary.subscriberNet)],
            ["게시물", formatNumber(snapshot?.summary.contentPublished)],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{snapshot ? `${snapshot.rangeDays}일 집계` : connectionLabel}</small>
            </div>
          ))}
        </section>

        <section className={`workspace-grid ${activeView === "settings" ? "settings-layout" : ""}`}>
          <div className="workspace-primary">
            <div className="section-title">
              <div>
                <h2>{viewLabel(activeView)}</h2>
                <span>{sectionSubtitle}</span>
              </div>
              {snapshot?.account.thumbnailUrl ? (
                <img className="channel-avatar" src={snapshot.account.thumbnailUrl} alt="" />
              ) : (
                <BarChart3 size={18} />
              )}
            </div>

            {activeView === "overview" && (
              <div className="platform-table">
                <div className="table-header">
                  <span>플랫폼</span>
                  <span>수집 범위</span>
                  <span>상태</span>
                  <span aria-hidden="true" />
                </div>
                {platforms.map((platform) => {
                  const Icon = platform.icon;
                  const isYouTube = platform.id === "youtube";
                  const stateText = isYouTube ? connectionLabel : "커넥터 구현 전";
                  return (
                    <div className="table-row" key={platform.id}>
                      <div className="table-platform">
                        <span
                          className="platform-icon"
                          style={{ color: platform.color, backgroundColor: platform.tint }}
                        >
                          <Icon size={18} />
                        </span>
                        <strong>{platform.label}</strong>
                      </div>
                      <span className="muted">{platform.detail}</span>
                      <span
                        className={`state-label ${isYouTube && connection?.connected ? "ready" : "planned"}`}
                      >
                        {stateText}
                      </span>
                      {isYouTube ? (
                        <button
                          className="secondary-button"
                          type="button"
                          disabled={loading || syncing || connecting}
                          onClick={primaryAction}
                        >
                          {connection?.connected
                            ? "새로고침"
                            : connection?.configured
                              ? "연결"
                              : "설정"}
                        </button>
                      ) : (
                        <button
                          className="secondary-button guide-button"
                          type="button"
                          onClick={() => openPlatformSetup(platform.id)}
                        >
                          준비 방법
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {activeView === "content" && <ContentPanel snapshot={snapshot} />}
            {activeView === "trends" && <TrendPanel snapshot={snapshot} />}
            {activeView === "exports" && (
              <ExportPanel snapshot={snapshot} onSetup={() => openPlatformSetup("youtube")} />
            )}
            {activeView === "connections" && (
              <div className="connection-list">
                {platforms.map((platform) => {
                  const Icon = platform.icon;
                  const isYouTube = platform.id === "youtube";
                  return (
                    <div className="connection-row" key={platform.id}>
                      <span
                        className="platform-icon"
                        style={{ color: platform.color, backgroundColor: platform.tint }}
                      >
                        <Icon size={19} />
                      </span>
                      <div>
                        <strong>{platform.label}</strong>
                        <span>{isYouTube ? connectionLabel : "커넥터 구현 전"}</span>
                      </div>
                      <button
                        className={
                          isYouTube && connection?.configured
                            ? "primary-button"
                            : "secondary-button"
                        }
                        type="button"
                        disabled={isYouTube && (loading || syncing || connecting)}
                        onClick={() =>
                          isYouTube ? primaryAction() : openPlatformSetup(platform.id)
                        }
                      >
                        {isYouTube
                          ? connection?.connected
                            ? "데이터 새로고침"
                            : connection?.configured
                              ? "연결"
                              : "준비 방법"
                          : "준비 방법"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {activeView === "settings" && <SetupPanel onRetry={() => void refresh()} />}
          </div>

          {activeView !== "settings" && (
            <aside className="activity-panel">
              <div className="section-title">
                <div>
                  <h2>{snapshot?.account.title ?? "YouTube"}</h2>
                  <span>{connectionLabel}</span>
                </div>
                {connection?.connected && (
                  <button
                    className="icon-button"
                    type="button"
                    title="YouTube 연결 해제"
                    onClick={() => {
                      if (window.confirm("YouTube 연결과 저장된 스냅샷을 삭제할까요?")) {
                        void disconnect();
                      }
                    }}
                  >
                    <Unlink size={16} />
                  </button>
                )}
              </div>
              {snapshot ? (
                <div className="account-summary">
                  <div>
                    <span>현재 구독자</span>
                    <strong>{formatNumber(snapshot.account.subscriberCount)}</strong>
                  </div>
                  <div>
                    <span>누적 조회</span>
                    <strong>{formatNumber(snapshot.account.totalViewCount)}</strong>
                  </div>
                  <div>
                    <span>공개 영상</span>
                    <strong>{formatNumber(snapshot.account.videoCount)}</strong>
                  </div>
                  {snapshot.warnings.map((item) => (
                    <p className="warning-text" key={item.code}>
                      {item.message}
                    </p>
                  ))}
                </div>
              ) : (
                <div className="empty-activity">
                  <span className="activity-line" />
                  <strong>{loading ? "상태 확인 중" : connectionLabel}</strong>
                  <span>—</span>
                </div>
              )}
            </aside>
          )}
        </section>
      </main>
    </div>
  );
}
