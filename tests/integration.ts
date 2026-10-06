import assert from "node:assert/strict";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { readFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { unzipSync } from "fflate";
import type { ConversionResult, OutputFormat, ResizeOptions } from "../lib/types";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const output = path.resolve(process.env.TEST_OUTPUT_DIR ?? "data/output");
const uploads = path.resolve(process.env.TEST_UPLOAD_DIR ?? "data/uploads");
const prefix = `forge-test-${randomUUID().slice(0, 8)}`;
const saved: string[] = [];
// Exercise the exact route handlers without sockets when a sandbox blocks listening.
// The default transport remains HTTP for real Next.js and Docker acceptance testing.
const routes = process.env.TEST_IN_PROCESS === "1" ? {
  "/api/health": (await import("../app/api/health/route")).GET,
  "/api/batches": (await import("../app/api/batches/route")).POST,
  "/api/convert": (await import("../app/api/convert/route")).POST,
  "/api/download": (await import("../app/api/download/route")).GET,
  "/api/zip": (await import("../app/api/zip/route")).GET,
} : null;
async function request(url: string, init?: RequestInit) {
  if (!routes) return fetch(url, init);
  const target = new URL(url);
  const route = routes[target.pathname as keyof typeof routes];
  assert.ok(route, `Unknown test route ${target.pathname}`);
  const headers = new Headers(init?.headers); headers.set("host", target.host);
  return route(new Request(url, { ...init, headers }));
}
type Input = { name: string; mime: string; data: Buffer; resize?: ResizeOptions };
type Result = ConversionResult;
async function json<T>(response: Response) { const body = await response.json(); assert.ok(response.ok, JSON.stringify(body)); return body as T; }
async function batch(inputs: Input[], lossless = false, resize?: ResizeOptions, outputFormat?: OutputFormat) {
  return json<{ batchId: string; fileIds: string[] }>(await request(`${base}/api/batches`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: inputs.map(f => ({ name: f.name, size: f.data.length, mime: f.mime, resize: f.resize })), quality: 80, lossless, resize, outputFormat }) }));
}
async function convert(id: string, fileId: string, input: Input) {
  return request(`${base}/api/convert?batch=${id}&id=${fileId}`, { method: "POST", headers: { "Content-Type": input.mime }, body: new Uint8Array(input.data) });
}
async function download(batchId: string, id: string) {
  const response = await request(`${base}/api/download?batch=${batchId}&id=${id}`); assert.equal(response.status, 200);
  const name = response.headers.get("content-disposition")!;
  assert.equal(response.headers.get("content-type"), name.endsWith('.png"') ? "image/png" : /\.jpe?g"$/.test(name) ? "image/jpeg" : "image/webp");
  return Buffer.from(await response.arrayBuffer());
}
async function verifyOutput(result: Result, data: Buffer) {
  saved.push(result.filename);
  assert.equal(result.outputSize, data.length);
  assert.deepEqual(await readFile(path.join(output, result.filename)), data);
  const metadata = await sharp(data).metadata();
  assert.equal(metadata.format, result.format);
  assert.equal(result.width, metadata.width); assert.equal(result.height, metadata.height);
}
try {
  if (process.env.TEST_IN_PROCESS === "1") await (await import("../lib/config")).initializeStorage();
  assert.equal((await request(`${base}/api/health`)).status, 200);
  const jpgData = await sharp({ create: { width: 160, height: 100, channels: 3, background: "#c45532" } }).jpeg().toBuffer();
  const raw = Buffer.alloc(80 * 60 * 4);
  for (let i = 0; i < raw.length; i += 4) { raw[i] = 30; raw[i + 1] = 130; raw[i + 2] = 180; raw[i + 3] = (i / 4) % 3 === 0 ? 0 : (i / 4) % 3 === 1 ? 128 : 255; }
  const pngData = await sharp(raw, { raw: { width: 80, height: 60, channels: 4 } }).png().toBuffer();
  const jpg: Input = { name: `${prefix}-product.jpg`, mime: "image/jpeg", data: jpgData };
  const png: Input = { name: `${prefix}-transparent.png`, mime: "image/png", data: pngData };
  const first = await batch([jpg, png], true);
  const pendingZip = await request(`${base}/api/zip?batch=${first.batchId}`); assert.equal(pendingZip.status, 404);
  const results = await Promise.all([jpg, png].map(async (input, index) => json<Result>(await convert(first.batchId, first.fileIds[index], input))));
  assert.ok(results.every(result => result.format === "webp"), "Default conversion remains WebP");
  for (const result of results) await verifyOutput(result, await download(first.batchId, result.id));
  assert.deepEqual([results[0].width, results[0].height], [160, 100], "Resize is off by default");
  const webpPixels = await sharp(await download(first.batchId, results[1].id)).ensureAlpha().raw().toBuffer();
  for (let i = 3; i < raw.length; i += 4) assert.equal(webpPixels[i], raw[i], "PNG alpha must survive conversion");
  const originalDownload = await download(first.batchId, results[0].id);
  const again = await batch([jpg]);
  const conflict = await json<Result>(await convert(again.batchId, again.fileIds[0], jpg));
  assert.equal(conflict.filename, `${prefix}-product-1.webp`);
  await verifyOutput(conflict, await download(again.batchId, conflict.id));
  assert.deepEqual(await download(first.batchId, results[0].id), originalDownload);
  const zipResponse = await request(`${base}/api/zip?batch=${first.batchId}`); assert.equal(zipResponse.status, 200);
  const zipped = unzipSync(new Uint8Array(await zipResponse.arrayBuffer()));
  assert.deepEqual(Object.keys(zipped).sort(), results.map(r => r.filename).sort());
  for (const result of results) assert.deepEqual(Buffer.from(zipped[result.filename]), await readFile(path.join(output, result.filename)));
  const duplicate = await convert(first.batchId, first.fileIds[0], jpg); assert.equal(duplicate.status, 409);
  const crossSite = await request(`${base}/api/batches`, { method: "POST", headers: { Origin: "https://untrusted.example", "Content-Type": "application/json" }, body: "{}" }); assert.equal(crossSite.status, 403);
  const malformed = await request(`${base}/api/batches`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" }); assert.equal(malformed.status, 400);
  for (const details of [ { name: "attack.svg", mime: "image/svg+xml", size: 50 }, { name: "wrong.png", mime: "image/jpeg", size: 50 }, { name: "large.jpg", mime: "image/jpeg", size: 31 * 1024 * 1024 } ]) {
    const response = await request(`${base}/api/batches`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: [details], quality: 80, lossless: false }) }); assert.equal(response.status, 400);
  }
  const mixedInputs = [jpg, png, { name: `${prefix}-corrupt.png`, mime: "image/png", data: Buffer.from("not an image") }, { name: `${prefix}-spoof.png`, mime: "image/png", data: jpgData }];
  const mixed = await batch(mixedInputs);
  let successCount = 0;
  for (const [index, input] of mixedInputs.entries()) {
    const response = await convert(mixed.batchId, mixed.fileIds[index], input);
    if (index > 1) assert.equal(response.status, 400);
    else {
      const result = await json<Result>(response); const data = await download(mixed.batchId, result.id);
      await verifyOutput(result, data); successCount++;
      if (index === 1) { const pixels = await sharp(data).ensureAlpha().raw().toBuffer(); for (let i = 3; i < raw.length; i += 4) assert.equal(pixels[i], raw[i], "Lossy WebP must preserve PNG alpha"); }
    }
  }
  const mixedZip = await request(`${base}/api/zip?batch=${mixed.batchId}`); assert.equal(mixedZip.status, 200);
  assert.equal(Object.keys(unzipSync(new Uint8Array(await mixedZip.arrayBuffer()))).length, successCount);
  const inputs: Input[] = Array.from({ length: 100 }, (_, index) => ({ ...jpg, name: `${prefix}-batch-${index}.jpg`, resize: index % 2 ? { percent: 50 } : undefined }));
  const many = await batch(inputs, false, { width: 40 }); let next = 0;
  await Promise.all(Array.from({ length: 8 }, async () => { while (next < inputs.length) { const index = next++; const result = await json<Result>(await convert(many.batchId, many.fileIds[index], inputs[index])); await verifyOutput(result, await download(many.batchId, result.id)); assert.deepEqual([result.width, result.height], index % 2 ? [80, 50] : [40, 25]); } }));
  const manyZip = await request(`${base}/api/zip?batch=${many.batchId}`); assert.equal(manyZip.status, 200);
  assert.equal(Object.keys(unzipSync(new Uint8Array(await manyZip.arrayBuffer()))).length, 100);
  // The same settings apply independently to landscape JPEG and transparent PNG.
  for (const scenario of [
    { resize: { width: 40 }, expected: [[40, 25], [40, 30]], lossless: false },
    { resize: { height: 30 }, expected: [[48, 30], [40, 30]], lossless: true },
    { resize: { width: 60, height: 30 }, expected: [[48, 30], [40, 30]], lossless: false },
    { resize: { width: 1000, height: 1000 }, expected: [[160, 100], [80, 60]], lossless: false },
  ]) {
    const inputs = [jpg, png]; const resized = await batch(inputs, scenario.lossless, scenario.resize);
    const outputs: Result[] = [];
    for (const [index, input] of inputs.entries()) {
      const result = await json<Result>(await convert(resized.batchId, resized.fileIds[index], input));
      const data = await download(resized.batchId, result.id); await verifyOutput(result, data);
      outputs.push(result);
      assert.deepEqual([result.width, result.height], scenario.expected[index]);
      assert.deepEqual([result.originalWidth, result.originalHeight], index ? [80, 60] : [160, 100]);
      if (index === 1) {
        assert.equal((await sharp(data).metadata()).hasAlpha, true);
        const stats = await sharp(data).stats(); assert.ok(stats.channels[3].min < 255, "Resize must retain transparency");
      }
    }
    const response = await request(`${base}/api/zip?batch=${resized.batchId}`); assert.equal(response.status, 200);
    const entries = unzipSync(new Uint8Array(await response.arrayBuffer()));
    assert.deepEqual(Object.keys(entries).sort(), outputs.map(item => item.filename).sort());
    for (const item of outputs) assert.deepEqual(Buffer.from(entries[item.filename]), await download(resized.batchId, item.id));
  }
  const oriented: Input = { ...jpg, name: `${prefix}-oriented.jpg`, data: await sharp(jpgData).withMetadata({ orientation: 6 }).jpeg().toBuffer() };
  const rotatedBatch = await batch([oriented], false, { width: 30 });
  const rotatedResult = await json<Result>(await convert(rotatedBatch.batchId, rotatedBatch.fileIds[0], oriented));
  await verifyOutput(rotatedResult, await download(rotatedBatch.batchId, rotatedResult.id));
  assert.deepEqual([rotatedResult.originalWidth, rotatedResult.originalHeight, rotatedResult.width, rotatedResult.height], [100, 160, 30, 48], "Resize must use displayed EXIF orientation");
  const originalInputs = [{ ...jpg, name: `${prefix}-original.jpg` }, { ...jpg, name: `${prefix}-original.jpeg` }, { ...png, name: `${prefix}-original.png` }];
  const originalBatch = await batch(originalInputs, false, { width: 40 }, "original");
  const originalResults: Result[] = [];
  for (const [index, input] of originalInputs.entries()) {
    const result = await json<Result>(await convert(originalBatch.batchId, originalBatch.fileIds[index], input));
    const data = await download(originalBatch.batchId, result.id); await verifyOutput(result, data); originalResults.push(result);
    assert.equal(result.filename, input.name);
    assert.equal(result.format, index === 2 ? "png" : "jpeg");
    assert.deepEqual([result.width, result.height], index === 2 ? [40, 30] : [40, 25]);
    if (index === 2) assert.ok((await sharp(data).stats()).channels[3].min < 255, "Original-format PNG must retain alpha");
  }
  const originalZip = await request(`${base}/api/zip?batch=${originalBatch.batchId}`); assert.equal(originalZip.status, 200);
  const originalEntries = unzipSync(new Uint8Array(await originalZip.arrayBuffer()));
  assert.deepEqual(Object.keys(originalEntries).sort(), originalResults.map(result => result.filename).sort());
  for (const result of originalResults) assert.deepEqual(Buffer.from(originalEntries[result.filename]), await readFile(path.join(output, result.filename)));
  const originalAgain = await batch(originalInputs, false, { width: 20 }, "original");
  for (const [index, input] of originalInputs.entries()) {
    const previous = await readFile(path.join(output, originalResults[index].filename));
    const result = await json<Result>(await convert(originalAgain.batchId, originalAgain.fileIds[index], input));
    await verifyOutput(result, await download(originalAgain.batchId, result.id));
    assert.equal(result.filename, input.name.replace(/\.(jpg|jpeg|png)$/, "-1.$1"));
    assert.deepEqual(await readFile(path.join(output, originalResults[index].filename)), previous);
  }
  const resizeWebp = await batch(originalInputs, false, { width: 40 }, "webp");
  for (const [index, input] of originalInputs.entries()) {
    const result = await json<Result>(await convert(resizeWebp.batchId, resizeWebp.fileIds[index], input));
    await verifyOutput(result, await download(resizeWebp.batchId, result.id));
    assert.equal(result.format, "webp"); assert.match(result.filename, /\.webp$/);
    assert.deepEqual([result.width, result.height], index === 2 ? [40, 30] : [40, 25]);
  }
  for (const outputFormat of ["jpeg", "avif", "../png", null, 1]) {
    const response = await request(`${base}/api/batches`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: [{ name: jpg.name, mime: jpg.mime, size: jpg.data.length }], quality: 80, lossless: false, resize: { width: 40 }, outputFormat }) });
    assert.equal(response.status, 400);
  }
  for (const outputFormat of ["original", "webp"] as const) {
    // Three identically sized inputs must each produce their own requested dimensions.
    const individualInputs: Input[] = [
      { ...jpg, name: `${prefix}-individual-a.jpg`, resize: { width: 80 } },
      { ...jpg, name: `${prefix}-individual-b.jpeg`, resize: { percent: 30 } },
      { ...jpg, name: `${prefix}-individual-c.jpg`, resize: { height: 20 } },
      { ...png, name: `${prefix}-individual-d.png`, resize: { percent: 50 } },
    ];
    const individualBatch = await batch(individualInputs, true, undefined, outputFormat);
    const individualResults: Result[] = [];
    for (const [index, input] of individualInputs.entries()) {
      const result = await json<Result>(await convert(individualBatch.batchId, individualBatch.fileIds[index], input));
      const data = await download(individualBatch.batchId, result.id); await verifyOutput(result, data); individualResults.push(result);
      assert.deepEqual([result.width, result.height], [[80, 50], [48, 30], [32, 20], [40, 30]][index]);
      assert.equal(result.format, outputFormat === "webp" ? "webp" : index === 3 ? "png" : "jpeg");
      if (index === 3) assert.ok((await sharp(data).stats()).channels[3].min < 255);
    }
    const response = await request(`${base}/api/zip?batch=${individualBatch.batchId}`); assert.equal(response.status, 200);
    const entries = unzipSync(new Uint8Array(await response.arrayBuffer()));
    assert.deepEqual(Object.keys(entries).sort(), individualResults.map(item => item.filename).sort());
    for (const item of individualResults) assert.deepEqual(Buffer.from(entries[item.filename]), await download(individualBatch.batchId, item.id));
  }
  for (const percent of [20, 30, 40, 50, 60, 70, 80, 100]) {
    const inputs = [jpg, png]; const percentageBatch = await batch(inputs, false, { percent });
    for (const [index, input] of inputs.entries()) {
      const result = await json<Result>(await convert(percentageBatch.batchId, percentageBatch.fileIds[index], input));
      await verifyOutput(result, await download(percentageBatch.batchId, result.id));
      assert.deepEqual([result.width, result.height], index ? [Math.round(80 * percent / 100), Math.round(60 * percent / 100)] : [Math.round(160 * percent / 100), percent]);
    }
  }
  const percentRotatedBatch = await batch([oriented], false, { percent: 50 });
  const percentRotated = await json<Result>(await convert(percentRotatedBatch.batchId, percentRotatedBatch.fileIds[0], oriented));
  await verifyOutput(percentRotated, await download(percentRotatedBatch.batchId, percentRotated.id));
  assert.deepEqual([percentRotated.width, percentRotated.height], [50, 80]);
  const tiny: Input = { name: `${prefix}-tiny.png`, mime: "image/png", data: await sharp({ create: { width: 1, height: 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer() };
  const tinyBatch = await batch([tiny], false, { percent: 1 });
  const tinyResult = await json<Result>(await convert(tinyBatch.batchId, tinyBatch.fileIds[0], tiny));
  await verifyOutput(tinyResult, await download(tinyBatch.batchId, tinyResult.id)); assert.deepEqual([tinyResult.width, tinyResult.height], [1, 1]);
  const invalidFile = { name: jpg.name, mime: jpg.mime, size: jpg.data.length, resize: { percent: 0 } };
  const invalidIndividual = await request(`${base}/api/batches`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: [invalidFile], resize: { percent: 50 }, quality: 80, lossless: false }) });
  assert.equal(invalidIndividual.status, 400, "Invalid individual settings must not be hidden by valid batch defaults");
  for (const resize of [null, {}, [], { width: 0 }, { height: 1.5 }, { width: "40" }, { width: 16384 }, { height: -30 }]) {
    const response = await request(`${base}/api/batches`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ files: [{ name: jpg.name, mime: jpg.mime, size: jpg.data.length }], quality: 80, lossless: false, resize }) });
    assert.equal(response.status, 400, `Invalid resize ${JSON.stringify(resize)} must be rejected before upload`);
  }
  assert.equal((await readdir(uploads)).filter(name => name.endsWith(".upload")).length, 0);
  console.log("PASS: batch and per-image pixel/percentage resize, all percentage presets, EXIF, 1px minimum, Original/WebP outputs, alpha, mixed-settings 100-image batch, ZIP bytes, MIME, conflicts, validation, cross-site blocking, filesystem output, temporary cleanup.");
} finally {
  for (const filename of saved) await unlink(path.join(output, filename)).catch(() => {});
}
