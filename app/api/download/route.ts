import { Readable } from "node:stream";
import { getBatchFile } from "@/lib/batches";
import { config } from "@/lib/config";
import { openOutput } from "@/lib/file-utils";
import { outputMimeTypes } from "@/lib/output-format";
import { AppError, errorResponse } from "@/lib/errors";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const { file } = getBatchFile(params.get("batch"), params.get("id"));
    if (file.status !== "completed" || !file.result) throw new AppError("This image has not been converted.", 404);
    const handle = await openOutput(config.outputDir, file.result.filename);
    const size = (await handle.stat()).size;
    return new Response(Readable.toWeb(handle.createReadStream()) as ReadableStream, { headers: {
      "Content-Type": outputMimeTypes[file.result.format], "Content-Length": String(size), "Content-Disposition": `attachment; filename="${file.result.filename}"`, "Cache-Control": "no-store"
    } });
  } catch (error) { return errorResponse(error); }
}
