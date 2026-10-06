import { randomUUID } from "node:crypto";
import { config } from "./config";
import { AppError } from "./errors";
import { validateInput } from "./file-utils";
import type { ConversionOptions, ConversionResult } from "./types";

type BatchFile = { id: string; name: string; size: number; mime: string; status: "waiting" | "processing" | "completed" | "failed"; result?: ConversionResult };
type Batch = { id: string; created: number; options: ConversionOptions; files: BatchFile[] };
// Route bundles and development reloads must share the same process-local registry.
const shared = globalThis as typeof globalThis & { forgeBatches?: Map<string, Batch> };
const batches = shared.forgeBatches ??= new Map<string, Batch>();
const TTL = 24 * 60 * 60 * 1000;
function cleanup() {
  for (const [id, batch] of batches) if (Date.now() - batch.created > TTL && !batch.files.some(f => f.status === "processing")) batches.delete(id);
}
export function createBatch(body: unknown) {
  cleanup();
  if (!body || typeof body !== "object") throw new AppError("Invalid batch.");
  const { files, quality, lossless } = body as Record<string, unknown>;
  if (!Array.isArray(files) || files.length < 1 || files.length > config.maxFiles) throw new AppError(`Select between 1 and ${config.maxFiles} images.`);
  if (typeof quality !== "number" || !Number.isInteger(quality) || quality < 1 || quality > 100 || typeof lossless !== "boolean") throw new AppError("Quality must be between 1 and 100.");
  const items: BatchFile[] = files.map(file => {
    if (!file || typeof file !== "object") throw new AppError("Invalid image details.");
    const { name, size, mime } = file;
    if (typeof name !== "string" || name.length > 255 || typeof mime !== "string" || !Number.isSafeInteger(size) || size <= 0 || size > config.maxUploadMB * 1024 * 1024) throw new AppError(`Each image must be non-empty and no larger than ${config.maxUploadMB} MB.`);
    validateInput(name, mime);
    return { id: randomUUID(), name, size, mime, status: "waiting" };
  });
  if (batches.size >= 100) throw new AppError("Too many recent batches. Restart the app to clear old sessions or try again later.", 429);
  const batch: Batch = { id: randomUUID(), created: Date.now(), options: { quality, lossless }, files: items };
  batches.set(batch.id, batch);
  return batch;
}
export function getBatch(id: string | null) {
  cleanup();
  const batch = id ? batches.get(id) : undefined;
  if (!batch) throw new AppError("This batch has expired. Convert the images again to create new download links.", 404);
  return batch;
}
export function getBatchFile(batchId: string | null, fileId: string | null) {
  const batch = getBatch(batchId);
  const file = batch.files.find(file => file.id === fileId);
  if (!file) throw new AppError("Image not found in this batch.", 404);
  return { batch, file };
}
