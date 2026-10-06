import type { TaskMode } from "@/lib/types";
export function ConversionProgress({ completed, total, busy, mode = "convert" }: { completed: number; total: number; busy: boolean; mode?: TaskMode }) {
  const percent = total ? Math.round(completed / total * 100) : 0;
  return <div className="conversion-progress" aria-live="polite"><div><strong>{busy ? `${mode === "resize" ? "Processing" : "Converting"} ${completed} / ${total}` : mode === "resize" ? "Resize complete" : "Conversion complete"}</strong><span>{percent}%</span></div><progress aria-label="Processing progress" value={completed} max={total || 1} /></div>;
}
