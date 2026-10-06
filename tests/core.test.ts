import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, symlink, writeFile, readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { ConversionQueue } from "../lib/queue";
import { safeBaseName, reserveOutput, validateInput, openOutput } from "../lib/file-utils";
import { createBatch, getBatch } from "../lib/batches";
import { config, initializeStorage } from "../lib/config";

test("queue limits concurrency and recovers after a rejected task", async () => {
  const queue = new ConversionQueue(4); let active = 0; let maximum = 0; let count = 0;
  const outcomes = await Promise.allSettled(Array.from({ length: 100 }, (_, index) => queue.run(async () => {
    active++; maximum = Math.max(active, maximum);
    try { await new Promise(resolve => setTimeout(resolve, 2)); if (index === 3) throw new Error("test failure"); count++; }
    finally { active--; }
  })));
  assert.equal(maximum, 4); assert.equal(active, 0); assert.equal(count, 99);
  assert.equal(outcomes.filter(result => result.status === "rejected").length, 1);
  assert.equal(await queue.run(async () => "still works"), "still works");
});
test("filename sanitization removes paths and invalid or reserved names", () => {
  assert.equal(safeBaseName("../../product-image.jpg"), "product-image");
  assert.equal(safeBaseName("C:\\images\\product.png"), "product");
  assert.equal(safeBaseName("CON.jpg"), "image-CON");
  assert.equal(safeBaseName("...png"), "image");
  assert.equal(safeBaseName("café picture.jpg"), "cafe-picture");
  assert.throws(() => validateInput("test.svg", "image/svg+xml"));
  assert.throws(() => validateInput("test.png", "image/jpeg"));
});
test("atomic filename reservation preserves existing bytes with simultaneous requests", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "forge-test-"));
  try {
    const reservations = await Promise.all(Array.from({ length: 8 }, () => reserveOutput(directory, "product.jpg")));
    assert.equal(new Set(reservations.map(file => file.filename)).size, 8);
    for (const [index, file] of reservations.entries()) { await file.handle.writeFile(`file-${index}`); await file.handle.close(); }
    const next = await reserveOutput(directory, "product.png");
    assert.equal(next.filename, "product-8.webp"); await next.handle.close();
    for (const [index, file] of reservations.entries()) assert.equal((await readFile(file.filePath)).toString(), `file-${index}`);
    await assert.rejects(() => openOutput(directory, "../secret.webp"));
    await symlink(reservations[0].filePath, path.join(directory, "linked.webp"));
    await assert.rejects(() => openOutput(directory, "linked.webp"));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test("startup creates missing storage and cleans only application-owned abandoned uploads", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-startup-"));
  const previous = { outputDir: config.outputDir, uploadDir: config.uploadDir };
  try {
    config.outputDir = path.join(root, "output"); config.uploadDir = path.join(root, "uploads");
    await initializeStorage();
    await writeFile(path.join(config.uploadDir, "11111111-1111-1111-1111-111111111111.upload"), "orphan");
    await writeFile(path.join(config.uploadDir, "keep.txt"), "keep");
    await initializeStorage();
    assert.deepEqual(await readdir(config.uploadDir), ["keep.txt"]);
    assert.deepEqual(await readdir(config.outputDir), []);
  } finally { Object.assign(config, previous); await rm(root, { recursive: true, force: true }); }
});
test("invalid environment values and overlapping directories fail configuration loading", () => {
  for (const values of [{ WEBP_QUALITY: "NaN" }, { CONVERSION_CONCURRENCY: "0" }, { MAX_FILES: "" }, { MAX_UPLOAD_MB: "-1" }, { OUTPUT_DIR: "" }, { OUTPUT_DIR: "same", UPLOAD_DIR: "same" }]) {
    const result = spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", "await import('./lib/config.ts')"], { env: { ...process.env, ...values }, encoding: "utf8" });
    assert.notEqual(result.status, 0, JSON.stringify(values));
    assert.match(result.stderr, /must be|must be different/);
  }
});
test("batch rejects incorrect limits, types, and quality", () => {
  const file = { name: "photo.jpg", mime: "image/jpeg", size: 10 };
  const batch = createBatch({ files: [file], quality: 80, lossless: false });
  assert.equal(getBatch(batch.id), batch);
  for (const body of [ { files: [], quality: 80, lossless: false }, { files: [file], quality: 0, lossless: false }, { files: [file], quality: 80, lossless: "no" }, { files: [{ ...file, size: 31 * 1024 * 1024 }], quality: 80, lossless: false }, { files: Array(101).fill(file), quality: 80, lossless: false } ]) assert.throws(() => createBatch(body));
});

test("batch validates resize settings and snapshots dimensions independently of the request", () => {
  const body = { files: [{ name: "photo.jpg", mime: "image/jpeg", size: 10 }], quality: 80, lossless: false };
  for (const resize of [null, [], "100", {}, { width: null }, { width: "100" }, { width: 0 }, { height: -1 }, { width: 1.5 }, { width: NaN }, { height: Infinity }, { width: 16384 }]) {
    assert.throws(() => createBatch({ ...body, resize }), /resize/i, JSON.stringify(resize));
  }
  assert.equal(createBatch(body).options.resize, undefined);
  const resize = { width: 16383, height: 1 };
  const batch = createBatch({ ...body, resize });
  resize.width = 0;
  assert.deepEqual(batch.options.resize, { width: 16383, height: 1 });
  assert.equal(createBatch({ ...body, resize: { height: 600 } }).options.resize?.height, 600);
});

test("output selection defaults to WebP and requires valid dimensions for original format", () => {
  const body = { files: [{ name: "photo.jpg", mime: "image/jpeg", size: 10 }], quality: 80, lossless: false };
  assert.equal(createBatch(body).options.outputFormat, "webp");
  assert.equal(createBatch({ ...body, outputFormat: "original", resize: { width: 100 } }).options.outputFormat, "original");
  for (const outputFormat of ["jpg", "avif", "../png", null, 1, {}]) assert.throws(() => createBatch({ ...body, outputFormat, resize: { width: 100 } }), /output format/);
  assert.throws(() => createBatch({ ...body, outputFormat: "original" }), /resize dimensions/);
});

test("original-format output reserves safe names and never overwrites matching input paths", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "forge-format-"));
  try {
    for (const extension of ["jpg", "jpeg", "png"] as const) {
      await writeFile(path.join(directory, `photo.${extension}`), "original");
      const output = await reserveOutput(directory, "../../photo.png", extension);
      assert.equal(output.filename, `photo-1.${extension}`);
      await output.handle.writeFile("resized"); await output.handle.close();
      const handle = await openOutput(directory, output.filename);
      assert.equal((await handle.readFile()).toString(), "resized"); await handle.close();
      assert.equal((await readFile(path.join(directory, `photo.${extension}`))).toString(), "original");
    }
    for (const filename of ["../photo.png", "photo.svg", "photo.jpg/secret", "photo.png.exe"]) await assert.rejects(() => openOutput(directory, filename));
    await symlink(path.join(directory, "photo.png"), path.join(directory, "linked.png"));
    await assert.rejects(() => openOutput(directory, "linked.png"));
  } finally { await rm(directory, { recursive: true, force: true }); }
});
