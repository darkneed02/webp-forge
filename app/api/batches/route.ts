import { createBatch } from "@/lib/batches";
import { errorResponse, AppError, requireSameOrigin } from "@/lib/errors";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    if (!request.headers.get("content-type")?.includes("application/json")) throw new AppError("Expected JSON batch details.");
    // Limit the manifest before JSON parsing, including requests without Content-Length.
    const reader = request.body?.getReader();
    if (!reader) throw new AppError("Missing batch details.");
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 512_000) { await reader.cancel(); throw new AppError("Batch details are too large.", 413); } chunks.push(value); }
    } finally { reader.releaseLock(); }
    let body: unknown;
    try { body = JSON.parse(Buffer.concat(chunks).toString()); } catch { throw new AppError("Invalid batch details."); }
    const batch = createBatch(body);
    return Response.json({ batchId: batch.id, fileIds: batch.files.map(f => f.id) });
  } catch (error) { return errorResponse(error); }
}
