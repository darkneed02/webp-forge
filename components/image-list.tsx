import { Fragment } from "react";
import type { ResizeSettingsValue, SelectedImage } from "@/lib/types";
import { ResizeControls } from "./resize-controls";
import { formatSize } from "@/lib/format-size";
import { ImageRow } from "./image-row";
import { Button } from "./ui/button";
import { Icon } from "./icon";
export function ImageList({ images, disabled, onRemove, onClear, onDownload, downloading, resizeIndividual, resizeDefaults, resizeErrors, onResizeChange }: { images: SelectedImage[]; disabled: boolean; onRemove: (id: string) => void; onClear: () => void; onDownload: (image: SelectedImage) => void; downloading: string | null; resizeIndividual: boolean; resizeDefaults: ResizeSettingsValue; resizeErrors: Map<string, string>; onResizeChange: (id: string, value: ResizeSettingsValue) => void }) {
  return <section className="image-list" aria-label="Selected images"><div className="list-heading"><h2>{images.length ? `${images.length} ${images.length === 1 ? "image" : "images"} selected` : "Your image queue"}<span>{formatSize(images.reduce((sum, image) => sum + image.file.size, 0))}</span></h2>{images.length > 0 && <Button variant="ghost" size="small" disabled={disabled} onClick={onClear}>Clear all</Button>}</div>
    {images.length ? <div className="table-scroll"><table><thead><tr><th>IMAGE</th><th>SIZE</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{images.map(image => <Fragment key={image.id}><ImageRow image={image} disabled={disabled} onRemove={() => onRemove(image.id)} onDownload={() => onDownload(image)} downloading={downloading === image.id} />{resizeIndividual && <tr className="individual-resize-row"><td colSpan={4}><strong className="individual-resize-title">Resize {image.file.name}</strong><ResizeControls id={`resize-${image.id}`} label={`Resize ${image.file.name}`} value={image.resizeSettings ?? resizeDefaults} onChange={value => onResizeChange(image.id, value)} disabled={disabled} error={resizeErrors.get(image.id)} /></td></tr>}</Fragment>)}</tbody></table></div> : <div className="empty-queue"><Icon name="image" size={22} /><span>A lighter web starts with your first image.</span></div>}
  </section>;
}
