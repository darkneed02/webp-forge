import type { SelectedImage } from "@/lib/types";
import { formatSize } from "@/lib/format-size";
import { ImageRow } from "./image-row";
import { Button } from "./ui/button";
import { Icon } from "./icon";
export function ImageList({ images, disabled, onRemove, onClear, onDownload, downloading }: { images: SelectedImage[]; disabled: boolean; onRemove: (id: string) => void; onClear: () => void; onDownload: (image: SelectedImage) => void; downloading: string | null }) {
  return <section className="image-list" aria-label="Selected images"><div className="list-heading"><h2>{images.length ? `${images.length} ${images.length === 1 ? "image" : "images"} selected` : "Your image queue"}<span>{formatSize(images.reduce((sum, image) => sum + image.file.size, 0))}</span></h2>{images.length > 0 && <Button variant="ghost" size="small" disabled={disabled} onClick={onClear}>Clear all</Button>}</div>
    {images.length ? <div className="table-scroll"><table><thead><tr><th>IMAGE</th><th>SIZE</th><th>STATUS</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{images.map(image => <ImageRow key={image.id} image={image} disabled={disabled} onRemove={() => onRemove(image.id)} onDownload={() => onDownload(image)} downloading={downloading === image.id} />)}</tbody></table></div> : <div className="empty-queue"><Icon name="image" size={22} /><span>A lighter web starts with your first image.</span></div>}
  </section>;
}
