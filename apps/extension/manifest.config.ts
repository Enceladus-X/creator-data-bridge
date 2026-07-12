import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Creator Data Bridge",
  short_name: "Creator Bridge",
  description:
    "Collect YouTube, TikTok, Instagram, and X creator data locally and export AI-ready CSV files.",
  version: "0.2.0",
  minimum_chrome_version: "114",
  action: {
    default_title: "Creator Data Bridge",
  },
  background: {
    service_worker: "src/background.ts",
    type: "module",
  },
  side_panel: {
    default_path: "sidepanel.html",
  },
  permissions: ["alarms", "clipboardWrite", "identity", "scripting", "sidePanel", "storage"],
  host_permissions: [
    "http://127.0.0.1:8787/*",
    "http://localhost:8787/*",
    "http://127.0.0.1:48765/*",
  ],
  optional_host_permissions: [
    "https://studio.youtube.com/*",
    "https://www.tiktok.com/*",
    "https://www.instagram.com/*",
    "https://x.com/*",
  ],
});
