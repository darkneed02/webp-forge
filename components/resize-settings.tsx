import type { ResizeScope, ResizeSettingsValue } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ResizeControls } from "./resize-controls";

export type { ResizeSettingsValue } from "@/lib/types";

export function ResizeSettings({ value, onChange, disabled, error, required = false, scope, onScopeChange }: { value: ResizeSettingsValue; onChange: (value: ResizeSettingsValue) => void; disabled: boolean; error?: string; required?: boolean; scope: ResizeScope; onScopeChange: (scope: ResizeScope) => void }) {
  return <Card className="resize-card"><CardHeader><CardTitle>Image dimensions</CardTitle></CardHeader><CardContent>
    <fieldset disabled={disabled} aria-label="Image resize settings">
      {!required && <label className="resize-toggle"><input type="checkbox" checked={value.enabled} onChange={event => onChange({ ...value, enabled: event.target.checked })} />Resize images</label>}
      {required || value.enabled ? <>
        <div className="resize-scope">
          <label><input type="radio" name="resize-scope" checked={scope === "batch"} onChange={() => onScopeChange("batch")} />All images — same settings</label>
          <label><input type="radio" name="resize-scope" checked={scope === "individual"} onChange={() => onScopeChange("individual")} />Each image — different settings</label>
        </div>
        {scope === "batch" ? <ResizeControls value={value} onChange={onChange} disabled={disabled} error={error} /> : <p className="settings-note">Set pixels or a percentage under each image in your queue. Individual settings are kept when you switch back to all images.</p>}
      </> : <p className="settings-note">Keep original dimensions. Enable to make images smaller while converting to WebP.</p>}
    </fieldset>
  </CardContent></Card>;
}
