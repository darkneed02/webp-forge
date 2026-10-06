import assert from "node:assert/strict";
import { chromium } from "playwright";
import sharp from "sharp";
import { mkdir, readFile, readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3000";
const prefix = `forge-browser-${randomUUID().slice(0, 8)}`;
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const browser = await chromium.launch({ executablePath, headless: true });
const errors: string[] = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
page.on("pageerror", error => errors.push(error.message));
async function checkTheme(scheme: "light" | "dark") {
  await page.emulateMedia({ colorScheme: scheme });
  const styles = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const card = getComputedStyle(document.querySelector(".card")!);
    const button = getComputedStyle(document.querySelector(".button-outline")!);
    const input = document.querySelector("#resize-width");
    const inputStyles = input ? getComputedStyle(input) : undefined;
    return {
      scheme: getComputedStyle(document.documentElement).colorScheme,
      background: body.backgroundColor,
      pairs: [[body.color, body.backgroundColor], [card.color, card.backgroundColor], [button.color, button.backgroundColor], ...(inputStyles ? [[inputStyles.color, inputStyles.backgroundColor]] : [])],
    };
  });
  function luminance(color: string) {
    const values = color.match(/[\d.]+/g)!.slice(0, 3).map(channel => {
      const value = Number(channel) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return values[0] * 0.2126 + values[1] * 0.7152 + values[2] * 0.0722;
  }
  assert.equal(styles.scheme, scheme);
  for (const [text, background] of styles.pairs) {
    const a = luminance(text); const b = luminance(background);
    assert.ok((Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05) >= 4.5, `${scheme}: text must remain readable (${text} on ${background})`);
  }
  return styles.background;
}
try {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto(base);
  await page.getByRole("heading", { name: "Drop your images here" }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Convert to WebP" }).isDisabled(), true);
  const jpeg = await sharp({ create: { width: 200, height: 120, channels: 3, background: "#bb542f" } }).jpeg().toBuffer();
  const png = await sharp({ create: { width: 100, height: 100, channels: 4, background: { r: 100, g: 160, b: 100, alpha: 0.5 } } }).png().toBuffer();
  await page.getByLabel("Select images to convert").setInputFiles([{ name: `${prefix}.jpg`, mimeType: "image/jpeg", buffer: jpeg }, { name: `${prefix}.png`, mimeType: "image/png", buffer: png }]);
  await page.getByRole("heading", { name: "2 images selected" }).waitFor();
  assert.equal(await page.locator(".thumbnail img").count(), 2);
  const lightBackground = await checkTheme("light");
  const darkBackground = await checkTheme("dark");
  assert.notEqual(lightBackground, darkBackground);
  assert.equal(await page.locator(".thumbnail img").count(), 2, "Switching system themes must preserve selected images");
  assert.ok(await page.getByRole("radio", { name: /Balanced/ }).isChecked());
  assert.equal(await page.getByLabel("Resize images", { exact: true }).isChecked(), false);
  await page.getByLabel("Resize images", { exact: true }).check();
  await page.getByLabel("Max width (px)").fill("");
  await page.getByRole("alert").waitFor();
  assert.equal(await page.getByRole("button", { name: /Convert to WebP/ }).isDisabled(), true);
  await page.getByLabel("Max width (px)").fill("80");
  await page.getByLabel("Max height (px)").fill("50");
  await checkTheme("light"); await checkTheme("dark");
  assert.equal(await page.getByLabel("Max width (px)").inputValue(), "80", "Theme changes must preserve resize settings");
  await page.getByRole("radio", { name: /Custom/ }).check();
  await page.locator("#quality-slider").fill("73");
  await page.getByRole("radio", { name: /Lossless/ }).check();
  assert.equal(await page.getByLabel("Max width (px)").inputValue(), "80", "Quality changes must preserve resize settings");
  await page.getByRole("button", { name: /Convert to WebP/ }).click();
  await page.getByRole("heading", { name: "Conversion complete" }).waitFor({ timeout: 30_000 });
  assert.equal(await page.locator(".status-completed").count(), 2);
  assert.equal(await page.locator(".image-dimensions").first().innerText(), "200 × 120 → 80 × 48 px");
  assert.equal(await page.locator(".image-dimensions").nth(1).innerText(), "100 × 100 → 50 × 50 px");
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download All ZIP" }).click();
  const download = await downloadEvent; assert.equal(download.suggestedFilename(), "webp-forge.zip"); assert.equal(await download.failure(), null);
  const individualEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: `Download ${prefix}.webp`, exact: true }).click();
  const individual = await individualEvent;
  assert.equal(individual.suggestedFilename(), `${prefix}.webp`);
  const filePath = await individual.path(); assert.ok(filePath);
  const metadata = await sharp(await readFile(filePath)).metadata();
  assert.deepEqual([metadata.width, metadata.height], [80, 48]);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/desktop-dark.png", fullPage: true });
  await checkTheme("light");
  assert.equal(await page.locator(".status-completed").count(), 2);
  await page.screenshot({ path: "test-results/desktop-light.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "No page-level horizontal overflow");
  await page.screenshot({ path: "test-results/mobile-light.png", fullPage: true });
  await checkTheme("dark");
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.screenshot({ path: "test-results/mobile-dark.png", fullPage: true });
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByRole("heading", { name: "Your image queue" }).waitFor();
  await page.getByLabel("Resize images", { exact: true }).uncheck();
  await page.getByLabel("Select images to convert").setInputFiles([{ name: `${prefix}-single.jpg`, mimeType: "image/jpeg", buffer: jpeg }]);
  await page.getByRole("button", { name: /Convert to WebP/ }).click();
  await page.getByRole("heading", { name: "Conversion complete" }).waitFor();
  assert.equal(await page.locator(".image-dimensions").innerText(), "200 × 120 → 200 × 120 px");
  assert.equal(await page.getByRole("button", { name: "Download All ZIP" }).count(), 0);
  const singleEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download WebP", exact: true }).click();
  const singleDownload = await singleEvent;
  assert.equal(singleDownload.suggestedFilename(), `${prefix}-single.webp`);
  assert.equal(await singleDownload.failure(), null);
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByLabel("Select images to convert").setInputFiles([
    { name: `${prefix}-corrupt.png`, mimeType: "image/png", buffer: Buffer.from("not an image") },
    { name: `${prefix}-partial.png`, mimeType: "image/png", buffer: png },
  ]);
  await page.getByRole("button", { name: /Convert to WebP/ }).click();
  await page.getByRole("heading", { name: "Conversion complete" }).waitFor();
  assert.equal(await page.locator(".status-failed").count(), 1);
  assert.equal(await page.getByRole("button", { name: "Download All ZIP" }).count(), 0);
  const partialEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download WebP", exact: true }).click();
  assert.equal((await partialEvent).suggestedFilename(), `${prefix}-partial.webp`);
  await page.getByRole("button", { name: "Clear all" }).click();
  await page.getByLabel("Select images to convert").setInputFiles([{ name: "bad.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg/>") }]);
  await page.getByRole("alert").waitFor();
  assert.deepEqual(errors, []);
  console.log("PASS: system light/dark themes, readable contrast, live theme changes preserving state, previews, quality controls, batch ZIP, single WebP (including partial failure), clear, unsupported file error, mobile layout, no runtime errors.");
} finally {
  await browser.close();
  const output = path.resolve(process.env.TEST_OUTPUT_DIR ?? "data/output");
  for (const file of await readdir(output)) if (file.startsWith(prefix)) await unlink(path.join(output, file));
}
