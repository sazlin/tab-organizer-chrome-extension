import { organizeAllWindows, organizeWindow, updateBadge } from "./organize.js";
import { getSettings } from "./settings.js";

const ORGANIZE_DELAY_MS = 150;

/** @type {Map<number, ReturnType<typeof setTimeout>>} */
const pendingByWindow = new Map();
let organizeQueue = Promise.resolve();

/**
 * @param {() => Promise<void>} work
 */
function enqueue(work) {
  organizeQueue = organizeQueue
    .then(work)
    .catch((error) => {
      console.warn("Tab Organizer: organize failed", error);
    })
    .then(updateBadge)
    .catch((error) => {
      console.warn("Tab Organizer: badge update failed", error);
    });
}

/**
 * @param {number | undefined} windowId
 */
function scheduleOrganize(windowId) {
  if (windowId === undefined) {
    return;
  }

  const previous = pendingByWindow.get(windowId);
  if (previous) {
    clearTimeout(previous);
  }

  pendingByWindow.set(
    windowId,
    setTimeout(() => {
      pendingByWindow.delete(windowId);
      enqueue(async () => {
        const settings = await getSettings();
        if (!settings.autoOrganize) {
          return;
        }

        await organizeWindow(windowId);
      });
    }, ORGANIZE_DELAY_MS),
  );
}

function scheduleOrganizeAll() {
  enqueue(async () => {
    const settings = await getSettings();
    if (!settings.autoOrganize) {
      return;
    }

    await organizeAllWindows();
  });
}

chrome.runtime.onInstalled.addListener(() => {
  scheduleOrganizeAll();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleOrganizeAll();
});

chrome.tabs.onCreated.addListener((tab) => {
  scheduleOrganize(tab.windowId);
});

chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.url || changeInfo.status === "complete") {
    scheduleOrganize(tab.windowId);
  }
});

chrome.tabs.onAttached.addListener((_tabId, attachInfo) => {
  scheduleOrganize(attachInfo.newWindowId);
});

chrome.tabs.onReplaced.addListener(async (addedTabId) => {
  try {
    const tab = await chrome.tabs.get(addedTabId);
    scheduleOrganize(tab.windowId);
  } catch (error) {
    console.warn("Tab Organizer: replaced tab lookup failed", error);
  }
});

chrome.tabs.onRemoved.addListener((_tabId, removeInfo) => {
  if (!removeInfo.isWindowClosing) {
    enqueue(updateBadge);
  }
});

chrome.tabGroups.onCreated.addListener(() => {
  enqueue(updateBadge);
});

chrome.tabGroups.onRemoved.addListener(() => {
  enqueue(updateBadge);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") {
    return;
  }

  if (changes.autoOrganize || changes.groupSubdomains) {
    scheduleOrganizeAll();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "organize-now") {
    return;
  }

  enqueue(async () => {
    try {
      await organizeAllWindows();
      sendResponse({ ok: true });
    } catch (error) {
      console.warn("Tab Organizer: organize-now failed", error);
      sendResponse({ ok: false });
    }
  });

  return true;
});
