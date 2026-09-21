import { applyFocusBumps } from "./bump.js";
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

// Chrome can kill the worker after ~30s idle. Alarms still fire; setTimeout does not.
const ALARM_MIN_MS = 30_000;

/** @type {{ tabId: number, windowId: number, startedAt: number } | null} */
let dwell = null;
let dwellGeneration = 0;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let tabTimer;
/** @type {ReturnType<typeof setTimeout> | undefined} */
let groupTimer;

/**
 * @param {string} name
 * @returns {{ tabId: number, startedAt: number } | null}
 */
function parseFocusAlarm(name) {
  const match = /^focus-(?:tab|group):(\d+):(\d+)$/.exec(name);
  if (!match) {
    return null;
  }

  return { tabId: Number(match[1]), startedAt: Number(match[2]) };
}

function clearFocusTimers() {
  if (tabTimer !== undefined) {
    clearTimeout(tabTimer);
    tabTimer = undefined;
  }

  if (groupTimer !== undefined) {
    clearTimeout(groupTimer);
    groupTimer = undefined;
  }
}

async function clearFocusAlarms() {
  try {
    const alarms = await chrome.alarms.getAll();
    await Promise.all(
      alarms
        .filter((alarm) => parseFocusAlarm(alarm.name))
        .map((alarm) => chrome.alarms.clear(alarm.name)),
    );
  } catch (error) {
    console.warn("Tab Organizer: clearing focus alarms failed", error);
  }
}

/**
 * @param {number} tabId
 */
function clearDwellIfTab(tabId) {
  if (dwell?.tabId !== tabId) {
    return;
  }

  dwell = null;
  dwellGeneration += 1;
  clearFocusTimers();
  void clearFocusAlarms();
}

/**
 * @param {{ tabId: number, startedAt: number }} current
 */
function queueFocusBump(current) {
  void (async () => {
    try {
      const settings = await getSettings();
      await applyFocusBumps(
        current.tabId,
        Date.now() - current.startedAt,
        settings,
      );
    } catch (error) {
      console.warn("Tab Organizer: focus bump failed", error);
    }
  })();
}

/**
 * @param {"tab" | "group"} kind
 * @param {number} waitMs
 * @param {{ tabId: number, windowId: number, startedAt: number }} current
 * @param {number} generation
 */
function armFocusBump(kind, waitMs, current, generation) {
  const fire = () => {
    if (generation !== dwellGeneration) {
      return;
    }

    queueFocusBump(current);
  };

  if (waitMs < ALARM_MIN_MS) {
    const timer = setTimeout(fire, waitMs);
    if (kind === "tab") {
      tabTimer = timer;
    } else {
      groupTimer = timer;
    }
  }

  // Packed Chrome 120+ may delay this to 30s. Unpacked fires at the requested time.
  void chrome.alarms
    .create(`focus-${kind}:${current.tabId}:${current.startedAt}`, {
      when: Date.now() + waitMs,
    })
    .catch((error) => {
      console.warn("Tab Organizer: focus alarm failed", error);
    });
}

/**
 * @param {{ tabId: number, windowId: number, startedAt: number }} current
 * @param {number} generation
 */
async function scheduleFocusBumps(current, generation) {
  clearFocusTimers();
  await clearFocusAlarms();
  if (generation !== dwellGeneration) {
    return;
  }

  const settings = await getSettings();
  if (generation !== dwellGeneration) {
    return;
  }

  const elapsed = Date.now() - current.startedAt;
  const tabWait = settings.tabBumpSeconds * 1000 - elapsed;
  const groupWait = settings.groupBumpSeconds * 1000 - elapsed;

  if (tabWait <= 0 || groupWait <= 0) {
    queueFocusBump(current);
  }

  if (tabWait > 0) {
    armFocusBump("tab", tabWait, current, generation);
  }

  if (groupWait > 0) {
    armFocusBump("group", groupWait, current, generation);
  }
}

async function rescheduleCurrentDwell() {
  if (!dwell) {
    return;
  }

  await scheduleFocusBumps(dwell, dwellGeneration);
}

/**
 * @param {number} tabId
 * @param {number} windowId
 */
async function startDwell(tabId, windowId) {
  try {
    const win = await chrome.windows.get(windowId);
    if (!win.focused) {
      return;
    }
  } catch {
    return;
  }

  if (dwell?.tabId === tabId && dwell.windowId === windowId) {
    return;
  }

  const generation = ++dwellGeneration;
  dwell = { tabId, windowId, startedAt: Date.now() };
  try {
    await scheduleFocusBumps(dwell, generation);
  } catch (error) {
    console.warn("Tab Organizer: scheduling focus bump failed", error);
  }
}

/**
 * @param {number} [windowId]
 */
async function watchFocusedTab(windowId) {
  const query =
    windowId === undefined
      ? { active: true, lastFocusedWindow: true }
      : { active: true, windowId };
  const [tab] = await chrome.tabs.query(query);
  if (tab?.id === undefined || tab.windowId === undefined) {
    return;
  }

  await startDwell(tab.id, tab.windowId);
}

chrome.runtime.onInstalled.addListener(() => {
  scheduleOrganizeAll();
  return watchFocusedTab();
});

chrome.runtime.onStartup.addListener(() => {
  scheduleOrganizeAll();
  return watchFocusedTab();
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

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  clearDwellIfTab(tabId);
  if (!removeInfo.isWindowClosing) {
    enqueue(updateBadge);
  }
});

chrome.tabs.onActivated.addListener((info) =>
  startDwell(info.tabId, info.windowId),
);

chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    return;
  }

  return watchFocusedTab(windowId);
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

  if (changes.tabBumpSeconds || changes.groupBumpSeconds) {
    void rescheduleCurrentDwell();
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

chrome.alarms.onAlarm.addListener((alarm) => {
  const parsed = parseFocusAlarm(alarm.name);
  if (!parsed) {
    return;
  }

  queueFocusBump(parsed);
});
