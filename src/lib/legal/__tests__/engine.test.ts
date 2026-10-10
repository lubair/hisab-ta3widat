import { describe, expect, it } from "vitest";
import { D, money } from "../decimal";
import { ent, expectedDismissal, keys, run } from "./fixtures";

/** Art. 238: one month of work = 26 days of effective work. */
const daily = (monthly: number | string = 6000) => new D(monthly).div(26);

describe("seniority thresholds and Article 53 progressive scale", () => {
  it("less than 6 months: no dismissal indemnity, short notice still due", () => {
    const r = run({ startDate: "2026-01-01", endDate: "2026-05-31" });
    expect(r.ok).toBe(true);
    const d = ent(r, "dismissal_indemnity");
    expect(d.status).toBe("not_applicable");
    expect(d.reasonsNotApplicable.map((m) => m.key)).toContain("na.dismissal.min_seniority");
    const notice = ent(r, "notice_indemnity");
    expect(notice.status).toBe("payable");
    expect(notice.amount).toBe(money(daily().times(8)).toFixed(2));
    expect(keys(r, ent(r, "paid_leave"))).toContain("note.leave_full_months_only");
  });

  it("exactly 6 months: eligible; the started year counts as a full year (96 h)", () => {
    const r = run({ startDate: "2026-01-01", endDate: "2026-06-30" });
    const d = ent(r, "dismissal_indemnity");
    expect(d.status).toBe("payable");
    expect(d.amount).toBe(expectedDismissal(96));
    const prorata = run({ startDate: "2026-01-01", endDate: "2026-06-30", options: { dismissalPartialYear: "prorata" } });
    expect(ent(prorata, "dismissal_indemnity").amount).toBe(expectedDismissal(48));
  });

  it("exactly 1 year: 96 h, one month of notice (1-5 year tier), 1.5 months of damages", () => {
    const r = run({ startDate: "2025-01-01", endDate: "2025-12-31" });
    expect(r.seniority?.effective).toEqual({ years: 1, months: 0, days: 0 });
    expect(ent(r, "dismissal_indemnity").amount).toBe(expectedDismissal(96));
    expect(ent(r, "notice_indemnity").amount).toBe("6000.00");
    expect(ent(r, "unfair_dismissal_damages").amount).toBe("9000.00");
  });

  it("exactly 5 years: 480 h with no +1 year rounding; employee notice per the Arabic decree text (5 years or more = 2 months)", () => {
    const r = run({ startDate: "2020-01-01", endDate: "2024-12-31" });
    expect(r.seniority?.effective).toEqual({ years: 5, months: 0, days: 0 });
    expect(ent(r, "dismissal_indemnity").amount).toBe(expectedDismissal(480));
    const notice = ent(r, "notice_indemnity");
    expect(notice.amount).toBe("12000.00");
    expect(notice.reviewFlags.map((f) => f.key)).toContain("flag.notice_5y_boundary");
    expect(ent(r, "unfair_dismissal_damages").amount).toBe("45000.00");
    // Executives: "1 to 5 years" includes exactly 5 years.
    expect(ent(run({ category: "executive", startDate: "2020-01-01", endDate: "2024-12-31" }), "notice_indemnity").amount).toBe("12000.00");
  });

  it("5 years and 1 month: the started sixth year counts in full (Cour de cassation)", () => {
    const r = run({ startDate: "2020-01-01", endDate: "2025-01-31" });
    expect(r.seniority?.effective).toEqual({ years: 5, months: 1, days: 0 });
    expect(ent(r, "dismissal_indemnity").amount).toBe(expectedDismissal(480 + 144));
    expect(ent(r, "unfair_dismissal_damages").amount).toBe("54000.00");
    expect(ent(r, "notice_indemnity").amount).toBe("12000.00");
  });

  it("5 years and 1 month with the prorata option: 5 × 96 + (1/12) × 144 = 492 h, flagged", () => {
    const r = run({ startDate: "2020-01-01", endDate: "2025-01-31", options: { dismissalPartialYear: "prorata" } });
    const d = ent(r, "dismissal_indemnity");
    expect(d.amount).toBe(expectedDismissal(492));
    expect(d.reviewFlags.map((f) => f.key)).toContain("flag.prorata_interpretation");
  });

  it("10 years: 5 × 96 + 5 × 144 = 1 200 h", () => {
    const r = run({ startDate: "2015-01-01", endDate: "2024-12-31" });
    expect(ent(r, "dismissal_indemnity").amount).toBe(expectedDismissal(1200));
    expect(ent(r, "unfair_dismissal_damages").amount).toBe("90000.00");
  });

  it("15 years: 480 + 720 + 960 = 2 160 h", () => {
    const r = run({ startDate: "2010-01-01", endDate: "2024-12-31" });
    expect(ent(r, "dismissal_indemnity").amount).toBe(expectedDismissal(2160));
  });

  it("more than 20 years: 240 h per year beyond 15 years", () => {
    const r = run({ startDate: "2004-07-01", endDate: "2026-06-30" });
    expect(r.seniority?.effective.years).toBe(22);
    expect(ent(r, "dismissal_indemnity").amount).toBe(expectedDismissal(2160 + 7 * 240));
    expect(ent(r, "unfair_dismissal_damages").amount).toBe(money(new D(33).times(6000)).toFixed(2));
  });

  it("damages are capped at 36 months", () => {
    const r = run({ startDate: "2000-01-01", endDate: "2025-12-31" });
    const dmg = ent(r, "unfair_dismissal_damages");
    expect(dmg.amount).toBe(money(new D(36).times(6000)).toFixed(2));
    expect(dmg.caps[0].key).toBe("cap.damages_applied");
  });

  it("prorata option computes partial years exactly (Y + (M + D/30)/12)", () => {
    const r = run({ startDate: "2020-01-01", endDate: "2022-07-15", options: { dismissalPartialYear: "prorata" } });
    expect(r.seniority?.effective).toEqual({ years: 2, months: 6, days: 15 });
    const years = new D(2).plus(new D(6).plus(new D(15).div(30)).div(12));
    expect(ent(r, "dismissal_indemnity").amount).toBe(expectedDismissal(years.times(96).toString()));
  });
});

describe("executive notice periods (Decree 2.04.469)", () => {
  it.each([
    ["2026-01-01", "2026-06-30", "6000.00"],
    ["2022-01-01", "2024-12-31", "12000.00"],
    ["2018-01-01", "2024-12-31", "18000.00"],
  ])("executive %s → %s", (start, end, amount) => {
    const r = run({ category: "executive", startDate: start, endDate: end });
    expect(ent(r, "notice_indemnity").amount).toBe(amount);
  });

  it("deducts notice already worked (partial) and nothing when respected", () => {
    const partial = run({ noticeStatus: "partial", noticeDaysServed: "10" });
    expect(ent(partial, "notice_indemnity").amount).toBe(money(new D(12000).minus(daily().times(10))).toFixed(2));
    const respected = run({ noticeStatus: "respected" });
    expect(ent(respected, "notice_indemnity").amount).toBe("0.00");
  });
});

describe("termination reasons drive eligibility", () => {
  it("unfair dismissal: damages are a judicial estimate kept apart from statutory totals", () => {
    const r = run();
    const dmg = ent(r, "unfair_dismissal_damages");
    expect(dmg.nature).toBe("judicial_estimate");
    expect(r.totals.judicialEstimate).toBe(dmg.amount);
    const statutory = r.entitlements
      .filter((e) => e.status !== "not_applicable" && e.nature === "statutory")
      .reduce((acc, e) => acc.plus(e.amount), new D(0));
    expect(r.totals.statutory).toBe(statutory.toFixed(2));
  });

  it("gross misconduct: no dismissal indemnity, damages or notice; leave remains due", () => {
    const r = run({ terminationReason: "gross_misconduct" });
    for (const id of ["dismissal_indemnity", "unfair_dismissal_damages", "notice_indemnity"] as const) {
      expect(ent(r, id).status).toBe("not_applicable");
    }
    expect(ent(r, "paid_leave").status).toBe("payable");
  });

  it("justified dismissal: indemnity and notice, no damages", () => {
    const r = run({ terminationReason: "justified_dismissal" });
    expect(ent(r, "dismissal_indemnity").status).toBe("payable");
    expect(ent(r, "notice_indemnity").status).toBe("payable");
    expect(ent(r, "unfair_dismissal_damages").status).toBe("not_applicable");
  });

  it.each(["resignation", "mutual_agreement"] as const)("%s: only leave and other entitlements", (reason) => {
    const r = run({ terminationReason: reason, other: { unpaidWages: "1000" } });
    expect(ent(r, "dismissal_indemnity").status).toBe("not_applicable");
    expect(ent(r, "unfair_dismissal_damages").status).toBe("not_applicable");
    expect(ent(r, "notice_indemnity").status).toBe("not_applicable");
    expect(ent(r, "paid_leave").status).toBe("payable");
    expect(ent(r, "other_entitlements").amount).toBe("1000.00");
  });

  it("rejects a CDD-only reason on a CDI", () => {
    const r = run({ terminationReason: "cdd_early_termination" });
    expect(r.ok).toBe(false);
    expect(r.errors[0].key).toBe("error.cdi_cdd_reason");
  });
});

describe("fixed-term contracts (CDD) never receive CDI rules automatically", () => {
  it("early termination: remaining salaries until the planned term (Art. 33)", () => {
    const r = run({
      contractType: "CDD",
      terminationReason: "cdd_early_termination",
      startDate: "2025-01-01",
      endDate: "2025-06-30",
      cddPlannedEndDate: "2025-12-31",
    });
    expect(r.ok).toBe(true);
    expect(ent(r, "cdd_damages").amount).toBe("36000.00");
    for (const id of ["dismissal_indemnity", "unfair_dismissal_damages", "notice_indemnity"] as const) {
      expect(ent(r, id).status).toBe("not_applicable");
    }
  });

  it("term reached: no CDD damages", () => {
    const r = run({ contractType: "CDD", terminationReason: "cdd_early_termination", startDate: "2025-01-01", endDate: "2025-12-31", cddPlannedEndDate: "2025-12-31" });
    expect(ent(r, "cdd_damages").status).toBe("not_applicable");
  });

  it("requires the planned end date", () => {
    const r = run({ contractType: "CDD", terminationReason: "cdd_early_termination", cddPlannedEndDate: "" });
    expect(r.errors.map((e) => e.key)).toContain("error.cdd_planned_end");
  });

  it("requalification as CDI is opt-in and flagged as an estimate", () => {
    const r = run({ contractType: "CDD", cddRequalifiedAsCdi: true, terminationReason: "unfair_dismissal" });
    expect(ent(r, "dismissal_indemnity").status).toBe("payable");
    expect(ent(r, "cdd_damages").status).toBe("not_applicable");
    expect(ent(r, "dismissal_indemnity").reviewFlags.map((f) => f.key)).toContain("flag.cdd_requalification");
    expect(r.warnings.map((w) => w.key)).toContain("warn.requalification_estimate");
  });
});

describe("domestic workers (Law 19.12)", () => {
  const domestic = { regime: "domestic" as const, weeklyHours: "48", dailyHours: "8", grossMonthly: "2500" };

  it("uses a separate module: one year minimum, no Art. 41 damages, rule flagged for review", () => {
    const short = run({ ...domestic, startDate: "2025-03-01", endDate: "2025-12-31" });
    expect(ent(short, "dismissal_indemnity").status).toBe("not_applicable");
    expect(ent(short, "unfair_dismissal_damages").status).toBe("not_applicable");

    const r = run({ ...domestic, startDate: "2022-01-01", endDate: "2024-12-31" });
    const d = ent(r, "dismissal_indemnity");
    expect(d.provisionIds).toEqual(["L1912-21"]);
    expect(d.status).toBe("payable");
    // 48 h/week × 52 / 12 = 208 h/month
    expect(d.amount).toBe(expectedDismissal(3 * 96, 2500, 208));
    expect(d.reviewFlags.length).toBeGreaterThan(0);
  });

  it("counts effective work only from the law's entry into force (2 October 2018)", () => {
    const r = run({ ...domestic, startDate: "2015-01-01", endDate: "2020-12-31" });
    expect(r.seniority?.actual.years).toBe(6);
    expect(r.seniority?.effective).toEqual({ years: 2, months: 2, days: 30 });
    expect(r.warnings.map((w) => w.key)).toContain("warn.domestic_seniority_from_law");
    expect(ent(r, "dismissal_indemnity").amount).toBe(expectedDismissal(3 * 96, 2500, 208));
  });

  it("does not apply the Labor Code representative multiplier or minimum wage floor", () => {
    const r = run({ ...domestic, grossMonthly: "1000", employeeRepresentative: true, startDate: "2022-01-01", endDate: "2024-12-31" });
    expect(ent(r, "dismissal_indemnity").amount).toBe(expectedDismissal(3 * 96, 1000, 208));
  });

  it("notice is not computed because Law 19-12 has no notice provision", () => {
    const r = run({ ...domestic, startDate: "2022-01-01", endDate: "2024-12-31" });
    const notice = ent(r, "notice_indemnity");
    expect(notice.status).toBe("not_applicable");
    expect(notice.reasonsNotApplicable[0].key).toBe("na.notice.no_rule_domestic");
  });

  it("is unavailable before the law entered into force", () => {
    const r = run({ ...domestic, startDate: "2016-01-01", endDate: "2018-06-30" });
    expect(r.ok).toBe(false);
  });
});

describe("statutory minimum wage (historical, never retroactive)", () => {
  it("warns when the salary is below the SMIG but keeps the actual salary", () => {
    const r = run({ grossMonthly: "3000", startDate: "2020-01-01", endDate: "2026-03-31" });
    expect(r.minimumWage?.statutoryAmount).toBe("17.92");
    expect(r.minimumWage?.belowMinimum).toBe(true);
    expect(r.warnings.map((w) => w.key)).toContain("warn.below_minimum_wage");
    expect(r.referenceSalary?.art57Average).toBe("3000");
  });

  it("Art. 56: the dismissal indemnity base cannot be lower than the SMIG in force", () => {
    const r = run({ grossMonthly: "3000", startDate: "2020-01-01", endDate: "2026-03-31" });
    const d = ent(r, "dismissal_indemnity");
    // 6 y 3 m → 7 years: 480 + 2 × 144 = 768 h at 17.92 MAD/h instead of 3000 / 191
    expect(d.amount).toBe(money(new D(768).times("17.92")).toFixed(2));
    expect(d.notes.map((m) => m.key)).toContain("note.art56_floor_applied");
    // The other entitlements keep the actual salary.
    expect(ent(r, "notice_indemnity").amount).toBe("6000.00");
  });

  it("applies the SMIG in force on the legal date, not today's", () => {
    expect(run({ endDate: "2010-06-30", startDate: "2005-01-01" }).minimumWage?.statutoryAmount).toBe("10.64");
    expect(run({ endDate: "2025-06-30" }).minimumWage?.statutoryAmount).toBe("17.1");
    expect(run({ endDate: "2023-06-30" }).minimumWage?.statutoryAmount).toBe("15.55");
    expect(run({ endDate: "2016-06-30", startDate: "2010-01-01" }).minimumWage?.statutoryAmount).toBe("13.46");
  });

  it("uses the SMAG for agricultural employment (from 1 April 2026: 97.44)", () => {
    const before = run({ sector: "agricultural", weeklyHours: "48", endDate: "2026-03-31", startDate: "2020-01-01" });
    const after = run({ sector: "agricultural", weeklyHours: "48", endDate: "2026-04-30", startDate: "2020-01-01" });
    expect(before.minimumWage?.statutoryAmount).toBe("93");
    expect(after.minimumWage?.statutoryAmount).toBe("97.44");
  });

  it("a different applicable legal date changes the rules used and is reported", () => {
    const r = run({ endDate: "2026-06-30", startDate: "2020-01-01", legalDate: "2025-06-30" });
    expect(r.legalDate).toBe("2025-06-30");
    expect(r.minimumWage?.statutoryAmount).toBe("17.1");
    expect(r.warnings.map((w) => w.key)).toContain("warn.legal_date_differs");
  });
});

describe("Article 55 / 57 reference salary", () => {
  it("averages the 52 weeks preceding termination when the salary changed", () => {
    const salaryHistory = Array.from({ length: 12 }, (_, i) => ({
      month: `2024-${String(i + 1).padStart(2, "0")}`,
      gross: i < 6 ? "5000" : "7000",
      excluded: "0",
    }));
    const r = run({ grossMonthly: "7000", useSalaryHistory: true, salaryHistory });
    expect(r.referenceSalary?.art57Average).toBe("6000");
    expect(ent(r, "dismissal_indemnity").amount).toBe(expectedDismissal(480, 6000));
    // Notice compensates the salary the employee would have earned: the current one (2 months).
    expect(ent(r, "notice_indemnity").amount).toBe("14000.00");
  });

  it("excludes reimbursements and transport from the Art. 57 base but keeps included bonuses", () => {
    const r = run({
      grossMonthly: "6500",
      components: [
        { id: "a", type: "seniority_bonus", monthlyAmount: "500" },
        { id: "b", type: "transport_allowance", monthlyAmount: "300" },
        { id: "c", type: "hardship_allowance", monthlyAmount: "200" },
      ],
    });
    expect(r.referenceSalary?.art57Monthly).toBe("6000");
    // Hardship is excluded from Art. 57 but is regular remuneration for notice purposes.
    expect(r.referenceSalary?.regularMonthly).toBe("6200");
  });

  it("errors when components exceed the gross salary", () => {
    const r = run({ grossMonthly: "1000", components: [{ id: "a", type: "seniority_bonus", monthlyAmount: "2000" }] });
    expect(r.ok).toBe(false);
  });
});

describe("paid leave (Art. 231 et seq.)", () => {
  it("accrues 1.5 days/month, the seniority bonus, and the unserved notice period, valued at monthly / 26", () => {
    const r = run();
    const leave = ent(r, "paid_leave");
    // 12 months of reference period + 2 months of unserved notice = 14 months
    // 14 × 1.5 = 21 days + 1.5 × 14/12 seniority bonus = 22.75 days
    const accrued = leave.inputs.find((i) => i.label.key === "input.leave_accrued");
    expect(accrued?.value).toBe("22.75");
    expect(leave.amount).toBe(money(new D("22.75").times(daily())).toFixed(2));
  });

  it("counts a started month in full after six months of service (Art. 251)", () => {
    const r = run({ startDate: "2025-01-01", endDate: "2026-03-10", noticeStatus: "respected" });
    const leave = ent(r, "paid_leave");
    // Reference period 2026-01-01 → 2026-03-10 = 2 months 10 days → 3 months → 4.5 days
    expect(leave.inputs.find((i) => i.label.key === "input.leave_period_months")?.value).toBe("3");
    expect(leave.notes.map((m) => m.key)).toContain("note.leave_started_month");
  });

  it("counts only complete months below six months of service (Art. 252)", () => {
    const r = run({ startDate: "2026-01-01", endDate: "2026-05-15" });
    const leave = ent(r, "paid_leave");
    // 4 months 15 days + 8/26 month of unserved notice → 4 complete months → 6 days
    expect(leave.inputs.find((i) => i.label.key === "input.leave_period_months")?.value).toBe("4");
    expect(leave.amount).toBe(money(new D(6).times(daily())).toFixed(2));
    expect(leave.notes.map((m) => m.key)).toContain("note.leave_full_months_only");
  });

  it("subtracts days already taken and never goes negative", () => {
    const r = run({ leave: { daysTaken: "100" } });
    expect(ent(r, "paid_leave").amount).toBe("0.00");
  });
});

describe("staff representatives (Art. 58)", () => {
  it("doubles the statutory dismissal indemnity", () => {
    const r = run({ employeeRepresentative: true });
    const d = ent(r, "dismissal_indemnity");
    // Doubled before rounding: 2 × 480 h × 6000 / 191
    expect(d.amount).toBe(expectedDismissal(960));
    expect(d.provisionIds).toContain("CT-58");
  });
});

describe("no double counting and correct deductions", () => {
  it("deducts amounts already paid per entitlement and never returns negatives", () => {
    const r = run({ alreadyPaid: { dismissalIndemnity: "1000", notice: "999999" } });
    const d = ent(r, "dismissal_indemnity");
    expect(d.computed).toBe(expectedDismissal(480));
    expect(d.amount).toBe(new D(d.computed).minus(1000).toFixed(2));
    expect(ent(r, "notice_indemnity").amount).toBe("0.00");
  });

  it("deducts salary advances from the net payable only", () => {
    const r = run({ other: { salaryAdvances: "500" } });
    expect(r.totals.advancesDeducted).toBe("500.00");
    expect(r.totals.netPayable).toBe(new D(r.totals.grandTotal).minus(500).toFixed(2));
  });

  it("values unpaid overtime with statutory premiums and flags a possible double count", () => {
    const r = run({
      grossMonthly: "6200",
      components: [{ id: "o", type: "overtime", monthlyAmount: "200" }],
      other: { unpaidOvertimeHours: { rate25: "10" } },
    });
    const other = ent(r, "other_entitlements");
    expect(other.amount).toBe(money(new D(6200).div(191).times(10).times("1.25")).toFixed(2));
    expect(other.notes.map((m) => m.key)).toContain("note.overtime_no_double");
  });

  it("totals equal the sum of rounded line amounts", () => {
    const r = run({ startDate: "2013-04-17", endDate: "2026-02-11", grossMonthly: "7333.33" });
    const sumLines = r.entitlements
      .filter((e) => e.status !== "not_applicable")
      .reduce((acc, e) => acc.plus(e.amount), new D(0));
    expect(r.totals.grandTotal).toBe(sumLines.toFixed(2));
    for (const e of r.entitlements) expect(e.amount).toMatch(/^\d+\.\d{2}$/);
  });
});

describe("suspensions and seniority", () => {
  it("removes non-assimilated suspensions (unpaid leave) but keeps illness", () => {
    const unpaid = run({ suspensions: [{ id: "s", type: "unpaid_leave", from: "2022-01-01", to: "2022-01-31" }] });
    expect(unpaid.seniority?.excludedSuspensionDays).toBe(31);
    expect(unpaid.seniority?.effective).toEqual({ years: 4, months: 11, days: 0 });
    const illness = run({ suspensions: [{ id: "s", type: "illness", from: "2022-01-01", to: "2022-01-31" }] });
    expect(illness.seniority?.effective).toEqual({ years: 5, months: 0, days: 0 });
  });
});

describe("rule resolution by date", () => {
  it("returns an error rather than a figure when no rule is in force", () => {
    const r = run({ startDate: "2004-07-01", endDate: "2004-09-30" });
    expect(r.ok).toBe(false);
    expect(r.errors[0].key).toBe("error.missing_rule");
  });
});
