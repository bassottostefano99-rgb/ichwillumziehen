// Pure module — accepts the parsed JSON, returns query-functions.
// No I/O, no globals. Browser and Node both call createCityData(data).

export function createCityData(data) {
  const { defaults, tiers, cities } = data;

  function getCityTier(city) {
    return cities[city] ?? 'XL';
  }

  function getMultiplier(city, category) {
    const tier = getCityTier(city);
    return tiers[tier]?.mul?.[category] ?? 1.0;
  }

  function getEffectiveDefault(city, category) {
    const base = defaults[category] ?? 0;
    return Math.round(base * getMultiplier(city, category));
  }

  function listCities() {
    return Object.keys(cities).sort((a, b) => a.localeCompare(b, 'de'));
  }

  function getDefaults() {
    return { ...defaults };
  }

  function getTier(tierKey) {
    return tiers[tierKey];
  }

  return { getCityTier, getMultiplier, getEffectiveDefault, listCities, getDefaults, getTier };
}
