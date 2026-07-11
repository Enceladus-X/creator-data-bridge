import { ArrowUpRight, DatabaseZap, LayoutDashboard, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useApiHealth, useYouTubeDashboard } from "../shared/api";
import { openDashboard } from "../shared/chrome";
import { platforms } from "../shared/platforms";

const ranges = [7, 28, 90] as const;
const numberFormatter = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatNumber(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : numberFormatter.format(value);
}

export function App() {
  const [range, setRange] = useState<(typeof ranges)[number]>(28);
  const apiState = useApiHealth();
  const { data, loading, syncing, connecting, error, connect, sync } = useYouTubeDashboard();
  const connection = data?.connection;
  const snapshot = data?.snapshot;
  const engagement = snapshot?.summary
    ? (snapshot.summary.likes ?? 0) +
      (snapshot.summary.comments ?? 0) +
      (snapshot.summary.shares ?? 0)
    : null;

  const primaryAction = () => {
    if (!connection?.configured) {
      openDashboard("settings");
      return;
    }
    if (connection?.connected) {
      void sync(range);
    } else {
      void connect();
    }
  };

  return (
    <main className="panel-shell">
      <header className="panel-header">
        <div className="brand-mark" aria-hidden="true">
          <DatabaseZap size={19} />
        </div>
        <div className="panel-title">
          <strong>Creator Data Bridge</strong>
          <span>{snapshot?.account.title ?? "통합 채널 분석"}</span>
        </div>
        <button
          className="icon-button"
          type="button"
          title="전체 대시보드"
          onClick={() => openDashboard()}
        >
          <LayoutDashboard size={18} />
        </button>
      </header>

      <section className="panel-controls" aria-label="동기화 기간">
        <div className="segmented">
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
          className="primary-button"
          type="button"
          disabled={loading || syncing || connecting}
          onClick={primaryAction}
        >
          <RefreshCw size={16} className={syncing ? "spinning" : ""} />
          {syncing
            ? "동기화 중"
            : connecting
              ? "연결 확인 중"
              : !connection?.configured
                ? "설정 열기"
                : connection.connected
                  ? "모두 동기화"
                  : "YouTube 연결"}
        </button>
      </section>

      {(!connection?.configured || error) && (
        <div className={`panel-notice ${error ? "error" : ""}`}>
          {error ?? "Google OAuth 미설정"}
        </div>
      )}

      <section className="metric-grid" aria-label="핵심 지표">
        <div>
          <span>조회·재생</span>
          <strong>{formatNumber(snapshot?.summary.views)}</strong>
        </div>
        <div>
          <span>참여</span>
          <strong>{formatNumber(engagement)}</strong>
        </div>
        <div>
          <span>구독자 순증</span>
          <strong>{formatNumber(snapshot?.summary.subscriberNet)}</strong>
        </div>
        <div>
          <span>게시물</span>
          <strong>{formatNumber(snapshot?.summary.contentPublished)}</strong>
        </div>
      </section>

      <section className="platform-section">
        <div className="section-heading">
          <h2>연결</h2>
          <span>{platforms.length}개 플랫폼</span>
        </div>
        <div className="platform-list">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const isYouTube = platform.id === "youtube";
            const buttonLabel = !isYouTube
              ? "예정"
              : !connection?.configured
                ? "설정"
                : connection.connected
                  ? "동기화"
                  : "연결";
            return (
              <article className="platform-row" key={platform.id}>
                <div
                  className="platform-icon"
                  style={{ color: platform.color, backgroundColor: platform.tint }}
                >
                  <Icon size={18} />
                </div>
                <div className="platform-copy">
                  <strong>{platform.label}</strong>
                  <span>
                    {isYouTube && connection?.connected ? snapshot?.account.title : platform.detail}
                  </span>
                </div>
                {isYouTube ? (
                  <button
                    className="connect-button"
                    type="button"
                    disabled={loading || syncing || connecting}
                    onClick={primaryAction}
                  >
                    {buttonLabel}
                    {!connection?.connected && <ArrowUpRight size={14} />}
                  </button>
                ) : (
                  <span className="planned-badge">예정</span>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <footer className="panel-footer">
        <span className={`status-dot ${apiState}`} />
        <span>
          API {apiState === "online" ? "온라인" : apiState === "checking" ? "확인 중" : "오프라인"}
        </span>
        <button type="button" onClick={() => openDashboard()}>
          상세 보기
        </button>
      </footer>
    </main>
  );
}
