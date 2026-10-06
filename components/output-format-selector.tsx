import type { OutputFormat } from "@/lib/types";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";

export function OutputFormatSelector({ value, onChange, disabled }: { value: OutputFormat; onChange: (value: OutputFormat) => void; disabled: boolean }) {
  return <Card className="output-format-card"><CardHeader><CardTitle>Save resized images as</CardTitle></CardHeader><CardContent>
    <fieldset disabled={disabled}><legend className="field-label">OUTPUT FORMAT</legend>
      <div className="quality-options">
        <label className={`quality-option ${value === "original" ? "is-selected" : ""}`}><input type="radio" name="output-format" value="original" checked={value === "original"} onChange={() => onChange("original")} /><span><strong>Original format <small>DEFAULT</small></strong><em>JPG stays JPG. JPEG stays JPEG. PNG stays PNG.</em></span></label>
        <label className={`quality-option ${value === "webp" ? "is-selected" : ""}`}><input type="radio" name="output-format" value="webp" checked={value === "webp"} onChange={() => onChange("webp")} /><span><strong>WebP</strong><em>Resize and convert to WebP in one step.</em></span></label>
      </div>
    </fieldset>
    {value === "original" && <p className="settings-note">PNG transparency is preserved. JPEG images are re-encoded at quality 90. Originals are never changed.</p>}
  </CardContent></Card>;
}
