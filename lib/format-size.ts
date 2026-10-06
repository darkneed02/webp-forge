export function formatSize(bytes: number) {
  const absolute = Math.abs(bytes);
  const unit = absolute >= 1024 ** 3 ? 3 : absolute >= 1024 ** 2 ? 2 : absolute >= 1024 ? 1 : 0;
  return `${(bytes / 1024 ** unit).toLocaleString(undefined, { maximumFractionDigits: unit ? 1 : 0 })} ${["B", "KB", "MB", "GB"][unit]}`;
}
