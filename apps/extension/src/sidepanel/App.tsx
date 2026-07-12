import type {
  BrowserPlatform,
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
  Square,
  Trash2,
} from "lucide-react";
import { browserPlatforms } from "../collection/preferences";
import { openDashboard } from "../shared/chrome";
import { requestAllPlatformPermissions, useBrowserCollection } from "../shared/collection";
import { platforms } from "../shared/platforms";

const statusLabels: Record<PlatformCheckpoint["state"], string> = {
  pending: "대기",
  opening: "수집 화면 여는 중",
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

function runLabel(state: string | undefined) {
  if (state === "running" || state === "preflight") return "수집 중";
  if (state === "completed") return "수집 완료";
  if (state === "partially_completed") return "일부 수집 완료";
  if (state === "failed") return "수집 실패";
  if (state === "cancelled") return "수집 중단됨";
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
      ? "첫 실행 때 사이트 권한을 요청합니다"
      : (checkpoint?.errorMessage ??
        (checkpoint?.accountHandle
          ? `${checkpoint.accountHandle} · 콘텐츠 ${checkpoint.discovered}개`
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
        <label
          className="platform-switch"
          title={`${metadata.label} 수집 ${selected ? "끄기" : "켜기"}`}
        >
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

export function App() {
  const {
    snapshot,
    permissions,
    loading,
    preferencesLoading,
    running,
    preferences,
    autoDownloadArmed,
    autoExporting,
    error,
    refresh,
    start,
    cancel,
    retry,
    exportCsv,
    clear,
    togglePlatform,
    setItemLimit,
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
    await start(selectedPlatforms, preferences.itemLimit);
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
        <button
          className="icon-button"
          type="button"
          title="전체 대시보드"
          onClick={() => openDashboard()}
        >
          <LayoutDashboard size={18} />
        </button>
      </header>

      <section className="collection-heading">
        <div>
          <span className="eyebrow">CHANNEL SNAPSHOT</span>
          <h1>채널 CSV 수집</h1>
        </div>
        <span className={`run-badge ${run?.state ?? "idle"}`}>{runLabel(run?.state)}</span>
      </section>

      {error ? (
        <div className="panel-notice error">
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="platform-section" aria-label="수집 플랫폼">
        <div className="section-heading">
          <h2>수집 설정</h2>
          <span>{selectedPlatforms.length}개 플랫폼 사용</span>
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

      <section className="limit-section" aria-label="플랫폼별 수집 개수">
        <div>
          <h2>플랫폼별 최대 콘텐츠</h2>
          <span>오래된 게시물까지 스크롤해 수집합니다</span>
        </div>
        <div className="limit-control">
          {[50, 100, 250, 500].map((limit) => (
            <button
              key={limit}
              type="button"
              className={preferences.itemLimit === limit ? "active" : ""}
              aria-pressed={preferences.itemLimit === limit}
              disabled={running}
              onClick={() => setItemLimit(limit as 50 | 100 | 250 | 500)}
            >
              {limit}
            </button>
          ))}
        </div>
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
          <strong>{content.length}</strong>
        </div>
        <div>
          <span>CSV 행</span>
          <strong>{records.length}</strong>
        </div>
        <div>
          <span>제한 지표</span>
          <strong>{unavailable}</strong>
        </div>
      </section>

      {content.length > 0 ? (
        <section className="content-preview">
          <div className="section-heading">
            <h2>최근 수집 콘텐츠</h2>
            <span>{content.length}개</span>
          </div>
          <div className="preview-list">
            {content.slice(0, 4).map((record) => (
              <a
                href={record.contentUrl}
                target="_blank"
                rel="noreferrer"
                key={`${record.platform}-${record.contentId}`}
              >
                <span>{record.platform}</span>
                <strong>{record.title || record.contentId}</strong>
                <small>
                  {record.views === null
                    ? "조회 —"
                    : `조회 ${record.views.toLocaleString("ko-KR")}`}
                </small>
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className="panel-actions">
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
            disabled={
              loading || preferencesLoading || selectedPlatforms.length === 0 || autoExporting
            }
            onClick={() => void startAll()}
          >
            {loading || autoExporting ? (
              <LoaderCircle size={17} className="spinning" />
            ) : (
              <Play size={17} />
            )}
            {selectedPlatforms.length === 0
              ? "수집할 플랫폼을 선택하세요"
              : missingPermissions.length > 0
                ? "권한 허용 후 수집 · CSV 다운로드"
                : "수집하고 CSV 다운로드"}
          </button>
        )}
        <button
          className="secondary-button export-button"
          type="button"
          disabled={records.length === 0 || running || autoExporting}
          onClick={() => void exportCsv()}
        >
          <FileDown size={16} />
          CSV 저장
        </button>
      </section>

      <footer className="panel-footer">
        <span className="status-dot online" />
        <span>
          {autoDownloadArmed ? "수집 완료 후 CSV 자동 저장" : "로컬 저장 · 외부 전송 없음"}
        </span>
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
