// ── ichwillumziehen.com — UI glue & module wiring ───────────────────────────

import { createCityData } from './lib/cityData.js';
import * as MC from './lib/mietcheck.js';
import { tagAffiliate, makeAffiliateConfig, isAmazonUrl } from './lib/affiliate.js';
import { normalizeItem, addItem, deleteItem, clearAll, calcTotal } from './lib/wishlist.js';
import { createDefaultProfile, makeProfileStore, makeWishlistStore } from './lib/profile.js';

// Supabase
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { makeAuth } from './lib/auth.js';
import { makeSync } from './lib/sync.js';
import { makeConsentStore, isConsentDecided } from './lib/consent.js';

const SUPABASE_URL = 'https://bvtmvirboshsyiqknxdd.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2dG12aXJib3Noc3lpcWtueGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc5MTI3ODEsImV4cCI6MjA5MzQ4ODc4MX0.XLG_Bkj3RFOZSrtwYjS9inR3oYoBhI8cpONIau-NpP0';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const auth = makeAuth(supabase);
const consentStore = makeConsentStore({ storage: window.localStorage });
const ADSENSE_CLIENT = 'ca-pub-XXXXXXXXXXXXXXXX';        // TODO: replace after AdSense approval
const ADSENSE_SLOT_ID = 'XXXXXXXXXX';                     // TODO: replace after AdSense approval

// ── Config ──────────────────────────────────────────────────────────────────
const AFFILIATE = makeAffiliateConfig({
  amazonTag: 'PLATZHALTER-21',           // TODO: replace with real Amazon Partnernet tag
  amazonEnabled: true,
});

// ── State ───────────────────────────────────────────────────────────────────
const profileStore = makeProfileStore({ storage: window.localStorage });
const wishlistStore = makeWishlistStore({ storage: window.localStorage });
const sync = makeSync({ supabase, profileStore, wishlistStore });

let cityData = null;
let profile = profileStore.load() ?? createDefaultProfile();
let wishlist = wishlistStore.load();
let currentStep = 1;

// ── Init ────────────────────────────────────────────────────────────────────
async function init() {
  const res = await fetch('./city-data.json');
  if (!res.ok) throw new Error('city-data.json failed to load');
  cityData = createCityData(await res.json());

  initMietcheckUI();
  initWishlistUI();
  initAuthUI();
  initConsent();

  await auth.getSession();
  updateHeaderAuthState();
  if (auth.isLoggedIn()) {
    try {
      const { mergedProfile, mergedItems } = await sync.runOnLogin(auth.getUser().id);
      if (mergedProfile) profile = mergedProfile;
      if (mergedItems) wishlist = mergedItems;
    } catch (err) { console.error(err); }
  }

  renderProfile();
  renderWishlist();

  // Tag amazon links in inspiration cards
  document.querySelectorAll('[data-aff-amazon]').forEach(a => {
    a.href = tagAffiliate(a.href, AFFILIATE);
  });
}

// ── Format ──────────────────────────────────────────────────────────────────
const fmtEur = (cents) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format((cents ?? 0) / 100);
const fmtEurInt = (val) => `${Math.round(val).toLocaleString('de-DE')} €`;
const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const isSafeUrl = (url) => {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch { return false; }
};

// ── Mietcheck UI ────────────────────────────────────────────────────────────
function initMietcheckUI() {
  const $ = (id) => document.getElementById(id);

  // Income
  $('mc-income').addEventListener('input', e => { profile.income = parseInt(e.target.value) || 0; persistAndRevalidate(); });

  // KV
  document.querySelectorAll('[data-kv]').forEach(btn => btn.addEventListener('click', () => {
    profile.kv = btn.dataset.kv;
    document.querySelectorAll('[data-kv]').forEach(b => b.classList.toggle('sel', b === btn));
    $('mc-kv-x').hidden = profile.kv !== 'p';
    persistAndRevalidate();
  }));
  $('mc-kvb').addEventListener('input', e => { profile.kvBetrag = parseInt(e.target.value) || 0; persistAndRevalidate(); });

  // Auto
  document.querySelectorAll('[data-auto]').forEach(btn => btn.addEventListener('click', () => {
    profile.auto = btn.dataset.auto;
    document.querySelectorAll('[data-auto]').forEach(b => b.classList.toggle('sel', b === btn));
    $('mc-auto-x').hidden = profile.auto !== 'ja';
    $('mc-oepnv-x').hidden = profile.auto !== 'nein';
    persistAndRevalidate();
  }));
  $('mc-arate').addEventListener('input', e => { profile.autoRate = parseInt(e.target.value) || 0; persistAndRevalidate(); });
  $('mc-abenzin').addEventListener('input', e => { profile.autoBenzin = parseInt(e.target.value) || 0; persistAndRevalidate(); });
  $('mc-avers').addEventListener('input', e => { profile.autoVersicherung = parseInt(e.target.value) || 0; persistAndRevalidate(); });
  $('mc-oepnv').addEventListener('input', e => { profile.autoOepnv = parseInt(e.target.value) || 0; persistAndRevalidate(); });

  // City
  const citySelect = $('mc-city');
  cityData.listCities().forEach(c => {
    const opt = document.createElement('option');
    opt.value = c; opt.textContent = c === 'ANDERE' ? 'Andere Stadt' : c;
    citySelect.appendChild(opt);
  });
  citySelect.addEventListener('change', e => { profile.city = e.target.value; renderTierPill(); renderEstList(); persistAndRevalidate(); });

  // Wohnung
  $('mc-kalt').addEventListener('input', persistAndRevalidate);
  $('mc-qm').addEventListener('input', persistAndRevalidate);

  // Navigation
  $('mc-next').addEventListener('click', goNext);
  $('mc-back').addEventListener('click', goBack);
}

function renderProfile() {
  const $ = (id) => document.getElementById(id);
  $('mc-income').value = profile.income || '';
  document.querySelectorAll('[data-kv]').forEach(b => b.classList.toggle('sel', b.dataset.kv === profile.kv));
  $('mc-kv-x').hidden = profile.kv !== 'p';
  $('mc-kvb').value = profile.kvBetrag || '';
  document.querySelectorAll('[data-auto]').forEach(b => b.classList.toggle('sel', b.dataset.auto === profile.auto));
  $('mc-auto-x').hidden = profile.auto !== 'ja';
  $('mc-oepnv-x').hidden = profile.auto !== 'nein';
  $('mc-arate').value = profile.autoRate || '';
  $('mc-abenzin').value = profile.autoBenzin || '';
  $('mc-avers').value = profile.autoVersicherung || '';
  $('mc-oepnv').value = profile.autoOepnv || '';
  if (profile.city) $('mc-city').value = profile.city;
  renderTierPill();
  renderEstList();
  persistAndRevalidate();
}

function renderTierPill() {
  const pill = document.getElementById('mc-city-info');
  if (!profile.city) { pill.hidden = true; return; }
  const tier = cityData.getCityTier(profile.city);
  const tierObj = cityData.getTier(tier);
  pill.hidden = false;
  pill.textContent = `${tierObj.label} (Tier ${tier}) — Lebensmittel/Restaurant/Sport angepasst`;
}

function renderEstList() {
  const list = document.getElementById('mc-est-list');
  const cats = MC.LEBENSHALTUNG_KEYS;
  const labels = {
    lebensmittel: ['Lebensmittel', 'Einkaufen & Kochen'],
    essen: ['Essen gehen & Lieferando', 'Restaurant, Delivery'],
    gym: ['Sport & Hobbys', 'Gym, Verein'],
    kleidung: ['Kleidung & Drogerie', 'Shopping, Hygiene'],
    handy: ['Handy', 'Tarif + Daten'],
    abos: ['Streaming & Abos', 'Netflix, Spotify ...'],
    urlaub: ['Urlaub & Freizeit', 'Ø pro Monat'],
    sparen: ['Sparen / ETF', 'Rücklage, Investition'],
    sonstiges: ['Sonstiges', 'Unvorhergesehenes'],
  };
  list.innerHTML = cats.map(id => {
    const def = profile.city ? cityData.getEffectiveDefault(profile.city, id) : (cityData.getDefaults()[id] ?? 0);
    const override = profile.lebenshaltung[id];
    const value = override ?? def;
    const isOverride = override != null;
    return `
      <div class="mc-est${isOverride ? ' editing' : ''}" data-cat="${id}">
        <div class="mc-est-name">${labels[id][0]}<span class="sub">${isOverride ? '✓ Eigener Wert' : 'Geschätzt'}</span></div>
        <span class="mc-est-amt${isOverride ? ' c' : ''}">~${value}€</span>
        <button class="mc-est-edit" data-cat="${id}" type="button">${isOverride ? '✓' : 'Anpassen'}</button>
        <div class="mc-est-input" data-cat="${id}"><input type="number" value="${value}" /></div>
      </div>`;
  }).join('');

  list.querySelectorAll('.mc-est-edit').forEach(btn => btn.addEventListener('click', () => toggleEstEdit(btn.dataset.cat)));
  list.querySelectorAll('.mc-est-input input').forEach(inp => {
    inp.addEventListener('change', e => {
      const cat = e.target.parentElement.dataset.cat;
      profile.lebenshaltung[cat] = parseInt(e.target.value) || 0;
      renderEstList();
      persistAndRevalidate();
    });
  });
}

function toggleEstEdit(cat) {
  const inputBox = document.querySelector(`.mc-est-input[data-cat="${cat}"]`);
  inputBox.classList.toggle('open');
  if (inputBox.classList.contains('open')) inputBox.querySelector('input').focus();
}

function persistAndRevalidate() {
  profileStore.save(profile);
  if (auth.isLoggedIn()) sync.pushProfile(auth.getUser().id, profile).catch(console.error);
  validateNext();
}

function validateNext() {
  const $ = (id) => document.getElementById(id);
  const next = $('mc-next');
  if (currentStep === 1) {
    next.disabled = !(profile.income >= 300 && profile.kv && profile.auto);
    next.textContent = 'Weiter';
  } else if (currentStep === 2) {
    next.disabled = !profile.city;
    next.textContent = 'Wohnung prüfen';
  } else {
    const kalt = parseInt($('mc-kalt').value) || 0;
    const qm = parseInt($('mc-qm').value) || 0;
    next.disabled = !(kalt > 100 && qm > 5);
    next.textContent = 'Berechnen';
  }
}

function showStep(n) {
  currentStep = n;
  document.querySelectorAll('.mc-screen').forEach(el => { el.hidden = parseInt(el.dataset.step) !== n; });
  for (let i = 1; i <= 3; i++) {
    document.getElementById(`mc-step-${i}`).classList.toggle('done', i <= n);
  }
  document.getElementById('mc-back').hidden = n === 1;
  validateNext();
  if (n === 2) renderEstList();
}

function goNext() {
  const $ = (id) => document.getElementById(id);
  if (currentStep === 1) showStep(2);
  else if (currentStep === 2) showStep(3);
  else if (currentStep === 3) {
    const listing = { kaltmiete: parseInt($('mc-kalt').value) || 0, qm: parseInt($('mc-qm').value) || 0 };
    renderResult(listing);
  }
}

function goBack() {
  if (currentStep > 1) showStep(currentStep - 1);
}

function renderResult(listing) {
  const result = MC.runMietcheck(profile, listing, cityData);
  const v = result.verdict;
  const sc = v.tone;

  const html = `
    <div class="mc-verdict ${sc}">${escapeHtml(v.text)}</div>
    <div class="mc-verdict-sub">${escapeHtml(v.sub)}</div>
    <div class="mc-surplus ${sc}">
      <div class="mc-snum" style="color:${sc==='ok'?'var(--accent)':sc==='warn'?'var(--warn)':'var(--bad)'}">${result.surplus>0?'+':''}${result.surplus}€</div>
      <div class="mc-slbl">verbleiben dir monatlich</div>
    </div>
    <span class="mc-slabel">Dein Budget</span>
    <div class="mc-bdown">
      <div class="mc-brow"><span class="mc-bl">Nettoeinkommen</span><span class="mc-bv mc-pos">+${result.breakdown.income}€</span></div>
      ${result.breakdown.kvBetrag > 0 ? `<div class="mc-brow"><span class="mc-bl">Private KV</span><span class="mc-bv mc-neg">-${result.breakdown.kvBetrag}€</span></div>` : ''}
      ${result.breakdown.autoKosten > 0 ? `<div class="mc-brow"><span class="mc-bl">${profile.auto==='ja'?'Auto':'ÖPNV'}</span><span class="mc-bv mc-neg">-${result.breakdown.autoKosten}€</span></div>` : ''}
      <div class="mc-brow"><span class="mc-bl">Lebenshaltung</span><span class="mc-bv mc-neg">-${result.breakdown.lebenshaltung}€</span></div>
      <div class="mc-brow tot"><span class="mc-bl">Für Wohnung verfügbar</span><span class="mc-bv" style="color:${result.availForRent>0?'var(--accent)':'var(--bad)'}">${result.availForRent>0?'+':''}${result.availForRent}€</span></div>
    </div>
    <span class="mc-slabel">Diese Wohnung</span>
    <div class="mc-bdown">
      <div class="mc-brow"><span class="mc-bl">Kaltmiete</span><span class="mc-bv mc-neg">-${result.breakdown.kaltmiete}€</span></div>
      <div class="mc-brow"><span class="mc-bl">Strom (~${listing.qm}m²)</span><span class="mc-bv mc-neg">-${result.breakdown.strom}€</span></div>
      <div class="mc-brow"><span class="mc-bl">Heizung &amp; Wasser</span><span class="mc-bv mc-neg">-${result.breakdown.heizung}€</span></div>
      <div class="mc-brow"><span class="mc-bl">Internet + GEZ + Haftpflicht</span><span class="mc-bv mc-neg">-${result.breakdown.sonstNK}€</span></div>
      <div class="mc-brow tot"><span class="mc-bl">Warmmiete gesamt</span><span class="mc-bv">${result.warmmiete}€</span></div>
    </div>
    <span class="mc-slabel">Einmalig beim Einzug</span>
    <div class="mc-bdown">
      <div class="mc-brow"><span class="mc-bl">Kaution (2× Kaltmiete)</span><span class="mc-bv">${listing.kaltmiete * 2}€</span></div>
      <div class="mc-brow"><span class="mc-bl">Renovierung Pauschal</span><span class="mc-bv">500€</span></div>
      <div class="mc-brow"><span class="mc-bl">Möbel-Reserve</span><span class="mc-bv">2.000€</span></div>
      <div class="mc-brow tot"><span class="mc-bl">Gesamt einmalig</span><span class="mc-bv">${result.einmalig}€</span></div>
    </div>
  `;
  document.getElementById('mc-result').innerHTML = html;
  document.getElementById('mc-result').scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Show Strom-Affiliate card after a result is generated
  document.querySelector('[data-aff="strom"]').hidden = false;
}

// ── Wishlist UI ─────────────────────────────────────────────────────────────
function initWishlistUI() {
  const form = document.getElementById('wl-form');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      const item = normalizeItem({
        name: fd.get('name'),
        price: fd.get('price'),
        imageUrl: fd.get('image'),
        linkUrl: fd.get('link'),
        note: fd.get('note'),
      });
      wishlist = addItem(wishlist, item);
      wishlistStore.save(wishlist);
      if (auth.isLoggedIn()) sync.pushItem(auth.getUser().id, item).catch(console.error);
      form.reset();
      document.getElementById('wl-name').focus();
      renderWishlist();
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById('wl-clear').addEventListener('click', () => {
    if (!wishlist.length) return;
    if (!confirm('Wirklich alle Items löschen?')) return;
    wishlist = clearAll(wishlist);
    wishlistStore.save(wishlist);
    renderWishlist();
  });
}

function renderWishlist() {
  const grid = document.getElementById('wl-grid');
  const total = document.getElementById('wl-total');

  if (!wishlist.length) {
    grid.innerHTML = `<div class="wl-empty">Füge dein erstes Item hinzu — Möbel, Deko, Werkzeuge. Bild und Kauflink optional.</div>`;
  } else {
    grid.innerHTML = wishlist.map(item => {
      const imgHtml = isSafeUrl(item.imageUrl)
        ? `<img src="${escapeHtml(item.imageUrl)}" alt="${escapeHtml(item.name)}" loading="lazy" onerror="this.outerHTML='Kein Bild'" />`
        : 'Kein Bild';
      const taggedLink = tagAffiliate(item.linkUrl, AFFILIATE);
      const isAmazon = isAmazonUrl(item.linkUrl);
      const linkHtml = isSafeUrl(taggedLink)
        ? `<a class="wl-buy" href="${escapeHtml(taggedLink)}" target="_blank" rel="noopener nofollow sponsored">Zum Shop${isAmazon ? '<span class="wl-werb">(Werbung)</span>' : ''}</a>`
        : `<span class="wl-buy disabled">Kein Link</span>`;
      return `
        <article class="wl-card" data-id="${item.id}">
          <div class="wl-card-img">${imgHtml}</div>
          <div class="wl-card-body">
            <div class="wl-card-top">
              <span class="wl-card-name">${escapeHtml(item.name)}</span>
              <span class="wl-card-price">${fmtEur(item.priceCents)}</span>
            </div>
            <div class="wl-card-note">${escapeHtml(item.note ?? '')}</div>
            <div class="wl-card-actions">
              ${linkHtml}
              <button class="wl-del" type="button" data-del="${item.id}">✕</button>
            </div>
          </div>
        </article>`;
    }).join('');
    grid.querySelectorAll('[data-del]').forEach(btn => btn.addEventListener('click', () => {
      wishlist = deleteItem(wishlist, btn.dataset.del);
      wishlistStore.save(wishlist);
      if (auth.isLoggedIn()) sync.deleteItemRemote(btn.dataset.del).catch(console.error);
      renderWishlist();
    }));
  }

  total.textContent = fmtEur(calcTotal(wishlist));
}

// ── Auth UI ─────────────────────────────────────────────────────────────────
function initAuthUI() {
  const btn = document.getElementById('btn-open-login');
  const modal = document.getElementById('login-modal');
  const form = document.getElementById('login-form');
  const input = document.getElementById('login-email');
  const status = document.getElementById('login-status');
  const submit = document.getElementById('login-submit');

  btn.addEventListener('click', async () => {
    if (auth.isLoggedIn()) {
      if (confirm('Möchtest du dich abmelden?')) {
        await auth.signOut();
      }
    } else {
      input.value = '';
      status.hidden = true;
      modal.showModal();
    }
  });

  form.addEventListener('submit', async (e) => {
    if (e.submitter && e.submitter.value === 'cancel') return;
    if (e.submitter && e.submitter.value !== 'confirm') return;
    e.preventDefault();
    submit.disabled = true;
    try {
      await auth.signInWithMagicLink(input.value);
      status.textContent = '✓ Login-Link verschickt — schau in dein Postfach.';
      status.hidden = false;
    } catch (err) {
      status.textContent = '✗ Fehler: ' + err.message;
      status.hidden = false;
    } finally {
      submit.disabled = false;
    }
  });

  // Header state on auth change
  auth.onChange(async (event, session) => {
    updateHeaderAuthState();
    if (event === 'SIGNED_IN' && session?.user) {
      modal.close();
      try {
        const { mergedProfile, mergedItems } = await sync.runOnLogin(session.user.id);
        if (mergedProfile) profile = mergedProfile;
        if (mergedItems) wishlist = mergedItems;
        renderProfile();
        renderWishlist();
      } catch (err) {
        console.error('Sync failed:', err);
      }
    }
  });
}

function updateHeaderAuthState() {
  const btn = document.getElementById('btn-open-login');
  if (auth.isLoggedIn()) {
    const u = auth.getUser();
    btn.textContent = u?.email ?? 'Abmelden';
    btn.classList.add('logged-in');
  } else {
    btn.textContent = 'Anmelden';
    btn.classList.remove('logged-in');
  }
}

function initConsent() {
  const banner = document.getElementById('cookie-banner');
  const form = document.getElementById('cookie-form');
  const ckAds = document.getElementById('ck-ads');

  const existing = consentStore.load();
  if (!isConsentDecided(existing)) {
    banner.showModal();
  } else {
    applyConsent(existing);
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const choice = e.submitter?.value;
    const ads = choice === 'all' ? true : ckAds.checked;
    const saved = consentStore.save({ ads });
    banner.close();
    applyConsent(saved);
  });

  document.getElementById('ftr-cookies').addEventListener('click', e => {
    e.preventDefault();
    const c = consentStore.load();
    ckAds.checked = !!c?.ads;
    banner.showModal();
  });
}

function applyConsent(consent) {
  loadAdSense({ personalized: !!consent.ads });
}

function loadAdSense({ personalized }) {
  const slot = document.getElementById('adsense-slot');
  if (slot.dataset.loaded === '1') return;        // never load twice

  // Use IntersectionObserver to defer load until scrolled near
  const obs = new IntersectionObserver((entries, o) => {
    if (!entries.some(e => e.isIntersecting)) return;
    o.disconnect();

    if (ADSENSE_CLIENT.includes('XXXX')) return;        // not yet approved — leave empty
    slot.dataset.loaded = '1';
    slot.hidden = false;
    slot.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${ADSENSE_CLIENT}" data-ad-slot="${ADSENSE_SLOT_ID}" data-ad-format="auto" data-full-width-responsive="true"${personalized ? '' : ' data-npa-on-unknown-consent="true"'}></ins>`;
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    s.crossOrigin = 'anonymous';
    document.head.appendChild(s);
    s.onload = () => { (window.adsbygoogle = window.adsbygoogle || []).push({}); };
  }, { rootMargin: '300px' });
  obs.observe(slot);
}

// ── Boot ────────────────────────────────────────────────────────────────────
init().catch(err => {
  console.error(err);
  document.body.innerHTML = `<pre style="padding:20px;color:#ff6b6b">Fehler beim Laden: ${err.message}</pre>`;
});
