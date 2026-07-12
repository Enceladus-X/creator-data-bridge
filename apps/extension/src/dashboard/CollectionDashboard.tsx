import type { BrowserPlatform, CollectionRecord } from "@creator-data-bridge/contracts";
import {
  BarChart3,
  DatabaseZap,
  FileDown,
  LayoutDashboard,
  PanelRightOpen,
  RefreshCw,
  Rows3,
  Search,
  Settings,
} from "lucide-react";
import { type CSSProperties, useMemo, useState } from "react";
import { browserPlatforms } from "../collection/preferences";
import { openCollectionPanel } from "../shared/chrome";
import { useBrowserCollection } from "../shared/collection";
import { platforms } from "../shared/platforms";

const dashboardViews = [
  { id: "overview", label: "개요", icon: LayoutDashboard },
  { id: "content", label: "콘텐츠", icon: Rows3 },
  { id: "compare", label: "플랫폼 비교", icon: BarChart3 },
  { id: "exports", label: "내보내기", icon: FileDown },
  { id: "settings", label: "설정", icon: Settings },
] as const;

type DashboardView = (typeof dashboardViews)[number]["id"];
type MetricKey = "views" | "likes" | "comments";
type ContentSort = MetricKey | "publishedAt";

const metricFormatter = new Intl.NumberFormat("ko-KR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function formatMetric(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : metricFormatter.format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function sumMetric(records: CollectionRecord[], key: MetricKey) {
  return records.reduce((total, record) => total + (record[key] ?? 0), 0);
}

function platformMetadata(platform: CollectionRecord["platform"]) {
  const metadata = platforms.find((item) => item.id === platform);
  if (!metadata) throw new Error(`Platform metadata is missing for ${platform}`);
  return metadata;
}

function runStateLabel(state: string | undefined) {
  if (state === "preflight" || state === "running") return "수집 중";
  if (state === "completed") return "완료";
  if (state === "partially_completed") return "일부 완료";
  if (state === "failed") return "실패";
  if (state === "cancelled") return "중단됨";
  return "수집 전";
}

function EmptyData({ onCollect }: { onCollect: () => void }) {
  return (
    <div className="dashboard-empty">
      <DatabaseZap size={30} />
      <strong>표시할 수집 데이터가 없습니다</strong>
      <span>사이드패널에서 채널 데이터를 수집하면 이곳에 바로 표시됩니다.</span>
      <button className="primary-button" type="button" onClick={onCollect}>
        <PanelRightOpen size={16} />
        수집 패널 열기
      </button>
    </div>
  );
}

export interface PlatformSummary {
  platform: BrowserPlatform;
  accountHandle: string | null;
  contentCount: number;
  knownViews: number;
  views: number;
  likes: number;
  comments: number;
  unavailable: number;
  state: string;
}

export function buildPlatformSummaries(
  records: CollectionRecord[],
  checkpoints: Record<BrowserPlatform, { state: string }> | null,
): PlatformSummary[] {
  return browserPlatforms.map((platform) => {
    const platformRecords = records.filter((record) => record.platform === platform);
    const content = platformRecords.filter((record) => record.recordType === "content");
    const summary = platformRecords.find((record) => record.recordType === "channel_summary");
    const unavailable = content.reduce(
      (total, record) =>
        total +
        [record.viewsCoverage, record.likesCoverage, record.commentsCoverage].filter(
          (coverage) => coverage !== "complete",
        ).length,
      0,
    );
    return {
      platform,
      accountHandle: summary?.accountHandle ?? content[0]?.accountHandle ?? null,
      contentCount: content.length,
      knownViews: content.filter((record) => record.views !== null).length,
      views: sumMetric(content, "views"),
      likes: sumMetric(content, "likes"),
      comments: sumMetric(content, "comments"),
      unavailable,
      state: checkpoints?.[platform]?.state ?? "pending",
    };
  });
}

function OverviewPanel({
  summaries,
  content,
}: {
  summaries: PlatformSummary[];
  content: CollectionRecord[];
}) {
  const leaders = [...content]
    .sort((left, right) => (right.views ?? -1) - (left.views ?? -1))
    .slice(0, 6);
  return (
    <div className="overview-layout">
      <section className="dashboard-section" aria-labelledby="platform-overview-title">
        <div className="dashboard-section-heading">
          <div>
            <h2 id="platform-overview-title">플랫폼 성과</h2>
            <span>최신 로컬 스냅샷</span>
          </div>
        </div>
        <div className="platform-performance-table">
          <div className="performance-header">
            <span>플랫폼</span>
            <span>콘텐츠</span>
            <span>조회</span>
            <span>좋아요</span>
            <span>댓글</span>
            <span>상태</span>
          </div>
          {summaries.map((summary) => {
            const metadata = platformMetadata(summary.platform);
            const Icon = metadata.icon;
            return (
              <div className="performance-row" key={summary.platform}>
                <div className="performance-platform">
                  <span style={{ color: metadata.color, backgroundColor: metadata.tint }}>
                    <Icon size={18} />
                  </span>
                  <div>
                    <strong>{metadata.label}</strong>
                    <small>{summary.accountHandle ?? "계정 미확인"}</small>
                  </div>
                </div>
                <span>{summary.contentCount}</span>
                <span>{summary.knownViews ? formatMetric(summary.views) : "—"}</span>
                <span>{formatMetric(summary.likes)}</span>
                <span>{formatMetric(summary.comments)}</span>
                <span className={`collection-state ${summary.state}`}>
                  {runStateLabel(summary.state)}
                  {summary.unavailable ? ` · 제한 ${summary.unavailable}` : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="content-leaders-title">
        <div className="dashboard-section-heading">
          <div>
            <h2 id="content-leaders-title">조회 상위 콘텐츠</h2>
            <span>조회수가 제공된 콘텐츠 기준</span>
          </div>
        </div>
        <div className="leader-list">
          {leaders.length ? (
            leaders.map((record, index) => (
              <a
                href={record.contentUrl}
                target="_blank"
                rel="noreferrer"
                key={`${record.platform}-${record.contentId}`}
              >
                <span className="leader-rank">{index + 1}</span>
                <div>
                  <strong>{record.title || record.contentId}</strong>
                  <small>{record.platform}</small>
                </div>
                <span className="leader-value">{formatMetric(record.views)}</span>
              </a>
            ))
          ) : (
            <div className="section-empty">조회수가 제공된 콘텐츠가 없습니다.</div>
          )}
        </div>
      </section>
    </div>
  );
}

function ContentPanel({ content }: { content: CollectionRecord[] }) {
  const [platformFilter, setPlatformFilter] = useState<"all" | BrowserPlatform>("all");
  const [sortBy, setSortBy] = useState<ContentSort>("views");
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return content
      .filter((record) => platformFilter === "all" || record.platform === platformFilter)
      .filter(
        (record) =>
          !normalizedQuery ||
          record.title.toLowerCase().includes(normalizedQuery) ||
          record.contentId.toLowerCase().includes(normalizedQuery),
      )
      .sort((left, right) => {
        if (sortBy === "publishedAt") {
          return (right.publishedAt ?? "").localeCompare(left.publishedAt ?? "");
        }
        return (right[sortBy] ?? -1) - (left[sortBy] ?? -1);
      });
  }, [content, platformFilter, query, sortBy]);

  return (
    <section className="dashboard-section content-analysis" aria-labelledby="content-table-title">
      <div className="dashboard-section-heading content-toolbar">
        <div>
          <h2 id="content-table-title">콘텐츠 데이터</h2>
          <span>{visible.length}개 표시</span>
        </div>
        <div className="content-controls">
          <label className="search-field">
            <Search size={15} />
            <span className="sr-only">콘텐츠 검색</span>
            <input
              type="search"
              value={query}
              placeholder="제목 또는 ID 검색"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">플랫폼 필터</span>
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value as "all" | BrowserPlatform)}
            >
              <option value="all">전체 플랫폼</option>
              {browserPlatforms.map((platform) => (
                <option value={platform} key={platform}>
                  {platformMetadata(platform).label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">정렬 기준</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as ContentSort)}
            >
              <option value="views">조회순</option>
              <option value="likes">좋아요순</option>
              <option value="comments">댓글순</option>
              <option value="publishedAt">게시일순</option>
            </select>
          </label>
        </div>
      </div>
      <div className="collection-content-table">
        <div className="collection-content-header">
          <span>플랫폼</span>
          <span>콘텐츠</span>
          <span>게시일</span>
          <span>조회</span>
          <span>좋아요</span>
          <span>댓글</span>
        </div>
        {visible.map((record) => {
          const metadata = platformMetadata(record.platform);
          return (
            <a
              className="collection-content-row"
              href={record.contentUrl}
              target="_blank"
              rel="noreferrer"
              key={`${record.platform}-${record.contentId}`}
            >
              <span className="content-platform" style={{ color: metadata.color }}>
                {metadata.label}
              </span>
              <span className="content-name">
                <strong>{record.title || record.contentId}</strong>
                <small>{record.contentId}</small>
              </span>
              <span>{record.publishedAt ?? "—"}</span>
              <span>{formatMetric(record.views)}</span>
              <span>{formatMetric(record.likes)}</span>
              <span>{formatMetric(record.comments)}</span>
            </a>
          );
        })}
      </div>
      {visible.length === 0 ? (
        <div className="section-empty">조건에 맞는 콘텐츠가 없습니다.</div>
      ) : null}
    </section>
  );
}

function ComparisonPanel({ summaries }: { summaries: PlatformSummary[] }) {
  const maximumViews = Math.max(...summaries.map((summary) => summary.views), 1);
  const maximumEngagement = Math.max(
    ...summaries.map((summary) => summary.likes + summary.comments),
    1,
  );
  return (
    <div className="comparison-layout">
      <section className="dashboard-section" aria-labelledby="views-comparison-title">
        <div className="dashboard-section-heading">
          <div>
            <h2 id="views-comparison-title">플랫폼별 조회</h2>
            <span>조회수 제공 범위 내 합계</span>
          </div>
        </div>
        <div className="comparison-chart" role="img" aria-label="플랫폼별 조회수 비교 막대그래프">
          {summaries.map((summary) => {
            const metadata = platformMetadata(summary.platform);
            return (
              <div className="comparison-row" key={summary.platform}>
                <strong>{metadata.label}</strong>
                <span className="comparison-track">
                  <span
                    style={
                      {
                        width: `${(summary.views / maximumViews) * 100}%`,
                        "--platform-color": metadata.color,
                      } as CSSProperties
                    }
                  />
                </span>
                <span className="comparison-value">
                  {summary.knownViews ? formatMetric(summary.views) : "—"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="engagement-comparison-title">
        <div className="dashboard-section-heading">
          <div>
            <h2 id="engagement-comparison-title">플랫폼별 반응</h2>
            <span>좋아요와 댓글 합계</span>
          </div>
        </div>
        <div
          className="comparison-chart"
          role="img"
          aria-label="플랫폼별 좋아요와 댓글 비교 막대그래프"
        >
          {summaries.map((summary) => {
            const metadata = platformMetadata(summary.platform);
            const engagement = summary.likes + summary.comments;
            return (
              <div className="comparison-row" key={summary.platform}>
                <strong>{metadata.label}</strong>
                <span className="comparison-track">
                  <span
                    style={
                      {
                        width: `${(engagement / maximumEngagement) * 100}%`,
                        "--platform-color": metadata.color,
                      } as CSSProperties
                    }
                  />
                </span>
                <span className="comparison-value">{formatMetric(engagement)}</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function ExportPanel({
  records,
  completedAt,
  onExport,
}: {
  records: CollectionRecord[];
  completedAt: string | null | undefined;
  onExport: () => void;
}) {
  const accountCount = new Set(
    records.map((record) => `${record.platform}:${record.accountHandle}`),
  ).size;
  return (
    <section className="dashboard-section export-workspace" aria-labelledby="csv-export-title">
      <div className="export-symbol">
        <FileDown size={28} />
      </div>
      <div>
        <h2 id="csv-export-title">AI 분석용 통합 CSV</h2>
        <p>대시보드와 동일한 최신 로컬 레코드를 UTF-8 BOM CSV로 저장합니다.</p>
        <dl className="export-facts">
          <div>
            <dt>행</dt>
            <dd>{records.length}</dd>
          </div>
          <div>
            <dt>열</dt>
            <dd>29</dd>
          </div>
          <div>
            <dt>계정</dt>
            <dd>{accountCount}</dd>
          </div>
          <div>
            <dt>수집 완료</dt>
            <dd>{formatDate(completedAt)}</dd>
          </div>
        </dl>
      </div>
      <button
        className="primary-button"
        type="button"
        onClick={onExport}
        disabled={!records.length}
      >
        <FileDown size={16} />
        CSV 다운로드
      </button>
    </section>
  );
}

function SettingsPanel({
  enabledPlatforms,
  itemLimit,
  disabled,
  onToggle,
  onLimit,
}: {
  enabledPlatforms: BrowserPlatform[];
  itemLimit: 50 | 100 | 250 | 500;
  disabled: boolean;
  onToggle: (platform: BrowserPlatform) => void;
  onLimit: (limit: 50 | 100 | 250 | 500) => void;
}) {
  return (
    <section
      className="dashboard-section dashboard-settings"
      aria-labelledby="collection-settings-title"
    >
      <div className="dashboard-section-heading">
        <div>
          <h2 id="collection-settings-title">수집 설정</h2>
          <span>사이드패널과 동일한 설정이 즉시 저장됩니다.</span>
        </div>
      </div>
      <div className="dashboard-platform-settings">
        {browserPlatforms.map((platform) => {
          const metadata = platformMetadata(platform);
          const Icon = metadata.icon;
          const enabled = enabledPlatforms.includes(platform);
          return (
            <label className="dashboard-platform-toggle" key={platform}>
              <span
                className="settings-platform-icon"
                style={{ color: metadata.color, backgroundColor: metadata.tint }}
              >
                <Icon size={19} />
              </span>
              <span>
                <strong>{metadata.label}</strong>
                <small>{metadata.detail}</small>
              </span>
              <input
                type="checkbox"
                checked={enabled}
                disabled={disabled}
                onChange={() => onToggle(platform)}
              />
              <span className="settings-switch" aria-hidden="true" />
            </label>
          );
        })}
      </div>
      <div className="dashboard-limit-setting">
        <div>
          <strong>플랫폼별 최대 콘텐츠</strong>
          <span>수집 시간이 길어지면 낮은 범위를 선택하세요.</span>
        </div>
        <fieldset className="dashboard-segmented">
          <legend className="sr-only">플랫폼별 최대 콘텐츠</legend>
          {([50, 100, 250, 500] as const).map((limit) => (
            <button
              className="dashboard-segmented-button"
              type="button"
              aria-pressed={itemLimit === limit}
              disabled={disabled}
              onClick={() => onLimit(limit)}
              key={limit}
            >
              {limit}
            </button>
          ))}
        </fieldset>
      </div>
    </section>
  );
}

export function CollectionDashboard() {
  const [activeView, setActiveView] = useState<DashboardView>(() =>
    window.location.hash.startsWith("#settings") ? "settings" : "overview",
  );
  const {
    snapshot,
    loading,
    preferencesLoading,
    running,
    preferences,
    error,
    refresh,
    exportCsv,
    togglePlatform,
    setItemLimit,
  } = useBrowserCollection();
  const records = snapshot.records;
  const run = snapshot.run;
  const content = records.filter((record) => record.recordType === "content");
  const summaries = useMemo(
    () => buildPlatformSummaries(records, run?.platforms ?? null),
    [records, run?.platforms],
  );
  const totalViews = sumMetric(content, "views");
  const totalLikes = sumMetric(content, "likes");
  const totalComments = sumMetric(content, "comments");
  const activeLabel = dashboardViews.find((view) => view.id === activeView)?.label ?? "개요";
  const accountLabel = records[0]?.accountHandle ?? "Local workspace";
  const openPanel = () => void openCollectionPanel();

  return (
    <div className="collection-dashboard-shell">
      <aside className="collection-sidebar">
        <div className="collection-brand">
          <div className="brand-mark" aria-hidden="true">
            <DatabaseZap size={20} />
          </div>
          <div>
            <strong>Creator Data Bridge</strong>
            <span>{accountLabel}</span>
          </div>
        </div>
        <nav aria-label="수집 데이터 대시보드">
          {dashboardViews.map((view) => {
            const Icon = view.icon;
            return (
              <button
                type="button"
                className={activeView === view.id ? "active" : ""}
                onClick={() => setActiveView(view.id)}
                key={view.id}
              >
                <Icon size={17} />
                {view.label}
              </button>
            );
          })}
        </nav>
        <div className="collection-sidebar-footer">
          <span className={`status-dot ${running ? "checking" : "online"}`} />
          {running ? "수집 진행 중" : "로컬 데이터"}
        </div>
      </aside>

      <main className="collection-dashboard-main">
        <header className="collection-dashboard-header">
          <div>
            <span className="eyebrow">COLLECTION SNAPSHOT</span>
            <h1>{activeLabel}</h1>
          </div>
          <div className="collection-header-actions">
            <button
              className="icon-button"
              type="button"
              title="데이터 새로고침"
              onClick={() => void refresh()}
              disabled={loading}
            >
              <RefreshCw size={17} className={loading ? "spinning" : ""} />
            </button>
            <button
              className="secondary-button"
              type="button"
              onClick={() => void exportCsv()}
              disabled={!records.length || running}
            >
              <FileDown size={16} />
              CSV 저장
            </button>
            <button className="primary-button" type="button" onClick={openPanel}>
              <PanelRightOpen size={16} />새 데이터 수집
            </button>
          </div>
        </header>

        {error ? <div className="collection-dashboard-notice">{error}</div> : null}

        <section className="collection-status-band" aria-label="수집 데이터 상태">
          <span>{runStateLabel(run?.state)}</span>
          <span>마지막 수집 {formatDate(run?.completedAt ?? run?.createdAt)}</span>
          <span>{records.length}개 CSV 행</span>
          <span>외부 전송 없음</span>
        </section>

        {activeView !== "settings" ? (
          <section className="collection-metric-band" aria-label="최신 수집 핵심 지표">
            {[
              ["콘텐츠", content.length],
              ["조회", totalViews],
              ["좋아요", totalLikes],
              ["댓글", totalComments],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{formatMetric(value as number)}</strong>
                <small>최신 스냅샷 합계</small>
              </div>
            ))}
          </section>
        ) : null}

        <div className="collection-dashboard-workspace">
          {!records.length && activeView !== "settings" ? (
            <EmptyData onCollect={openPanel} />
          ) : null}
          {records.length && activeView === "overview" ? (
            <OverviewPanel summaries={summaries} content={content} />
          ) : null}
          {records.length && activeView === "content" ? <ContentPanel content={content} /> : null}
          {records.length && activeView === "compare" ? (
            <ComparisonPanel summaries={summaries} />
          ) : null}
          {activeView === "exports" ? (
            <ExportPanel
              records={records}
              completedAt={run?.completedAt}
              onExport={() => void exportCsv()}
            />
          ) : null}
          {activeView === "settings" ? (
            <SettingsPanel
              enabledPlatforms={preferences.enabledPlatforms}
              itemLimit={preferences.itemLimit}
              disabled={running || preferencesLoading}
              onToggle={togglePlatform}
              onLimit={setItemLimit}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
