import { MAX_RESIZE_DIMENSION, PERCENT_PRESETS } from "@/lib/resize";
import type { ResizeSettingsValue } from "@/lib/types";
import { Button } from "./ui/button";

export function ResizeControls({ value, onChange, disabled, error, id = "resize", label = "Resize dimensions" }: { value: ResizeSettingsValue; onChange: (value: ResizeSettingsValue) => void; disabled: boolean; error?: string; id?: string; label?: string }) {
  const helpId = `${id}-help`; const errorId = `${id}-error`;
  return <fieldset disabled={disabled} aria-label={label} className="resize-controls">
    <div className="resize-methods">
      <label><input type="radio" name={`${id}-method`} checked={value.method === "pixels"} onChange={() => onChange({ ...value, method: "pixels" })} />Pixels</label>
      <label><input type="radio" name={`${id}-method`} checked={value.method === "percent"} onChange={() => onChange({ ...value, method: "percent" })} />Percentage</label>
    </div>
    {value.method === "pixels" ? <div className="resize-inputs">
      <label htmlFor={`${id}-width`}>Max width (px)<input id={`${id}-width`} type="number" min="1" max={MAX_RESIZE_DIMENSION} step="1" placeholder="Auto" value={value.width} aria-invalid={!!error} aria-describedby={error ? `${errorId} ${helpId}` : helpId} onChange={event => onChange({ ...value, width: event.target.value })} /></label>
      <label htmlFor={`${id}-height`}>Max height (px)<input id={`${id}-height`} type="number" min="1" max={MAX_RESIZE_DIMENSION} step="1" placeholder="Auto" value={value.height} aria-invalid={!!error} aria-describedby={error ? `${errorId} ${helpId}` : helpId} onChange={event => onChange({ ...value, height: event.target.value })} /></label>
    </div> : <>
      <div className="resize-inputs"><label htmlFor={`${id}-percent`}>Size (% of original)<input id={`${id}-percent`} type="number" min="1" max="100" step="1" value={value.percent} aria-invalid={!!error} aria-describedby={error ? `${errorId} ${helpId}` : helpId} onChange={event => onChange({ ...value, percent: event.target.value })} /></label></div>
      <div className="percent-presets" aria-label="Percentage presets">{PERCENT_PRESETS.map(percent => <Button key={percent} variant="outline" size="small" aria-pressed={Number(value.percent) === percent} onClick={() => onChange({ ...value, percent: String(percent) })}>{percent}%</Button>)}</div>
    </>}
    {error && <p id={errorId} className="resize-error" role="alert">{error}</p>}
    <p id={helpId} className="settings-note">{value.method === "pixels" ? "Enter one or both dimensions. Images fit within these limits without cropping or enlargement." : "50% means half the original width and height, not a target file size. Dimensions are rounded to pixels, with a minimum of 1 px."}</p>
  </fieldset>;
}
