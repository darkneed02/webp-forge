/* eslint-disable @next/next/no-img-element -- Local blob previews need native images. */
import type { SelectedImage } from "@/lib/types";
import { formatSize } from "@/lib/format-size";
import { Icon } from "./icon";
import { Button } from "./ui/button";
export function ImageRow({ image, disabled, onRemove, onDownload, downloading }: { image: SelectedImage; disabled: boolean; onRemove: () => void; onDownload: () => void; downloading: boolean }) {
  const reduction = image.result ? (1 - image.result.outputSize / image.file.size) * 100 : null;
  return <tr><td><div className="file-cell"><div className="thumbnail"><img src={image.preview} alt="" onError={event => { event.currentTarget.style.visibility = "hidden"; }} /></div><div className="file-details"><strong title={image.file.name}>{image.file.name}</strong><span>{image.file.name.split(".").pop()?.toUpperCase()}</span>{image.error && <p className="file-error">{image.error}</p>}</div></div></td>
    <td className="size-cell"><span>{formatSize(image.file.size)}</span>{image.result && <><small>{formatSize(image.result.outputSize)} {image.result.format === "webp" ? "WebP" : image.result.filename.split(".").pop()?.toUpperCase()} <b className={reduction! >= 0 ? "saving" : "growth"}>{reduction! >= 0 ? "−" : "+"}{Math.abs(reduction!).toFixed(0)}%</b></small><small className="image-dimensions">{image.result.originalWidth} × {image.result.originalHeight} → {image.result.width} × {image.result.height} px</small></>}</td>
    <td><span className={`status status-${image.status.toLowerCase()}`}>{image.status === "Completed" ? <Icon name="check" size={12} /> : image.status === "Processing" ? <Icon name="spinner" size={12} className="spin" /> : <i />}{image.status}</span></td>
    <td className="actions-cell">{image.result && <Button variant="ghost" size="icon" disabled={downloading} onClick={onDownload} aria-label={`Download ${image.result.filename}`} title="Download"><Icon name={downloading ? "spinner" : "download"} className={downloading ? "spin" : undefined} /></Button>}<Button variant="ghost" size="icon" disabled={disabled} onClick={onRemove} aria-label={`Remove ${image.file.name}`} title="Remove image"><Icon name="close" size={15} /></Button></td>
  </tr>;
}
