// Domain logic. Pure functions only — no DOM, no network, no globals.
// Everything here can be tested by calling it with plain objects.

export const WEAPON_FAMILIES = [
  "Laser",
  "Hybrid",
  "Projectile",
  "Light Missiles",
  "Rockets",
  "Advanced Light Missiles",
  "Advanced Rockets"
];

/**
 * Mean resistance per damage type across the three layers.
 * @param {{shield:number[], armor:number[], hull:number[]}} res
 * @returns {number[]} one value per damage type, same order as damageTypes
 */
export function averageResistances(res) {
  return res.shield.map((_, i) => (res.shield[i] + res.armor[i] + res.hull[i]) / 3);
}

/**
 * Index of the lowest average resistance.
 * @param {number[]} averages
 * @returns {number}
 */
export function weakestIndex(averages) {
  return averages.indexOf(Math.min(...averages));
}

/**
 * Effective damage of one round against a resistance profile.
 * @param {number[]} damage per damage type
 * @param {number[]} averages per damage type, as percentages
 * @returns {number}
 */
export function damageScore(damage, averages) {
  return damage.reduce((sum, v, i) => sum + v * (1 - averages[i] / 100), 0);
}

/**
 * Top-scoring rounds within one weapon family.
 * @param {Array} ammo full ammo list
 * @param {number[]} averages resistance profile to score against
 * @param {string} family
 * @param {number} limit
 * @returns {Array} ammo entries with an added `score`
 */
export function rankAmmo(ammo, averages, family, limit = 2) {
  return ammo
    .filter(a => a.family === family)
    .map(a => ({ ...a, score: damageScore(a.dmg, averages) }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/**
 * Apply the search box and the two dropdowns.
 * @param {Array} ships
 * @param {{query:string, faction:string, class:string}} filters
 * @returns {Array}
 */
export function filterShips(ships, filters) {
  const q = filters.query.trim().toLowerCase();
  return ships.filter(s =>
    (!q || s.name.toLowerCase().includes(q)) &&
    (filters.faction === "all" || s.faction === filters.faction) &&
    (filters.class === "all" || s.class === filters.class)
  );
}

/**
 * Count ships per value of a given key, sorted alphabetically.
 * @param {Array} ships
 * @param {string} key e.g. "group" or "faction"
 * @returns {Array<[string, number]>}
 */
export function countBy(ships, key) {
  const counts = {};
  for (const s of ships) counts[s[key]] = (counts[s[key]] || 0) + 1;
  return Object.entries(counts).sort((a, b) => a[0].localeCompare(b[0]));
}
