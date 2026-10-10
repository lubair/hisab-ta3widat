import { compareDates, isValidISODate } from "../dates";
import type { LegalRuleSet } from "./schema";

export interface ValidationIssue {
  path: string;
  message: string;
}

const DECIMAL_RE = /^\d+(\.\d+)?$/;

function overlaps(aFrom: string, aTo: string | null | undefined, bFrom: string, bTo: string | null | undefined) {
  const aEnd = aTo ?? "9999-12-31";
  const bEnd = bTo ?? "9999-12-31";
  return compareDates(aFrom, bEnd) <= 0 && compareDates(bFrom, aEnd) <= 0;
}

/**
 * Structural and legal-traceability validation applied before any rule set
 * version is saved. Every minimum wage value must cite its decree and an
 * official source URL; effective periods of the same rule must not overlap.
 */
export function validateRuleSet(ruleSet: LegalRuleSet): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (ruleSet.schemaVersion !== 1) issues.push({ path: "schemaVersion", message: "Unsupported schema version" });
  if (!ruleSet.version) issues.push({ path: "version", message: "Version is required" });

  ruleSet.minimumWages.forEach((w, i) => {
    const p = `minimumWages[${i}]`;
    if (!w.id) issues.push({ path: `${p}.id`, message: "id is required" });
    if (!DECIMAL_RE.test(w.amount) || Number(w.amount) <= 0) issues.push({ path: `${p}.amount`, message: "Amount must be a positive decimal" });
    if (!isValidISODate(w.validFrom)) issues.push({ path: `${p}.validFrom`, message: "Invalid start date" });
    if (w.validTo && !isValidISODate(w.validTo)) issues.push({ path: `${p}.validTo`, message: "Invalid end date" });
    if (w.validTo && isValidISODate(w.validFrom) && isValidISODate(w.validTo) && compareDates(w.validTo, w.validFrom) < 0) {
      issues.push({ path: `${p}.validTo`, message: "End date precedes start date" });
    }
    if (!w.decree?.trim()) issues.push({ path: `${p}.decree`, message: "Decree reference is required" });
    if (!/^https:\/\//.test(w.officialUrl ?? "")) issues.push({ path: `${p}.officialUrl`, message: "An https official source URL is required" });
    if (w.sector === "agricultural" && w.unit !== "day") issues.push({ path: `${p}.unit`, message: "SMAG is a daily rate" });
    if (w.sector === "non_agricultural" && w.unit !== "hour") issues.push({ path: `${p}.unit`, message: "SMIG is an hourly rate" });
  });

  for (const sector of ["non_agricultural", "agricultural"] as const) {
    const list = ruleSet.minimumWages.filter((w) => w.sector === sector && isValidISODate(w.validFrom));
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (overlaps(list[i].validFrom, list[i].validTo, list[j].validFrom, list[j].validTo)) {
          issues.push({ path: `minimumWages.${sector}`, message: `Overlapping periods: ${list[i].id} / ${list[j].id}` });
        }
      }
    }
  }

  const byKey = new Map<string, typeof ruleSet.rules>();
  ruleSet.rules.forEach((r, i) => {
    const p = `rules[${i}]`;
    if (!r.id) issues.push({ path: `${p}.id`, message: "id is required" });
    if (!isValidISODate(r.validFrom)) issues.push({ path: `${p}.validFrom`, message: "Invalid start date" });
    if (r.validTo && !isValidISODate(r.validTo)) issues.push({ path: `${p}.validTo`, message: "Invalid end date" });
    if (r.value === undefined) issues.push({ path: `${p}.value`, message: "Value is required" });
    const arr = byKey.get(r.key) ?? [];
    arr.push(r);
    byKey.set(r.key, arr);
  });
  for (const [key, list] of byKey) {
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        if (overlaps(list[i].validFrom, list[i].validTo, list[j].validFrom, list[j].validTo)) {
          issues.push({ path: `rules.${key}`, message: `Overlapping periods: ${list[i].id} / ${list[j].id}` });
        }
      }
    }
  }

  const ids = new Set<string>();
  for (const p of ruleSet.provisions) {
    if (ids.has(p.id)) issues.push({ path: `provisions.${p.id}`, message: "Duplicate provision id" });
    ids.add(p.id);
    if (!/^https:\/\//.test(p.officialUrl ?? "")) issues.push({ path: `provisions.${p.id}.officialUrl`, message: "An https official source URL is required" });
  }
  return issues;
}
