import assert from "node:assert/strict";
import test from "node:test";
import { bumpPlan, TAB_GROUP_ID_NONE } from "../src/bump.js";

const settings = { tabBumpSeconds: 3, groupBumpSeconds: 30 };

test("bumpPlan treats a zero threshold as immediate", () => {
  const tabs = [
    { id: 1, index: 0, pinned: false, groupId: 7, active: false },
    { id: 2, index: 1, pinned: false, groupId: 10, active: false },
    { id: 3, index: 2, pinned: false, groupId: 10, active: true },
  ];

  assert.deepEqual(
    bumpPlan(tabs[2], tabs, 0, { tabBumpSeconds: 0, groupBumpSeconds: 0 }),
    { tabIndex: 1, groupIndex: 0 },
  );
});

test("bumpPlan waits until each threshold", () => {
  const tabs = [
    { id: 1, index: 0, pinned: false, groupId: 7, active: false },
    { id: 2, index: 1, pinned: false, groupId: 10, active: false },
    { id: 3, index: 2, pinned: false, groupId: 10, active: true },
  ];

  assert.deepEqual(bumpPlan(tabs[2], tabs, 2999, settings), {
    tabIndex: null,
    groupIndex: null,
  });
  assert.deepEqual(bumpPlan(tabs[2], tabs, 3000, settings), {
    tabIndex: 1,
    groupIndex: null,
  });
  assert.deepEqual(bumpPlan(tabs[2], tabs, 30_000, settings), {
    tabIndex: 1,
    groupIndex: 0,
  });
});

test("bumpPlan skips pinned, ungrouped, and inactive tabs", () => {
  const grouped = { id: 2, index: 1, pinned: false, groupId: 10, active: true };
  const tabs = [
    { id: 1, index: 0, pinned: false, groupId: 10, active: false },
    grouped,
  ];

  assert.deepEqual(
    bumpPlan({ ...grouped, pinned: true }, tabs, 30_000, settings),
    { tabIndex: null, groupIndex: null },
  );
  assert.deepEqual(
    bumpPlan({ ...grouped, groupId: TAB_GROUP_ID_NONE }, tabs, 30_000, settings),
    { tabIndex: null, groupIndex: null },
  );
  assert.deepEqual(
    bumpPlan({ ...grouped, active: false }, tabs, 30_000, settings),
    { tabIndex: null, groupIndex: null },
  );
});

test("bumpPlan is a no-op when the tab and group are already first", () => {
  const tabs = [
    { id: 1, index: 0, pinned: true, groupId: TAB_GROUP_ID_NONE, active: false },
    { id: 2, index: 1, pinned: false, groupId: 8, active: true },
    { id: 3, index: 2, pinned: false, groupId: 8, active: false },
  ];

  assert.deepEqual(bumpPlan(tabs[1], tabs, 30_000, settings), {
    tabIndex: null,
    groupIndex: null,
  });
});

test("bumpPlan places a later group after pinned tabs", () => {
  const tabs = [
    { id: 1, index: 0, pinned: true, groupId: TAB_GROUP_ID_NONE, active: false },
    { id: 2, index: 1, pinned: false, groupId: 7, active: false },
    { id: 3, index: 2, pinned: false, groupId: 8, active: false },
    { id: 4, index: 3, pinned: false, groupId: 8, active: true },
  ];

  assert.deepEqual(bumpPlan(tabs[3], tabs, 30_000, settings), {
    tabIndex: 2,
    groupIndex: 1,
  });
});
