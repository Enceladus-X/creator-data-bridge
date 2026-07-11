import { defineManifest } from "@crxjs/vite-plugin";

export default defineManifest({
  manifest_version: 3,
  name: "Creator Data Bridge",
  short_name: "Creator Bridge",
  description: "Sync creator analytics and prepare AI-ready exports.",
  version: "0.1.0",
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
  permissions: ["clipboardWrite", "identity", "sidePanel", "storage"],
  host_permissions: ["http://127.0.0.1:8787/*", "http://localhost:8787/*"],
});
