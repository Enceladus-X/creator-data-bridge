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
import { type AppLocale, localeTag, localizeError, t } from "../shared/i18n";
import { platforms } from "../shared/platforms";

const dashboardViews = [
  { id: "overview", icon: LayoutDashboard },
  { id: "content", icon: Rows3 },
  { id: "compare", icon: BarChart3 },
  { id: "exports", icon: FileDown },
  { id: "settings", icon: Settings },
] as const;

type DashboardView = (typeof dashboardViews)[number]["id"];
type MetricKey = "views" | "likes" | "comments";
type ContentSort = MetricKey | "publishedAt";

const metricFormatter = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 0 });

export function formatMetric(value: number | null | undefined) {
  return value === null || value === undefined ? "—" : metricFormatter.format(value);
}

function dashboardViewLabel(locale: AppLocale, view: DashboardView) {
  const keys: Record<DashboardView, Parameters<typeof t>[1]> = {
    overview: "overview",
    content: "content",
    compare: "compare",
    exports: "exports",
    settings: "settings",
  };
  return t(locale, keys[view]);
}

function formatDate(locale: AppLocale, value: string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(localeTag(locale), {
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

function runStateLabel(locale: AppLocale, state: string | undefined) {
  if (state === "preflight" || state === "running") return t(locale, "runCollecting");
  if (state === "completed") return t(locale, "completed");
  if (state === "partially_completed") return t(locale, "runPartial");
  if (state === "failed") return t(locale, "runFailed");
  if (state === "cancelled") return t(locale, "cancelled");
  return t(locale, "neverCollected");
}

function EmptyData({ onCollect, locale }: { onCollect: () => void; locale: AppLocale }) {
  return (
    <div className="dashboard-empty">
      <DatabaseZap size={30} />
      <strong>{t(locale, "noDataTitle")}</strong>
      <span>{t(locale, "noDataBody")}</span>
      <button className="primary-button" type="button" onClick={onCollect}>
        <PanelRightOpen size={16} />
        {t(locale, "openCollectionPanel")}
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

export function platformUploadUrl(platform: BrowserPlatform, _accountHandle: string | null = null) {
  if (platform === "youtube") return "https://www.youtube.com/upload";
  if (platform === "tiktok") return "https://www.tiktok.com/tiktokstudio/upload";
  if (platform === "x") return "https://x.com/compose/post";
  return "https://www.instagram.com/create/select/";
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
  locale,
}: {
  summaries: PlatformSummary[];
  content: CollectionRecord[];
  locale: AppLocale;
}) {
  const leaders = [...content]
    .sort((left, right) => (right.views ?? -1) - (left.views ?? -1))
    .slice(0, 6);
  return (
    <div className="overview-layout">
      <section className="dashboard-section" aria-labelledby="platform-overview-title">
        <div className="dashboard-section-heading">
          <div>
            <h2 id="platform-overview-title">{t(locale, "platformPerformance")}</h2>
            <span>{t(locale, "latestSnapshot")}</span>
          </div>
        </div>
        <div className="platform-performance-table">
          <div className="performance-header">
            <span>{t(locale, "platform")}</span>
            <span>{t(locale, "content")}</span>
            <span>{t(locale, "views")}</span>
            <span>{t(locale, "likes")}</span>
            <span>{t(locale, "comments")}</span>
            <span>{t(locale, "status")}</span>
          </div>
          {summaries.map((summary) => {
            const metadata = platformMetadata(summary.platform);
            const Icon = metadata.icon;
            return (
              <div className="performance-row" key={summary.platform}>
                <div className="performance-platform">
                  <a
                    className="performance-platform-link"
                    href={platformUploadUrl(summary.platform, summary.accountHandle)}
                    target="_blank"
                    rel="noreferrer"
                    title={t(locale, "openUploadPage", { platform: metadata.label })}
                    aria-label={t(locale, "openUploadPage", { platform: metadata.label })}
                    style={{ color: metadata.color, backgroundColor: metadata.tint }}
                  >
                    <Icon size={18} />
                  </a>
                  <div>
                    <strong>{metadata.label}</strong>
                    <small>{summary.accountHandle ?? t(locale, "accountUnknown")}</small>
                  </div>
                </div>
                <span>{summary.contentCount}</span>
                <span>{summary.knownViews ? formatMetric(summary.views) : "—"}</span>
                <span>{formatMetric(summary.likes)}</span>
                <span>{formatMetric(summary.comments)}</span>
                <span className={`collection-state ${summary.state}`}>
                  {runStateLabel(locale, summary.state)}
                  {summary.unavailable
                    ? ` · ${t(locale, "limitations", { count: summary.unavailable })}`
                    : ""}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="dashboard-section" aria-labelledby="content-leaders-title">
        <div className="dashboard-section-heading">
          <div>
            <h2 id="content-leaders-title">{t(locale, "topContent")}</h2>
            <span>{t(locale, "contentWithViews")}</span>
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
            <div className="section-empty">{t(locale, "noViewContent")}</div>
          )}
        </div>
      </section>
    </div>
  );
}

function ContentPanel({ content, locale }: { content: CollectionRecord[]; locale: AppLocale }) {
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
          <h2 id="content-table-title">{t(locale, "contentData")}</h2>
          <span>{t(locale, "shownCount", { count: visible.length })}</span>
        </div>
        <div className="content-controls">
          <label className="search-field">
            <Search size={15} />
            <span className="sr-only">{t(locale, "searchContent")}</span>
            <input
              type="search"
              value={query}
              placeholder={t(locale, "searchPlaceholder")}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            <span className="sr-only">{t(locale, "platformFilter")}</span>
            <select
              value={platformFilter}
              onChange={(event) => setPlatformFilter(event.target.value as "all" | BrowserPlatform)}
            >
              <option value="all">{t(locale, "allPlatforms")}</option>
              {browserPlatforms.map((platform) => (
                <option value={platform} key={platform}>
                  {platformMetadata(platform).label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">{t(locale, "sortBy")}</span>
            <select
              value={sortBy}
              onChange={(event) => setSortBy(event.target.value as ContentSort)}
            >
              <option value="views">{t(locale, "sortViews")}</option>
              <option value="likes">{t(locale, "sortLikes")}</option>
              <option value="comments">{t(locale, "sortComments")}</option>
              <option value="publishedAt">{t(locale, "sortPublished")}</option>
            </select>
          </label>
        </div>
      </div>
      <div className="collection-content-table">
        <div className="collection-content-header">
          <span>{t(locale, "platform")}</span>
          <span>{t(locale, "content")}</span>
          <span>{t(locale, "publishedAt")}</span>
          <span>{t(locale, "views")}</span>
          <span>{t(locale, "likes")}</span>
          <span>{t(locale, "comments")}</span>
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
        <div className="section-empty">{t(locale, "noMatchingContent")}</div>
      ) : null}
    </section>
  );
}

function ComparisonPanel({
  summaries,
  locale,
}: {
  summaries: PlatformSummary[];
  locale: AppLocale;
}) {
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
            <h2 id="views-comparison-title">{t(locale, "viewsByPlatform")}</h2>
            <span>{t(locale, "knownViewsTotal")}</span>
          </div>
        </div>
        <div className="comparison-chart" role="img" aria-label={t(locale, "viewsChart")}>
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
            <h2 id="engagement-comparison-title">{t(locale, "engagementByPlatform")}</h2>
            <span>{t(locale, "likesAndComments")}</span>
          </div>
        </div>
        <div className="comparison-chart" role="img" aria-label={t(locale, "engagementChart")}>
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
  locale,
}: {
  records: CollectionRecord[];
  completedAt: string | null | undefined;
  onExport: () => void;
  locale: AppLocale;
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
        <h2 id="csv-export-title">{t(locale, "aiCsv")}</h2>
        <p>{t(locale, "aiCsvBody")}</p>
        <dl className="export-facts">
          <div>
            <dt>{t(locale, "rows")}</dt>
            <dd>{records.length}</dd>
          </div>
          <div>
            <dt>{t(locale, "columns")}</dt>
            <dd>29</dd>
          </div>
          <div>
            <dt>{t(locale, "accounts")}</dt>
            <dd>{accountCount}</dd>
          </div>
          <div>
            <dt>{t(locale, "collectionCompleted")}</dt>
            <dd>{formatDate(locale, completedAt)}</dd>
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
        {t(locale, "csvDownload")}
      </button>
    </section>
  );
}

function SettingsPanel({
  enabledPlatforms,
  locale,
  disabled,
  onToggle,
  onLocale,
}: {
  enabledPlatforms: BrowserPlatform[];
  locale: AppLocale;
  disabled: boolean;
  onToggle: (platform: BrowserPlatform) => void;
  onLocale: (locale: AppLocale) => void;
}) {
  return (
    <section
      className="dashboard-section dashboard-settings"
      aria-labelledby="collection-settings-title"
    >
      <div className="dashboard-section-heading">
        <div>
          <h2 id="collection-settings-title">{t(locale, "collectionSettings")}</h2>
          <span>{t(locale, "sharedSettings")}</span>
        </div>
      </div>
      <div className="dashboard-language-setting">
        <div>
          <strong>{t(locale, "language")}</strong>
          <span>{t(locale, "languageDescription")}</span>
        </div>
        <fieldset className="dashboard-segmented">
          <legend className="sr-only">{t(locale, "language")}</legend>
          <button
            type="button"
            aria-pressed={locale === "ko"}
            disabled={disabled}
            onClick={() => onLocale("ko")}
          >
            {t(locale, "korean")}
          </button>
          <button
            type="button"
            aria-pressed={locale === "en"}
            disabled={disabled}
            onClick={() => onLocale("en")}
          >
            English
          </button>
        </fieldset>
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
                <small>{locale === "en" ? metadata.detailEn : metadata.detail}</small>
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
    setLocale,
  } = useBrowserCollection();
  const locale = preferences.locale;
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
  const activeLabel = dashboardViewLabel(locale, activeView);
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
        <nav aria-label={t(locale, "collectionDashboard")}>
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
                {dashboardViewLabel(locale, view.id)}
              </button>
            );
          })}
        </nav>
        <div className="collection-sidebar-footer">
          <span className={`status-dot ${running ? "checking" : "online"}`} />
          {running ? t(locale, "collectionInProgress") : t(locale, "localData")}
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
              title={t(locale, "refreshData")}
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
              {t(locale, "saveCsv")}
            </button>
            <button className="primary-button" type="button" onClick={openPanel}>
              <PanelRightOpen size={16} />
              {t(locale, "newCollection")}
            </button>
          </div>
        </header>

        {error ? (
          <div className="collection-dashboard-notice">{localizeError(locale, error)}</div>
        ) : null}

        <section className="collection-status-band" aria-label={t(locale, "dataStatus")}>
          <span>{runStateLabel(locale, run?.state)}</span>
          <span>
            {t(locale, "lastCollection", {
              date: formatDate(locale, run?.completedAt ?? run?.createdAt),
            })}
          </span>
          <span>{t(locale, "csvRowCount", { count: records.length })}</span>
          <span>{t(locale, "noExternalTransfer")}</span>
        </section>

        {activeView !== "settings" ? (
          <section className="collection-metric-band" aria-label={t(locale, "keyMetrics")}>
            {[
              [t(locale, "content"), content.length],
              [t(locale, "views"), totalViews],
              [t(locale, "likes"), totalLikes],
              [t(locale, "comments"), totalComments],
            ].map(([label, value]) => (
              <div key={label}>
                <span>{label}</span>
                <strong>{formatMetric(value as number)}</strong>
                <small>{t(locale, "latestTotal")}</small>
              </div>
            ))}
          </section>
        ) : null}

        <div className="collection-dashboard-workspace">
          {!records.length && activeView !== "settings" ? (
            <EmptyData onCollect={openPanel} locale={locale} />
          ) : null}
          {records.length && activeView === "overview" ? (
            <OverviewPanel summaries={summaries} content={content} locale={locale} />
          ) : null}
          {records.length && activeView === "content" ? (
            <ContentPanel content={content} locale={locale} />
          ) : null}
          {records.length && activeView === "compare" ? (
            <ComparisonPanel summaries={summaries} locale={locale} />
          ) : null}
          {activeView === "exports" ? (
            <ExportPanel
              records={records}
              completedAt={run?.completedAt}
              onExport={() => void exportCsv()}
              locale={locale}
            />
          ) : null}
          {activeView === "settings" ? (
            <SettingsPanel
              enabledPlatforms={preferences.enabledPlatforms}
              locale={locale}
              disabled={running || preferencesLoading}
              onToggle={togglePlatform}
              onLocale={setLocale}
            />
          ) : null}
        </div>
      </main>
    </div>
  );
}
