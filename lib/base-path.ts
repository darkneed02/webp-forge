// The base path is fixed at build time: Next.js bakes it into routes and client bundles.
export function normalizeBasePath(value: string | undefined) {
  const trimmed = (value ?? "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  if (!/^(\/[A-Za-z0-9._~-]+)+$/.test(trimmed)) throw new Error("BASE_PATH must look like /webp-forge (letters, digits, . _ ~ - segments).");
  return trimmed;
}
export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export function withBasePath(path: string) { return `${basePath}${path}`; }
