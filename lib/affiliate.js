// Affiliate-Tag-Injection. Browser + Node compatible.

export function makeAffiliateConfig({ amazonTag, amazonEnabled = true }) {
  return { amazon: { tag: amazonTag, enabled: amazonEnabled } };
}

export function isAmazonUrl(url) {
  try {
    const u = new URL(url);
    return /(^|\.)amazon\.[a-z]+(\.[a-z]{2,})?$/i.test(u.hostname);
  } catch {
    return false;
  }
}

export function tagAffiliate(url, config) {
  if (!url || typeof url !== 'string') return url;
  try {
    const u = new URL(url);
    if (isAmazonUrl(url) && config?.amazon?.enabled) {
      u.searchParams.set('tag', config.amazon.tag);
      return u.toString();
    }
  } catch (_) {
    // Not a valid URL — return as-is
  }
  return url;
}
