"use client";
import { useRef, useState } from "react";
import { Button } from "./ui/button";
import { Icon } from "./icon";

export function DropZone({ onFiles, disabled, maxFiles, maxUploadMB }: { onFiles: (files: File[]) => void; disabled: boolean; maxFiles: number; maxUploadMB: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  return <div className={`drop-zone ${dragging ? "is-dragging" : ""} ${disabled ? "is-disabled" : ""}`}
    onDragOver={event => { event.preventDefault(); if (!disabled) setDragging(true); }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
    onDrop={event => { event.preventDefault(); setDragging(false); if (!disabled) onFiles(Array.from(event.dataTransfer.files)); }}>
    <input ref={input} type="file" accept=".jpg,.jpeg,.png,image/jpeg,image/png" multiple disabled={disabled} className="sr-only" aria-label="Select images to convert" onChange={event => { onFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} />
    <div className="upload-symbol"><Icon name="upload" size={28} /></div>
    <h2>{dragging ? "Drop them. We'll take it from here." : "Drop your images here"}</h2>
    <p>Give your images a lighter side.</p>
    <Button variant="outline" disabled={disabled} onClick={() => input.current?.click()}><Icon name="image" />Select Images</Button>
    <div className="upload-limits"><span>JPG</span><span>JPEG</span><span>PNG</span><i />Up to {maxFiles} files · {maxUploadMB} MB each</div>
  </div>;
}
