import sharp from "sharp";
import { pipeline } from "node:stream/promises";
import { stat } from "node:fs/promises";
import { config } from "./config";
import { AppError } from "./errors";
import { reserveOutput, removeFile, validateInput } from "./file-utils";
import { ConversionQueue } from "./queue";
import { parseResizeOptions } from "./resize";
import { parseOutputFormat, resolveOutputFormat } from "./output-format";
import type { ConversionOptions } from "./types";

sharp.cache(false);
sharp.concurrency(1);
const shared = globalThis as typeof globalThis & { forgeQueue?: ConversionQueue };
export const conversionQueue = shared.forgeQueue ??= new ConversionQueue(config.concurrency);
export async function convertImage(input: string, name: string, mime: string, options: ConversionOptions) {
  const format = validateInput(name, mime);
  const resize = parseResizeOptions(options.resize);
  const outputFormat = parseOutputFormat(options.outputFormat);
  if (outputFormat === "original" && !resize) throw new AppError("Enter resize dimensions when keeping the original format.");
  const target = resolveOutputFormat(name, format, outputFormat);
  const image = sharp(input, { limitInputPixels: 40_000_000, failOn: "warning" });
  let originalWidth: number; let originalHeight: number;
  try {
    const metadata = await image.metadata();
    if (metadata.format !== format) throw new AppError("The image contents do not match its file type.");
    if ((metadata.pages ?? 1) > 1) throw new AppError("Animated PNG images are not supported in this version.");
    if (!metadata.width || !metadata.height) throw new AppError("Cannot read this image's dimensions.");
    const rotated = (metadata.orientation ?? 1) >= 5 && (metadata.orientation ?? 1) <= 8;
    originalWidth = rotated ? metadata.height : metadata.width;
    originalHeight = rotated ? metadata.width : metadata.height;
  } catch (error) { if (error instanceof AppError) throw error; throw new AppError("This image is corrupted or exceeds the 40-megapixel limit."); }
  const output = await reserveOutput(config.outputDir, name, target.extension);
  try {
    image.rotate();
    if (resize) image.resize({ ...resize, fit: "inside", withoutEnlargement: true });
    let width = originalWidth; let height = originalHeight;
    image.on("info", info => { width = info.width; height = info.height; });
    if (target.format === "webp") image.webp(options.lossless ? { lossless: true } : { quality: options.quality });
    else if (target.format === "jpeg") image.jpeg({ quality: 90 });
    else image.png();
    await pipeline(image, output.handle.createWriteStream());
    const size = (await stat(output.filePath)).size;
    return { filename: output.filename, outputSize: size, originalWidth, originalHeight, width, height, format: target.format };
  } catch (error) {
    await output.handle.close().catch(() => {});
    await removeFile(output.filePath);
    if (["EACCES", "EPERM", "ENOSPC"].includes((error as NodeJS.ErrnoException).code ?? "")) throw error;
    throw new AppError("This image could not be converted. It may be damaged or unsupported.");
  }
}
