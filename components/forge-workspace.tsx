"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ConversionOptions, ConversionResult, OutputFormat, PublicConfig, ResizeOptions, ResizeScope, SelectedImage, TaskMode } from "@/lib/types";
import { resizeFromSettings } from "@/lib/resize";
import { DropZone } from "./drop-zone";
import { ImageList } from "./image-list";
import { QualitySelector, type Preset } from "./quality-selector";
import { ResizeSettings, type ResizeSettingsValue } from "./resize-settings";
import { OutputFormatSelector } from "./output-format-selector";
import { ConversionProgress } from "./conversion-progress";
import { ResultSummary } from "./result-summary";
import { Button } from "./ui/button";
import { Icon } from "./icon";

async function responseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "The request failed. Try again.");
  return body as T;
}
export function ForgeWorkspace({ config, mode }: { config: PublicConfig; mode: TaskMode }) {
  const router = useRouter();
  const resizeMode = mode === "resize";
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [options, setOptions] = useState<ConversionOptions>({ quality: config.quality, lossless: false });
  const [preset, setPreset] = useState<Preset>(config.quality === 80 ? "Balanced" : "Custom");
  const [resize, setResize] = useState<ResizeSettingsValue>({ enabled: resizeMode, method: "pixels", width: "1920", height: "", percent: "50" });
  const [resizeScope, setResizeScope] = useState<ResizeScope>("batch");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>(resizeMode ? "original" : "webp");
  let resizeOptions: ResizeOptions | undefined; let resizeError: string | undefined;
  const resizeActive = resizeMode || resize.enabled;
  const imageResizeOptions = new Map<string, ResizeOptions>();
  const imageResizeErrors = new Map<string, string>();
  if (resizeActive) {
    if (resizeScope === "batch") {
      try { resizeOptions = resizeFromSettings(resize); }
      catch (error) { resizeError = error instanceof Error ? error.message : "Invalid resize settings."; }
    } else {
      for (const image of images) {
        try { imageResizeOptions.set(image.id, resizeFromSettings(image.resizeSettings ?? resize)); }
        catch (error) { const message = error instanceof Error ? error.message : "Invalid resize settings."; imageResizeErrors.set(image.id, message); resizeError ??= `${image.file.name}: ${message}`; }
      }
    }
  }
  const [busy, setBusy] = useState(false);
  const [batchId, setBatchId] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<string | null>(null);
  const previews = useRef(new Set<string>());
  const controllers = useRef(new Set<AbortController>());
  const runLock = useRef(false);
  useEffect(() => {
    const urls = previews.current; const requests = controllers.current;
    return () => { urls.forEach(url => URL.revokeObjectURL(url)); requests.forEach(controller => controller.abort()); };
  }, []);
  function resetResults() { setFinished(false); setBatchId(null); }
  function addFiles(files: File[]) {
    if (runLock.current || !files.length) return;
    const accepted: SelectedImage[] = []; const errors: string[] = [];
    for (const file of files) {
      const extension = file.name.split(".").pop()?.toLowerCase();
      const mime = extension === "png" ? "image/png" : "image/jpeg";
      if (!["jpg", "jpeg", "png"].includes(extension ?? "") || (file.type && file.type !== mime)) { errors.push(`${file.name}: only JPG, JPEG, and PNG are supported.`); continue; }
      if (!file.size || file.size > config.maxUploadMB * 1024 * 1024) { errors.push(`${file.name}: must be non-empty and at most ${config.maxUploadMB} MB.`); continue; }
      if (images.length + accepted.length >= config.maxFiles) { errors.push(`A batch can contain up to ${config.maxFiles} images.`); break; }
      const preview = URL.createObjectURL(file); previews.current.add(preview);
      accepted.push({ id: crypto.randomUUID(), file, preview, status: "Ready", resizeSettings: resizeScope === "individual" ? { ...resize } : undefined });
    }
    setError(errors.length ? errors.slice(0, 3).join(" ") : null);
    if (accepted.length) { resetResults(); setImages(previous => [...previous.map(image => ({ ...image, status: "Ready" as const, error: undefined, result: undefined })), ...accepted]); }
  }
  function remove(id?: string) {
    if (runLock.current) return;
    images.filter(image => !id || image.id === id).forEach(image => { URL.revokeObjectURL(image.preview); previews.current.delete(image.preview); });
    resetResults();
    setImages(previous => previous.filter(image => id && image.id !== id).map(image => ({ ...image, status: "Ready", error: undefined, result: undefined })));
    setError(null);
  }
  function update(id: string, patch: Partial<SelectedImage>) { setImages(previous => previous.map(image => image.id === id ? { ...image, ...patch } : image)); }
  function changeResizeScope(scope: ResizeScope) {
    if (runLock.current) return;
    if (scope === "individual") setImages(previous => previous.map(image => ({ ...image, resizeSettings: image.resizeSettings ?? { ...resize } })));
    setResizeScope(scope);
  }
  async function convert() {
    if (runLock.current || !images.length) return;
    if (resizeError) { setError(resizeError); return; }
    runLock.current = true; setBusy(true); setError(null); setFinished(false); setBatchId(null);
    setImages(previous => previous.map(image => ({ ...image, status: "Waiting", result: undefined, error: undefined })));
    const controller = new AbortController(); controllers.current.add(controller);
    try {
      const batch = await responseJson<{ batchId: string; fileIds: string[] }>(await fetch("/api/batches", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ ...options, outputFormat, resize: resizeOptions, files: images.map(image => ({ name: image.file.name, size: image.file.size, mime: image.file.type || (image.file.name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg"), resize: resizeActive && resizeScope === "individual" ? imageResizeOptions.get(image.id) : undefined })) })
      }));
      setBatchId(batch.batchId);
      let next = 0;
      // Only a bounded number of uploads can be in flight. The server also has a global queue.
      const worker = async () => {
        while (next < images.length && !controller.signal.aborted) {
          const index = next++; const image = images[index]; update(image.id, { status: "Processing" });
          try {
            const result = await responseJson<ConversionResult>(await fetch(`/api/convert?batch=${batch.batchId}&id=${batch.fileIds[index]}`, {
              method: "POST", headers: { "Content-Type": image.file.type || (image.file.name.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg") }, body: image.file, signal: controller.signal
            }));
            update(image.id, { status: "Completed", result });
          } catch (error) { update(image.id, { status: "Failed", error: error instanceof Error ? error.message : "Conversion failed. Try again." }); }
        }
      };
      await Promise.all(Array.from({ length: Math.min(config.concurrency, images.length) }, worker));
      setFinished(true);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not start the batch.");
      setImages(previous => previous.map(image => ({ ...image, status: "Ready" })));
    } finally { setBusy(false); runLock.current = false; controllers.current.delete(controller); }
  }
  async function download(image?: SelectedImage) {
    if (!batchId || downloading) return;
    setDownloading(image?.id ?? "zip"); setError(null);
    try {
      const response = await fetch(image ? `/api/download?batch=${batchId}&id=${image.result!.id}` : `/api/zip?batch=${batchId}`);
      if (!response.ok) { const body = await response.json(); throw new Error(body.error || "Download failed."); }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a"); link.href = url; link.download = image?.result?.filename ?? "webp-forge.zip";
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) { setError(error instanceof Error ? error.message : "Download failed. Try again."); }
    finally { setDownloading(null); }
  }
  const completed = images.filter(image => image.status === "Completed" || image.status === "Failed").length;
  const actionLabel = resizeMode ? outputFormat === "webp" ? "Resize & convert to WebP" : "Resize images" : "Convert to WebP";
  return <>
    <div className="workspace-navigation"><Button variant="outline" disabled={busy || downloading !== null} onClick={() => router.push("/")}>← Choose another tool</Button><span>{resizeMode ? "RESIZE" : "WEBP CONVERSION"}</span></div>
    {error && <div className="error-banner" role="alert"><span>{error}</span><Button variant="ghost" size="icon" aria-label="Dismiss error" onClick={() => setError(null)}><Icon name="close" size={16} /></Button></div>}
    <div className="workspace-grid"><div className="main-column">
      <DropZone onFiles={addFiles} disabled={busy} maxFiles={config.maxFiles} maxUploadMB={config.maxUploadMB} />
      <ImageList images={images} disabled={busy || downloading !== null} onRemove={remove} onClear={() => remove()} onDownload={image => void download(image)} downloading={downloading} resizeIndividual={resizeActive && resizeScope === "individual"} resizeDefaults={resize} resizeErrors={imageResizeErrors} onResizeChange={(id, value) => { if (!runLock.current) update(id, { resizeSettings: value }); }} />
      {(busy || finished) && <ConversionProgress completed={completed} total={images.length} busy={busy} mode={mode} />}
      <div className="privacy-note"><Icon name="shield" size={15} /><span>Processed locally. Your images stay on your machine.</span></div>
    </div><aside className="settings-column">
      {resizeMode && <OutputFormatSelector value={outputFormat} onChange={setOutputFormat} disabled={busy} />}
      {outputFormat === "webp" && <QualitySelector preset={preset} options={options} onChange={(next, value) => { setPreset(next); setOptions(value); }} disabled={busy} />}
      <ResizeSettings value={resize} onChange={setResize} disabled={busy} error={resizeScope === "batch" ? resizeError : undefined} required={resizeMode} scope={resizeScope} onScopeChange={changeResizeScope} />
      <Button className="convert-button" disabled={busy || !images.length || !!resizeError || downloading !== null} onClick={() => void convert()}><Icon name={busy ? "spinner" : "forge"} className={busy ? "spin" : undefined} />{busy ? resizeMode ? "Processing…" : "Converting…" : actionLabel}{!busy && images.length > 0 && <span>{images.length}</span>}{!busy && <Icon name="arrow" size={16} />}</Button>
      {finished && <ResultSummary images={images} onDownload={image => void download(image)} downloading={downloading !== null} mode={mode} />}
      <div className="output-note"><div><Icon name="folder" size={18} /><strong>Saved, automatically.</strong></div><p>Every converted image goes straight to your configured output folder.</p><span>Original files are never changed.</span></div>
    </aside></div>
  </>;
}
