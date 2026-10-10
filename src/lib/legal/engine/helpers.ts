import { D, type Dec } from "../decimal";
import type { YMD } from "../dates";
import type { Message, MessageParams, PartialYearMethod } from "../types";

export const msg = (key: string, params?: MessageParams): Message => (params ? { key, params } : { key });

/** Compact number for formulas: up to `dp` decimals, trailing zeros trimmed. */
export function n(value: Dec, dp = 2): string {
  const fixed = value.toDecimalPlaces(dp, D.ROUND_HALF_UP).toFixed(dp);
  return fixed.includes(".") ? fixed.replace(/0+$/, "").replace(/\.$/, "") : fixed;
}

/** Years + (months + days / 30) / 12 — the 30-day month convention keeps the fraction auditable. */
export function decimalYears(ymd: YMD): Dec {
  return new D(ymd.years).plus(new D(ymd.months).plus(new D(ymd.days).div(30)).div(12));
}

export function decimalMonths(ymd: YMD): Dec {
  return new D(ymd.years * 12 + ymd.months).plus(new D(ymd.days).div(30));
}

export function hasFraction(ymd: YMD): boolean {
  return ymd.months > 0 || ymd.days > 0;
}

/**
 * Years to apply to a "per year or fraction of year" scale.
 * - prorata: exact fraction (default).
 * - full_year: any started year counts as a whole year. A whole number of
 *   years is NOT rounded up (the workbook's DATEDIF+1 bug).
 */
export function scaleYears(ymd: YMD, method: PartialYearMethod): Dec {
  if (method === "full_year") return new D(ymd.years + (hasFraction(ymd) ? 1 : 0));
  return decimalYears(ymd);
}

export function ymdToString(ymd: YMD): string {
  return `${ymd.years}y ${ymd.months}m ${ymd.days}d`;
}
