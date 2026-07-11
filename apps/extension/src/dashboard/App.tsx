import type { YouTubeDashboardSnapshot } from "@creator-data-bridge/contracts";
import {
  BarChart3,
  DatabaseZap,
  FileDown,
  FileJson,
  LayoutDashboard,
  Link2,
  RefreshCw,
  Rows3,
  Settings,
  Unlink,
} from "lucide-react";
import { useState } from "react";
import { useApiHealth, useYouTubeDashboard } from "../shared/api";
import { downloadJson } from "../shared/chrome";
import { platforms } from "../shared/platforms";

const ranges = [7, 28, 90] as const;
const views = [
  { id: "overview", label: "개요", icon: LayoutDashboard },
  { id: "content", label: "콘텐츠", icon: Rows3 },
  { id: "trends", label: "추이", icon: BarChart3 },
  { id: "exports", label: "내보내기", icon: FileDown },
] as const;

type ViewId = (typeof views)[number]["id"];

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
    return <div className="data-empty">동기화된 콘텐츠 없음</div>;
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
    return <div className="data-empty">동기화된 추이 없음</div>;
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

function ExportPanel({ snapshot }: { snapshot: YouTubeDashboardSnapshot | null }) {
  if (!snapshot) {
    return <div className="data-empty">내보낼 동기화 데이터 없음</div>;
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

export function App() {
  const [range, setRange] = useState<(typeof ranges)[number]>(28);
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const apiState = useApiHealth();
  const { data, loading, syncing, connecting, error, connect, sync, disconnect } =
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
    if (connection?.connected) {
      void sync(range);
    } else {
      void connect();
    }
  };

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
            onClick={() => setActiveView("overview")}
          >
            <Link2 size={17} />
            연결 관리
          </button>
          <button className="utility-button" type="button" title="로컬 설정">
            <Settings size={17} />
            설정
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">{snapshot?.account.title ?? "Workspace"}</span>
            <h1>{views.find((view) => view.id === activeView)?.label}</h1>
          </div>
          <div className="header-actions">
            <div className="segmented range-control">
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
            </div>
            <button
              className="primary-button sync-button"
              type="button"
              disabled={loading || !connection?.configured || syncing || connecting}
              onClick={primaryAction}
            >
              <RefreshCw size={16} className={syncing ? "spinning" : ""} />
              {syncing
                ? "동기화 중"
                : connecting
                  ? "연결 확인 중"
                  : connection?.connected
                    ? "모두 동기화"
                    : "YouTube 연결"}
            </button>
          </div>
        </header>

        {(!connection?.configured || error) && (
          <div className={`notice-band ${error ? "error" : ""}`}>
            {error ?? "Google OAuth 미설정 · 환경변수 상태 확인 필요"}
          </div>
        )}

        <section className="health-band" aria-label="시스템 상태">
          <div>
            <span className={`status-dot ${apiState}`} />
            API{" "}
            {apiState === "online" ? "온라인" : apiState === "checking" ? "확인 중" : "오프라인"}
          </div>
          <div>YouTube {connectionLabel}</div>
          <div>마지막 동기화 {formatSyncedAt(snapshot?.lastSyncedAt)}</div>
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

        <section className="workspace-grid">
          <div className="workspace-primary">
            <div className="section-title">
              <div>
                <h2>{views.find((view) => view.id === activeView)?.label}</h2>
                <span>
                  {snapshot ? `${snapshot.periodStart}–${snapshot.periodEnd}` : "동기화 대기"}
                </span>
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
                  const stateText = isYouTube ? connectionLabel : "계획됨";
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
                      <button
                        className="secondary-button"
                        type="button"
                        disabled={!isYouTube || !connection?.configured || syncing || connecting}
                        onClick={primaryAction}
                      >
                        {isYouTube && connection?.connected
                          ? "동기화"
                          : isYouTube
                            ? "연결"
                            : "예정"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            {activeView === "content" && <ContentPanel snapshot={snapshot} />}
            {activeView === "trends" && <TrendPanel snapshot={snapshot} />}
            {activeView === "exports" && <ExportPanel snapshot={snapshot} />}
          </div>

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
        </section>
      </main>
    </div>
  );
}
