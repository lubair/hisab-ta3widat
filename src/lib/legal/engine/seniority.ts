import { addDays, compareDates, inclusiveDays, overlapDays, serviceYMD } from "../dates";
import { D } from "../decimal";
import type { LegalRuleSet } from "../rules/schema";
import { resolveRule } from "../rules/resolve";
import type { CalculationInput, Message, SeniorityBreakdown, SuspensionPeriod } from "../types";
import { decimalYears, msg, n } from "./helpers";

export interface SeniorityResult {
  breakdown: SeniorityBreakdown;
  warnings: Message[];
  suspensionDetails: { period: SuspensionPeriod; days: number; counted: boolean }[];
}

/**
 * Actual seniority = calendar service from start date to the last day of work.
 * Effective seniority = actual seniority minus suspension periods that are not
 * legally assimilated to effective work. Non-assimilated days are removed by
 * shifting the end date back, so the calendar Y/M/D logic stays exact.
 */
export function computeSeniority(input: CalculationInput, ruleSet: LegalRuleSet, legalDate: string): SeniorityResult {
  const warnings: Message[] = [];
  const actual = serviceYMD(input.startDate, input.endDate);
  const actualDays = inclusiveDays(input.startDate, input.endDate);

  // Law 19-12 art. 21: effective work only counts from the law's entry into force.
  const domesticFrom = resolveRule(ruleSet, "regime.availability", legalDate)?.value.domesticFrom;
  const countFrom =
    input.regime === "domestic" && domesticFrom && compareDates(input.startDate, domesticFrom) < 0 ? domesticFrom : input.startDate;
  if (countFrom !== input.startDate) warnings.push(msg("warn.domestic_seniority_from_law", { date: countFrom }));
  const countedDays = compareDates(input.endDate, countFrom) >= 0 ? inclusiveDays(countFrom, input.endDate) : 0;

  const assimilation = resolveRule(ruleSet, "seniority.suspension_assimilation", legalDate)?.value;
  const suspensionDetails: SeniorityResult["suspensionDetails"] = [];
  let excluded = 0;
  for (const period of input.suspensions) {
    if (!period.from || !period.to || compareDates(period.to, period.from) < 0) {
      warnings.push(msg("warn.suspension_invalid"));
      continue;
    }
    const days = countedDays > 0 ? overlapDays(period.from, period.to, countFrom, input.endDate) : 0;
    const counted = period.countsAsEffectiveWork ?? assimilation?.[period.type] ?? false;
    suspensionDetails.push({ period, days, counted });
    if (!counted) excluded += days;
  }
  excluded = Math.min(excluded, countedDays);

  const effective =
    countedDays === 0 ? { years: 0, months: 0, days: 0 } : serviceYMD(countFrom, addDays(input.endDate, -excluded));
  if (excluded >= countedDays) {
    effective.years = 0;
    effective.months = 0;
    effective.days = 0;
  }

  if (excluded > 0) warnings.push(msg("warn.suspensions_excluded", { days: excluded }));

  return {
    breakdown: {
      actual,
      actualDays,
      excludedSuspensionDays: excluded,
      effective,
      actualDecimalYears: n(decimalYears(actual), 4),
      effectiveDecimalYears: n(decimalYears(effective), 4),
    },
    warnings,
    suspensionDetails,
  };
}

export function effectiveTotalMonths(b: SeniorityBreakdown) {
  return new D(b.effective.years * 12 + b.effective.months).plus(new D(b.effective.days).div(30));
}
