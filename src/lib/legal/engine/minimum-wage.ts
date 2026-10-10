import { D, dec, type Dec } from "../decimal";
import type { LegalRuleSet } from "../rules/schema";
import { resolveMinimumWage, resolveRule } from "../rules/resolve";
import type { CalculationInput, Message, MinimumWageCheck } from "../types";
import { msg, n } from "./helpers";
import type { ReferenceSalaryValues } from "./reference-salary";

/**
 * Compares the employee's fixed remuneration with the statutory minimum wage
 * in force on the legal date (and for each month of the salary history).
 * It only WARNS: the actual salary is never replaced by the minimum wage.
 */
export function checkMinimumWage(
  input: CalculationInput,
  ruleSet: LegalRuleSet,
  legalDate: string,
  salary: ReferenceSalaryValues,
): MinimumWageCheck {
  const notes: Message[] = [];
  const domestic = input.regime === "domestic";
  const sector = domestic ? "non_agricultural" : input.sector;
  const entry = resolveMinimumWage(ruleSet, sector, legalDate);
  const checkSector: MinimumWageCheck["sector"] = domestic ? "domestic" : input.sector;

  if (!entry) {
    notes.push(msg("minwage.no_entry", { date: legalDate }));
    return {
      sector: checkSector,
      entryId: null,
      unit: sector === "agricultural" ? "day" : "hour",
      statutoryAmount: null,
      statutoryMonthlyEquivalent: null,
      employeeComparable: null,
      belowMinimum: false,
      decree: null,
      validFrom: null,
      validTo: null,
      historyMonthsBelow: [],
      notes,
    };
  }

  let ratio = new D(1);
  if (domestic) {
    const r = resolveRule(ruleSet, "minimum_wage.domestic", legalDate);
    if (r) ratio = dec(r.value.ratioOfSmig);
    notes.push(msg("minwage.domestic_ratio", { ratio: n(ratio.times(100)) }));
  }

  const dailyHours = dec(input.dailyHours);
  let statutoryComparable: Dec;
  let employeeComparable: Dec;
  let monthlyEquivalent: Dec;
  if (entry.unit === "day") {
    // SMAG is a daily rate for a full legal working day (2496 h / 312 days = 8 h).
    const legalDayHours = new D(8);
    statutoryComparable = dec(entry.amount);
    const dailyWage = salary.fixedMonthlyForMinWage.div(salary.workingDaysPerMonth);
    employeeComparable = dailyHours.gt(0) ? dailyWage.times(legalDayHours).div(dailyHours) : dailyWage;
    monthlyEquivalent = statutoryComparable.times(salary.workingDaysPerMonth).times(dailyHours).div(legalDayHours);
    notes.push(msg("minwage.agri_basis"));
  } else {
    statutoryComparable = dec(entry.amount).times(ratio);
    employeeComparable = salary.fixedMonthlyForMinWage.div(salary.monthlyHours);
    monthlyEquivalent = statutoryComparable.times(salary.monthlyHours);
  }

  const belowMinimum = employeeComparable.lt(statutoryComparable);
  if (input.employeeUnder18) notes.push(msg("minwage.minor_note"));

  const historyMonthsBelow: string[] = [];
  for (const row of salary.historyIncluded) {
    const monthEntry = resolveMinimumWage(ruleSet, sector, `${row.month}-01`);
    if (!monthEntry) continue;
    let monthlyMin: Dec;
    if (monthEntry.unit === "day") {
      monthlyMin = dec(monthEntry.amount).times(salary.workingDaysPerMonth).times(dailyHours).div(8);
    } else {
      monthlyMin = dec(monthEntry.amount).times(ratio).times(salary.monthlyHours);
    }
    if (row.gross.lt(monthlyMin)) historyMonthsBelow.push(row.month);
  }

  return {
    sector: checkSector,
    entryId: entry.id,
    unit: entry.unit,
    statutoryAmount: n(statutoryComparable, 4),
    statutoryMonthlyEquivalent: n(monthlyEquivalent),
    employeeComparable: n(employeeComparable, 4),
    belowMinimum,
    decree: entry.decree,
    validFrom: entry.validFrom,
    validTo: entry.validTo ?? null,
    historyMonthsBelow,
    notes,
  };
}
