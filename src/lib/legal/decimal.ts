import Decimal from "decimal.js";

/**
 * Isolated Decimal constructor for all legal/financial arithmetic.
 * Precision is high enough that intermediate results never lose cents;
 * rounding to 2 decimals (half-up, the usual payroll convention) only happens
 * when an amount is presented as a final monetary result.
 */
export const D = Decimal.clone({ precision: 40, rounding: Decimal.ROUND_HALF_UP });
export type Dec = InstanceType<typeof D>;

export type DecimalInput = Dec | string | number;

export function dec(value: DecimalInput | null | undefined): Dec {
  if (value === null || value === undefined || value === "") return new D(0);
  if (typeof value === "string") {
    const normalized = value.replace(/\s|\u00A0|\u202F/g, "").replace(",", ".");
    if (normalized === "" || normalized === "-" || Number.isNaN(Number(normalized))) return new D(0);
    return new D(normalized);
  }
  return new D(value);
}

export function money(value: Dec): Dec {
  return value.toDecimalPlaces(2, D.ROUND_HALF_UP);
}

export function moneyStr(value: Dec): string {
  return money(value).toFixed(2);
}

export function sum(values: Dec[]): Dec {
  return values.reduce((acc, v) => acc.plus(v), new D(0));
}

export function maxDec(a: Dec, b: Dec): Dec {
  return a.greaterThan(b) ? a : b;
}

export function minDec(a: Dec, b: Dec): Dec {
  return a.lessThan(b) ? a : b;
}

/** Non-negative clamp: outstanding amounts never become negative claims. */
export function nonNegative(value: Dec): Dec {
  return value.isNegative() ? new D(0) : value;
}
