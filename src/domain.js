const MULTI_PART_PUBLIC_SUFFIXES = new Set([
  "ac.uk",
  "co.in",
  "co.jp",
  "co.kr",
  "co.nz",
  "co.uk",
  "co.za",
  "com.au",
  "com.br",
  "com.mx",
  "github.io",
  "gov.uk",
  "net.au",
  "org.au",
  "org.uk",
]);

const GROUP_COLORS = [
  "blue",
  "red",
  "yellow",
  "green",
  "pink",
  "purple",
  "cyan",
  "orange",
];

/**
 * @param {string | undefined} urlString
 * @returns {string | null}
 */
export function hostnameFromUrl(urlString) {
  if (!urlString) {
    return null;
  }

  try {
    const url = new URL(urlString);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return null;
    }

    return url.hostname.replace(/^www\./i, "").toLowerCase();
  } catch {
    return null;
  }
}

/**
 * @param {string} hostname
 * @returns {boolean}
 */
function isIpAddress(hostname) {
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)) {
    return true;
  }

  return hostname.includes(":");
}

/**
 * @param {string} hostname
 * @returns {string}
 */
export function registrableDomain(hostname) {
  if (isIpAddress(hostname) || !hostname.includes(".")) {
    return hostname;
  }

  const parts = hostname.split(".");
  if (parts.length <= 2) {
    return hostname;
  }

  const lastTwo = parts.slice(-2).join(".");
  if (MULTI_PART_PUBLIC_SUFFIXES.has(lastTwo) && parts.length >= 3) {
    return parts.slice(-3).join(".");
  }

  return lastTwo;
}

/**
 * @param {string | undefined} urlString
 * @param {boolean} groupSubdomains
 * @returns {string | null}
 */
export function groupKey(urlString, groupSubdomains) {
  const hostname = hostnameFromUrl(urlString);
  if (!hostname) {
    return null;
  }

  return groupSubdomains ? registrableDomain(hostname) : hostname;
}

/**
 * @param {string} domain
 * @returns {(typeof GROUP_COLORS)[number]}
 */
export function colorForDomain(domain) {
  let hash = 0;
  for (let i = 0; i < domain.length; i += 1) {
    hash = (hash * 31 + domain.charCodeAt(i)) >>> 0;
  }

  return GROUP_COLORS[hash % GROUP_COLORS.length];
}
