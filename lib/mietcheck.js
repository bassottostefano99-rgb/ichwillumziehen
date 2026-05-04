// Pure functions for the affordability check.
// All money values are integers (€). No floats stored.

export const NK_INTERNET = 40;
export const NK_GEZ = 18;
export const NK_HAFTPFLICHT = 8;
export const KAUTION_MULT = 2;
export const RENOVIERUNG_PAUSCHALE = 500;
export const MOEBEL_RESERVE = 2000;

const LEBENSHALTUNG_KEYS = [
  'lebensmittel','essen','gym','kleidung','handy',
  'abos','urlaub','sparen','sonstiges'
];

export function calcStrom(qm) {
  return Math.round(50 + Math.max(0, qm - 40) * 0.5);
}

export function calcHeizung(qm) {
  return Math.round(qm * 2.0);
}

export function calcSonstNK() {
  return NK_INTERNET + NK_GEZ + NK_HAFTPFLICHT;
}

export function calcWarmmiete({ kaltmiete, qm }) {
  return kaltmiete + calcStrom(qm) + calcHeizung(qm) + calcSonstNK();
}

export function calcLebenshaltung(profile, cityData) {
  let sum = 0;
  for (const key of LEBENSHALTUNG_KEYS) {
    const override = profile.lebenshaltung?.[key];
    sum += (override ?? cityData.getEffectiveDefault(profile.city, key));
  }
  return sum;
}

export function calcAutoKosten(profile) {
  if (profile.auto === 'ja') {
    return (profile.autoRate ?? 0) + (profile.autoBenzin ?? 0) + (profile.autoVersicherung ?? 0);
  }
  if (profile.auto === 'nein') {
    return profile.autoOepnv ?? 0;
  }
  return 0;
}

export function calcSurplus(profile, listing, cityData) {
  const lebenshaltung = calcLebenshaltung(profile, cityData);
  const autoKosten = calcAutoKosten(profile);
  const totalOut = (profile.kvBetrag ?? 0) + autoKosten + lebenshaltung;
  const availForRent = profile.income - totalOut;
  const warm = calcWarmmiete(listing);
  return availForRent - warm;
}

export function getVerdict(surplus) {
  if (surplus > 500)  return { tone: 'ok',   text: 'Ja, machbar.',           sub: `+${surplus}€ Spielraum/Mo.` };
  if (surplus > 150)  return { tone: 'warn', text: 'Ja, aber knapp.',        sub: `Nur +${surplus}€ Puffer.` };
  if (surplus > 0)    return { tone: 'warn', text: 'Sehr knapp.',            sub: `Nur +${surplus}€ übrig.` };
  return                  { tone: 'bad',  text: 'Zu eng.',                sub: `Dir fehlen ${Math.abs(surplus)}€/Mo.` };
}

export function calcEinmalig(kaltmiete) {
  return kaltmiete * KAUTION_MULT + RENOVIERUNG_PAUSCHALE + MOEBEL_RESERVE;
}

export function runMietcheck(profile, listing, cityData) {
  const lebenshaltung = calcLebenshaltung(profile, cityData);
  const autoKosten = calcAutoKosten(profile);
  const totalOut = (profile.kvBetrag ?? 0) + autoKosten + lebenshaltung;
  const availForRent = profile.income - totalOut;
  const warmmiete = calcWarmmiete(listing);
  const surplus = availForRent - warmmiete;

  return {
    warmmiete,
    strom: calcStrom(listing.qm),
    heizung: calcHeizung(listing.qm),
    sonstNK: calcSonstNK(),
    lebenshaltung,
    autoKosten,
    totalOut,
    availForRent,
    surplus,
    verdict: getVerdict(surplus),
    einmalig: calcEinmalig(listing.kaltmiete),
    breakdown: {
      income: profile.income,
      kvBetrag: profile.kvBetrag ?? 0,
      autoKosten,
      lebenshaltung,
      kaltmiete: listing.kaltmiete,
      strom: calcStrom(listing.qm),
      heizung: calcHeizung(listing.qm),
      sonstNK: calcSonstNK(),
    },
  };
}
