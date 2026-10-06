import path from "node:path";
import { randomUUID } from "node:crypto";
import { config, ensureDirectories } from "@/lib/config";
import { getBatchFile } from "@/lib/batches";
import { convertImage, conversionQueue } from "@/lib/converter";
import { receiveUpload } from "@/lib/upload";
import { removeFile } from "@/lib/file-utils";
import { AppError, errorResponse, requireSameOrigin } from "@/lib/errors";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  let temp: string | undefined;
  let current: ReturnType<typeof getBatchFile>["file"] | undefined;
  try {
    requireSameOrigin(request);
    const params = new URL(request.url).searchParams;
    const { batch, file } = getBatchFile(params.get("batch"), params.get("id"));
    if (file.status !== "waiting") throw new AppError("This image has already been submitted.", 409);
    if (request.headers.get("content-type") !== file.mime) throw new AppError("The uploaded MIME type does not match this image.");
    file.status = "processing"; current = file;
    return await conversionQueue.run(async () => {
      await ensureDirectories();
      temp = path.join(config.uploadDir, `${randomUUID()}.upload`);
      await receiveUpload(request, temp, file.size, config.maxUploadMB * 1024 * 1024);
      const result = await convertImage(temp, file.name, file.mime, { ...batch.options, resize: file.resize });
      file.result = { ...result, originalSize: file.size, id: file.id };
      file.status = "completed";
      return Response.json(file.result);
    });
  } catch (error) { if (current) current.status = "failed"; return errorResponse(error); }
  finally { if (temp) await removeFile(temp); }
}
