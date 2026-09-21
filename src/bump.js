export const TAB_GROUP_ID_NONE = -1;

/**
 * @typedef {{
 *   id?: number,
 *   index?: number,
 *   pinned?: boolean,
 *   groupId?: number,
 *   active?: boolean,
 *   windowId?: number,
 * }} BumpTab
 */

/**
 * @param {BumpTab} tab
 * @param {readonly BumpTab[]} windowTabs
 * @returns {number | null}
 */
function groupStartIndex(tab, windowTabs) {
  if (tab.groupId === undefined || tab.groupId === TAB_GROUP_ID_NONE) {
    return null;
  }

  let start = Infinity;
  for (const candidate of windowTabs) {
    if (candidate.groupId === tab.groupId && candidate.index !== undefined) {
      start = Math.min(start, candidate.index);
    }
  }

  return start === Infinity ? null : start;
}

/**
 * @param {readonly BumpTab[]} windowTabs
 * @returns {number}
 */
function firstUnpinnedIndex(windowTabs) {
  let count = 0;
  for (const tab of windowTabs) {
    if (tab.pinned) {
      count += 1;
    }
  }

  return count;
}

/**
 * @param {BumpTab} tab
 * @param {readonly BumpTab[]} windowTabs
 * @param {number} elapsedMs
 * @param {{ tabBumpSeconds: number, groupBumpSeconds: number }} settings
 * @returns {{ tabIndex: number | null, groupIndex: number | null }}
 */
export function bumpPlan(tab, windowTabs, elapsedMs, settings) {
  if (
    tab.pinned ||
    !tab.active ||
    tab.index === undefined ||
    tab.groupId === undefined ||
    tab.groupId === TAB_GROUP_ID_NONE
  ) {
    return { tabIndex: null, groupIndex: null };
  }

  const groupStart = groupStartIndex(tab, windowTabs);
  const groupFront = firstUnpinnedIndex(windowTabs);
  const tabDue = elapsedMs >= settings.tabBumpSeconds * 1000;
  const groupDue = elapsedMs >= settings.groupBumpSeconds * 1000;

  return {
    tabIndex: tabDue && groupStart !== null && tab.index !== groupStart ? groupStart : null,
    groupIndex: groupDue && groupStart !== null && groupStart !== groupFront ? groupFront : null,
  };
}

/**
 * @param {number} tabId
 * @param {number} elapsedMs
 * @param {{ tabBumpSeconds: number, groupBumpSeconds: number }} settings
 * @returns {Promise<void>}
 */
export async function applyFocusBumps(tabId, elapsedMs, settings) {
  let tab;
  try {
    tab = await chrome.tabs.get(tabId);
  } catch {
    return;
  }

  if (!tab.active || tab.windowId === undefined) {
    return;
  }

  const windowTabs = await chrome.tabs.query({ windowId: tab.windowId });
  const plan = bumpPlan(tab, windowTabs, elapsedMs, settings);

  try {
    if (plan.tabIndex !== null && tab.id !== undefined) {
      await chrome.tabs.move(tab.id, { index: plan.tabIndex });
    }

    if (plan.groupIndex !== null) {
      await chrome.tabGroups.move(tab.groupId, { index: plan.groupIndex });
    }
  } catch (error) {
    console.warn("Tab Organizer: focus bump failed", error);
  }
}
