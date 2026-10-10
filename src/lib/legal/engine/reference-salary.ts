import { addMonths, compareDates } from "../dates";
import { D, dec, minDec, sum, type Dec } from "../decimal";
import type { LegalRuleSet } from "../rules/schema";
import { requireRule } from "../rules/resolve";
import type { CalculationInput, Message, ReferenceSalary } from "../types";
import { msg, n } from "./helpers";
import { COMPONENT_TREATMENT } from "./salary-components";

export interface ReferenceSalaryValues {
  art57Monthly: Dec;
  art57Average: Dec;
  regularMonthly: Dec;
  monthlyHours: Dec;
  hourlyArt57: Dec;
  hourlyRegular: Dec;
  workingDaysPerWeek: Dec;
  workingDaysPerMonth: Dec;
  dailyRegular: Dec;
  /** Base salary + function/seniority elements, without overtime/commissions — used for minimum wage checks. */
  fixedMonthlyForMinWage: Dec;
  historyIncluded: { month: string; included: Dec; gross: Dec }[];
}

export interface ReferenceSalaryResult {
  values: ReferenceSalaryValues;
  summary: ReferenceSalary;
  warnings: Message[];
  errors: Message[];
}

const WEEKS_PER_MONTH = new D(52).div(12);
const VARIABLE_TYPES = new Set(["overtime", "commission", "tips", "variable_pay"]);

export function computeReferenceSalary(
  input: CalculationInput,
  ruleSet: LegalRuleSet,
  legalDate: string,
): ReferenceSalaryResult {
  const warnings: Message[] = [];
  const errors: Message[] = [];

  const gross = dec(input.grossMonthly);
  const componentsTotal = sum(input.components.map((c) => dec(c.monthlyAmount)));
  const baseExplicit = input.baseSalary !== undefined && input.baseSalary !== "";
  const base = baseExplicit ? dec(input.baseSalary) : gross.minus(componentsTotal);

  if (gross.lte(0)) errors.push(msg("error.gross_required"));
  if (base.isNegative()) errors.push(msg("error.components_exceed_gross"));

  const recomposed = base.plus(componentsTotal);
  let unclassified = new D(0);
  if (baseExplicit && gross.gt(0) && !recomposed.eq(gross)) {
    unclassified = gross.minus(recomposed);
    warnings.push(
      msg("warn.gross_mismatch", { gross: n(gross), recomposed: n(recomposed), diff: n(unclassified.abs()) }),
    );
  }

  const breakdown: ReferenceSalary["componentBreakdown"] = [
    { id: "base", type: "base_salary", amount: n(base), inArt57: true, inRegular: true },
  ];
  let art57Monthly = base;
  let regularMonthly = base;
  let fixedMonthly = base;
  for (const c of input.components) {
    const amount = dec(c.monthlyAmount);
    if (amount.isZero()) continue;
    const t = COMPONENT_TREATMENT[c.type];
    breakdown.push({ id: c.id, type: c.type, label: c.label, amount: n(amount), inArt57: t.inArt57, inRegular: t.inRegular });
    if (t.inArt57) art57Monthly = art57Monthly.plus(amount);
    if (t.inRegular) regularMonthly = regularMonthly.plus(amount);
    if (t.inRegular && !VARIABLE_TYPES.has(c.type)) fixedMonthly = fixedMonthly.plus(amount);
  }
  if (unclassified.gt(0)) {
    breakdown.push({ id: "unclassified", type: "unclassified", amount: n(unclassified), inArt57: false, inRegular: false });
    warnings.push(msg("warn.unclassified_excluded", { amount: n(unclassified) }));
  }

  /* --------------------------------------------- Art. 55: 52-week average */
  const windowStart = addMonths(input.endDate, -12);
  const historyIncluded: ReferenceSalaryValues["historyIncluded"] = [];
  let art57Average = art57Monthly;
  let averageMonthsUsed = 0;
  if (input.useSalaryHistory) {
    for (const row of input.salaryHistory) {
      const g = dec(row.gross);
      if (!row.month || g.lte(0)) continue;
      const monthStart = `${row.month}-01`;
      if (compareDates(monthStart, input.endDate) > 0 || compareDates(addMonths(monthStart, 1), windowStart) <= 0) {
        warnings.push(msg("warn.history_out_of_window", { month: row.month }));
        continue;
      }
      const excluded = minDec(dec(row.excluded), g);
      historyIncluded.push({ month: row.month, gross: g, included: g.minus(excluded) });
    }
    if (historyIncluded.length > 0) {
      averageMonthsUsed = historyIncluded.length;
      art57Average = sum(historyIncluded.map((h) => h.included)).div(historyIncluded.length);
    } else {
      warnings.push(msg("warn.history_empty"));
    }
  }

  /* ---------------------------------------------------- working time */
  const weekly = dec(input.weeklyHours);
  const daily = dec(input.dailyHours);
  if (weekly.lte(0)) errors.push(msg("error.weekly_hours_required"));
  if (daily.lte(0)) errors.push(msg("error.daily_hours_required"));

  let monthlyHours: Dec;
  let monthlyHoursMethod: Message;
  if (input.regime === "domestic") {
    const wt = requireRule(ruleSet, "working_time.domestic", legalDate).value;
    monthlyHours = weekly.times(WEEKS_PER_MONTH);
    monthlyHoursMethod = msg("method.hours_weekly_52_12", { weekly: n(weekly), hours: n(monthlyHours) });
    const max = input.employeeUnder18 ? wt.minorWeeklyHours : wt.weeklyHours;
    if (weekly.gt(max)) warnings.push(msg("warn.hours_above_legal", { weekly: n(weekly), max }));
  } else if (input.sector === "agricultural") {
    const wt = requireRule(ruleSet, "working_time.agricultural", legalDate).value;
    monthlyHours = weekly.times(WEEKS_PER_MONTH);
    monthlyHoursMethod = msg("method.hours_agri", {
      weekly: n(weekly),
      hours: n(monthlyHours),
      annual: wt.annualHours,
      conventional: wt.conventionalMonthlyHours,
    });
    if (weekly.gt(wt.weeklyHours)) warnings.push(msg("warn.hours_above_legal", { weekly: n(weekly), max: wt.weeklyHours }));
  } else {
    const wt = requireRule(ruleSet, "working_time.non_agricultural", legalDate).value;
    monthlyHours = weekly.times(wt.conventionalMonthlyHours).div(wt.weeklyHours);
    monthlyHoursMethod = msg("method.hours_non_agri", {
      weekly: n(weekly),
      legalWeekly: wt.weeklyHours,
      conventional: wt.conventionalMonthlyHours,
      annual: wt.annualHours,
      hours: n(monthlyHours),
    });
    if (weekly.gt(wt.weeklyHours)) warnings.push(msg("warn.hours_above_legal", { weekly: n(weekly), max: wt.weeklyHours }));
  }

  let workingDaysPerWeek = daily.gt(0) ? weekly.div(daily) : new D(6);
  if (workingDaysPerWeek.gt(6)) {
    warnings.push(msg("warn.days_per_week_capped", { days: n(workingDaysPerWeek) }));
    workingDaysPerWeek = new D(6);
  }
  const workingDaysPerMonth = workingDaysPerWeek.times(WEEKS_PER_MONTH);

  const safeHours = monthlyHours.gt(0) ? monthlyHours : new D(1);
  const safeDays = workingDaysPerMonth.gt(0) ? workingDaysPerMonth : new D(1);
  const hourlyArt57 = art57Average.div(safeHours);
  const hourlyRegular = regularMonthly.div(safeHours);
  const dailyRegular = regularMonthly.div(safeDays);

  return {
    values: {
      art57Monthly,
      art57Average,
      regularMonthly,
      monthlyHours,
      hourlyArt57,
      hourlyRegular,
      workingDaysPerWeek,
      workingDaysPerMonth,
      dailyRegular,
      fixedMonthlyForMinWage: fixedMonthly,
      historyIncluded,
    },
    summary: {
      art57Monthly: n(art57Monthly),
      art57Average: n(art57Average),
      averageMonthsUsed,
      regularMonthly: n(regularMonthly),
      monthlyHours: n(monthlyHours),
      monthlyHoursMethod,
      hourlyReference: n(hourlyArt57, 4),
      workingDaysPerWeek: n(workingDaysPerWeek),
      workingDaysPerMonth: n(workingDaysPerMonth),
      dailyReference: n(dailyRegular, 4),
      componentBreakdown: breakdown,
    },
    warnings,
    errors,
  };
}
