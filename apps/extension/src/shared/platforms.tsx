import type { Platform } from "@creator-data-bridge/contracts";
import { AtSign, Camera, type LucideIcon, Music2, Video } from "lucide-react";

export interface PlatformItem {
  id: Platform;
  label: string;
  detail: string;
  color: string;
  tint: string;
  icon: LucideIcon;
  state: "ready" | "planned";
}

export const platforms: PlatformItem[] = [
  {
    id: "youtube",
    label: "YouTube",
    detail: "Studio 채널 및 콘텐츠",
    color: "#d9162f",
    tint: "#fff0f2",
    icon: Video,
    state: "ready",
  },
  {
    id: "instagram",
    label: "Instagram",
    detail: "프로필 및 Reel 로컬 수집",
    color: "#b12778",
    tint: "#fff0f8",
    icon: Camera,
    state: "ready",
  },
  {
    id: "tiktok",
    label: "TikTok",
    detail: "Studio 및 프로필 로컬 수집",
    color: "#087f8c",
    tint: "#eafafa",
    icon: Music2,
    state: "ready",
  },
  {
    id: "x",
    label: "X",
    detail: "프로필 게시물 및 참여 지표",
    color: "#171717",
    tint: "#f2f2f2",
    icon: AtSign,
    state: "ready",
  },
];
