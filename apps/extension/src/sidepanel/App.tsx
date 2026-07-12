import type {
  BrowserPlatform,
  CollectionLogEntry,
  CollectionRecord,
  PlatformCheckpoint,
} from "@creator-data-bridge/contracts";
import {
  AlertTriangle,
  Check,
  Copy,
  DatabaseZap,
  FileDown,
  LayoutDashboard,
  LoaderCircle,
  Play,
  RefreshCw,
  ScrollText,
  Settings,
  Square,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { browserPlatforms } from "../collection/preferences";
import { copyText, openDashboard } from "../shared/chrome";
import { requestAllPlatformPermissions, useBrowserCollection } from "../shared/collection";
import {
  type AppLocale,
  localeTag,
  localizeError,
  localizeLogDetail,
  localizeLogMessage,
  t,
} from "../shared/i18n";
import { platforms } from "../shared/platforms";

function statusLabel(locale: AppLocale, state: PlatformCheckpoint["state"]) {
  const keys: Record<PlatformCheckpoint["state"], Parameters<typeof t>[1]> = {
    pending: "pending",
    opening: "opening",
    waiting: "waiting",
    collecting: "collecting",
    normalizing: "normalizing",
    completed: "completed",
    failed: "needsAttention",
    cancelled: "cancelled",
  };
  return t(locale, keys[state]);
}

function formatDate(locale: AppLocale, value: string | null | undefined) {
  if (!value) return t(locale, "neverCollected");
  return new Intl.DateTimeFormat(localeTag(locale), {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLogTime(locale: AppLocale, value: string) {
  return new Intl.DateTimeFormat(localeTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function runLabel(locale: AppLocale, state: string | undefined) {
  if (state === "running" || state === "preflight") return t(locale, "runCollecting");
  if (state === "completed") return t(locale, "runCompleted");
  if (state === "partially_completed") return t(locale, "runPartial");
  if (state === "failed") return t(locale, "runFailed");
  if (state === "cancelled") return t(locale, "runCancelled");
  return t(locale, "ready");
}

function countUnavailable(records: CollectionRecord[]) {
  return records.reduce((total, record) => {
    if (record.recordType !== "content") return total;
    return (
      total +
      [
        record.viewsCoverage,
        record.likesCoverage,
        record.commentsCoverage,
        record.sharesCoverage,
        record.savesCoverage,
      ].filter((coverage) => coverage !== "complete").length
    );
  }, 0);
}

export function buildLogClipboardText(logs: CollectionLogEntry[], locale: AppLocale) {
  return logs
    .map((entry) => {
      const metadata = entry.platform
        ? platforms.find((platform) => platform.id === entry.platform)
        : null;
      const detail = localizeLogDetail(locale, entry.detail);
      return [
        `[${formatLogTime(locale, entry.at)}]`,
        metadata ? `[${metadata.label}]` : "",
        localizeLogMessage(locale, entry.message),
        detail ? `· ${detail}` : "",
      ]
        .filter(Boolean)
        .join(" ");
    })
    .join("\n");
}

function PlatformStatus({
  locale,
  platform,
  checkpoint,
  permitted,
  selected,
  disabled,
  onToggle,
  onRetry,
}: {
  locale: AppLocale;
  platform: BrowserPlatform;
  checkpoint: PlatformCheckpoint | undefined;
  permitted: boolean;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  onRetry: () => void;
}) {
  const metadata = platforms.find((item) => item.id === platform);
  if (!metadata) return null;
  const Icon = metadata.icon;
  const state = !selected
    ? "disabled"
    : !permitted
      ? "permission"
      : (checkpoint?.state ?? "pending");
  const detail = !selected
    ? t(locale, "excludedDetail")
    : !permitted
      ? t(locale, "permissionNextRun")
      : (localizeError(locale, checkpoint?.errorMessage ?? null) ??
        (checkpoint?.accountHandle
          ? t(locale, "accountContent", {
              account: checkpoint.accountHandle,
              count: checkpoint.discovered.toLocaleString(localeTag(locale)),
            })
          : statusLabel(locale, checkpoint?.state ?? "pending")));

  return (
    <article className={`collection-platform ${state}`}>
      <div
        className="platform-icon"
        style={{ color: metadata.color, backgroundColor: metadata.tint }}
      >
        <Icon size={20} />
      </div>
      <div className="platform-copy">
        <div>
          <strong>{metadata.label}</strong>
          <span className={`platform-state ${state}`}>
            {checkpoint?.state === "completed" ? <Check size={13} /> : null}
            {!selected
              ? t(locale, "excluded")
              : !permitted
                ? t(locale, "permissionPending")
                : statusLabel(locale, checkpoint?.state ?? "pending")}
          </span>
        </div>
        <span title={detail}>{detail}</span>
      </div>
      <div className="platform-controls">
        {selected && permitted && checkpoint?.state === "failed" ? (
          <button
            className="retry-button"
            type="button"
            title={t(locale, "retryCollection", { platform: metadata.label })}
            onClick={onRetry}
            disabled={disabled}
          >
            <RefreshCw size={15} />
          </button>
        ) : null}
        <label
          className="platform-switch"
          title={t(locale, "platformCollectionSetting", { platform: metadata.label })}
        >
          <input
            type="checkbox"
            checked={selected}
            disabled={disabled}
            aria-label={t(locale, "platformCollectionSetting", { platform: metadata.label })}
            onChange={onToggle}
          />
          <span />
        </label>
      </div>
    </article>
  );
}

function ExecutionLog({ logs, locale }: { logs: CollectionLogEntry[]; locale: AppLocale }) {
  const logEnd = useRef<HTMLDivElement | null>(null);
  const lastLogId = logs.at(-1)?.id;
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (lastLogId) logEnd.current?.scrollIntoView({ block: "nearest" });
  }, [lastLogId]);

  const copyLogs = async () => {
    const copied = await copyText(buildLogClipboardText(logs, locale));
    setCopyState(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1_600);
  };

  return (
    <section className="execution-log" aria-labelledby="execution-log-title">
      <div className="section-heading log-heading">
        <div>
          <ScrollText size={16} />
          <h2 id="execution-log-title">{t(locale, "fullExecutionLog")}</h2>
        </div>
        <div className="log-heading-actions">
          <span>{t(locale, "logCount", { count: logs.length })}</span>
          <button
            type="button"
            title={t(locale, "copyLogs")}
            disabled={logs.length === 0}
            onClick={() => void copyLogs()}
          >
            {copyState === "copied" ? <Check size={14} /> : <Copy size={14} />}
            {copyState === "copied"
              ? t(locale, "logsCopied")
              : copyState === "failed"
                ? t(locale, "logsCopyFailed")
                : t(locale, "copyLogs")}
          </button>
        </div>
      </div>
      <div className="log-list" role="log" aria-live="polite">
        {logs.length ? (
          logs.map((entry) => {
            const metadata = entry.platform
              ? platforms.find((platform) => platform.id === entry.platform)
              : null;
            return (
              <div className={`log-row ${entry.level}`} key={entry.id}>
                <time dateTime={entry.at}>{formatLogTime(locale, entry.at)}</time>
                <span className="log-level-dot" aria-hidden="true" />
                <div>
                  <strong>
                    {metadata ? <span>{metadata.label}</span> : null}
                    {localizeLogMessage(locale, entry.message)}
                  </strong>
                  {entry.detail ? <small>{localizeLogDetail(locale, entry.detail)}</small> : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="log-empty">{t(locale, "logEmpty")}</div>
        )}
        <div ref={logEnd} />
      </div>
    </section>
  );
}

export function App() {
  const [activeView, setActiveView] = useState<"main" | "settings">("main");
  const {
    snapshot,
    permissions,
    loading,
    preferencesLoading,
    running,
    preferences,
    exporting,
    error,
    refresh,
    start,
    cancel,
    retry,
    exportCsv,
    clear,
    togglePlatform,
    setLocale,
  } = useBrowserCollection();
  const locale = preferences.locale;
  const run = snapshot.run;
  const records = snapshot.records;
  const content = records.filter((record) => record.recordType === "content");
  const unavailable = countUnavailable(records);
  const completedPlatforms = run
    ? run.requestedPlatforms.filter((platform) => run.platforms[platform].state === "completed")
        .length
    : 0;
  const progress = run ? Math.round((completedPlatforms / run.requestedPlatforms.length) * 100) : 0;
  const selectedPlatforms = preferences.enabledPlatforms;
  const missingPermissions = selectedPlatforms.filter((platform) => !permissions[platform]);

  const startAll = async () => {
    if (selectedPlatforms.length === 0) return;
    if (missingPermissions.length > 0) {
      const granted = await requestAllPlatformPermissions(missingPermissions);
      if (!granted) {
        await refresh();
        return;
      }
    }
    await start(selectedPlatforms);
  };

  return (
    <main className="panel-shell">
      <header className="panel-header">
        <div className="brand-mark" aria-hidden="true">
          <DatabaseZap size={20} />
        </div>
        <div className="panel-title">
          <strong>Creator Data Bridge</strong>
          <span>{formatDate(locale, run?.completedAt ?? run?.createdAt)}</span>
        </div>
        <div className="panel-header-actions">
          <button
            className="icon-button"
            type="button"
            title={t(locale, "fullDashboard")}
            onClick={() => openDashboard()}
          >
            <LayoutDashboard size={18} />
          </button>
          <button
            className={`icon-button ${activeView === "settings" ? "active" : ""}`}
            type="button"
            title={
              activeView === "settings"
                ? t(locale, "collectionView")
                : t(locale, "collectionSettings")
            }
            aria-pressed={activeView === "settings"}
            onClick={() => setActiveView(activeView === "settings" ? "main" : "settings")}
          >
            <Settings size={18} />
          </button>
        </div>
      </header>

      <section className="collection-heading">
        <div>
          <span className="eyebrow">
            {activeView === "settings" ? "COLLECTION SETTINGS" : "CHANNEL SNAPSHOT"}
          </span>
          <h1>
            {activeView === "settings"
              ? t(locale, "collectionPlatforms")
              : t(locale, "channelDataCollection")}
          </h1>
        </div>
        <span className={`run-badge ${run?.state ?? "idle"}`}>
          {activeView === "settings"
            ? t(locale, "platformsEnabled", { count: selectedPlatforms.length })
            : runLabel(locale, run?.state)}
        </span>
      </section>

      {error ? (
        <div className="panel-notice error">
          <AlertTriangle size={16} />
          <span>{localizeError(locale, error)}</span>
        </div>
      ) : null}

      {activeView === "settings" ? (
        <section className="platform-section" aria-label={t(locale, "collectionPlatforms")}>
          <div className="section-heading">
            <div>
              <h2>{t(locale, "platformSelection")}</h2>
              <p>{t(locale, "settingsSavedNextRun")}</p>
            </div>
          </div>
          <div className="language-setting">
            <div>
              <strong>{t(locale, "language")}</strong>
              <span>{t(locale, "languageDescription")}</span>
            </div>
            <fieldset className="language-control">
              <legend className="sr-only">{t(locale, "language")}</legend>
              <button
                type="button"
                className={locale === "ko" ? "active" : ""}
                aria-pressed={locale === "ko"}
                onClick={() => setLocale("ko")}
              >
                {t(locale, "korean")}
              </button>
              <button
                type="button"
                className={locale === "en" ? "active" : ""}
                aria-pressed={locale === "en"}
                onClick={() => setLocale("en")}
              >
                English
              </button>
            </fieldset>
          </div>
          <div className="platform-list">
            {browserPlatforms.map((platform) => (
              <PlatformStatus
                key={platform}
                locale={locale}
                platform={platform}
                checkpoint={run?.platforms[platform]}
                permitted={permissions[platform]}
                selected={selectedPlatforms.includes(platform)}
                disabled={loading || preferencesLoading || running}
                onToggle={() => togglePlatform(platform)}
                onRetry={() => void retry(platform)}
              />
            ))}
          </div>
        </section>
      ) : (
        <>
          <section className="panel-actions" aria-label={t(locale, "collectAndExport")}>
            {running ? (
              <button
                className="secondary-button stop-button"
                type="button"
                onClick={() => void cancel()}
              >
                <Square size={15} />
                {t(locale, "stopCollection")}
              </button>
            ) : (
              <button
                className="primary-button collect-button"
                type="button"
                disabled={loading || preferencesLoading || selectedPlatforms.length === 0}
                onClick={() => void startAll()}
              >
                {loading ? <LoaderCircle size={17} className="spinning" /> : <Play size={17} />}
                {t(locale, "collect")}
              </button>
            )}
            <button
              className="secondary-button export-button"
              type="button"
              disabled={records.length === 0 || running || exporting}
              onClick={() => void exportCsv()}
            >
              {exporting ? <LoaderCircle size={16} className="spinning" /> : <FileDown size={16} />}
              {t(locale, "csvDownload")}
            </button>
          </section>

          {run ? (
            <section className="progress-section" aria-label={t(locale, "progressStatus")}>
              <div className="progress-copy">
                <span>{running ? t(locale, "readingPlatforms") : runLabel(locale, run.state)}</span>
                <strong>{progress}%</strong>
              </div>
              <div className="progress-track" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </div>
            </section>
          ) : null}

          <section className="collection-metrics" aria-label={t(locale, "resultSummary")}>
            <div>
              <span>{t(locale, "content")}</span>
              <strong>{content.length.toLocaleString(localeTag(locale))}</strong>
            </div>
            <div>
              <span>{t(locale, "csvRows")}</span>
              <strong>{records.length.toLocaleString(localeTag(locale))}</strong>
            </div>
            <div>
              <span>{t(locale, "limitedMetrics")}</span>
              <strong>{unavailable.toLocaleString(localeTag(locale))}</strong>
            </div>
          </section>

          <ExecutionLog logs={run?.logs ?? []} locale={locale} />
        </>
      )}

      <footer className="panel-footer">
        <span className="status-dot online" />
        <span>{t(locale, "localOnly")}</span>
        <button
          type="button"
          title={t(locale, "deleteHistory")}
          disabled={running || records.length === 0}
          onClick={() => void clear()}
        >
          <Trash2 size={15} />
        </button>
      </footer>
    </main>
  );
}
