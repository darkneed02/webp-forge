import test from "node:test";
import assert from "node:assert/strict";
import { createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Home from "../app/page";
import { ResultSummary } from "../components/result-summary";
import type { ImageFormat, SelectedImage } from "../lib/types";

function findDownload(node: ReactNode): { onClick: () => void; disabled: boolean } | undefined {
  if (Array.isArray(node)) return node.map(findDownload).find(Boolean);
  if (!isValidElement<{ children?: ReactNode; className?: string; onClick: () => void; disabled: boolean }>(node)) return undefined;
  if (node.props.className === "download-results-button") return node.props;
  return findDownload(node.props.children);
}
function completed(extension: string, format: ImageFormat): SelectedImage {
  return { id: extension, file: new File(["original image"], `photo.${extension}`), preview: "", status: "Completed", result: { id: extension, filename: `photo.${extension}`, format, originalSize: 14, outputSize: 10, originalWidth: 100, originalHeight: 60, width: 50, height: 30 } };
}

test("home offers separate resize and WebP tool routes", () => {
  const html = renderToStaticMarkup(createElement(Home));
  assert.match(html, /href="\/resize"/); assert.match(html, /href="\/convert"/);
  assert.match(html, /What would you like to do/);
});

test("single successful outputs download directly with their actual format, even with failed images", () => {
  for (const [extension, format, label] of [["jpg", "jpeg", "JPG"], ["jpeg", "jpeg", "JPEG"], ["png", "png", "PNG"], ["webp", "webp", "WebP"]] as const) {
    const image = completed(extension, format);
    const failed: SelectedImage = { id: "failed", file: new File(["broken"], "broken.png"), preview: "", status: "Failed" };
    let requested: SelectedImage | undefined;
    const tree = ResultSummary({ images: [image, failed], mode: "resize", downloading: false, onDownload: value => { requested = value; } });
    const html = renderToStaticMarkup(tree);
    assert.match(html, new RegExp(`Download ${label}`)); assert.doesNotMatch(html, /Download All ZIP/);
    assert.match(html, /Resize complete/); assert.match(html, /1 \/ 2 images processed/);
    assert.match(html, format === "webp" ? /WebP size/ : /Output size/);
    const control = findDownload(tree); assert.ok(control); assert.equal(control.disabled, false);
    control.onClick(); assert.equal(requested, image);
  }
});

test("mixed-format multiple outputs use ZIP and no-success batches disable downloads", () => {
  for (const images of [[completed("jpg", "jpeg"), completed("png", "png")], []]) {
    let invoked = false; let requested: SelectedImage | undefined;
    const tree = ResultSummary({ images, downloading: false, onDownload: value => { invoked = true; requested = value; } });
    const control = findDownload(tree); assert.ok(control);
    assert.equal(control.disabled, images.length === 0);
    if (images.length) { assert.match(renderToStaticMarkup(tree), /Download All ZIP/); control.onClick(); assert.equal(invoked, true); assert.equal(requested, undefined); }
  }
});
