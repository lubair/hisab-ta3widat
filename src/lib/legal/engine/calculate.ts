import { compareDates, isValidISODate } from "../dates";
import { D, dec, money, nonNegative, sum } from "../decimal";
import type { LegalRuleSet } from "../rules/schema";
import { MissingRuleError, resolveRule } from "../rules/resolve";
import type { CalculationInput, CalculationResult, Entitlement, Message } from "../types";
import {
  cddDamages,
  dismissalIndemnity,
  noticeIndemnity,
  otherEntitlements,
  paidLeave,
  unfairDismissalDamages,
  type EngineContext,
} from "./entitlements";
import { msg, n } from "./helpers";
import { checkMinimumWage } from "./minimum-wage";
import { computeReferenceSalary } from "./reference-salary";
import { computeSeniority } from "./seniority";

const EMPTY_TOTALS = { statutory: "0.00", judicialEstimate: "0.00", grandTotal: "0.00", advancesDeducted: "0.00", netPayable: "0.00" };

export function validateInput(input: CalculationInput, ruleSet: LegalRuleSet): Message[] {
  const errors: Message[] = [];
  if (!isValidISODate(input.startDate)) errors.push(msg("error.start_date"));
  if (!isValidISODate(input.endDate)) errors.push(msg("error.end_date"));
  if (errors.length) return errors;
  if (compareDates(input.endDate, input.startDate) < 0) errors.push(msg("error.end_before_start"));
  if (input.legalDate && !isValidISODate(input.legalDate)) errors.push(msg("error.legal_date"));

  if (input.contractType === "CDI" && input.terminationReason === "cdd_early_termination") {
    errors.push(msg("error.cdi_cdd_reason"));
  }
  if (input.contractType === "CDD" && !input.cddRequalifiedAsCdi) {
    if (!input.cddPlannedEndDate || !isValidISODate(input.cddPlannedEndDate)) errors.push(msg("error.cdd_planned_end"));
    else if (compareDates(input.cddPlannedEndDate, input.startDate) <= 0) errors.push(msg("error.cdd_planned_before_start"));
  }

  const legalDate = input.legalDate || input.endDate;
  const availability = resolveRule(ruleSet, "regime.availability", legalDate)?.value;
  if (availability) {
    const from = input.regime === "domestic" ? availability.domesticFrom : availability.laborCodeFrom;
    if (compareDates(legalDate, from) < 0) {
      errors.push(msg(input.regime === "domestic" ? "error.domestic_before_law" : "error.labor_code_before_law", { from }));
    }
    if (compareDates(input.endDate, from) < 0) {
      errors.push(msg("error.termination_before_law", { from }));
    }
  }
  return errors;
}

/**
 * Pure, deterministic entry point of the legal calculation engine.
 * The same input and rule set always produce the same result.
 */
export function calculateCompensation(input: CalculationInput, ruleSet: LegalRuleSet): CalculationResult {
  const legalDate = input.legalDate && isValidISODate(input.legalDate) ? input.legalDate : input.endDate;
  const base: CalculationResult = {
    ok: false,
    errors: [],
    warnings: [],
    legalDate,
    rulesVersion: ruleSet.version,
    seniority: null,
    referenceSalary: null,
    minimumWage: null,
    entitlements: [],
    totals: EMPTY_TOTALS,
    appliedRuleIds: [],
  };

  const errors = validateInput(input, ruleSet);
  if (errors.length) return { ...base, errors };

  try {
    const warnings: Message[] = [];
    if (input.legalDate && input.legalDate !== input.endDate) {
      warnings.push(msg("warn.legal_date_differs", { legalDate: input.legalDate, endDate: input.endDate }));
    }

    const seniority = computeSeniority(input, ruleSet, legalDate);
    warnings.push(...seniority.warnings);

    const salary = computeReferenceSalary(input, ruleSet, legalDate);
    warnings.push(...salary.warnings);
    if (salary.errors.length) return { ...base, errors: salary.errors, warnings };

    const appliedRuleIds = new Set<string>();
    const ctx: EngineContext = {
      input,
      ruleSet,
      legalDate,
      seniority: seniority.breakdown,
      salary: salary.values,
      treatAsCdi: input.contractType === "CDI" || Boolean(input.cddRequalifiedAsCdi),
      appliedRuleIds,
    };

    const minimumWage = checkMinimumWage(input, ruleSet, legalDate, salary.values);
    if (minimumWage.belowMinimum) {
      warnings.push(
        msg("warn.below_minimum_wage", {
          employee: minimumWage.employeeComparable ?? "",
          minimum: minimumWage.statutoryAmount ?? "",
          unit: minimumWage.unit,
        }),
      );
    }
    if (minimumWage.historyMonthsBelow.length) {
      warnings.push(msg("warn.history_below_minimum", { months: minimumWage.historyMonthsBelow.join(", ") }));
    }

    const dismissal = dismissalIndemnity(ctx);
    const damages = unfairDismissalDamages(ctx);
    const notice = noticeIndemnity(ctx);
    const leave = paidLeave(ctx, notice.entitlement.status === "not_applicable" ? new D(0) : notice.unservedMonths);
    const cdd = cddDamages(ctx);
    const other = otherEntitlements(ctx);
    const entitlements: Entitlement[] = [dismissal, damages, notice.entitlement, leave, cdd, other];

    const payable = entitlements.filter((e) => e.status !== "not_applicable");
    const statutory = sum(payable.filter((e) => e.nature === "statutory").map((e) => dec(e.amount)));
    const judicial = sum(payable.filter((e) => e.nature === "judicial_estimate").map((e) => dec(e.amount)));
    const grandTotal = statutory.plus(judicial);
    const advances = nonNegative(dec(input.other.salaryAdvances));
    const advancesDeducted = advances.gt(grandTotal) ? grandTotal : advances;
    if (advances.gt(0)) warnings.push(msg("warn.advances_rules", { amount: n(advances) }));
    if (advances.gt(grandTotal)) warnings.push(msg("warn.advances_exceed_total"));

    if (input.contractType === "CDD" && input.cddRequalifiedAsCdi) warnings.push(msg("warn.requalification_estimate"));

    return {
      ...base,
      ok: true,
      warnings,
      seniority: seniority.breakdown,
      referenceSalary: salary.summary,
      minimumWage,
      entitlements,
      totals: {
        statutory: money(statutory).toFixed(2),
        judicialEstimate: money(judicial).toFixed(2),
        grandTotal: money(grandTotal).toFixed(2),
        advancesDeducted: money(advancesDeducted).toFixed(2),
        netPayable: money(grandTotal.minus(advancesDeducted)).toFixed(2),
      },
      appliedRuleIds: [...appliedRuleIds],
    };
  } catch (e) {
    if (e instanceof MissingRuleError) {
      return { ...base, errors: [msg("error.missing_rule", { rule: e.ruleKey, date: e.date })] };
    }
    throw e;
  }
}
