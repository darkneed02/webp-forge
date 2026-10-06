import { AppError } from "./errors";
import type { ResizeOptions } from "./types";

export const MAX_RESIZE_DIMENSION = 16_383;

// Used by the manifest API and conversion service; omitted options keep original size.
export function parseResizeOptions(value: unknown): ResizeOptions | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new AppError("Invalid resize settings.");
  const { width, height } = value as Record<string, unknown>;
  if (width === undefined && height === undefined) throw new AppError("Enter a width or height to resize images.");
  for (const dimension of [width, height]) {
    if (dimension !== undefined && (typeof dimension !== "number" || !Number.isInteger(dimension) || dimension < 1 || dimension > MAX_RESIZE_DIMENSION)) {
      throw new AppError(`Resize dimensions must be whole numbers between 1 and ${MAX_RESIZE_DIMENSION} pixels.`);
    }
  }
  return { width: width as number | undefined, height: height as number | undefined };
}
