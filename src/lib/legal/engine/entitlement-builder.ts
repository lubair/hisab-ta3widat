import { D, dec, money, nonNegative, type Dec } from "../decimal";
import type { LegalRuleSet, VerificationStatus } from "../rules/schema";
import type { Entitlement, EntitlementId, EntitlementNature, Message } from "../types";
import { msg, n } from "./helpers";

export function notApplicable(
  id: EntitlementId,
  reasons: Message[],
  provisionIds: string[],
  nature: EntitlementNature = "statutory",
  notes: Message[] = [],
): Entitlement {
  return {
    id,
    status: "not_applicable",
    nature,
    computed: "0.00",
    alreadyPaid: "0.00",
    amount: "0.00",
    method: msg(`method.${id}`),
    formula: "—",
    inputs: [],
    steps: [],
    caps: [],
    notes,
    reasonsNotApplicable: reasons,
    provisionIds,
    reviewFlags: [],
  };
}

export function finalize(
  base: Omit<Entitlement, "status" | "computed" | "alreadyPaid" | "amount">,
  computed: Dec,
  alreadyPaidRaw: string | undefined,
): Entitlement {
  const computedMoney = money(computed);
  const paid = money(nonNegative(dec(alreadyPaidRaw)));
  const outstanding = nonNegative(computedMoney.minus(paid));
  const notes = [...base.notes];
  if (paid.gt(0)) notes.push(msg("note.already_paid_deducted", { paid: n(paid), computed: n(computedMoney) }));
  if (paid.gt(computedMoney)) notes.push(msg("note.paid_exceeds_computed"));
  return {
    ...base,
    notes,
    status: computedMoney.isZero() ? "zero" : "payable",
    computed: computedMoney.toFixed(2),
    alreadyPaid: paid.toFixed(2),
    amount: outstanding.toFixed(2),
  };
}

/** Adds a review flag for every rule/provision used that is not fully verified. */
export function verificationFlags(ruleSet: LegalRuleSet, ruleIds: string[]): Message[] {
  const flags: Message[] = [];
  for (const id of ruleIds) {
    const rule = ruleSet.rules.find((r) => r.id === id);
    if (rule && rule.verification === "requires_legal_review") flags.push(msg("flag.rule_requires_review", { rule: id }));
  }
  return flags;
}

export function statusFlag(status: VerificationStatus, id: string): Message[] {
  return status === "requires_legal_review" ? [msg("flag.rule_requires_review", { rule: id })] : [];
}

export const ZERO = new D(0);
