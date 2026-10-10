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

  const assimilation = resolveRule(ruleSet, "seniority.suspension_assimilation", legalDate)?.value;
  const suspensionDetails: SeniorityResult["suspensionDetails"] = [];
  let excluded = 0;
  for (const period of input.suspensions) {
    if (!period.from || !period.to || compareDates(period.to, period.from) < 0) {
      warnings.push(msg("warn.suspension_invalid"));
      continue;
    }
    const days = overlapDays(period.from, period.to, input.startDate, input.endDate);
    const counted = period.countsAsEffectiveWork ?? assimilation?.[period.type] ?? false;
    suspensionDetails.push({ period, days, counted });
    if (!counted) excluded += days;
  }
  excluded = Math.min(excluded, actualDays);

  const effective = excluded > 0 ? serviceYMD(input.startDate, addDays(input.endDate, -excluded)) : actual;
  if (excluded >= actualDays) {
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
