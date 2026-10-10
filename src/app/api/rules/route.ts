import { NextResponse, type NextRequest } from "next/server";
import type { LegalRuleSet } from "@/lib/legal/rules/schema";
import { validateRuleSet } from "@/lib/legal/rules/validate";
import { checkAdminToken, getActiveRuleSet, isAdminDevMode, listVersions, saveNewVersion } from "@/lib/server/rules-store";

export async function GET() {
  const [ruleSet, versions] = await Promise.all([getActiveRuleSet(), listVersions()]);
  return NextResponse.json({ ruleSet, ...versions, devMode: isAdminDevMode() });
}

interface SaveBody {
  ruleSet: LegalRuleSet;
  note: string;
  author?: string;
  officialSourceConfirmed: boolean;
}

export async function POST(request: NextRequest) {
  const auth = checkAdminToken(request.headers.get("x-admin-token"));
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: auth.status });

  let body: SaveBody;
  try {
    body = (await request.json()) as SaveBody;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!body.officialSourceConfirmed) {
    return NextResponse.json({ error: "official_source_confirmation_required" }, { status: 422 });
  }
  if (!body.note?.trim()) {
    return NextResponse.json({ error: "version_note_required" }, { status: 422 });
  }
  const issues = validateRuleSet(body.ruleSet);
  if (issues.length) return NextResponse.json({ error: "validation_failed", issues }, { status: 422 });

  const version = await saveNewVersion(body.ruleSet, {
    author: body.author?.slice(0, 120) ?? "admin",
    note: body.note.slice(0, 2000),
    officialSourceConfirmed: true,
  });
  return NextResponse.json({ id: version.id, createdAt: version.createdAt });
}
