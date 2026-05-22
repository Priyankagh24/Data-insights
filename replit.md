# ExpenseIQ

An AI-Powered Enterprise Expense Intelligence Platform that visualizes 15,020 cleaned enterprise expense transactions across 8 analytical tabs. Designed for finance and audit teams conducting FY 2024–26 ERP migration reviews.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080, served at `/api`)
- `pnpm --filter @workspace/expense-dashboard run dev` — run the dashboard frontend (port 26062, served at `/`)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `DATABASE_URL` — Postgres connection string (provisioned, not yet used for live queries)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5 + csv-parse + multer
- DB: PostgreSQL + Drizzle ORM (provisioned; data loaded from CSVs into memory at startup)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Frontend: React + Vite + Tailwind v4 + Recharts + shadcn/ui

## Where things live

- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth for all endpoints)
- `lib/api-client-react/src/generated/api.ts` — generated React Query hooks
- `lib/api-zod/src/generated/api.ts` — generated Zod schemas for backend
- `artifacts/api-server/src/data/loader.ts` — CSV data loader (loads 15k rows into memory at startup)
- `artifacts/api-server/src/routes/expenses.ts` — all 12 expense analytics endpoints
- `artifacts/expense-dashboard/src/pages/dashboard.tsx` — main dashboard shell (8 tabs, navbar)
- `artifacts/expense-dashboard/src/components/dashboard/` — one file per tab
- `attached_assets/` — source CSV + JSON data files

## Architecture decisions

- **In-memory data store**: All 15,020 expenses are parsed from CSV at first API request and cached. No DB seeding needed — keeps ERP migration data immutable in source files.
- **Contract-first API**: OpenAPI spec written first; hooks and Zod schemas generated via Orval codegen. Frontend never writes raw fetch calls.
- **Path resolution**: `WORKSPACE_ROOT = join(process.cwd(), "../../")` — the API server CWD is `artifacts/api-server/`, so 2 levels up reaches the workspace root where `attached_assets/` lives.
- **Google Fonts import**: Placed as the absolute first line in `index.css` (before `@import "tailwindcss"`) — required by PostCSS ordering rules.

## Product

- **Overview**: 6 KPI cards (₹2617.69 Cr total spend, 15,020 txns, 1,494 personal, 5,928 missing receipts), monthly area chart, department bar chart, receipt compliance donut, AI insights
- **Personal Expenses**: Offender leaderboard, business vs personal donut, top personal vendors, policy violation cards
- **Vendor Analysis**: Top 15 vendors, SaaS concentration bar, spend concentration donut, risk insight cards
- **Departments**: Donut + cost center bars + sortable department table with personal flags
- **Currency**: Distribution pie, INR vs foreign bars, per-currency breakdown table, forex insights
- **Data Quality**: ERP readiness score gauge, missing values per field, issue severity counts (CRITICAL/WARNING/INFO)
- **Fraud & Anomalies**: Risk score gauge, high-value outliers table, refund transactions table, anomaly insight cards
- **Executive Summary**: Overall risk score, governance status badge, key findings, major risks, recommendations, action items with priority badges

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Do not use `process.cwd()` directly for file paths — it resolves to `artifacts/api-server/`. Use `join(process.cwd(), "../../")` to get workspace root.
- Do not run `pnpm dev` at workspace root.
- Always run codegen (`pnpm --filter @workspace/api-spec run codegen`) after changing `openapi.yaml`.
- Google Fonts `@import url(...)` MUST be the very first line of `index.css`.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
