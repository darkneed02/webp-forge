import { MAX_RESIZE_DIMENSION } from "@/lib/resize";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

export type ResizeSettingsValue = { enabled: boolean; width: string; height: string };

export function ResizeSettings({ value, onChange, disabled, error, required = false }: { value: ResizeSettingsValue; onChange: (value: ResizeSettingsValue) => void; disabled: boolean; error?: string; required?: boolean }) {
  return <Card className="resize-card"><CardHeader><CardTitle>Image dimensions</CardTitle></CardHeader><CardContent>
    <fieldset disabled={disabled} aria-label="Image resize settings">
      {!required && <label className="resize-toggle"><input type="checkbox" checked={value.enabled} onChange={event => onChange({ ...value, enabled: event.target.checked })} />Resize images</label>}
      {required || value.enabled ? <>
        <div className="resize-inputs">
          <label htmlFor="resize-width">Max width (px)<input id="resize-width" type="number" min="1" max={MAX_RESIZE_DIMENSION} step="1" placeholder="Auto" value={value.width} aria-invalid={!!error} aria-describedby={error ? "resize-error resize-help" : "resize-help"} onChange={event => onChange({ ...value, width: event.target.value })} /></label>
          <label htmlFor="resize-height">Max height (px)<input id="resize-height" type="number" min="1" max={MAX_RESIZE_DIMENSION} step="1" placeholder="Auto" value={value.height} aria-invalid={!!error} aria-describedby={error ? "resize-error resize-help" : "resize-help"} onChange={event => onChange({ ...value, height: event.target.value })} /></label>
        </div>
        {error && <p id="resize-error" className="resize-error" role="alert">{error}</p>}
        <p id="resize-help" className="settings-note">Enter one or both dimensions. Images fit within these limits, keep their proportions, and are never enlarged or cropped. Applies to the whole batch.</p>
      </> : <p className="settings-note">Keep original dimensions. Enable to make images smaller while converting to WebP.</p>}
    </fieldset>
  </CardContent></Card>;
}
