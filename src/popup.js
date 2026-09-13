import { getSettings, setSettings } from "./settings.js";

const autoOrganize = document.getElementById("autoOrganize");
const groupSubdomains = document.getElementById("groupSubdomains");
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
}

autoOrganize.addEventListener("change", async () => {
  await setSettings({ autoOrganize: autoOrganize.checked });
});

groupSubdomains.addEventListener("change", async () => {
  await setSettings({ groupSubdomains: groupSubdomains.checked });
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
