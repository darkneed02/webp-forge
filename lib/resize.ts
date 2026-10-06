import { AppError } from "./errors";
import type { ResizeOptions, ResizeSettingsValue } from "./types";

export const MAX_RESIZE_DIMENSION = 16_383;
export const PERCENT_PRESETS = [20, 30, 40, 50, 60, 70, 80] as const;

// Used by the manifest API and conversion service; omitted options keep original size.
export function parseResizeOptions(value: unknown): ResizeOptions | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AppError("Invalid resize settings.");
  const { width, height, percent } = value as Record<string, unknown>;
  if (percent !== undefined) {
    if (width !== undefined || height !== undefined) throw new AppError("Choose either pixel dimensions or a percentage for resize.");
    if (typeof percent !== "number" || !Number.isInteger(percent) || percent < 1 || percent > 100) throw new AppError("Resize percentage must be a whole number between 1 and 100.");
    return { percent };
  }
  if (width === undefined && height === undefined) throw new AppError("Enter a width or height to resize images.");
  for (const dimension of [width, height]) {
    if (dimension !== undefined && (typeof dimension !== "number" || !Number.isInteger(dimension) || dimension < 1 || dimension > MAX_RESIZE_DIMENSION)) {
      throw new AppError(`Resize dimensions must be whole numbers between 1 and ${MAX_RESIZE_DIMENSION} pixels.`);
    }
  }
  return { width: width as number | undefined, height: height as number | undefined };
}

export function resizeFromSettings(value: ResizeSettingsValue): ResizeOptions {
  return parseResizeOptions(value.method === "percent" ? { percent: value.percent.trim() ? Number(value.percent) : NaN } : { width: value.width.trim() ? Number(value.width) : undefined, height: value.height.trim() ? Number(value.height) : undefined })!;
}

export function resizeDimensions(value: ResizeOptions, width: number, height: number) {
  if (value.percent !== undefined) return { width: Math.max(1, Math.round(width * value.percent / 100)), height: Math.max(1, Math.round(height * value.percent / 100)) };
  return { width: value.width, height: value.height };
}
