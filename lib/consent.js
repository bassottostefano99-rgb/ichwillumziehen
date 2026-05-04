const KEY = 'iwu_consent';

export function makeConsentStore({ storage }) {
  return {
    load() {
      const raw = storage.getItem(KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    },
    save({ ads }) {
      const c = { necessary: true, ads: !!ads, decidedAt: Date.now() };
      storage.setItem(KEY, JSON.stringify(c));
      return c;
    },
    clear() { storage.removeItem(KEY); },
  };
}

export function isConsentDecided(consent) {
  return !!(consent && consent.decidedAt);
}
