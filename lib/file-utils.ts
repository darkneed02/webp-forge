import path from "node:path";
import { open, unlink } from "node:fs/promises";
import { constants } from "node:fs";
import { AppError } from "./errors";

export function validateInput(name: string, mime: string) {
  const extension = path.extname(name).toLowerCase();
  if (!/^\.(jpe?g|png)$/.test(extension)) throw new AppError("Only JPG, JPEG, and PNG images are supported.");
  const expected = extension === ".png" ? "image/png" : "image/jpeg";
  if (mime !== expected) throw new AppError("The image type does not match its file extension.");
  return expected === "image/png" ? "png" : "jpeg";
}
export function safeBaseName(name: string) {
  const leaf = path.basename(name.replaceAll("\\", "/"));
  const stem = leaf.slice(0, leaf.length - path.extname(leaf).length);
  const safe = stem.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "image";
  return /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(safe) ? `image-${safe}` : safe;
}
/** O_EXCL reserves names atomically, including across simultaneous batches. */
export async function reserveOutput(directory: string, originalName: string) {
  const base = safeBaseName(originalName);
  for (let i = 0; i < 10000; i++) {
    const filename = `${base}${i ? `-${i}` : ""}.webp`;
    const filePath = path.join(directory, filename);
    try { return { filename, filePath, handle: await open(filePath, "wx", 0o644) }; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }
  throw new AppError("Too many files share this name. Rename the image and try again.", 409);
}
export async function openOutput(directory: string, filename: string) {
  if (path.basename(filename) !== filename || !/^[a-zA-Z0-9_-]+\.webp$/.test(filename)) throw new AppError("Invalid download filename.");
  try {
    const handle = await open(path.join(directory, filename), constants.O_RDONLY | constants.O_NOFOLLOW);
    if (!(await handle.stat()).isFile()) { await handle.close(); throw new Error("Not a file"); }
    return handle;
  } catch { throw new AppError("This output file is no longer available.", 404); }
}
export async function removeFile(filePath: string) {
  try { await unlink(filePath); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Could not clean temporary file", error); }
}
