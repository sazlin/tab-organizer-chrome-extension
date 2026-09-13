import { colorForDomain, groupKey } from "./domain.js";
import { getSettings } from "./settings.js";

/**
 * @param {number | undefined} windowId
 * @returns {Promise<void>}
 */
export async function organizeWindow(windowId) {
  if (windowId === undefined) {
    return;
  }

  const settings = await getSettings();
  const tabs = await chrome.tabs.query({ windowId });
  const existingGroups = await chrome.tabGroups.query({ windowId });
  const groupsByTitle = new Map(
    existingGroups
      .filter((group) => Boolean(group.title))
      .map((group) => [group.title, group]),
  );

  /** @type {Map<string, Array<{id: number, groupId: number}>>} */
  const tabsByDomain = new Map();

  for (const tab of tabs) {
    if (tab.pinned || tab.id === undefined) {
      continue;
    }

    const domain = groupKey(tab.url, settings.groupSubdomains);
    if (!domain) {
      continue;
    }

    const grouped = tabsByDomain.get(domain);
    if (grouped) {
      grouped.push({ id: tab.id, groupId: tab.groupId });
    } else {
      tabsByDomain.set(domain, [{ id: tab.id, groupId: tab.groupId }]);
    }
  }

  for (const [domain, domainTabs] of tabsByDomain) {
    const existing = groupsByTitle.get(domain);
    const tabIds = domainTabs
      .filter((tab) => tab.groupId !== existing?.id)
      .map((tab) => tab.id);

    if (tabIds.length === 0) {
      continue;
    }

    try {
      const groupId = existing
        ? await chrome.tabs.group({ groupId: existing.id, tabIds })
        : await chrome.tabs.group({
            createProperties: { windowId },
            tabIds,
          });

      if (!existing) {
        await chrome.tabGroups.update(groupId, {
          color: colorForDomain(domain),
          title: domain,
        });
        groupsByTitle.set(domain, {
          id: groupId,
          title: domain,
        });
      }
    } catch (error) {
      console.warn("Tab Organizer: failed to group", domain, error);
    }
  }
}

/**
 * @returns {Promise<void>}
 */
export async function organizeAllWindows() {
  const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
  for (const window of windows) {
    if (window.id === undefined) {
      continue;
    }

    await organizeWindow(window.id);
  }
}

/**
 * @returns {Promise<void>}
 */
export async function updateBadge() {
  const groups = await chrome.tabGroups.query({});
  await chrome.action.setBadgeBackgroundColor({ color: "#1a73e8" });
  await chrome.action.setBadgeText({
    text: groups.length > 0 ? String(groups.length) : "",
  });
}
