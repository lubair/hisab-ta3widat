# Legal data: sources and verification status

The baseline rule set (`src/lib/legal/rules/seed.ts`, version `MA-2026.10-2`)
gives every value one of three statuses:

| Status | Meaning | How the app shows it |
|---|---|---|
| `verified` | Read in a reproduction of the official text (BO). | Green badge |
| `corroborated` | Read in a primary-text copy (ILO reproduction of the Code, Arabic official copies), or confirmed by several reliable sources, but not yet checked against the BO issue itself. | Blue badge |
| `requires_legal_review` | Could not be reliably confirmed. Applied, but flagged on every result that uses it. | Amber badge plus a review flag on the entitlement |

Promoting a value to `verified` requires a person to check it against the BO
issue and record the reference through the admin page (see "Updating the law"
in the README).

## Primary texts consulted

- **Code du travail (Law 65-99):** Dahir 1-03-194 of 11 September 2003, BO
  5210 of 6 May 2004 (French edition). French text as reproduced by the ILO:
  <https://webapps.ilo.org/static/english/inwork/cb-policy-guide/moroccolabourcode2004.pdf>
- **Law 19-12 (domestic workers):** Dahir 1-16-121 of 10 August 2016, BO 6493
  of 22 August 2016 (Arabic) and BO 6610 of 5 October 2017 (French).
  - In force since 2 October 2018 (Art. 27).
  - Implementing decrees 2-17-355 and 2-17-356: BO 6609 of 2 October 2017.
- **Decree 2-04-469 (notice periods):** 29 December 2004, BO 5279 of
  3 January 2005 (Arabic).
- **Decree 2-04-426 (paid holidays):** 29 December 2004, BO 5280 of
  6 January 2005, as amended.
- **SGG Bulletin officiel portal:** <https://www.sgg.gov.ma/BulletinOfficiel.aspx>

## Minimum wage history

| Period | SMIG (MAD/h) | SMAG (MAD/day) | Instrument | Status |
|---|---|---|---|---|
| 2004-07-01 → 2008-06-30 | 9.66 | 50.00 | Décret 2-04-421 (BO 5219) | corroborated |
| 2008-07-01 → 2009-06-30 | 10.14 | 52.50 | Décret 2-08-292 (BO 5649 of 21/07/2008) | corroborated |
| 2009-07-01 → 2011-06-30 | 10.64 | 55.12 | Décret 2-08-292 | corroborated |
| 2011-07-01 → 2012-06-30 | 11.70 | 60.63 | Décret 2-11-247 (BO 5959 of 11/07/2011) | corroborated |
| 2012-07-01 → 2014-06-30 | 12.24 | 63.39 | Décret 2-11-247 | corroborated |
| 2014-07-01 → 2015-06-30 | 12.85 | 66.56 | Décret 2-14-343 (BO 6272 of 10/07/2014) | corroborated |
| 2015-07-01 → 2019-06-30 | 13.46 | 69.73 | Décret 2-14-343 | corroborated |
| 2019-07-01 → 2020-06-30 | 14.13 | 73.22 | Décret 2-19-424 (BO 6790 of 27/06/2019) | corroborated |
| 2020-07-01 → 2022-08-31 | 14.81 | 76.70 | Décret 2-19-424 | corroborated |
| 2022-09-01 → 2023-08-31 | 15.55 | 84.37 | Décret 2-22-606 (BO 7125 of 12/09/2022); tourism sector deferred to 2023-01-01 | corroborated |
| 2023-09-01 → 2024-12-31 (SMAG: 2025-03-31) | 16.29 | 88.58 | Décret 2-23-799 (BO 7240 of 19/10/2023) | **verified** (BO text on ILO NATLEX) |
| 2025-01-01 (SMAG: 2025-04-01) → | 17.10 | 93.00 | Décret 2-24-1122 (BO 7367 of 06/01/2025) | corroborated |
| 2026-01-01 (SMAG: 2026-04-01) → | 17.92 | 97.44 | Décret 2-25-983 of 29/12/2025 (BO 7469) | corroborated |

Gaps and limits:

- No value is recorded for 2004-06-08 → 2004-06-30. For a legal date in that
  window, the app reports a missing minimum wage instead of guessing.
- The textile-sector staging of 2008–2013 is not modelled.

## Calculation rules

| Rule | Value | Article | Status |
|---|---|---|---|
| Working time, non-agricultural | 2288 h/year, 44 h/week | Art. 184 | corroborated |
| Working time, agricultural | 2496 h/year | Art. 184 | corroborated |
| Month of work | 26 days of effective work, 191 h (non-agricultural) or 208 h (agricultural) | Art. 238 | corroborated |
| Dismissal indemnity, eligibility | 6 months in the same company | Art. 52 | corroborated |
| Dismissal indemnity, scale | 96/144/192/240 h per year or fraction of a year | Art. 53 | corroborated |
| Fraction of a year | Counts as a whole year (Cour de cassation, social chamber, 2017 and 2023). Prorata is available as an option and flagged. | Art. 53 / 41 | corroborated (decision numbers not obtained) |
| Periods assimilated to effective work | Paid leave, maternity, work accident or occupational disease, authorised absences, illness, administrative closure, force majeure | Art. 54 | corroborated (default mapping: requires_legal_review) |
| Reference salary | 52-week average; never below the statutory minimum wage | Art. 55, 56 | corroborated |
| Staff and union representatives | Indemnity +100 % | Art. 58 | corroborated |
| Cumulation | Damages + notice + indemnity | Art. 59 | corroborated |
| Damages | 1.5 months per year or fraction, cap 36 months | Art. 41 | corroborated |
| Notice | Executives 1/2/3 months; employees and workers 8 days/1/2 months | Decree 2-04-469 | corroborated |
| Notice at exactly 5 years (employees and workers) | 2 months, following the Arabic text ("خمس سنوات فأكثر"). The French says "plus de 5 ans". Flagged on the result. | Decree 2-04-469 | corroborated (translation discrepancy) |
| Paid leave | 1.5 d/month (2 under 18), +1.5 d per 5 years, max 30 days | Art. 231, 232 | corroborated |
| Leave on termination | A started month counts in full after 6 months; below 6 months, only complete months count; due whatever the cause | Art. 251, 252, 254 | corroborated |
| Leave: assimilated periods | Notice period, previous leave, Art. 32 1°-5° suspensions | Art. 239 | corroborated |
| Overtime premiums | 25 / 50 / 100 % | Art. 201 | corroborated |
| Domestic: hours | 48 h/week, 40 h for ages 16-18 | Law 19-12 Art. 13 | corroborated |
| Domestic: minimum wage | 60 % of SMIG in cash; no later amending text found | Art. 19 | corroborated |
| Domestic: leave | 1.5 d/month after 6 months, no seniority supplement | Art. 16 | corroborated |
| Domestic: dismissal indemnity | 1 year of continuous effective work, same hourly scale, counted from 2018-10-02 only | Art. 21 | corroborated |
| Domestic: gross misconduct | The law is silent. The general principle (Labor Code Art. 61) is applied and flagged. | — | requires_legal_review |
| Domestic: notice and Art. 41 damages | None in the law, so nothing is computed | — | corroborated (absent) |
| Domestic: month of reference | 26 days, by analogy with Art. 238 | — | flagged in the rule description |

## Paid holidays (private sector)

The private-sector list comes from Decree 2-04-426 of 29 December 2004, as
amended:

- 11 January
- 14 January (Yennayer), from 2024 (Decree 2-23-1000)
- 1 May
- 30 July
- 14 August
- 20 August
- 21 August
- 31 October (Fête de l'Unité), from 2026-02-05 (Decree 2-26-14, BO 7480)
- 6 November
- 18 November
- Aïd al-Fitr, Aïd al-Adha, 1 Moharram and Aïd al-Mawlid, one day each

**1 January is not a private-sector paid holiday.** Many secondary sources
wrongly list it, and the original workbook did too.

## Open points to check against the BO

1. The signing date of Decree 2-08-292.
2. The BO number and date of Decree 2-23-1000 (Yennayer).
3. Direct reading of BO 7469 (Decree 2-25-983) and BO 7480 (Decree 2-26-14).
4. The Cour de cassation decision numbers for the 2017 and 2023 "fraction
   d'année" rulings.
5. Whether gross misconduct excludes the domestic-worker indemnity
   (Law 19-12 is silent).
6. The 5-year boundary for employees and workers in Decree 2-04-469 (the
   Arabic and French texts differ).
