import path from "node:path";
import { mkdir, access, readdir, unlink } from "node:fs/promises";
import { constants } from "node:fs";

function integer(name: string, fallback: number, min: number, max: number) {
  const raw = process.env[name];
  const value = raw === undefined ? fallback : Number(raw);
  if (!raw && raw !== undefined || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}.`);
  }
  return value;
}
function directory(name: string, fallback: string) {
  const value = process.env[name] ?? fallback;
  if (!value.trim() || value.includes("\0")) throw new Error(`${name} must be a valid directory.`);
  return path.resolve(value);
}
export const config = {
  outputDir: directory("OUTPUT_DIR", "data/output"),
  uploadDir: directory("UPLOAD_DIR", "data/uploads"),
  quality: integer("WEBP_QUALITY", 80, 1, 100),
  maxUploadMB: integer("MAX_UPLOAD_MB", 30, 1, 500),
  maxFiles: integer("MAX_FILES", 100, 1, 1000),
  concurrency: integer("CONVERSION_CONCURRENCY", 4, 1, 32),
};
if (config.outputDir === config.uploadDir) throw new Error("OUTPUT_DIR and UPLOAD_DIR must be different.");
export async function ensureDirectories() {
  for (const directory of [config.outputDir, config.uploadDir]) {
    await mkdir(directory, { recursive: true });
    await access(directory, constants.R_OK | constants.W_OK | constants.X_OK);
  }
}
export async function initializeStorage() {
  await ensureDirectories();
  // Only remove this application's abandoned temporary uploads, once at startup.
  for (const name of await readdir(config.uploadDir)) {
    if (/^[0-9a-f-]{36}\.upload$/.test(name)) await unlink(path.join(config.uploadDir, name));
  }
}
export const publicConfig = { quality: config.quality, maxUploadMB: config.maxUploadMB, maxFiles: config.maxFiles, concurrency: config.concurrency };
