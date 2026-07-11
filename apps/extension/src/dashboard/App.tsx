import {
  BarChart3,
  Braces,
  DatabaseZap,
  FileDown,
  LayoutDashboard,
  Link2,
  RefreshCw,
  Rows3,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { useApiHealth } from "../shared/api";
import { platforms } from "../shared/platforms";

const ranges = [7, 28, 90] as const;
const views = [
  { id: "overview", label: "개요", icon: LayoutDashboard },
  { id: "content", label: "콘텐츠", icon: Rows3 },
  { id: "trends", label: "추이", icon: BarChart3 },
  { id: "exports", label: "내보내기", icon: FileDown },
] as const;

type ViewId = (typeof views)[number]["id"];

export function App() {
  const [range, setRange] = useState<(typeof ranges)[number]>(28);
  const [activeView, setActiveView] = useState<ViewId>("overview");
  const apiState = useApiHealth();

  return (
    <div className="dashboard-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark" aria-hidden="true">
            <DatabaseZap size={20} />
          </div>
          <div>
            <strong>Creator Data Bridge</strong>
            <span>Workspace</span>
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
          <button className="utility-button" type="button">
            <Link2 size={17} />
            연결 관리
          </button>
          <button className="utility-button" type="button">
            <Settings size={17} />
            설정
          </button>
        </div>
      </aside>

      <main className="dashboard-main">
        <header className="dashboard-header">
          <div>
            <span className="eyebrow">Workspace</span>
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
            <button className="primary-button sync-button" type="button">
              <RefreshCw size={16} />
              모두 동기화
            </button>
          </div>
        </header>

        <section className="health-band" aria-label="시스템 상태">
          <div>
            <span className={`status-dot ${apiState}`} />
            API{" "}
            {apiState === "online" ? "온라인" : apiState === "checking" ? "확인 중" : "오프라인"}
          </div>
          <div>기간 {range}일</div>
          <div>마지막 동기화 —</div>
        </section>

        <section className="metric-strip" aria-label="핵심 지표">
          {[
            ["조회·재생", "—"],
            ["참여", "—"],
            ["팔로워 순증", "—"],
            ["게시물", "—"],
          ].map(([label, value]) => (
            <div key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>연결 대기</small>
            </div>
          ))}
        </section>

        <section className="workspace-grid">
          <div className="workspace-primary">
            <div className="section-title">
              <div>
                <h2>플랫폼 상태</h2>
                <span>커넥터 준비 및 연결 현황</span>
              </div>
              <Braces size={18} />
            </div>

            <div className="platform-table">
              <div className="table-header">
                <span>플랫폼</span>
                <span>수집 범위</span>
                <span>상태</span>
                <span aria-hidden="true" />
              </div>
              {platforms.map((platform) => {
                const Icon = platform.icon;
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
                    <span className={`state-label ${platform.state}`}>
                      {platform.state === "ready" ? "연결 가능" : "계획됨"}
                    </span>
                    <button className="secondary-button" type="button">
                      {platform.state === "ready" ? "연결" : "보기"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <aside className="activity-panel">
            <div className="section-title">
              <div>
                <h2>최근 동기화</h2>
                <span>실행 기록</span>
              </div>
              <RefreshCw size={17} />
            </div>
            <div className="empty-activity">
              <span className="activity-line" />
              <strong>기록 없음</strong>
              <span>—</span>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
