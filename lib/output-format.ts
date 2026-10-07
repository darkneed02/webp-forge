import { AppError } from "./errors";
import type { ImageFormat, OutputExtension, OutputFormat } from "./types";

export const outputMimeTypes: Record<ImageFormat, string> = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };

export function parseOutputFormat(value: unknown): OutputFormat {
  if (value === undefined) return "webp"; // Existing API clients keep their WebP behavior.
  if (value !== "original" && value !== "webp") throw new AppError("Choose Original format or WebP as the output format.");
  return value;
}

export function resolveOutputFormat(name: string, inputFormat: "jpeg" | "png", outputFormat: OutputFormat): { format: ImageFormat; extension: OutputExtension } {
  if (outputFormat === "webp") return { format: "webp", extension: "webp" };
  return { format: inputFormat, extension: inputFormat === "png" ? "png" : name.toLowerCase().endsWith(".jpeg") ? "jpeg" : "jpg" };
}
