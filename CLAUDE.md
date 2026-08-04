# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Community Legal Risk Early Warning Platform (社区法治风险预警平台) — a government dashboard for monitoring community legal disputes in Beijing's Xicheng District. All UI text and code comments are in **Simplified Chinese**.

## Commands

```bash
npm run dev          # Dev server at http://localhost:5173/ (mock mode, no backend needed)
npm run build        # Production build → dist/
npm run type-check   # TypeScript type checking via vue-tsc
npm run native:build # Build C++ risk engine (CMake/Ninja)
npm run native:bench # Run C++ benchmark (default 1M records)
npm run security:scan # Scan for plaintext secrets
npm run hooks:install # Install pre-commit secret scanning hook
```

No test framework, linter, or formatter is configured.

## Architecture

### Tech Stack
- **Frontend:** Vue 3.5 + TypeScript 6 + Vite 8
- **UI:** Arco Design (`@arco-design/web-vue`) with dark navy/cyan theme
- **Charts/Maps:** ECharts 5 with GeoJSON (Xicheng district → Beijing fallback → scatter fallback)
- **HTTP:** Axios (`src/api/http.ts`, baseURL from `VITE_API_BASE_URL` or `/api`, 8s timeout)
- **Native Engine:** C++17 static library (standalone systemd service, no frontend binding)

### Source Layout
```
src/
  api/
    http.ts            # Axios instance
    platform.ts        # All API functions + inline mock data (21 functions)
  components/
    back-home.vue      # Navigation button
    risk-map-panel.vue # ECharts geo map (~688 lines, WebSocket + 3s simulation fallback)
  views/               # 12 page-level components (all use <script setup lang="ts">)
  services/
    platform-socket.ts # WebSocket factory: createPlatformSocket({onOpen,onMessage,onClose,onError})
  types/
    platform.ts        # All TypeScript interfaces (single source of truth)
  router/
    index.ts           # 12 flat routes, no lazy loading, no guards
native/                # C++17 risk scoring engine (CMake, outputs librisk_engine.a + demo + bench)
public/maps/           # GeoJSON: xicheng_full.json, beijing_full.json
scripts/               # Shell/Python tooling for deploy, security, native build
```

### Mock-First API Pattern (Core Design)
`src/api/platform.ts` is the central file. Every API function checks `import.meta.env.VITE_USE_MOCK !== 'false'` — **mock mode is the default**. The app runs entirely without a backend.

- Mock data is defined as `const` objects inline alongside each function
- Exception: `mockOfficialDynamics` is `let` — CRUD operations mutate it in-memory
- When adding new API endpoints, follow the same pattern: mock data at top, typed async function returning mock or calling `http.get/post/put/delete`

### Environment Variables
No `.env` files are committed (all gitignored). Create `.env.local` for local overrides.

| Variable | Default | Purpose |
|---|---|---|
| `VITE_USE_MOCK` | `true` (anything except `'false'`) | Toggle mock vs real API |
| `VITE_API_BASE_URL` | `/api` | Axios baseURL |
| `VITE_WS_URL` | unset | WebSocket URL; if unset, map uses 3s local simulation |

### Risk Scoring
C++ engine formula: `score = conflict×0.30 + severity×0.25 + fraud×0.20 + unresolved×0.25`, clamped [0, 100].
TypeScript `getRiskLevelByScore()` mirrors threshold logic: ≥80 → '高', ≥60 → '中', <60 → '低'.

### TypeScript Configuration
- `noUncheckedIndexedAccess: true` — all indexed access returns `T | undefined`
- Path alias: `@` → `./src` (in both tsconfig.app.json and vite.config.ts)
- Split config: `tsconfig.app.json` (browser, extends `@vue/tsconfig/tsconfig.dom.json`) + `tsconfig.node.json` (vite config only)

### Coding Conventions
- Vue 3 Composition API only (`<script setup lang="ts">`)
- Local state per view with `ref()`/`reactive()`, data loaded in `onMounted()`
- Scoped styles with `:deep()` for Arco Design overrides
- Dark theme: navy gradients, `#d8f2ff`/`#9fd4f2` text colors, `rgba()` blue-range backgrounds

### Security
- Pre-commit hook + GitHub Actions (`secrets-guard.yml`) scan for plaintext secrets
- Server secrets encrypted with AES-256-CBC, decrypted only at runtime in `/run/`
- Never commit `.env` files or credentials

### Deployment (Linux)
```bash
npm run server:setup    # Install system dependencies (apt-based)
npm run server:deploy   # Build + deploy site + systemd service
```
Requires systemd. Deploy script installs nginx SPA config and starts native risk engine as a service.

## Known Issues
- **Pinia not initialized:** `createPinia()` never called in `main.ts` — stores won't work
- **`procuratorate-suggestion.vue` bug:** calls undeclared `message` (lowercase) instead of imported `Message` (uppercase) — runtime ReferenceError in all handlers
- **`procuratorate-suggestion.vue`:** data hardcoded inline instead of wired to API layer
- **Unused dependencies:** `echarts-gl`, `@dataview/datav-vue3`, `stores/counter.ts` — installed/present but never imported
- **`venv/` tracked in git** — should be gitignored
- **No Vite proxy** — real API mode needs a reverse proxy or proxy config
