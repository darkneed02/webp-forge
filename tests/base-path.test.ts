import test from "node:test";
import assert from "node:assert/strict";
import { normalizeBasePath } from "../lib/base-path";

test("base path accepts empty and normalizes trailing slashes", () => {
  assert.equal(normalizeBasePath(undefined), "");
  assert.equal(normalizeBasePath(""), "");
  assert.equal(normalizeBasePath("/"), "");
  assert.equal(normalizeBasePath("/webp-forge/"), "/webp-forge");
  assert.equal(normalizeBasePath("/tools/webp"), "/tools/webp");
});

test("base path rejects values that are not absolute URL segments", () => {
  for (const value of ["webp-forge", "/webp forge", "//x", "/a/../b?q", "https://example.com/x"]) assert.throws(() => normalizeBasePath(value), /BASE_PATH/);
});
