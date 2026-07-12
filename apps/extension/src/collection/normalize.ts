import type { CollectionValueCoverage } from "@creator-data-bridge/contracts";

const compactMultipliers: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
  천: 1_000,
  만: 10_000,
  억: 100_000_000,
};

export function parseCompactCount(value: string | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  const normalized = value.trim().replaceAll(",", "").replace(/\s+/g, "");
  if (!normalized) return null;
  const match = normalized.match(/^(-?\d+(?:\.\d+)?)([kKmMbB천만억])?$/);
  if (!match) return null;
  const numeric = Number.parseFloat(match[1] ?? "");
  if (!Number.isFinite(numeric) || numeric < 0) return null;
  const suffix = match[2]?.toLowerCase();
  return Math.round(numeric * (suffix ? (compactMultipliers[suffix] ?? 1) : 1));
}

export function parseDuration(value: string | null | undefined): number | null {
  if (!value) return null;
  const parts = value
    .trim()
    .split(":")
    .map((part) => Number.parseInt(part, 10));
  if (parts.some((part) => !Number.isFinite(part))) return null;
  if (parts.length === 2) return (parts[0] ?? 0) * 60 + (parts[1] ?? 0);
  if (parts.length === 3) {
    return (parts[0] ?? 0) * 3600 + (parts[1] ?? 0) * 60 + (parts[2] ?? 0);
  }
  return null;
}

export function normalizeHandle(value: string): string {
  const trimmed = value.trim().replace(/^@+/, "");
  return trimmed ? `@${trimmed}` : "@unknown";
}

export function sanitizeContentUrl(value: string): string {
  try {
    const url = new URL(value);
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return value;
  }
}

export function parseInstagramDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = new Date(`${value.trim()} 00:00:00 UTC`);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
}

export function parseYouTubeStudioDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const dotted = value.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?/);
  if (dotted) {
    const [, year, month, day] = dotted;
    return `${year}-${month?.padStart(2, "0")}-${day?.padStart(2, "0")}`;
  }
  const korean = value.match(/(\d{4})년\s*(\d{1,2})월\s*(\d{1,2})일/);
  if (!korean) return null;
  const [, year, month, day] = korean;
  return `${year}-${month?.padStart(2, "0")}-${day?.padStart(2, "0")}`;
}

export function parseKoreanStudioDate(
  value: string | null | undefined,
  reference: Date,
): string | null {
  if (!value) return null;
  const match = value.match(
    /(?:(\d{4})년\s*)?(\d{1,2})월\s*(\d{1,2})일\s*(오전|오후)?\s*(\d{1,2})?:?(\d{2})?/,
  );
  if (!match) return null;
  const year = Number.parseInt(match[1] ?? String(reference.getFullYear()), 10);
  const month = Number.parseInt(match[2] ?? "", 10);
  const day = Number.parseInt(match[3] ?? "", 10);
  let hour = Number.parseInt(match[5] ?? "0", 10);
  const minute = Number.parseInt(match[6] ?? "0", 10);
  if (match[4] === "오후" && hour < 12) hour += 12;
  if (match[4] === "오전" && hour === 12) hour = 0;
  const local = new Date(year, month - 1, day, hour, minute, 0);
  return Number.isNaN(local.valueOf()) ? null : local.toISOString();
}

export function metricCoverage(value: number | null, missing: CollectionValueCoverage) {
  return value === null ? missing : ("complete" as const);
}
