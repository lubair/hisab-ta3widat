import { emptyInput } from "../../form/defaults";
import { D, money } from "../decimal";
import { calculateCompensation } from "../engine/calculate";
import { SEED_RULESET } from "../rules/seed";
import type { CalculationInput, CalculationResult, Entitlement, EntitlementId } from "../types";

type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] };

/** Non-agricultural CDI employee, 44 h/week, 6 000 MAD gross with no extra components. */
export function input(overrides: DeepPartial<CalculationInput> = {}): CalculationInput {
  const base = emptyInput();
  return {
    ...base,
    startDate: "2020-01-01",
    endDate: "2024-12-31",
    grossMonthly: "6000",
    ...overrides,
    leave: { ...base.leave, daysTaken: "0", carriedOverDays: "0", ...overrides.leave },
    other: {
      ...base.other,
      ...overrides.other,
      unpaidOvertimeHours: { ...base.other.unpaidOvertimeHours, ...overrides.other?.unpaidOvertimeHours },
    },
    alreadyPaid: { ...base.alreadyPaid, ...overrides.alreadyPaid },
    options: { ...base.options, ...overrides.options },
    components: (overrides.components as CalculationInput["components"]) ?? base.components,
    salaryHistory: (overrides.salaryHistory as CalculationInput["salaryHistory"]) ?? base.salaryHistory,
    suspensions: (overrides.suspensions as CalculationInput["suspensions"]) ?? base.suspensions,
  } as CalculationInput;
}

export function run(overrides: DeepPartial<CalculationInput> = {}): CalculationResult {
  return calculateCompensation(input(overrides), SEED_RULESET);
}

export function ent(result: CalculationResult, id: EntitlementId): Entitlement {
  const e = result.entitlements.find((x) => x.id === id);
  if (!e) throw new Error(`Entitlement ${id} missing (errors: ${JSON.stringify(result.errors)})`);
  return e;
}

/** Independent restatement of Art. 53: hours × (monthly / 191), rounded half-up to the centime. */
export function expectedDismissal(hours: string | number, monthly: string | number = 6000, monthlyHours: string | number = 191): string {
  return money(new D(monthly).div(monthlyHours).times(hours)).toFixed(2);
}

export function keys(result: CalculationResult, e: Entitlement): string[] {
  return [...e.reasonsNotApplicable, ...e.reviewFlags, ...e.notes].map((m) => m.key).concat(result.warnings.map((w) => w.key));
}
