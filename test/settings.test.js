import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS, normalizeSeconds } from "../src/settings.js";

test("normalizeSeconds keeps valid durations including zero", () => {
  assert.equal(normalizeSeconds(0, 3), 0);
  assert.equal(normalizeSeconds(3, 3), 3);
  assert.equal(normalizeSeconds("30", 30), 30);
  assert.equal(normalizeSeconds(2.5, 3), 2.5);
});

test("normalizeSeconds falls back for missing or invalid values", () => {
  assert.equal(normalizeSeconds(undefined, DEFAULT_SETTINGS.tabBumpSeconds), 3);
  assert.equal(normalizeSeconds(-1, 3), 3);
  assert.equal(normalizeSeconds(NaN, 30), 30);
  assert.equal(normalizeSeconds("nope", 30), 30);
});
