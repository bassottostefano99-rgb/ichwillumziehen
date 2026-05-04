// Profile + Wishlist storage abstractions.
// Storage is injected (window.localStorage in browser, mock in tests).

const PROFILE_KEY = 'iwu_profile';
const WISHLIST_KEY = 'iwu_wishlist';

const LEBENSHALTUNG_KEYS = [
  'lebensmittel','essen','gym','kleidung','handy',
  'abos','urlaub','sparen','sonstiges',
];

export function createDefaultProfile() {
  const lebenshaltung = {};
  for (const k of LEBENSHALTUNG_KEYS) lebenshaltung[k] = null;
  return {
    income: 0,
    kv: '',
    kvBetrag: 0,
    auto: '',
    autoRate: 0,
    autoBenzin: 0,
    autoVersicherung: 0,
    autoOepnv: 0,
    city: '',
    lebenshaltung,
    updatedAt: Date.now(),
  };
}

export function makeProfileStore({ storage }) {
  return {
    load() {
      const raw = storage.getItem(PROFILE_KEY);
      if (!raw) return null;
      try { return JSON.parse(raw); } catch { return null; }
    },
    save(profile) {
      const stamped = { ...profile, updatedAt: Date.now() };
      storage.setItem(PROFILE_KEY, JSON.stringify(stamped));
    },
    clear() {
      storage.removeItem(PROFILE_KEY);
    },
  };
}

export function makeWishlistStore({ storage }) {
  return {
    load() {
      const raw = storage.getItem(WISHLIST_KEY);
      if (!raw) return [];
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    },
    save(items) {
      storage.setItem(WISHLIST_KEY, JSON.stringify(items));
    },
    clear() {
      storage.removeItem(WISHLIST_KEY);
    },
  };
}
