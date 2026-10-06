import { PassThrough, Readable } from "node:stream";
import { once } from "node:events";
import { Zip, ZipPassThrough } from "fflate";
import { getBatch } from "@/lib/batches";
import { config } from "@/lib/config";
import { openOutput } from "@/lib/file-utils";
import { AppError, errorResponse } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const batch = getBatch(new URL(request.url).searchParams.get("batch"));
    const files = batch.files.flatMap(f => f.status === "completed" && f.result ? [f.result] : []);
    if (!files.length) throw new AppError("There are no converted images to download.", 404);
    // Check every file before sending headers. No ZIP is written to disk.
    for (const file of files) { const handle = await openOutput(config.outputDir, file.filename); await handle.close(); }
    const output = new PassThrough();
    const controller = new AbortController();
    output.once("close", () => controller.abort());
    const zip = new Zip((error, chunk, final) => {
      if (error) output.destroy(error); else if (!output.destroyed) { output.write(chunk); if (final) output.end(); }
    });
    void (async () => {
      try {
        for (const file of files) {
          if (output.destroyed) break;
          const handle = await openOutput(config.outputDir, file.filename);
          const entry = new ZipPassThrough(file.filename); zip.add(entry);
          try {
            for await (const chunk of handle.createReadStream()) {
              if (output.destroyed) break;
              entry.push(chunk as Buffer);
              if (output.writableNeedDrain) await once(output, "drain", { signal: controller.signal });
            }
            if (output.destroyed) break;
            entry.push(new Uint8Array(), true);
          } finally { await handle.close(); }
        }
        if (!output.destroyed) zip.end();
      } catch (error) { if (!controller.signal.aborted) console.error("ZIP generation failed", error); output.destroy(new Error("ZIP download failed. Try again.")); }
      finally { zip.terminate(); }
    })();
    return new Response(Readable.toWeb(output) as ReadableStream, { headers: { "Content-Type": "application/zip", "Content-Disposition": "attachment; filename=webp-forge.zip", "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
