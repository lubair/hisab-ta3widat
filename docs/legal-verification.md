# Legal data: sources and verification status

The baseline rule set (`src/lib/legal/rules/seed.ts`, version `MA-2026.10-1`)
gives every value one of three statuses:

| Status | Meaning | How the app shows it |
|---|---|---|
| `verified` | Checked against the official text (Bulletin officiel). | Green badge |
| `corroborated` | Consistent across several reliable secondary sources. Not yet checked line by line against the BO. | Blue badge |
| `requires_legal_review` | Could not be reliably confirmed. Applied, but flagged on every result that uses it. | Amber badge plus a review flag on the entitlement |

No value in the baseline is marked `verified`. Promoting a value requires a
person to check it against the official publication and record the BO
reference through the admin page (see "Updating the law" in the README).

## Minimum wage history

| Period | SMIG (MAD/h) | SMAG (MAD/day) | Instrument | Status |
|---|---|---|---|---|
| 2014-07-01 → 2015-06-30 | 12.85 | 66.56 | Décret 2.14.343 (BO 6272, 10/07/2014) | corroborated |
| 2015-07-01 → 2019-06-30 | 13.46 | 69.73 | Décret 2.14.343 | corroborated |
| 2019-07-01 → 2020-06-30 | 14.13 | 73.22 | Décret 2.19.424 | corroborated |
| 2020-07-01 → 2022-08-31 | 14.81 | 76.70 | Décret 2.19.424 | corroborated |
| 2022-09-01 → 2023-08-31 | 15.55 | 84.37 | 2022 decree, **number not confirmed** | requires_legal_review |
| 2023-09-01 → 2024-12-31 / 2025-03-31 | 16.29 | 88.58 | 2022 decree, **number not confirmed** | requires_legal_review |
| 2025-01-01 / 2025-04-01 → | 17.10 | 93.00 | Décret 2.24.1122 | corroborated |
| 2026-01-01 / 2026-04-01 → | 17.92 | 97.44 | Décret 2.25.983 du 29/12/2025 | corroborated (BO number to record) |

Before 2014-07-01 there is no entry, so the minimum wage check reports
"no minimum wage entry" instead of guessing.

## Calculation rules

| Rule | Value | Status |
|---|---|---|
| Labor Code in force | 2004-06-08 | corroborated |
| Working time, non-agricultural | 2288 h/year, 44 h/week, 191 h/month by convention | corroborated |
| Working time, agricultural | 2496 h/year, 208 h/month | corroborated |
| Dismissal indemnity (Art. 52-53) | 6 months of effective work; 96/144/192/240 h | corroborated |
| Damages (Art. 41) | 1.5 months per year or fraction; 36-month cap | corroborated |
| Notice (Decree 2.04.469) | Executives 1/2/3 months; employees and workers 8 days/1/2 months | corroborated |
| Paid leave (Art. 231-232) | 1.5 d/month (2 under 18), +1.5 d per 5 years, max 30 | corroborated |
| Overtime premiums (Art. 201) | 25 / 50 / 100 % | corroborated |
| Art. 251 (compensatory leave indemnity): article number | — | requires_legal_review |
| Suspensions assimilated to effective work (defaults) | illness, work accident, maternity, military service, temporary closure | requires_legal_review |
| Law 19-12 working time | 48 h (40 h for 16-18) | requires_legal_review |
| Law 19-12 dismissal indemnity | 1 year minimum, same hourly scale | requires_legal_review |
| Law 19-12 leave | 1.5 d/month after 6 months | requires_legal_review |
| Law 19-12 minimum wage | 60 % of SMIG (check for later decrees raising the ratio) | requires_legal_review |
| Law 19-12 notice | **not set**: no verified duration, so no amount is computed | requires_legal_review |
| Religious paid holidays (number of days) | Eid al-Fitr, Eid al-Adha, 1 Muharram, Mawlid | requires_legal_review |
| Amazigh New Year (14 January) | Paid holiday since 2024 | corroborated |

## Interpretations exposed as options

- **Partial years (Art. 53 and Art. 41: "each year or fraction of a year").**
  The default prorates the fraction (years + months/12 + days/360). The
  alternative counts any fraction as a full year. It is available as an option
  and flagged, because the case law is not uniform.
- **Salary base for damages.** The last monthly remuneration by default. The
  52-week average is available as an option.
- **CDD requalification.** CDI rules are applied to a CDD only when the user
  explicitly asks for it, and the result is labelled as an estimate.

## Official sources

- Secrétariat Général du Gouvernement, Bulletin officiel portal:
  <https://www.sgg.gov.ma/BulletinOfficiel.aspx>. This is the reference for
  every decree and law, and is the URL used in the baseline data.
- Labor Code: Dahir 1-03-194 of 11 September 2003 promulgating Law 65-99,
  BO 5210 of 6 May 2004 (French edition).

Direct links to individual BO issues should be added through the admin page as
they are verified.
