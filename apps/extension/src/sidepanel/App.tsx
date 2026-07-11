import { ArrowUpRight, DatabaseZap, LayoutDashboard, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useApiHealth } from "../shared/api";
import { platforms } from "../shared/platforms";

const ranges = [7, 28, 90] as const;

export function App() {
  const [range, setRange] = useState<(typeof ranges)[number]>(28);
  const apiState = useApiHealth();

  const openDashboard = () => {
    void chrome.runtime.sendMessage({ type: "OPEN_DASHBOARD" });
  };

  return (
    <main className="panel-shell">
      <header className="panel-header">
        <div className="brand-mark" aria-hidden="true">
          <DatabaseZap size={19} />
        </div>
        <div className="panel-title">
          <strong>Creator Data Bridge</strong>
          <span>통합 채널 분석</span>
        </div>
        <button className="icon-button" type="button" title="전체 대시보드" onClick={openDashboard}>
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
        <button className="primary-button" type="button" onClick={openDashboard}>
          <RefreshCw size={16} />
          모두 동기화
        </button>
      </section>

      <section className="metric-grid" aria-label="핵심 지표">
        <div>
          <span>조회·재생</span>
          <strong>—</strong>
        </div>
        <div>
          <span>참여</span>
          <strong>—</strong>
        </div>
        <div>
          <span>팔로워 순증</span>
          <strong>—</strong>
        </div>
        <div>
          <span>게시물</span>
          <strong>—</strong>
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
                  <span>{platform.detail}</span>
                </div>
                <button className="connect-button" type="button" onClick={openDashboard}>
                  {platform.state === "ready" ? "연결" : "예정"}
                  {platform.state === "ready" && <ArrowUpRight size={14} />}
                </button>
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
        <button type="button" onClick={openDashboard}>
          상세 보기
        </button>
      </footer>
    </main>
  );
}
