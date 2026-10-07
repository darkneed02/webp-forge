import type { SelectedImage, TaskMode } from "@/lib/types";
import { formatSize } from "@/lib/format-size";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Icon } from "./icon";
export function ResultSummary({ images, onDownload, downloading, mode = "convert" }: { images: SelectedImage[]; onDownload: (image?: SelectedImage) => void; downloading: boolean; mode?: TaskMode }) {
  const success = images.filter(image => image.result);
  const singleImage = success.length === 1;
  const singleFormat = singleImage ? success[0].result!.filename.split(".").pop()!.toUpperCase() : "";
  const outputLabel = success.length && success.every(image => image.result!.format === "webp") ? "WebP size" : "Output size";
  const failed = images.filter(image => image.status === "Failed").length;
  const original = success.reduce((total, image) => total + image.file.size, 0);
  const output = success.reduce((total, image) => total + image.result!.outputSize, 0);
  const saved = original - output;
  const percent = original ? Math.abs(saved / original * 100) : 0;
  return <Card className="results-card"><CardHeader><CardTitle>{mode === "resize" ? "Resize complete" : "Conversion complete"}</CardTitle><span className="completion-icon"><Icon name="check" size={15} /></span></CardHeader><CardContent>
    <p className="results-count">{success.length} / {images.length} images {mode === "resize" ? "processed" : "converted"}{failed > 0 && <span> · {failed} failed</span>}</p>
    <div className="savings-highlight"><span>{saved >= 0 ? "STORAGE SAVED" : "STORAGE INCREASE"}</span><strong>{formatSize(Math.abs(saved))}</strong><b>{percent.toFixed(1)}% {saved >= 0 ? "smaller" : "larger"}</b></div>
    <div className="results-sizes"><div><span>Original size</span><strong>{formatSize(original)}</strong></div><Icon name="arrow" /><div><span>{outputLabel}</span><strong>{formatSize(output)}</strong></div></div>
    <Button variant="outline" className="download-results-button" disabled={!success.length || downloading} onClick={() => onDownload(singleImage ? success[0] : undefined)}><Icon name={downloading ? "spinner" : singleImage ? "download" : "zip"} className={downloading ? "spin" : undefined} />{downloading ? "Preparing download…" : singleImage ? `Download ${singleFormat === "WEBP" ? "WebP" : singleFormat}` : "Download All ZIP"}</Button>
    <p className="results-note">{success.length ? "Also saved to your output folder." : "Check the errors in your image queue and try again."}{failed > 0 && success.length > 0 && " Failed images are excluded from downloads and sizes."}</p>
  </CardContent></Card>;
}
