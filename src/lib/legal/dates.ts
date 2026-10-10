/**
 * Calendar utilities working exclusively on ISO dates (YYYY-MM-DD) in UTC,
 * so results never depend on the user's time zone or daylight saving.
 */

export type ISODate = string;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidISODate(value: string | undefined | null): value is ISODate {
  if (!value || !ISO_RE.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function toUTC(date: ISODate): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function fromUTC(ms: number): ISODate {
  const dt = new Date(ms);
  const y = dt.getUTCFullYear();
  const m = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dt.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const DAY_MS = 86_400_000;

export function addDays(date: ISODate, days: number): ISODate {
  return fromUTC(toUTC(date) + days * DAY_MS);
}

/** Number of days from `a` to `b` (b - a). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return Math.round((toUTC(b) - toUTC(a)) / DAY_MS);
}

/** Inclusive count of calendar days in [from, to]. */
export function inclusiveDays(from: ISODate, to: ISODate): number {
  return daysBetween(from, to) + 1;
}

export function compareDates(a: ISODate, b: ISODate): number {
  return toUTC(a) - toUTC(b);
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(Date.UTC(year, monthIndex0 + 1, 0)).getUTCDate();
}

export interface YMD {
  years: number;
  months: number;
  days: number;
}

/**
 * Calendar difference between `start` (inclusive) and `endExclusive`.
 * Equivalent to Excel DATEDIF "y"/"ym"/"md" but without its known "md" bug:
 * borrowed days use the length of the month preceding the end date.
 */
export function diffYMD(start: ISODate, endExclusive: ISODate): YMD {
  if (compareDates(endExclusive, start) <= 0) return { years: 0, months: 0, days: 0 };
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = endExclusive.split("-").map(Number);
  let years = ey - sy;
  let months = em - sm;
  let days = ed - sd;
  if (days < 0) {
    months -= 1;
    const prevMonthIndex0 = (em - 2 + 12) % 12;
    const prevMonthYear = em - 2 < 0 ? ey - 1 : ey;
    days += daysInMonth(prevMonthYear, prevMonthIndex0);
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

/** Service duration where `end` is the last day of work (inclusive). */
export function serviceYMD(start: ISODate, endInclusive: ISODate): YMD {
  return diffYMD(start, addDays(endInclusive, 1));
}

export function totalMonths(ymd: YMD): number {
  return ymd.years * 12 + ymd.months;
}

/** Number of days of [aFrom, aTo] that overlap [bFrom, bTo] (all inclusive). */
export function overlapDays(aFrom: ISODate, aTo: ISODate, bFrom: ISODate, bTo: ISODate): number {
  const from = Math.max(toUTC(aFrom), toUTC(bFrom));
  const to = Math.min(toUTC(aTo), toUTC(bTo));
  if (to < from) return 0;
  return Math.round((to - from) / DAY_MS) + 1;
}

export function isWithin(date: ISODate, from: ISODate, to?: ISODate | null): boolean {
  if (compareDates(date, from) < 0) return false;
  if (to && compareDates(date, to) > 0) return false;
  return true;
}

export function addMonths(date: ISODate, months: number): ISODate {
  const [y, m, d] = date.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const dim = daysInMonth(target.getUTCFullYear(), target.getUTCMonth());
  target.setUTCDate(Math.min(d, dim));
  return fromUTC(target.getTime());
}

export function todayISO(): ISODate {
  const now = new Date();
  return fromUTC(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}
