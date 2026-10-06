import { open } from "node:fs/promises";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import type { ReadableStream as NodeReadableStream } from "node:stream/web";
import { AppError } from "./errors";

export async function receiveUpload(request: Request, destination: string, expectedSize: number, maxSize: number) {
  if (!request.body) throw new AppError("No image was uploaded.");
  const length = request.headers.get("content-length");
  if (length !== null && Number(length) !== expectedSize) throw new AppError("Upload size does not match the selected image.");
  let received = 0;
  const limit = new Transform({ transform(chunk: Buffer, _encoding, callback) {
    received += chunk.length;
    callback(received > maxSize || received > expectedSize ? new AppError("The uploaded image is too large.", 413) : null, chunk);
  } });
  const handle = await open(destination, "wx", 0o600);
  try {
    await pipeline(Readable.fromWeb(request.body as NodeReadableStream<Uint8Array>), limit, handle.createWriteStream(), { signal: request.signal });
    if (received !== expectedSize) throw new AppError("The upload was incomplete. Try again.");
  } finally { await handle.close(); }
}
