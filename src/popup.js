import { DEFAULT_SETTINGS, getSettings, setSettings } from "./settings.js";

const autoOrganize = document.getElementById("autoOrganize");
const groupSubdomains = document.getElementById("groupSubdomains");
const tabBumpSeconds = document.getElementById("tabBumpSeconds");
const groupBumpSeconds = document.getElementById("groupBumpSeconds");
const organizeNow = document.getElementById("organizeNow");
const status = document.getElementById("status");

/**
 * @returns {Promise<void>}
 */
async function refreshStatus() {
  const [groups, tabs] = await Promise.all([
    chrome.tabGroups.query({}),
    chrome.tabs.query({}),
  ]);

  const httpTabs = tabs.filter((tab) => tab.url?.startsWith("http")).length;
  status.textContent = `${groups.length} group${groups.length === 1 ? "" : "s"} across ${httpTabs} site tab${httpTabs === 1 ? "" : "s"}`;
}

async function restoreSettings() {
  const settings = await getSettings();
  autoOrganize.checked = settings.autoOrganize;
  groupSubdomains.checked = settings.groupSubdomains;
  tabBumpSeconds.value = String(settings.tabBumpSeconds);
  groupBumpSeconds.value = String(settings.groupBumpSeconds);
}

/**
 * @param {HTMLInputElement} input
 * @param {number} fallback
 * @returns {number}
 */
function readSeconds(input, fallback) {
  const n = Number(input.value);
  if (input.value === "" || !Number.isFinite(n) || n < 0) {
    input.value = String(fallback);
    return fallback;
  }

  return n;
}

autoOrganize.addEventListener("change", async () => {
  await setSettings({ autoOrganize: autoOrganize.checked });
});

groupSubdomains.addEventListener("change", async () => {
  await setSettings({ groupSubdomains: groupSubdomains.checked });
});

tabBumpSeconds.addEventListener("change", async () => {
  await setSettings({
    tabBumpSeconds: readSeconds(tabBumpSeconds, DEFAULT_SETTINGS.tabBumpSeconds),
  });
});

groupBumpSeconds.addEventListener("change", async () => {
  await setSettings({
    groupBumpSeconds: readSeconds(
      groupBumpSeconds,
      DEFAULT_SETTINGS.groupBumpSeconds,
    ),
  });
});

organizeNow.addEventListener("click", async () => {
  organizeNow.disabled = true;
  organizeNow.textContent = "Organizing...";

  try {
    await chrome.runtime.sendMessage({ type: "organize-now" });
    await refreshStatus();
  } finally {
    organizeNow.disabled = false;
    organizeNow.textContent = "Organize now";
  }
});

await restoreSettings();
await refreshStatus();
