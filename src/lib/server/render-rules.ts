import "server-only";
import { connection } from "next/server";
import { IS_STATIC_EXPORT } from "@/lib/deployment";
import type { LegalRuleSet } from "@/lib/legal/rules/schema";
import { SEED_RULESET } from "@/lib/legal/rules/seed";
import { validateRuleSet } from "@/lib/legal/rules/validate";
import { getActiveRuleSet } from "./rules-store";

/**
 * Server deployments read the active version from the editable store at request time.
 * The static export has neither a server nor a writable store, so it embeds the committed
 * seed rules at build time; invalid rules fail the build instead of being published.
 */
export async function loadRuleSetForRender(): Promise<LegalRuleSet> {
  if (!IS_STATIC_EXPORT) {
    await connection();
    return getActiveRuleSet();
  }
  const issues = validateRuleSet(SEED_RULESET);
  if (issues.length) {
    throw new Error(
      `SEED_RULESET ${SEED_RULESET.version} failed validation:\n${issues.map((i) => `  ${i.path}: ${i.message}`).join("\n")}`,
    );
  }
  return SEED_RULESET;
}
