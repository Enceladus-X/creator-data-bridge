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
    detail: "채널 및 Analytics",
    color: "#d9162f",
    tint: "#fff0f2",
    icon: Video,
    state: "ready",
  },
  {
    id: "instagram",
    label: "Instagram",
    detail: "Professional Insights",
    color: "#b12778",
    tint: "#fff0f8",
    icon: Camera,
    state: "planned",
  },
  {
    id: "tiktok",
    label: "TikTok",
    detail: "프로필 및 공개 영상",
    color: "#087f8c",
    tint: "#eafafa",
    icon: Music2,
    state: "planned",
  },
  {
    id: "x",
    label: "X",
    detail: "게시물 및 참여 지표",
    color: "#171717",
    tint: "#f2f2f2",
    icon: AtSign,
    state: "planned",
  },
];
