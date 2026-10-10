# Moroccan Employment Compensation Calculator
### حاسبة التعويضات القانونية عن إنهاء عقد الشغل بالمغرب · Calculateur des indemnités de licenciement au Maroc

A web application that computes the amounts owed when an employment contract
ends in Morocco. It covers:

- the Labor Code (Law 65-99): non-agricultural and agricultural sectors, CDI and CDD;
- domestic workers (Law 19-12), as a separate module.

For each entitlement it shows whether it is due and why. Payable amounts come
with their formula, inputs, caps and legal reference. The rules used are those
in force on an **applicable legal date** that you choose.

- Arabic (RTL, default) and French (LTR) interface
- Entitlements: statutory dismissal indemnity (Art. 52-60), damages for unfair
  dismissal (Art. 41, shown as a judicial estimate), notice indemnity
  (Art. 43 / Decree 2.04.469), paid leave, early termination of a CDD
  (Art. 33), and other outstanding pay
- Art. 55 average over the last 52 weeks, Art. 57 salary component
  classification, suspensions, amounts already paid, salary advances
- Historical SMIG/SMAG table: minimum wage warnings are never retroactive and
  never replace the actual salary
- PDF report (Arabic or French), Excel workbook, print view
- Versioned legal rules administration with effective dates and source tracking
- Exact decimal arithmetic (`decimal.js`). Amounts are rounded to the centime
  only at the end.

The calculation runs in the browser. No account is needed, and no personal
data is sent or stored.

## Run locally

Requirements: Node.js 20 or later.

```bash
npm install
npm run dev          # http://localhost:4317  (redirects to /ar)
```

| Command | Purpose |
|---|---|
| `npm run dev` | Development server on port 4317 |
| `npm test` | Engine test suite (Vitest) |
| `npm run typecheck` | Generate route types and run `tsc` |
| `npm run lint` | ESLint |
| `npm run build` / `npm start` | Production build, then serve on port 4317 |

Routes: `/ar` and `/fr` for the calculator, `/ar/admin` and `/fr/admin` for
rules administration.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `ADMIN_TOKEN` | unset | Secret required to publish or restore rule versions. If unset in development, editing is allowed locally. If unset in production, the admin is read-only. |
| `RULES_STORE_PATH` | `data/rules-store.json` | Where published rule versions are stored. Without this file the bundled baseline (`src/lib/legal/rules/seed.ts`) is used. |

## Project layout

```
src/lib/legal/          calculation engine (pure TypeScript, no UI dependency)
  engine/               seniority, reference salary, entitlements, minimum wage
  rules/                rule schema, baseline data, date resolution, validation
  __tests__/            Vitest scenarios
src/lib/i18n/           Arabic and French dictionaries, number/date formatting
src/lib/export/         PDF (@react-pdf/renderer) and Excel (exceljs) reports
src/lib/server/         versioned rules store, rule loading per deployment (server only)
src/app/[locale]/       calculator and admin pages
src/app/api/rules/      rules API (GET active rules, POST new version, restore)
docs/                   workbook analysis and legal verification status
```

## Legal data and its limits

- [docs/workbook-analysis.md](docs/workbook-analysis.md) covers the original
  Excel workbook: its formulas, the errors found, and the rules that replace
  them.
- [docs/legal-verification.md](docs/legal-verification.md) gives the source
  and verification status of every value.

Values that could not be confirmed against an official text are marked
**requires legal review**. They are flagged on every result that uses them.
Law 19-12 contains no notice period and no Art. 41
damages, so none are computed for domestic workers. Damages for unfair dismissal are set by a court and are
reported as an estimate, separately from statutory amounts.

This tool provides an estimate. It does not replace advice from a lawyer or
labour inspector.

## Updating the law

Rules are only changed by a person, after checking an official publication
(Bulletin officiel). The app never updates rules from news or other unofficial
sources.

1. Open `/{locale}/admin` and enter the `ADMIN_TOKEN`.
2. **New minimum wage:** set an end date on the current row, add a new row
   (sector, amount, start date, decree, BO reference, official URL), and set
   its status to `verified` once checked against the BO.
3. **New or amended rule:** in "Calculation rules", click "New effective
   period" on that rule. Set the start date and the new value, and close the
   previous period with an end date. Periods of the same rule cannot overlap.
4. Enter a new version identifier (e.g. `MA-2027.01-1`) and a note citing the
   text, tick the official-source confirmation, then publish.
5. Every version is kept and can be restored from "Version history". The
   active version identifier is printed on every result and report.

To change the baseline shipped with the code, edit
`src/lib/legal/rules/seed.ts`, run `npm test` (the validation test checks
decrees, URLs and overlapping periods), and update
`docs/legal-verification.md`.

## Deployment

The app is a standard Next.js 16 application:

```bash
npm ci && npm run build
ADMIN_TOKEN=… RULES_STORE_PATH=/var/lib/indemnites/rules-store.json npm start
```

- Put `RULES_STORE_PATH` on persistent storage. Rule versions are written
  there atomically.
- On hosts with an ephemeral filesystem (serverless), either keep the admin
  read-only and update `seed.ts` through code review, or mount a persistent
  volume.
- Serve over HTTPS. The admin token is sent in a request header.

### GitHub Pages (static, read-only)

`.github/workflows/deploy.yml` type-checks, tests, and publishes a static export
to <https://lubair.github.io/moroccan-employment-compensation/> on every push
to `main`. In the repository settings, set **Pages → Source** to
**GitHub Actions**.

To reproduce the build locally:

```bash
GITHUB_PAGES=true npm run build   # writes ./out with base path /moroccan-employment-compensation
```

Differences from the server deployment:

- The calculator, both languages, and PDF/Excel exports run fully in the
  browser and work unchanged.
- Legal rules are taken from `src/lib/legal/rules/seed.ts` at build time and
  validated; an invalid seed fails the build. Versions saved through the admin
  into `data/rules-store.json` are **not** published.
- `/api/rules` is not exported and `/{locale}/admin` only shows a notice that
  administration is unavailable. To publish a rule change, edit `seed.ts`,
  run `npm test`, and push.
