export function ConversionProgress({ completed, total, busy }: { completed: number; total: number; busy: boolean }) {
  const percent = total ? Math.round(completed / total * 100) : 0;
  return <div className="conversion-progress" aria-live="polite"><div><strong>{busy ? `Converting ${completed} / ${total}` : "Conversion complete"}</strong><span>{percent}%</span></div><progress aria-label="Conversion progress" value={completed} max={total || 1} /></div>;
}
