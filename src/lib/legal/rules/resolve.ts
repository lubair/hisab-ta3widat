import { compareDates, isWithin, type ISODate } from "../dates";
import type {
  LegalProvision,
  LegalRuleSet,
  MinimumWageEntry,
  MinimumWageSector,
  PaidHoliday,
  RuleEntry,
  RuleKey,
} from "./schema";

/**
 * Returns the rule entry in force on `date`. When several entries overlap
 * (should not happen with valid data) the one with the latest start wins.
 */
export function resolveRule<K extends RuleKey>(
  ruleSet: LegalRuleSet,
  key: K,
  date: ISODate,
): RuleEntry<K> | null {
  const candidates = ruleSet.rules.filter(
    (r) => r.key === key && isWithin(date, r.validFrom, r.validTo ?? null),
  ) as unknown as RuleEntry<K>[];
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => compareDates(b.validFrom, a.validFrom))[0];
}

export function requireRule<K extends RuleKey>(ruleSet: LegalRuleSet, key: K, date: ISODate): RuleEntry<K> {
  const rule = resolveRule(ruleSet, key, date);
  if (!rule) throw new MissingRuleError(key, date);
  return rule;
}

export class MissingRuleError extends Error {
  constructor(
    public readonly ruleKey: string,
    public readonly date: ISODate,
  ) {
    super(`No legal rule "${ruleKey}" in force on ${date}`);
  }
}

export function resolveMinimumWage(
  ruleSet: LegalRuleSet,
  sector: MinimumWageSector,
  date: ISODate,
): MinimumWageEntry | null {
  const candidates = ruleSet.minimumWages.filter(
    (w) => w.sector === sector && isWithin(date, w.validFrom, w.validTo ?? null),
  );
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => compareDates(b.validFrom, a.validFrom))[0];
}

export function minimumWageHistory(ruleSet: LegalRuleSet, sector: MinimumWageSector): MinimumWageEntry[] {
  return ruleSet.minimumWages
    .filter((w) => w.sector === sector)
    .sort((a, b) => compareDates(a.validFrom, b.validFrom));
}

export function provisionsInForce(ruleSet: LegalRuleSet, date: ISODate): LegalProvision[] {
  return ruleSet.provisions.filter((p) => isWithin(date, p.validFrom, p.validTo ?? null));
}

export function findProvision(ruleSet: LegalRuleSet, id: string): LegalProvision | undefined {
  return ruleSet.provisions.find((p) => p.id === id);
}

export function paidHolidaysInForce(ruleSet: LegalRuleSet, date: ISODate): PaidHoliday[] {
  return ruleSet.paidHolidays.filter((h) => isWithin(date, h.validFrom, h.validTo ?? null));
}
