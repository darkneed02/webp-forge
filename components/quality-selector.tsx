import type { ConversionOptions } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Icon } from "./icon";
export type Preset = "Small" | "Balanced" | "High" | "Lossless" | "Custom";
const presets = [{ name: "Small", value: 60, text: "Smaller files, faster pages" }, { name: "Balanced", value: 80, text: "A little size. A lot of detail." }, { name: "High", value: 90, text: "More detail, larger files" }, { name: "Lossless", value: null, text: "Keep every pixel intact" }, { name: "Custom", value: null, text: "Find your own sweet spot" }] as const;
export function QualitySelector({ preset, options, onChange, disabled }: { preset: Preset; options: ConversionOptions; onChange: (preset: Preset, options: ConversionOptions) => void; disabled: boolean }) {
  return <Card><CardHeader><CardTitle>Conversion settings</CardTitle><Icon name="spark" size={17} /></CardHeader><CardContent>
    <fieldset disabled={disabled}><legend className="field-label">WEBP QUALITY</legend><div className="quality-options">
      {presets.map(item => <label key={item.name} className={`quality-option ${preset === item.name ? "is-selected" : ""}`}>
        <input type="radio" name="quality" value={item.name} checked={preset === item.name} onChange={() => onChange(item.name, { quality: item.value ?? options.quality, lossless: item.name === "Lossless" })} />
        <span><strong>{item.name}{item.name === "Balanced" && <small>RECOMMENDED</small>}</strong><em>{item.text}</em></span>
        <b>{item.value ?? (item.name === "Lossless" ? "∞" : "1–100")}</b>
      </label>)}
    </div>{preset === "Custom" && <div className="custom-quality"><label htmlFor="quality-slider">Quality <strong>{options.quality}</strong></label><input id="quality-slider" type="range" min="1" max="100" value={options.quality} onChange={event => onChange("Custom", { quality: Number(event.target.value), lossless: false })} /><div><span>Smaller size</span><span>More detail</span></div></div>}</fieldset>
    <div className="format-line"><span>Output format</span><span className="format-tag">.webp</span></div>
    <p className="settings-note">Transparency stays transparent. Images are auto-oriented and metadata is removed.</p>
  </CardContent></Card>;
}
