# Creator Data Bridge

[한국어](README.md) | [English](README.en.md)

[![CI](https://github.com/Enceladus-X/creator-data-bridge/actions/workflows/ci.yml/badge.svg)](https://github.com/Enceladus-X/creator-data-bridge/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Creator Data Bridge is a local-first Chrome extension that collects performance data from your YouTube, TikTok, Instagram, and X accounts and exports an AI-ready CSV.

The extension uses your existing signed-in Chrome sessions. It opens temporary platform tabs, reads profile and content metrics, and closes those tabs after collection. It does not read passwords or cookies, and collected records stay in local IndexedDB storage.

## Workflow

1. Sign in to YouTube Studio, TikTok, Instagram, and X in Chrome.
2. Open Collection settings in the extension side panel and enable the platforms you use.
3. Click `Collect`.
4. Approve the optional site permissions on the first run.
5. Review detailed progress and errors in the execution log.
6. Click `Download CSV` when collection is complete.

You do not need to keep profile tabs open. If a platform fails, successful platform records remain available as a partial result.

Open the full dashboard from the side-panel header to review platform totals, top content, searchable content records, comparisons, and CSV exports. Clicking a platform icon in Overview opens that platform's upload or compose page in a new tab.

The interface supports Korean and English. Language and platform preferences are shared between the side panel and dashboard and stored locally. Execution logs can also be displayed and copied in the selected language.

## Development

Requirements:

- Node.js 22.12 or later
- pnpm 10 or later
- A current stable version of Chrome

```powershell
git clone https://github.com/Enceladus-X/creator-data-bridge.git
cd creator-data-bridge
Copy-Item .env.example .env
pnpm install
pnpm dev
```

Load `apps/extension/dist` as an unpacked extension from `chrome://extensions` with Developer mode enabled.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the API and extension development servers |
| `pnpm lint` | Run Biome checks |
| `pnpm typecheck` | Type-check every workspace |
| `pnpm test` | Run contract, API, collector, and CSV tests |
| `pnpm build` | Create production builds |
| `pnpm check` | Run lint, type-checks, tests, and builds |

## Privacy and scope

- Read-only collection starts only after a user action.
- Browser collection does not store OAuth secrets, refresh tokens, passwords, or cookies.
- Records remain local until the user explicitly downloads a CSV.
- The extension distinguishes zero values from unavailable or limited metrics.
- Automated publishing, comments, and direct-message management are outside the current CSV product scope.

## Documentation

- [Product specification](docs/PRODUCT_SPEC.md)
- [Extension collection design](docs/EXTENSION_COLLECTION_SPEC.md)
- [Automated publishing design](docs/AUTOMATED_PUBLISHING_SPEC.md)
- [Platform capability research](docs/PLATFORM_CAPABILITIES.md)
- [Architecture](docs/ARCHITECTURE.md)
- [AI export contract](docs/AI_EXPORT_CONTRACT.md)
- [Roadmap](docs/ROADMAP.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)
