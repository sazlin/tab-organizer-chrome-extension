export const DEFAULT_SETTINGS = {
  autoOrganize: true,
  groupSubdomains: true,
  tabBumpSeconds: 3,
  groupBumpSeconds: 30,
};

/**
 * @typedef {typeof DEFAULT_SETTINGS} Settings
 */

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
export function normalizeSeconds(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) {
    return fallback;
  }

  return n;
}

/**
 * @returns {Promise<Settings>}
 */
export async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return {
    autoOrganize: stored.autoOrganize !== false,
    groupSubdomains: stored.groupSubdomains !== false,
    tabBumpSeconds: normalizeSeconds(
      stored.tabBumpSeconds,
      DEFAULT_SETTINGS.tabBumpSeconds,
    ),
    groupBumpSeconds: normalizeSeconds(
      stored.groupBumpSeconds,
      DEFAULT_SETTINGS.groupBumpSeconds,
    ),
  };
}

/**
 * @param {Partial<Settings>} partial
 * @returns {Promise<void>}
 */
export async function setSettings(partial) {
  await chrome.storage.local.set(partial);
}
