import type {
  BrowserPlatform,
  CollectionLogEntry,
  CollectionRecord,
  PlatformCheckpoint,
} from "@creator-data-bridge/contracts";
import {
  AlertTriangle,
  Check,
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
import { openDashboard } from "../shared/chrome";
import { requestAllPlatformPermissions, useBrowserCollection } from "../shared/collection";
import { platforms } from "../shared/platforms";

const statusLabels: Record<PlatformCheckpoint["state"], string> = {
  pending: "대기",
  opening: "페이지 여는 중",
  waiting: "페이지 준비 중",
  collecting: "콘텐츠 읽는 중",
  normalizing: "데이터 정리 중",
  completed: "완료",
  failed: "확인 필요",
  cancelled: "중단됨",
};

function formatDate(value: string | null | undefined) {
  if (!value) return "아직 수집 전";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatLogTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function runLabel(state: string | undefined) {
  if (state === "running" || state === "preflight") return "수집 중";
  if (state === "completed") return "수집 완료";
  if (state === "partially_completed") return "일부 완료";
  if (state === "failed") return "수집 실패";
  if (state === "cancelled") return "수집 중단";
  return "준비됨";
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

function PlatformStatus({
  platform,
  checkpoint,
  permitted,
  selected,
  disabled,
  onToggle,
  onRetry,
}: {
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
    ? "수집에서 제외됨"
    : !permitted
      ? "다음 수집 시 사이트 권한을 요청합니다"
      : (checkpoint?.errorMessage ??
        (checkpoint?.accountHandle
          ? `${checkpoint.accountHandle} · 콘텐츠 ${checkpoint.discovered.toLocaleString("ko-KR")}개`
          : statusLabels[checkpoint?.state ?? "pending"]));

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
              ? "제외"
              : !permitted
                ? "권한 대기"
                : statusLabels[checkpoint?.state ?? "pending"]}
          </span>
        </div>
        <span title={detail}>{detail}</span>
      </div>
      <div className="platform-controls">
        {selected && permitted && checkpoint?.state === "failed" ? (
          <button
            className="retry-button"
            type="button"
            title={`${metadata.label} 다시 수집`}
            onClick={onRetry}
            disabled={disabled}
          >
            <RefreshCw size={15} />
          </button>
        ) : null}
        <label className="platform-switch" title={`${metadata.label} 수집 설정`}>
          <input
            type="checkbox"
            checked={selected}
            disabled={disabled}
            aria-label={`${metadata.label} 수집`}
            onChange={onToggle}
          />
          <span />
        </label>
      </div>
    </article>
  );
}

function ExecutionLog({ logs }: { logs: CollectionLogEntry[] }) {
  const logEnd = useRef<HTMLDivElement | null>(null);
  const lastLogId = logs.at(-1)?.id;

  useEffect(() => {
    if (lastLogId) logEnd.current?.scrollIntoView({ block: "nearest" });
  }, [lastLogId]);

  return (
    <section className="execution-log" aria-labelledby="execution-log-title">
      <div className="section-heading log-heading">
        <div>
          <ScrollText size={16} />
          <h2 id="execution-log-title">전체 실행 로그</h2>
        </div>
        <span>{logs.length}건</span>
      </div>
      <div className="log-list" role="log" aria-live="polite">
        {logs.length ? (
          logs.map((entry) => {
            const metadata = entry.platform
              ? platforms.find((platform) => platform.id === entry.platform)
              : null;
            return (
              <div className={`log-row ${entry.level}`} key={entry.id}>
                <time dateTime={entry.at}>{formatLogTime(entry.at)}</time>
                <span className="log-level-dot" aria-hidden="true" />
                <div>
                  <strong>
                    {metadata ? <span>{metadata.label}</span> : null}
                    {entry.message}
                  </strong>
                  {entry.detail ? <small>{entry.detail}</small> : null}
                </div>
              </div>
            );
          })
        ) : (
          <div className="log-empty">수집을 실행하면 단계별 기록이 여기에 표시됩니다.</div>
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
  } = useBrowserCollection();
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
          <span>{formatDate(run?.completedAt ?? run?.createdAt)}</span>
        </div>
        <div className="panel-header-actions">
          <button
            className="icon-button"
            type="button"
            title="전체 대시보드"
            onClick={() => openDashboard()}
          >
            <LayoutDashboard size={18} />
          </button>
          <button
            className={`icon-button ${activeView === "settings" ? "active" : ""}`}
            type="button"
            title={activeView === "settings" ? "수집 화면" : "수집 설정"}
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
          <h1>{activeView === "settings" ? "수집 플랫폼" : "채널 데이터 수집"}</h1>
        </div>
        <span className={`run-badge ${run?.state ?? "idle"}`}>
          {activeView === "settings" ? `${selectedPlatforms.length}개 사용` : runLabel(run?.state)}
        </span>
      </section>

      {error ? (
        <div className="panel-notice error">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      {activeView === "settings" ? (
        <section className="platform-section" aria-label="수집 플랫폼 설정">
          <div className="section-heading">
            <div>
              <h2>플랫폼 선택</h2>
              <p>설정은 즉시 저장되며 다음 수집부터 적용됩니다.</p>
            </div>
          </div>
          <div className="platform-list">
            {browserPlatforms.map((platform) => (
              <PlatformStatus
                key={platform}
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
          <section className="panel-actions" aria-label="수집 및 내보내기">
            {running ? (
              <button
                className="secondary-button stop-button"
                type="button"
                onClick={() => void cancel()}
              >
                <Square size={15} />
                수집 중단
              </button>
            ) : (
              <button
                className="primary-button collect-button"
                type="button"
                disabled={loading || preferencesLoading || selectedPlatforms.length === 0}
                onClick={() => void startAll()}
              >
                {loading ? <LoaderCircle size={17} className="spinning" /> : <Play size={17} />}
                수집
              </button>
            )}
            <button
              className="secondary-button export-button"
              type="button"
              disabled={records.length === 0 || running || exporting}
              onClick={() => void exportCsv()}
            >
              {exporting ? <LoaderCircle size={16} className="spinning" /> : <FileDown size={16} />}
              CSV 다운로드
            </button>
          </section>

          {run ? (
            <section className="progress-section" aria-label="수집 진행 상태">
              <div className="progress-copy">
                <span>{running ? "플랫폼 데이터를 읽고 있습니다" : runLabel(run.state)}</span>
                <strong>{progress}%</strong>
              </div>
              <div className="progress-track" aria-hidden="true">
                <span style={{ width: `${progress}%` }} />
              </div>
            </section>
          ) : null}

          <section className="collection-metrics" aria-label="수집 결과 요약">
            <div>
              <span>콘텐츠</span>
              <strong>{content.length.toLocaleString("ko-KR")}</strong>
            </div>
            <div>
              <span>CSV 행</span>
              <strong>{records.length.toLocaleString("ko-KR")}</strong>
            </div>
            <div>
              <span>제한 지표</span>
              <strong>{unavailable.toLocaleString("ko-KR")}</strong>
            </div>
          </section>

          <ExecutionLog logs={run?.logs ?? []} />
        </>
      )}

      <footer className="panel-footer">
        <span className="status-dot online" />
        <span>로컬 저장 · 외부 전송 없음</span>
        <button
          type="button"
          title="수집 기록 삭제"
          disabled={running || records.length === 0}
          onClick={() => void clear()}
        >
          <Trash2 size={15} />
        </button>
      </footer>
    </main>
  );
}
