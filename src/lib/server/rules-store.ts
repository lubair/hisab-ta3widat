import "server-only";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { SEED_RULESET } from "@/lib/legal/rules/seed";
import type { LegalRuleSet } from "@/lib/legal/rules/schema";

export interface RuleSetVersion {
  id: string;
  createdAt: string;
  author: string;
  note: string;
  officialSourceConfirmed: boolean;
  ruleSet: LegalRuleSet;
}

export interface RulesStore {
  activeVersionId: string;
  versions: RuleSetVersion[];
}

export type VersionMeta = Omit<RuleSetVersion, "ruleSet"> & { rulesVersion: string };

const STORE_PATH = process.env.RULES_STORE_PATH || path.join(process.cwd(), "data", "rules-store.json");

function seedStore(): RulesStore {
  const id = "seed";
  return {
    activeVersionId: id,
    versions: [
      {
        id,
        createdAt: SEED_RULESET.publishedAt,
        author: "system",
        note: "Baseline legal rules shipped with the application (see docs/legal-verification.md).",
        officialSourceConfirmed: true,
        ruleSet: SEED_RULESET,
      },
    ],
  };
}

async function readStore(): Promise<RulesStore> {
  try {
    const raw = await readFile(STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as RulesStore;
    if (!parsed.versions?.length) return seedStore();
    return parsed;
  } catch {
    return seedStore();
  }
}

/** Atomic write: temp file then rename, so a crash never leaves a truncated store. */
async function writeStore(store: RulesStore): Promise<void> {
  await mkdir(path.dirname(STORE_PATH), { recursive: true });
  const tmp = `${STORE_PATH}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(store, null, 2), "utf-8");
  await rename(tmp, STORE_PATH);
}

export async function getActiveRuleSet(): Promise<LegalRuleSet> {
  const store = await readStore();
  const active = store.versions.find((v) => v.id === store.activeVersionId) ?? store.versions[store.versions.length - 1];
  return active.ruleSet;
}

export async function listVersions(): Promise<{ activeVersionId: string; versions: VersionMeta[] }> {
  const store = await readStore();
  return {
    activeVersionId: store.activeVersionId,
    versions: store.versions
      .map(({ ruleSet, ...meta }) => ({ ...meta, rulesVersion: ruleSet.version }))
      .reverse(),
  };
}

export async function saveNewVersion(
  ruleSet: LegalRuleSet,
  meta: { author: string; note: string; officialSourceConfirmed: boolean },
): Promise<RuleSetVersion> {
  const store = await readStore();
  const version: RuleSetVersion = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    author: meta.author || "admin",
    note: meta.note,
    officialSourceConfirmed: meta.officialSourceConfirmed,
    ruleSet: { ...ruleSet, publishedAt: new Date().toISOString() },
  };
  store.versions.push(version);
  store.activeVersionId = version.id;
  await writeStore(store);
  return version;
}

export async function restoreVersion(id: string): Promise<boolean> {
  const store = await readStore();
  if (!store.versions.some((v) => v.id === id)) return false;
  store.activeVersionId = id;
  await writeStore(store);
  return true;
}

export type AdminAuth = { ok: true; devMode: boolean } | { ok: false; status: 401 | 403 };

export function checkAdminToken(provided: string | null): AdminAuth {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return process.env.NODE_ENV === "production" ? { ok: false, status: 403 } : { ok: true, devMode: true };
  }
  if (!provided) return { ok: false, status: 401 };
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return { ok: false, status: 401 };
  return { ok: true, devMode: false };
}

export function isAdminDevMode(): boolean {
  return !process.env.ADMIN_TOKEN && process.env.NODE_ENV !== "production";
}
