# Analysis of the source workbook `Les Indemnités (1).xlsx`

This report covers phases 1 and 2 of the project. It inventories what the
workbook computes, flags the legal and mathematical problems in each formula,
states the rule that replaces it, and describes the engine that now implements
those rules.

The workbook has two sheets:

| Sheet | Purpose |
|---|---|
| `Les Indemnités` | Labor Code (Law 65-99) employees: "Cadres" and "Ouvrier" |
| `TD` | Domestic workers (Law 19-12) |

## 1. Compensation categories in the workbook

| Category | `Les Indemnités` | `TD` |
|---|---|---|
| Seniority (years) | F2 | F2 |
| Hourly wage | F3 | F3 |
| Damages for unfair dismissal (Art. 41) | F6 | — |
| Dismissal indemnity, 4 brackets (Art. 53) | F7:F10 | brackets block |
| Notice indemnity (Art. 43 / Decree 2.04.469) | B11 / D11 | — |
| Paid leave indemnity | D14 | D12 |
| Paid public holidays | D15 | holidays row |
| Unpaid wages | B17 | E17 input |
| Grand total | F18 | E17 |
| Reference data: SMIG, net ratio, leave and seniority-bonus scales, Art. 57 element list, holiday list, trial periods, absence permissions | L2, L3, Q2, M7, M19, J22:K25 and text blocks | L2, K2, L3 |

## 2. Formulas currently used

### Sheet `Les Indemnités`

| Cell | Formula | Meaning |
|---|---|---|
| F2 | `=DATEDIF(C2,E2,"y")+1` | Seniority in whole years, **always +1** |
| F3 | `=B3/191` | Hourly wage = last gross / 191 |
| L2 | `=15.55*191` | Hard-coded SMIG (Sept 2022 rate) × 191 |
| L3 | `=L2-(L2*6.74%)` | "Net" = gross − 6.74 % (CNSS 4.48 % + AMO 2.26 %) |
| Q2 | `2828.71` | Hard-coded 14.81 × 191 (2020 rate) |
| F6 | `=IF((F2*1.5)<=36,(F2*1.5),36)*B3` | Damages: min(years × 1.5, 36) × salary |
| D7:D10 | 5 / 5 / 5 / remainder | Years allocated per bracket |
| F7:F10 | `=IF((DATEDIF(C2,E2,"m")+1)<6,0,hours*years*F3)` | Bracket amount at 96/144/192/240 h |
| B11 | thresholds on `DATEDIF(...,"m")+1` (<12, <60, >=60) | Notice duration lookup |
| J23:K25 | Cadres 1/2/3 months; Ouvriers 8/26, 1, 2 months | Notice table |
| D11 | `=…*B4` | Notice indemnity on **net** salary (B4) |
| D14, D15 | `=B4/26*days` | Leave and holidays at net / 26 |
| F18 | `=SUM(...)+B17` | Total of every line, whatever the reason |
| B66, B67 | `YEAR(E2)-YEAR(C2)` variants | Dead alternative notice formulas |

### Sheet `TD`

| Cell | Formula | Meaning |
|---|---|---|
| D1 | list 40 / 44 / 48 / 20 | Weekly hours |
| F2 | `=DATEDIF(...,"y")+1` | Seniority +1 |
| L2 | `=15.55*0.6` | Domestic minimum = 60 % of the hard-coded 2022 SMIG |
| K2, L3 | `=L2*208`, `=K3/191` | Monthly minimum at 208 h, then divided by 191 |
| F3 | 48→208, 44→191, 40→174, other → `I9*191/44` | Hourly divisor |
| B3 | `500` | Example salary, far below the legal minimum, with no warning |
| B12 | `=1.5*0*2+1.5*0` | Leave placeholder that always returns 0 |
| D12 | `=net/26*days` | Leave value |
| E17 | unpaid + holidays + leave + dismissal | Total (no notice, no damages) |
| J16, J17 | stray `48*174/40` | Unused leftovers |

## 3. Legal and mathematical inaccuracies

| # | Problem | Impact |
|---|---|---|
| 1 | `DATEDIF(..,"y")+1` adds one year even when service is an exact number of years (5 y 0 m 0 d becomes 6). | Overstates the indemnity, damages and notice tier. |
| 2 | The 6-month eligibility test uses `DATEDIF(m)+1 < 6`, so 5 months of service already passes. | Pays an indemnity Art. 52 does not grant. |
| 3 | Notice thresholds use `months + 1`, so exactly 12 months counts as "more than 1 year" and exactly 60 months as "more than 5 years". | Wrong notice tier at the boundaries. |
| 4 | Every amount is computed for every case: no termination reason, no CDI/CDD distinction, no gross-misconduct test. | Totals include indemnities that are not legally due. |
| 5 | Hourly wage = **last** gross / 191. | Art. 55 requires the average of the 52 weeks before termination, and Art. 57 limits which elements count. |
| 6 | Gross salary used in full. | Art. 57 excludes expense reimbursements, responsibility, hardship, dangerous-zone and temporary-replacement allowances. |
| 7 | Notice, leave and holidays valued on **net** salary. | These indemnities replace remuneration and are computed on gross, before withholdings. |
| 8 | "Net" = gross − 6.74 %. | Ignores income tax, CNSS ceilings and allowance exemptions, so it is not a reliable net. |
| 9 | ÷26 for a daily wage, ÷191 for the hourly wage, ÷174 / ÷208 picked from a list. | The divisor must follow the employee's actual schedule (hours per week, days per week). |
| 10 | SMIG hard-coded to 15.55 (Sept 2022) or 14.81 (2020), with no effective dates. | Wrong minimum for any other termination date, including 17.10 (2025) and 17.92 (2026). |
| 11 | The minimum wage is used as a constant inside calculations. | The legal minimum is a floor for comparison. It must never replace the actual salary. |
| 12 | Domestic sheet: 60 % × SMIG × 208 then ÷191. | Inconsistent divisors; the 500 MAD example is below the minimum with no warning. |
| 13 | Domestic leave formula multiplies by zero. | Leave is always 0. |
| 14 | No deduction of amounts already paid, and no handling of advances. | Risk of double payment. |
| 15 | Damages (a judge's assessment) are summed with statutory amounts. | Mixes certain entitlements with estimates. |
| 16 | The category list has only "Cadres" and "Ouvrier". | "Employé" is missing. The decree groups employees with workers for notice purposes. |
| 17 | Leave accrual ignores the unserved notice period. | Art. 240 treats the notice period as effective work. |
| 18 | Seniority ignores suspensions (unpaid leave, strike…). | Art. 52-53 refer to effective work. |

## 4. Verified rules that replace the formulas

Verification statuses and sources are listed in [legal-verification.md](legal-verification.md).

| Topic | Rule implemented | Reference |
|---|---|---|
| Seniority | Calendar Y/M/D from start to last day (inclusive). Non-assimilated suspensions are deducted. No blanket rounding: a fraction counts pro rata by default. The "fraction = full year" reading is an option and is flagged. | Art. 52-53 |
| Eligibility | Indemnity only for CDI (or a CDD the user asserts would be requalified), ≥ 6 months of effective work, and not gross misconduct, resignation or mutual agreement. | Art. 52, 39, 61 |
| Dismissal indemnity | 96 h × years 0-5, 144 h × 5-10, 192 h × 10-15, 240 h beyond, × hourly reference. | Art. 53 |
| Reference salary | Average of the Art. 57 elements over the 12 months (52 weeks) before termination; the current month if no history is given (flagged). Hourly = monthly / (weekly hours × 191/44). | Art. 55, 57 |
| Damages | min(years × 1.5, 36) × monthly salary; unfair dismissal only (including resignation caused by the employer's gross misconduct, Art. 40). Shown as a **judicial estimate**. | Art. 41 |
| Notice | Executives 1 / 2 / 3 months; employees and workers 8 days / 1 / 2 months. Thresholds are "< 1 year", "1 to 5 years" (inclusive) and "> 5 years". Only the unserved part is owed, on gross remuneration. | Art. 43, 51; Decree 2.04.469 |
| Paid leave | 1.5 days/month (2 days under 18), + 1.5 days per full 5-year period, capped at 30 days. The unserved notice period counts. Days taken and days carried over are applied. Daily value = monthly remuneration / working days per month from the actual schedule. | Art. 231, 232, 240 |
| CDD | Early termination: salaries remaining until the planned term. No CDI indemnities unless the user requests requalification. | Art. 33, 16 |
| Domestic workers | Separate rules: 1 year minimum, same hourly scale, no Art. 41 damages, minimum wage 60 % of SMIG. Notice is not computed because no verified duration exists. All of these are flagged for legal review. | Law 19-12 |
| Minimum wage | Historical SMIG/SMAG table with effective dates and decrees. Comparison only, never retroactive, never substituted for the salary. | Art. 345; decrees |
| Other entitlements | Unpaid wages, overtime (+25/50/100 %), holidays, bonuses and other items, reported separately. Advances reduce the net payable only. | Art. 201, 217 |

## 5. Calculation engine architecture

```
src/lib/legal/
  decimal.ts            decimal.js (precision 40, ROUND_HALF_UP), rounding only on final amounts
  dates.ts              UTC ISO-date arithmetic, calendar Y/M/D service
  types.ts              CalculationInput / CalculationResult (language-agnostic message keys)
  rules/
    schema.ts           LegalRuleSet: minimum wages, provisions, dated rule entries, holidays
    seed.ts             baseline data with sources and verification status
    resolve.ts          resolveRule(ruleSet, key, legalDate): picks the version in force
    validate.ts         traceability checks (decree, https source, no overlapping periods)
  engine/
    calculate.ts        validateInput + calculateCompensation (pure, deterministic)
    seniority.ts        actual vs effective seniority, suspensions
    reference-salary.ts Art. 55 average, Art. 57 classification, hours and days divisors
    salary-components.ts per-component Art. 57 / regular remuneration treatment
    entitlements.ts     one function per entitlement, each returns its eligibility,
                        formula, inputs, steps, caps, notes, legal references and review flags
    minimum-wage.ts     SMIG / SMAG / domestic comparison
src/lib/server/rules-store.ts  versioned rule sets on disk (append-only history, restore)
src/app/api/rules/             GET active rules; POST new version (token, source confirmation)
```

Key properties:

- **Separation from the UI.** The engine has no React or i18n dependency. It
  returns message keys, which the UI, PDF and Excel exports translate.
- **Applicable legal date.** Every rule lookup goes through
  `resolveRule(…, legalDate)`. The legal date defaults to the termination date,
  can be overridden by the user, and is printed in the results and reports.
- **Auditability.** Each entitlement carries its formula, inputs, steps, caps,
  provisions and the identifiers of the rule versions used, together with the
  rule-set version.
- **No silent assumptions.** Interpretations (how partial years count, which
  salary base to use for damages) are explicit options. Rules without a
  verified official text are marked `requires_legal_review` and shown as such.
