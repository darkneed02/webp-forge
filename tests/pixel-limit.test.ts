import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

// The limit is read once at startup, so each case runs in a fresh process.
function convertWithLimit(width: number, height: number, megapixels: string, root: string) {
  const script = `
    const sharp = (await import("sharp")).default;
    const { convertImage } = await import("./lib/converter.ts");
    await (await import("./lib/config.ts")).initializeStorage();
    const input = ${JSON.stringify(path.join(root, "input.jpg"))};
    await sharp({ create: { width: ${width}, height: ${height}, channels: 3, background: "#3a7" } }).jpeg().toFile(input);
    try { const result = await convertImage(input, "photo.jpg", "image/jpeg", { quality: 80, lossless: false }); console.log("OK", result.width + "x" + result.height); }
    catch (error) { console.log("ERR", error.message); }`;
  return spawnSync(process.execPath, ["--import", "tsx", "--input-type=module", "-e", script], {
    env: { ...process.env, MAX_INPUT_MEGAPIXELS: megapixels, OUTPUT_DIR: path.join(root, "out"), UPLOAD_DIR: path.join(root, "up") }, encoding: "utf8",
  });
}

test("MAX_INPUT_MEGAPIXELS sets the decoded pixel limit and names it in the error", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "forge-pixels-"));
  try {
    const rejected = convertWithLimit(1200, 1000, "1", root);
    assert.match(rejected.stdout, /ERR .*exceeds the 1-megapixel limit/, rejected.stderr);
    const accepted = convertWithLimit(1200, 1000, "2", root);
    assert.match(accepted.stdout, /OK 1200x1000/, accepted.stderr);
  } finally { await rm(root, { recursive: true, force: true }); }
});
