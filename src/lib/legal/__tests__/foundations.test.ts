import { describe, expect, it } from "vitest";
import { exampleInput } from "../../form/defaults";
import { dictionaries, formatMAD, formatNumber, LOCALES } from "../../i18n";
import { serviceYMD } from "../dates";
import { dec, money } from "../decimal";
import { calculateCompensation } from "../engine/calculate";
import { resolveMinimumWage } from "../rules/resolve";
import { SEED_RULESET } from "../rules/seed";
import { validateRuleSet } from "../rules/validate";
import type { CalculationResult, Message } from "../types";
import { run } from "./fixtures";

describe("calendar seniority", () => {
  it.each([
    ["2020-01-01", "2020-12-31", { years: 1, months: 0, days: 0 }],
    ["2020-01-15", "2020-02-14", { years: 0, months: 1, days: 0 }],
    ["2020-02-29", "2021-02-27", { years: 0, months: 11, days: 30 }],
    ["2019-03-31", "2019-04-29", { years: 0, months: 0, days: 30 }],
    ["2024-01-01", "2024-01-01", { years: 0, months: 0, days: 1 }],
  ])("%s → %s", (start, end, expected) => {
    expect(serviceYMD(start, end)).toEqual(expected);
  });
});

describe("decimal arithmetic", () => {
  it("rounds half-up at the centime and parses localized input", () => {
    expect(money(dec("2.345")).toFixed(2)).toBe("2.35");
    expect(dec("1 234,50").toFixed(2)).toBe("1234.50");
    expect(dec("").toFixed(2)).toBe("0.00");
    expect(dec("0.1").plus(dec("0.2")).toString()).toBe("0.3");
  });

  it("formats MAD amounts without floating point and with no-break grouping", () => {
    expect(formatNumber("1234567.5", "fr")).toBe("1\u00A0234\u00A0567,50");
    expect(formatMAD("100", "ar")).toBe("100,00\u00A0درهم");
  });
});

describe("legal rule set", () => {
  it("seed passes validation (decree, official URL, no overlapping periods)", () => {
    expect(validateRuleSet(SEED_RULESET)).toEqual([]);
  });

  it("detects overlapping minimum wage periods and missing decrees", () => {
    const broken = structuredClone(SEED_RULESET);
    broken.minimumWages.push({ ...broken.minimumWages[0], id: "dup", decree: "" });
    const paths = validateRuleSet(broken).map((i) => i.path);
    expect(paths.some((p) => p.includes("decree"))).toBe(true);
    expect(validateRuleSet(broken).some((i) => /overlap/i.test(i.message))).toBe(true);
  });

  it("minimum wage periods are contiguous for each sector", () => {
    expect(resolveMinimumWage(SEED_RULESET, "non_agricultural", "2026-01-01")?.amount).toBe("17.92");
    expect(resolveMinimumWage(SEED_RULESET, "non_agricultural", "2025-12-31")?.amount).toBe("17.10");
    expect(resolveMinimumWage(SEED_RULESET, "agricultural", "2026-04-01")?.amount).toBe("97.44");
    expect(resolveMinimumWage(SEED_RULESET, "agricultural", "2026-03-31")?.amount).toBe("93.00");
  });
});

function collectKeys(result: CalculationResult): string[] {
  const out: Message[] = [...result.errors, ...result.warnings, ...(result.minimumWage?.notes ?? [])];
  if (result.referenceSalary) out.push(result.referenceSalary.monthlyHoursMethod);
  for (const e of result.entitlements) {
    out.push(e.method, ...e.caps, ...e.notes, ...e.reasonsNotApplicable, ...e.reviewFlags);
    out.push(...e.inputs.map((i) => i.label), ...e.steps.map((s) => s.label));
  }
  return out.map((m) => m.key);
}

describe("translations", () => {
  it("Arabic and French dictionaries have the same keys", () => {
    const ar = Object.keys(dictionaries.ar).sort();
    const fr = Object.keys(dictionaries.fr).sort();
    expect(ar.filter((k) => !fr.includes(k))).toEqual([]);
    expect(fr.filter((k) => !ar.includes(k))).toEqual([]);
  });

  it("every message produced by the engine is translated", () => {
    const scenarios: CalculationResult[] = [
      calculateCompensation(exampleInput(), SEED_RULESET),
      run({ startDate: "2026-01-01", endDate: "2026-05-31" }),
      run({ terminationReason: "gross_misconduct" }),
      run({ terminationReason: "resignation", other: { salaryAdvances: "99999999" } }),
      run({ terminationReason: "mutual_agreement" }),
      run({ terminationReason: "justified_dismissal", options: { dismissalPartialYear: "full_year", damagesPartialYear: "full_year" } }),
      run({ contractType: "CDD", terminationReason: "cdd_early_termination", startDate: "2025-01-01", endDate: "2025-06-30", cddPlannedEndDate: "2025-12-31" }),
      run({ contractType: "CDD", cddRequalifiedAsCdi: true }),
      run({ regime: "domestic", weeklyHours: "48", grossMonthly: "1500", startDate: "2022-01-01", endDate: "2024-12-31" }),
      run({ sector: "agricultural", weeklyHours: "48", grossMonthly: "1500", endDate: "2026-06-30", legalDate: "2025-06-30" }),
      run({ grossMonthly: "6000", baseSalary: "5000", noticeStatus: "partial", noticeDaysServed: "5" }),
      run({ suspensions: [{ id: "s", type: "strike", from: "2022-01-01", to: "2022-01-10" }] }),
      run({ startDate: "2004-07-01", endDate: "2004-09-30" }),
      run({ endDate: "2019-01-01", startDate: "2020-01-01" }),
      run({ grossMonthly: "0" }),
      run({ contractType: "CDD", terminationReason: "cdd_early_termination", cddPlannedEndDate: "" }),
    ];
    const missing = new Set<string>();
    for (const r of scenarios) {
      for (const key of collectKeys(r)) {
        for (const locale of LOCALES) if (!(key in dictionaries[locale])) missing.add(`${locale}:${key}`);
      }
    }
    expect([...missing]).toEqual([]);
  });
});
