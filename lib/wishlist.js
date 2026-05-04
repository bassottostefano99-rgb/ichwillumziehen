// Pure wishlist state operations. Runs in browser AND node.

function makeId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback for older runtimes
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function parsePriceCents(input) {
  if (typeof input === 'number' && Number.isFinite(input)) {
    return Math.round(input * 100);
  }
  if (typeof input !== 'string') throw new Error('Preis erforderlich');
  const cleaned = input.trim().replace(/\s/g, '').replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) throw new Error('Ungültiger Preis');
  return Math.round(parseFloat(cleaned) * 100);
}

export function normalizeItem(input) {
  const name = (input.name ?? '').trim();
  if (!name) throw new Error('Name erforderlich');
  const priceCents = parsePriceCents(input.price ?? input.priceCents);

  return {
    id: input.id ?? makeId(),
    name,
    priceCents,
    imageUrl: (input.imageUrl ?? input.image ?? '').trim() || null,
    linkUrl: (input.linkUrl ?? input.link ?? '').trim() || null,
    note: (input.note ?? '').trim() || null,
    createdAt: input.createdAt ?? Date.now(),
  };
}

export function addItem(list, item) {
  return [item, ...list];
}

export function deleteItem(list, id) {
  return list.filter(i => i.id !== id);
}

export function clearAll(_list) {
  return [];
}

export function calcTotal(list) {
  return list.reduce((sum, i) => sum + (i.priceCents ?? 0), 0);
}
