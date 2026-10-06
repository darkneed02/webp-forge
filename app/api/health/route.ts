import { ensureDirectories } from "@/lib/config";
export const dynamic = "force-dynamic";
export async function GET() {
  try { await ensureDirectories(); return Response.json({ status: "ok" }); }
  catch { return Response.json({ status: "error", error: "Output or upload folder is not writable." }, { status: 503 }); }
}
