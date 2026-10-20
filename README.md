# AI Financial Business Analyst

**Turn business data into actionable financial intelligence.**

Upload Excel/CSV transaction data and get structured revenue, expense, and profit
metrics, automatically detected anomalies, transparent forecasts, and a natural-language
AI analyst that answers questions about your business — every answer grounded in
numbers your own code calculated, not numbers an AI guessed.

> **Scope note:** This build implements the full core pipeline end-to-end: auth,
> CSV/Excel upload with smart column mapping, deterministic analytics, evidence-based
> AI chat, forecasting and anomaly detection. Invoice/OCR processing, PDF report
> export, and a few of the more peripheral pages from the original spec were left out
> of this pass so the core pipeline could be built solidly rather than everything
> being built shallowly — see [Future Improvements](#future-improvements).

---

## Table of Contents

1. [Core Philosophy](#core-philosophy)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Architecture](#architecture)
5. [Data Processing Pipeline](#data-processing-pipeline)
6. [Financial Calculations](#financial-calculations)
7. [AI Architecture — Evidence-Based Reasoning](#ai-architecture--evidence-based-reasoning)
8. [Forecasting](#forecasting)
9. [Anomaly Detection](#anomaly-detection)
10. [Database Schema](#database-schema)
11. [API Documentation](#api-documentation)
12. [Folder Structure](#folder-structure)
13. [Installation](#installation)
14. [Environment Variables](#environment-variables)
15. [MongoDB Atlas Setup](#mongodb-atlas-setup)
16. [AI API Setup](#ai-api-setup)
17. [Running the Application](#running-the-application)
18. [Sample Data](#sample-data)
19. [Testing](#testing)
20. [Security & Privacy](#security--privacy)
21. [Troubleshooting](#troubleshooting)
22. [Future Improvements](#future-improvements)

---

## Core Philosophy

> Don't just let AI generate text. Let deterministic analytics calculate the facts,
> then let AI explain those facts in a clear, evidence-based way.

Every number shown in this app — revenue, expenses, profit, category totals, growth
percentages, anomaly scores, forecast values — is calculated by plain JavaScript in
`server/services/analytics`, `services/forecast`, and `services/anomaly`. The AI layer
(`server/services/ai`) never touches the database and never invents a number. It
receives a small, pre-computed JSON "evidence" object and is instructed to explain it,
not to calculate anything new. If no AI provider is configured, the app falls back to
a deterministic, template-based explanation of the same evidence — so the product is
never dependent on an AI call to be useful.

```
DATA → CALCULATION → EVIDENCE → AI REASONING → VISUALIZATION
```
rather than
```
DATA → LLM → RANDOM TEXT
```

---

## Features

- **Authentication** — register/login/logout, JWT sessions, bcrypt password hashing, rate limiting.
- **Data Upload Center** — drag-and-drop CSV/XLSX/XLS upload, multi-sheet Excel support, smart column
  auto-mapping with confidence scoring, manual mapping correction, row-level validation
  (missing/invalid/duplicate detection) before anything is committed to the database.
- **Financial Dashboard** — revenue/expenses/profit/margin cards, date-range filters, revenue-vs-expense
  and category charts, automatic AI insights.
- **Analytics** — dedicated Revenue / Expense / Profit views with monthly trends, category breakdowns, and
  top customers/vendors.
- **Transaction Explorer** — searchable, filterable, sortable, paginated transaction table with CSV export.
- **AI Analyst (evidence-based chat)** — ask natural-language questions; the backend computes real evidence
  first, then explains it. Conversation history is saved and browsable.
- **Forecasting** — Weighted Moving Average or Linear Regression, with confidence bands and an explicit
  refusal to forecast confidently when there isn't enough historical data.
- **Anomaly Detection** — z-score based outlier detection per category, with severity levels and
  review/dismiss workflow. Recurring-expense detection based on consistent monthly patterns.
- **Sample data** included so the whole pipeline can be exercised immediately.

---

## Tech Stack

**Frontend:** React 18, Vite, React Router, Tailwind CSS, Recharts, Axios, Lucide icons.
**Backend:** Node.js, Express, MongoDB Atlas, Mongoose, JWT, bcryptjs, Multer, PapaParse (CSV), SheetJS/xlsx (Excel), Zod (validation), Helmet, express-rate-limit, express-mongo-sanitize.
**AI:** Configurable provider — Google Gemini or Anthropic Claude — behind a single `services/ai/aiProvider.js` interface. Works with `AI_PROVIDER=none` too (deterministic fallback).

---

## Architecture

```
                  AI FINANCIAL BUSINESS ANALYST
                              |
          +-------------------+-------------------+
          |                   |                   |
      DATA INPUT          PROCESSING          AI ENGINE
   Excel / CSV        Cleaning / Parsing     Intent → Evidence
                       Validation             → Explanation
                       Normalization
          |                   |                   |
          +-------------------+-------------------+
                              |
                       ANALYTICS ENGINE
                (revenue · expenses · profit · trends)
                              |
                       VISUALIZATION
                       BUSINESS DASHBOARD
                       AI ASSISTANT
```

---

## Data Processing Pipeline

```
File Upload → File Validation → Parsing → Column Auto-Detection
     → User Confirms/Corrects Mapping → Row Validation
     → Normalization → Database Storage → Analytics → AI Insights
```

- **Parsing:** `services/ingestion/fileParser.js` — PapaParse for CSV, SheetJS for Excel (with worksheet
  selection).
- **Column mapping:** `services/ingestion/columnMapper.js` — synonym-based auto-detection with a confidence
  score per field; anything under full confidence is surfaced to the user to confirm rather than silently
  assumed.
- **Validation:** `services/ingestion/dataValidator.js` — flags missing dates, invalid/zero amounts,
  duplicate rows (same date+amount+description), and missing categories, with per-row messages.
- **Normalization:** `services/ingestion/dataNormalizer.js` — the single place that decides canonical
  `type` (revenue/expense/refund/transfer/other) and `category` values.

Nothing is written to the `Transaction` collection until the user confirms the mapping — the initial
upload only returns a preview.

---

## Financial Calculations

All in `server/services/analytics/analyticsEngine.js` and `server/utils/financialMath.js`. Deterministic,
unit-testable, no AI involved:

```
Net Revenue    = Revenue − Refunds
Profit         = Net Revenue − Expenses
Margin (%)     = (Profit / Net Revenue) × 100
Growth (%)     = ((Current − Previous) / |Previous|) × 100
```

Category breakdowns, monthly series, and top customer/vendor rankings are all plain array
reduce/group operations — see the file for the full set.

---

## AI Architecture — Evidence-Based Reasoning

This is the feature the project is built around:

```
User Question
      ↓
Intent Classification        (services/ai/intentService.js — rule-based, deterministic)
      ↓
Structured Analytics Query   (services/ai/analystService.js routes to analyticsEngine /
                               forecastService / anomalyService)
      ↓
Deterministic Evidence        {current, previous, growth, expenseCategoryChanges, ...}
      ↓
AI Explanation                (services/ai/aiProvider.js — Gemini or Anthropic; strict
                               system prompt forbidding new calculations)
      ↓
Answer + "View Evidence"      (the raw evidence JSON is always attached to the response)
```

Example — `"Why were expenses higher in July?"`:

1. Intent classifier detects `expense_change_explanation` and the month "July".
2. `analystService` resolves July vs. June date ranges and calls
   `analyticsEngine.comparePeriods()`, which computes real totals and a category-by-category
   delta, sorted by absolute change.
3. That JSON evidence — and only that JSON — is sent to the AI provider with a system prompt
   that explicitly forbids inventing or recalculating numbers.
4. If no AI key is configured, `promptService.fallbackExplanation()` produces the same
   answer deterministically from the evidence, so the feature works with zero AI spend.

**Security rule:** the AI never executes a database query, never receives raw transaction dumps,
and never decides what to query — `intentService.js` (plain regex/keyword rules) is the only thing
that chooses which backend function runs.

---

## Forecasting

`server/services/forecast/forecastService.js` supports two transparent baseline models:

- **Weighted Moving Average** — recent periods weighted more heavily.
- **Linear Regression** — ordinary least squares over the monthly series, with a residual-error-based
  confidence band.

With fewer than 3 historical periods, the service **refuses to forecast** and returns a clear
`"Not enough historical data..."` message instead of a fabricated number. With 3–5 periods it still
forecasts but flags `reliable: false` and says so in the UI. Every forecast is labeled "Model-based
forecast; not a guarantee."

---

## Anomaly Detection

`server/services/anomaly/anomalyService.js` computes a z-score for each transaction **within its own
type + category peer group** (a large Marketing expense is judged against other Marketing expenses, not
against Rent). |z| ≥ 3 → high severity, |z| ≥ 2 → medium. Categories need at least 5 transactions before
anything is flagged, so early/sparse data doesn't produce false positives. Recurring-expense detection
looks for the same vendor/category appearing in 3+ distinct months with low amount variance.

---

## Database Schema

MongoDB Atlas via Mongoose. Collections: `User`, `DataSource`, `Transaction`, `Conversation`, `Forecast`,
`Anomaly`. See `server/models/*.js` for exact fields — summarized:

| Model | Purpose |
|---|---|
| `User` | Account, hashed password, currency preference |
| `DataSource` | One per uploaded file — status, mapping used, validation summary |
| `Transaction` | The canonical normalized financial record |
| `Conversation` | AI chat history, each assistant message stores its evidence + confidence |
| `Forecast` | Persisted forecast runs (method, predictions, reliability) |
| `Anomaly` | Flagged transactions with severity/status |

---

## API Documentation

All routes except `/api/auth/register` and `/api/auth/login` require `Authorization: Bearer <token>`.

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/me

POST   /api/data/upload                 (multipart, field name "file")
GET    /api/data/:id/sheet/:sheetName   (re-parse a different Excel worksheet)
POST   /api/data/:id/confirm            ({ mapping, usesDebitCredit })
GET    /api/data
GET    /api/data/:id
DELETE /api/data/:id

GET    /api/transactions
GET    /api/transactions/:id
GET    /api/transactions/export/csv

GET    /api/analytics/overview
GET    /api/analytics/revenue
GET    /api/analytics/expenses
GET    /api/analytics/profit
GET    /api/analytics/trends
GET    /api/analytics/categories

POST   /api/ai/chat                     ({ question, conversationId? })
POST   /api/ai/insights
GET    /api/ai/conversations
GET    /api/ai/conversations/:id
PATCH  /api/ai/conversations/:id
DELETE /api/ai/conversations/:id

POST   /api/forecast/revenue            ({ horizon, method })
POST   /api/forecast/expenses
POST   /api/forecast/profit
GET    /api/forecast/history

GET    /api/anomalies
PATCH  /api/anomalies/:id               ({ status })
GET    /api/anomalies/recurring
```

---

## Folder Structure

```
ai-financial-business-analyst/
├── client/
│   ├── src/
│   │   ├── components/{layout,ui,charts}/
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/
│   │   ├── services/
│   │   └── App.jsx, main.jsx, index.css
│   └── package.json
├── server/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── services/{ingestion,analytics,forecast,anomaly,ai}/
│   ├── validators/
│   ├── utils/
│   ├── config/db.js
│   └── server.js
├── sample-data/
├── README.md
└── .env.example
```

---

## Installation

Requires **Node.js 18+** and a MongoDB Atlas cluster (or local MongoDB).

```powershell
# From the project root
npm run install:all
```

This installs both `server/` and `client/` dependencies. (Equivalent to running
`npm install` in each folder separately.)

---

## Environment Variables

Copy `.env.example` to `server/.env` and fill in real values:

```
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/ai-financial-analyst
JWT_SECRET=replace_with_a_long_random_string
JWT_EXPIRES_IN=7d

AI_PROVIDER=gemini            # "gemini" | "anthropic" | "none"
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.0-flash
ANTHROPIC_API_KEY=your_anthropic_api_key
ANTHROPIC_MODEL=claude-sonnet-4-6

CLIENT_URL=http://localhost:5173
PORT=5000
NODE_ENV=development
MAX_UPLOAD_SIZE_MB=15
```

Generate a strong `JWT_SECRET` with:
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

If your backend runs anywhere other than `http://localhost:5000`, also copy
`client/.env.example` to `client/.env` and set `VITE_API_URL`.

---

## MongoDB Atlas Setup

1. Create a free account at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas).
2. Create a new cluster (the free M0 tier is enough for development).
3. Under **Database Access**, create a database user with a username/password.
4. Under **Network Access**, add your current IP (or `0.0.0.0/0` for development only).
5. Click **Connect → Drivers**, copy the connection string.
6. Replace `<password>` in the string with your database user's password, and add a database
   name after the host, e.g. `.../ai-financial-analyst?retryWrites=true`.
7. Paste the full string into `server/.env` as `MONGODB_URI`.
8. Start the backend (`npm run dev` in `server/`) — you should see
   `[db] MongoDB connected: ...` in the console.

---

## AI API Setup

The app works with either provider, or with no AI provider at all (`AI_PROVIDER=none`), in which case
every answer is generated from a deterministic template instead of a live model call.

**Gemini:**
1. Go to [aistudio.google.com/apikey](https://aistudio.google.com/apikey) and create an API key.
2. Set `AI_PROVIDER=gemini` and `GEMINI_API_KEY=...` in `server/.env`.

**Anthropic:**
1. Go to [console.anthropic.com](https://console.anthropic.com) and create an API key.
2. Set `AI_PROVIDER=anthropic` and `ANTHROPIC_API_KEY=...` in `server/.env`.

**Rate limits / errors:** the `/api/ai/*` and `/api/forecast/*` routes are rate-limited server-side
(20 requests/minute per IP) independent of the provider's own limits. If the AI provider call fails or
times out (20s) for any reason — bad key, rate limit, network issue — `aiProvider.js` catches it and the
app transparently falls back to the deterministic explanation instead of returning an error to the user.

---

## Running the Application

```powershell
# Terminal 1
cd server
npm run dev

# Terminal 2
cd client
npm run dev
```

Or, from the project root, `npm run dev` runs both concurrently.

- Backend: **http://localhost:5000** (health check at `/api/health`)
- Frontend: **http://localhost:5173**

---

## Sample Data

`sample-data/sample-transactions.csv` — 7 months (Feb–Aug 2026) of realistic revenue and expense
transactions across multiple categories, customers, and vendors, including a deliberately injected
anomalous marketing expense (so Anomaly Detection has something real to find) and several recurring
monthly expenses (Rent, Payroll, Software) so Recurring Expense detection has something to find too.

`sample-data/sample-bank-statement.csv` — a smaller file in a different shape (separate Debit/Credit
columns instead of one Amount column), to exercise the debit/credit mapping path.

**Fastest way to see the app populated:**
```powershell
cd server
npm run seed
```
This creates (or resets) a demo account and loads the sample transactions directly:
```
email:    demo@aifinancialanalyst.test
password: Demo12345!
```

Alternatively, register a normal account and upload the CSVs yourself through the Upload page to see
the column-mapping and validation flow in action.

---

## Testing

This pass was verified by:
- Syntax-checking every server file (`node --check`).
- Requiring every route/controller/service/model module without a live database connection to confirm
  the dependency graph is sound.
- Running the full ingestion → validation → normalization → analytics → anomaly → forecast pipeline
  in-process against `sample-transactions.csv`, and confirming: column auto-mapping reached full
  confidence, the July-vs-June expense comparison produced correct category-level deltas, the injected
  marketing anomaly was correctly flagged by the z-score detector, and the revenue forecast produced a
  sane next-period estimate with bounds.
- A production `vite build` of the client to confirm every page/component compiles and resolves.

Not yet covered by automated tests in this pass: a live MongoDB Atlas connection, live AI provider
calls, and end-to-end browser testing — see [Future Improvements](#future-improvements).

---

## Security & Privacy

- Passwords hashed with bcrypt (12 rounds); JWT sessions; auth/upload/AI endpoints rate-limited.
- File uploads validated by extension **and** MIME type; filenames checked for path-traversal
  characters; files are parsed in memory and never written to disk under a user-controlled name.
- `express-mongo-sanitize` strips Mongo operator injection from request bodies/params.
- Every data-access query is scoped to `req.user._id` — there is no endpoint that accepts a raw
  `userId` from the client.
- The AI provider only ever receives the small, pre-computed evidence JSON needed to answer the current
  question — never raw transaction dumps, other users' data, or credentials.
- Helmet sets standard security headers; CORS is restricted to `CLIENT_URL`.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| `MONGODB_URI is not set` on server start | Copy `.env.example` to `server/.env` and fill in your Atlas connection string. |
| Server connects but every request 401s | Make sure the frontend is sending the token — check `localStorage.afba_token` in devtools, and that `client/.env`'s `VITE_API_URL` matches your backend URL. |
| Excel upload fails to parse | The file may be password-protected or corrupted; try re-saving it from Excel/Google Sheets as `.xlsx`. |
| AI chat answers are always the deterministic/template version | Check `AI_PROVIDER` and the matching API key in `server/.env`; check the server console for `[aiProvider] AI call failed...` for the underlying error. |
| Forecast page says "not enough historical data" | You need at least 3 months of transactions spanning different calendar months — upload more data or check your date column mapped correctly. |
| CORS error in the browser console | `CLIENT_URL` in `server/.env` must exactly match the origin the frontend is served from (including port). |

---

## Future Improvements

- Invoice/receipt upload with OCR extraction (PDF/image) and invoice-total validation.
- PDF export for generated reports.
- Dark mode toggle (design tokens already support it via Tailwind's `class` strategy; wiring a toggle
  and dark chart palettes is the remaining work).
- Multi-instance-safe pending-upload storage (currently an in-memory Map — swap for Redis in a scaled
  deployment; noted in `server/utils/pendingUploadsStore.js`).
- Automated test suite (Jest/Vitest + Supertest) covering the API surface with a real or in-memory
  MongoDB instance.
- Accessibility pass (ARIA labeling on charts, full keyboard-nav audit).
- Code-splitting the client bundle (currently a single ~730KB chunk).
