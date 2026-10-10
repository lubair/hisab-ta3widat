import { NextResponse, type NextRequest } from "next/server";
import { checkAdminToken, restoreVersion } from "@/lib/server/rules-store";

export async function POST(request: NextRequest) {
  const auth = checkAdminToken(request.headers.get("x-admin-token"));
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: auth.status });
  const { id } = (await request.json().catch(() => ({}))) as { id?: string };
  if (!id) return NextResponse.json({ error: "id_required" }, { status: 400 });
  const ok = await restoreVersion(id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
