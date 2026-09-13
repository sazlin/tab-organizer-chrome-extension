export const DEFAULT_SETTINGS = {
  autoOrganize: true,
  groupSubdomains: true,
};

/**
 * @typedef {typeof DEFAULT_SETTINGS} Settings
 */

/**
 * @returns {Promise<Settings>}
 */
export async function getSettings() {
  const stored = await chrome.storage.local.get(DEFAULT_SETTINGS);
  return {
    autoOrganize: stored.autoOrganize !== false,
    groupSubdomains: stored.groupSubdomains !== false,
  };
}

/**
 * @param {Partial<Settings>} partial
 * @returns {Promise<void>}
 */
export async function setSettings(partial) {
  await chrome.storage.local.set(partial);
}
