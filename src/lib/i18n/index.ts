import type { Message } from "../legal/types";
import { ar } from "./ar";
import { fr } from "./fr";

export const LOCALES = ["ar", "fr"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ar";

export const dictionaries: Record<Locale, Record<string, string>> = { ar, fr };

export function isLocale(value: string): value is Locale {
  return (LOCALES as readonly string[]).includes(value);
}

export function dir(locale: Locale): "rtl" | "ltr" {
  return locale === "ar" ? "rtl" : "ltr";
}

export function translate(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const template = dictionaries[locale][key] ?? dictionaries.fr[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params[name];
    if (value === undefined) return `{${name}}`;
    return translateParam(locale, name, value);
  });
}

/** Enum-like params (category, unit) are translated; numbers are localized. */
function translateParam(locale: Locale, name: string, value: string | number): string {
  if (name === "category") return translate(locale, `form.category.${value}`);
  if (name === "unit") return translate(locale, value === "day" ? "unit.days" : value === "hour" ? "unit.hours" : "unit.months");
  if (typeof value === "number") return formatNumber(String(value), locale, 0, 4);
  if (/^-?\d+(\.\d+)?$/.test(value)) return formatNumber(value, locale, 0, 4);
  return value;
}

export function tm(locale: Locale, message: Message): string {
  return translate(locale, message.key, message.params);
}

/** No-break space keeps grouped digits in a single bidi run in RTL text and PDFs. */
const GROUP = "\u00A0";

/**
 * Formats a decimal string without converting through floating point.
 * Moroccan convention: space thousands separator, comma decimal separator, Latin digits.
 */
export function formatNumber(value: string, _locale: Locale, minFraction = 2, maxFraction = 2): string {
  if (value === "" || value === "—") return value;
  const negative = value.startsWith("-");
  const raw = negative ? value.slice(1) : value;
  let [intPart, fracPart = ""] = raw.split(".");
  if (fracPart.length > maxFraction) {
    // Values reaching here are already rounded by the engine; truncate defensively.
    fracPart = fracPart.slice(0, maxFraction);
  }
  fracPart = fracPart.replace(/0+$/, "");
  while (fracPart.length < minFraction) fracPart += "0";
  intPart = intPart.replace(/^0+(?=\d)/, "");
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, GROUP);
  return `${negative ? "-" : ""}${grouped}${fracPart ? "," + fracPart : ""}`;
}

export function formatMAD(value: string, locale: Locale): string {
  const num = formatNumber(value, locale, 2, 2);
  return locale === "ar" ? `${num}${GROUP}درهم` : `${num}${GROUP}MAD`;
}

export function formatDate(iso: string, locale: Locale): string {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const [y, m, d] = iso.split("-");
  return locale === "ar" ? `${d}/${m}/${y}` : `${d}/${m}/${y}`;
}

export function formatUnitValue(value: string, unit: string | undefined, locale: Locale): string {
  if (!unit || unit === "text") {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return formatDate(value, locale);
    if (["executive", "employee", "worker"].includes(value)) return translate(locale, `form.category.${value}`);
    return value;
  }
  if (unit === "MAD") return formatMAD(value, locale);
  const decimals = unit === "MAD/h" || unit === "MAD/day" ? 4 : 4;
  return `${formatNumber(value, locale, 0, decimals)}${GROUP}${translate(locale, `unit.${unit}`)}`;
}
