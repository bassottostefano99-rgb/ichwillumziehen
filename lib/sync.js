// Sync logic — supabase + storage are injected (DI for testability).

const PROFILE_TABLE = 'profiles';
const WISHLIST_TABLE = 'wishlist_items';

// === Pure merge functions ===
export function mergeProfile(local, db) {
  if (!local && !db) return null;
  if (!local) return db;
  if (!db) return local;
  // Both are in ms timestamps at this point (after conversion from DB)
  const localTs = local.updatedAt ?? 0;
  const dbTs = db.updatedAt ?? 0;
  return localTs >= dbTs ? local : db;
}

export function mergeWishlist(local, db) {
  const map = new Map();
  for (const item of local) map.set(item.id, item);
  // DB wins on id-conflict
  for (const item of db) map.set(item.id, item);
  return Array.from(map.values()).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
}

// Convert app-shape profile ↔ DB-shape profile
function profileToDbRow(profile, userId) {
  return {
    user_id: userId,
    income: profile.income,
    kv: profile.kv || null,
    kv_betrag: profile.kvBetrag,
    auto: profile.auto || null,
    auto_rate: profile.autoRate,
    auto_benzin: profile.autoBenzin,
    auto_versicherung: profile.autoVersicherung,
    auto_oepnv: profile.autoOepnv,
    city: profile.city || null,
    lebenshaltung: profile.lebenshaltung,
    updated_at: new Date(profile.updatedAt ?? Date.now()).toISOString(),
  };
}
function profileFromDbRow(row) {
  if (!row) return null;
  return {
    income: row.income ?? 0,
    kv: row.kv ?? '',
    kvBetrag: row.kv_betrag ?? 0,
    auto: row.auto ?? '',
    autoRate: row.auto_rate ?? 0,
    autoBenzin: row.auto_benzin ?? 0,
    autoVersicherung: row.auto_versicherung ?? 0,
    autoOepnv: row.auto_oepnv ?? 0,
    city: row.city ?? '',
    lebenshaltung: row.lebenshaltung ?? {},
    updatedAt: row.updated_at ? Date.parse(row.updated_at) : Date.now(),
  };
}

function itemToDbRow(item, userId) {
  return {
    id: item.id,
    user_id: userId,
    name: item.name,
    price_cents: item.priceCents,
    image_url: item.imageUrl,
    link_url: item.linkUrl,
    note: item.note,
    created_at: new Date(item.createdAt ?? Date.now()).toISOString(),
  };
}
function itemFromDbRow(row) {
  return {
    id: row.id,
    name: row.name,
    priceCents: row.price_cents,
    imageUrl: row.image_url,
    linkUrl: row.link_url,
    note: row.note,
    createdAt: row.created_at ? Date.parse(row.created_at) : Date.now(),
  };
}

// === Sync orchestrator ===
export function makeSync({ supabase, profileStore, wishlistStore }) {

  async function runOnLogin(userId) {
    // Profile
    const localProfile = profileStore.load();
    const { data: dbProfileRow } = await supabase.from(PROFILE_TABLE).select('*').eq('user_id', userId).maybeSingle();
    const dbProfile = profileFromDbRow(dbProfileRow);

    const winner = mergeProfile(localProfile, dbProfile);
    if (winner) {
      profileStore.save(winner);
      const { error } = await supabase.from(PROFILE_TABLE).upsert(profileToDbRow(winner, userId), { onConflict: 'user_id' });
      if (error) console.error('Profile upsert failed:', error);
    }

    // Wishlist
    const localItems = wishlistStore.load();
    const { data: dbItems } = await supabase.from(WISHLIST_TABLE).select('*').eq('user_id', userId);
    const dbItemsConverted = (dbItems ?? []).map(itemFromDbRow);

    const merged = mergeWishlist(localItems, dbItemsConverted);
    wishlistStore.save(merged);

    // Push local-only items to DB
    const dbIds = new Set(dbItemsConverted.map(i => i.id));
    const newOnes = localItems.filter(i => !dbIds.has(i.id));
    if (newOnes.length) {
      const rows = newOnes.map(i => itemToDbRow(i, userId));
      const { error } = await supabase.from(WISHLIST_TABLE).insert(rows);
      if (error) console.error('Wishlist insert failed:', error);
    }

    return { mergedProfile: winner, mergedItems: merged };
  }

  async function pushProfile(userId, profile) {
    const { error } = await supabase.from(PROFILE_TABLE).upsert(profileToDbRow(profile, userId), { onConflict: 'user_id' });
    if (error) console.error('Profile push failed:', error);
  }

  async function pushItem(userId, item) {
    const { error } = await supabase.from(WISHLIST_TABLE).upsert(itemToDbRow(item, userId));
    if (error) console.error('Item push failed:', error);
  }

  async function deleteItemRemote(itemId) {
    const { error } = await supabase.from(WISHLIST_TABLE).delete().eq('id', itemId);
    if (error) console.error('Item delete failed:', error);
  }

  return { runOnLogin, pushProfile, pushItem, deleteItemRemote };
}
