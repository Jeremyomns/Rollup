/* =============================================================
   tests/logic.test.mjs — Tests de la logique métier (sans navigateur)
   Lancement :  node tests/logic.test.mjs
   ============================================================= */

import assert from 'node:assert/strict';
import {
  DURATION_BUCKETS, acceptsPlayers, matchesFilters, filterGames, sortGames,
  pickRandomGame, emptyFilters, normalizeGame, validateGame, durationLabel, playersLabel,
} from '../js/model.js';
import { toCSV, toJSON, parseImport } from '../js/io.js';
import { SEED_GAMES } from '../js/seed.js';

let passed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failures.push({ name, err });
    console.log(`  ✗ ${name}\n      ${err.message}`);
  }
}

const games = SEED_GAMES.map(normalizeGame);
const bucketOf = (d) => DURATION_BUCKETS.find((b) => b.match(d))?.id;

console.log('\nFiltre « nombre de joueurs »');
test('un jeu 2–4 accepte 2, 3 et 4 joueurs', () => {
  const g = normalizeGame({ name: 'X', minPlayers: 2, maxPlayers: 4 });
  [2, 3, 4].forEach((n) => assert.equal(acceptsPlayers(g, n), true, `${n} joueurs`));
});
test('un jeu 2–4 refuse 1 et 5 joueurs', () => {
  const g = normalizeGame({ name: 'X', minPlayers: 2, maxPlayers: 4 });
  assert.equal(acceptsPlayers(g, 1), false);
  assert.equal(acceptsPlayers(g, 5), false);
});
test('« 8 et + » ne retient que les jeux allant jusqu’à 8 joueurs ou plus', () => {
  assert.equal(acceptsPlayers(normalizeGame({ name: 'A', minPlayers: 5, maxPlayers: 12 }), 8), true);
  assert.equal(acceptsPlayers(normalizeGame({ name: 'B', minPlayers: 2, maxPlayers: 6 }), 8), false);
});
test('sans filtre joueurs, tous les jeux passent', () => {
  assert.equal(filterGames(games, emptyFilters()).length, games.length);
});

console.log('\nTranches de durée (bornes)');
test('les bornes tombent dans la bonne tranche', () => {
  assert.equal(bucketOf(10), 'lt15');
  assert.equal(bucketOf(15), '15-30');
  assert.equal(bucketOf(30), '15-30');
  assert.equal(bucketOf(31), '30-45');
  assert.equal(bucketOf(45), '30-45');
  assert.equal(bucketOf(60), '45-60');
  assert.equal(bucketOf(61), '60-120');
  assert.equal(bucketOf(120), '60-120');
  assert.equal(bucketOf(121), 'gt120');
});
test('chaque durée appartient à exactement une tranche', () => {
  for (let d = 1; d <= 400; d += 1) {
    const hits = DURATION_BUCKETS.filter((b) => b.match(d));
    assert.equal(hits.length, 1, `durée ${d} → ${hits.length} tranche(s)`);
  }
});

console.log('\nCombinaison de filtres');
test('les groupes se combinent en ET, les valeurs d’un groupe en OU', () => {
  const filters = { ...emptyFilters(), players: 4, durations: ['45-60', '60-120'], categories: ['strategie', 'cooperation'] };
  const result = filterGames(games, filters);
  assert.ok(result.length > 0, 'au moins un résultat attendu');
  for (const g of result) {
    assert.equal(acceptsPlayers(g, 4), true);
    assert.ok(['45-60', '60-120'].includes(bucketOf(g.duration)));
    assert.ok(['strategie', 'cooperation'].includes(g.category));
  }
});
test('favoris uniquement + jamais joués', () => {
  const result = filterGames(games, { ...emptyFilters(), favoritesOnly: true, played: 'never' });
  assert.ok(result.every((g) => g.favorite && !g.played));
  assert.ok(result.length >= 1);
});
test('la recherche porte sur le nom et la description', () => {
  assert.equal(filterGames(games, { ...emptyFilters(), search: 'cités' }).length, 1);
  assert.ok(filterGames(games, { ...emptyFilters(), search: 'solo' }).length >= 1);
  assert.equal(filterGames(games, { ...emptyFilters(), search: 'zzzz' }).length, 0);
});
test('un filtre trop restrictif renvoie une liste vide', () => {
  const impossible = { ...emptyFilters(), players: 8, durations: ['lt15'], complexities: ['expert'] };
  assert.equal(filterGames(games, impossible).length, 0);
});

console.log('\nTirage aléatoire');
test('le tirage ne sort jamais du résultat filtré (300 essais)', () => {
  const filters = { ...emptyFilters(), players: 2, durations: ['30-45', '45-60'] };
  const pool = filterGames(games, filters);
  assert.ok(pool.length >= 2);
  for (let i = 0; i < 300; i += 1) {
    const pick = pickRandomGame(pool);
    assert.ok(pool.some((g) => g.id === pick.id));
    assert.equal(matchesFilters(pick, filters), true);
  }
});
test('« Un autre jeu » ne retire pas deux fois le même jeu d’affilée', () => {
  const pool = games.slice(0, 5);
  let previous = pool[0].id;
  for (let i = 0; i < 100; i += 1) {
    const next = pickRandomGame(pool, previous);
    assert.notEqual(next.id, previous);
    previous = next.id;
  }
});
test('avec un seul résultat, le tirage renvoie toujours ce jeu', () => {
  const only = [games[0]];
  assert.equal(pickRandomGame(only, games[0].id).id, games[0].id);
});
test('une liste vide renvoie null', () => {
  assert.equal(pickRandomGame([]), null);
});

console.log('\nNormalisation et validation');
test('min et max inversés sont remis dans l’ordre', () => {
  const g = normalizeGame({ name: 'Y', minPlayers: 6, maxPlayers: 2 });
  assert.equal(g.minPlayers, 2);
  assert.equal(g.maxPlayers, 6);
});
test('les valeurs invalides retombent sur des valeurs sûres', () => {
  const g = normalizeGame({ name: 'Z', minPlayers: 'abc', duration: '', category: 'inconnue', complexity: 'x' });
  assert.equal(g.minPlayers, 1);
  assert.equal(g.duration, 30);
  assert.equal(g.category, 'autres');
  assert.equal(g.complexity, 'facile');
});
test('« oui » / « 1 » sont compris comme vrai', () => {
  assert.equal(normalizeGame({ name: 'A', favorite: 'oui', played: '1' }).favorite, true);
  assert.equal(normalizeGame({ name: 'A', favorite: 'oui', played: '1' }).played, true);
  assert.equal(normalizeGame({ name: 'A', favorite: 'non' }).favorite, false);
});
test('un nom vide est refusé, un jeu correct est accepté', () => {
  assert.ok(validateGame({ name: '  ', minPlayers: 2, maxPlayers: 4, duration: 30 }).name);
  assert.deepEqual(validateGame({ name: 'OK', minPlayers: 2, maxPlayers: 4, duration: 30 }), {});
});
test('max inférieur à min et durée nulle sont signalés', () => {
  const e = validateGame({ name: 'OK', minPlayers: 4, maxPlayers: 2, duration: 0 });
  assert.ok(e.maxPlayers);
  assert.ok(e.duration);
});
test('une image doit être une URL http(s) ou une data URL', () => {
  assert.ok(validateGame({ name: 'OK', minPlayers: 1, maxPlayers: 2, duration: 10, image: 'coucou' }).image);
  assert.equal(validateGame({ name: 'OK', minPlayers: 1, maxPlayers: 2, duration: 10, image: 'https://x/y.jpg' }).image, undefined);
});

console.log('\nLibellés');
test('durées et joueurs sont formatés en français', () => {
  assert.equal(durationLabel(45), '45 min');
  assert.equal(durationLabel(90), '1 h 30');
  assert.equal(durationLabel(120), '2 h');
  assert.equal(playersLabel({ minPlayers: 1, maxPlayers: 1 }), '1 joueur');
  assert.equal(playersLabel({ minPlayers: 2, maxPlayers: 4 }), '2 à 4 joueurs');
});

console.log('\nExport / import');
test('aller-retour CSV : même nombre de jeux et mêmes noms', () => {
  const csv = toCSV(games);
  const back = parseImport(csv, 'export.csv').map(normalizeGame);
  assert.equal(back.length, games.length);
  assert.deepEqual(back.map((g) => g.name).sort(), games.map((g) => g.name).sort());
});
test('aller-retour CSV : champs conservés', () => {
  const back = parseImport(toCSV(games), 'export.csv').map(normalizeGame);
  const source = games.find((g) => g.name === 'Les Cités de Sable');
  const copy = back.find((g) => g.name === 'Les Cités de Sable');
  ['minPlayers', 'maxPlayers', 'duration', 'category', 'complexity', 'favorite', 'played', 'description']
    .forEach((f) => assert.deepEqual(copy[f], source[f], `champ ${f}`));
});
test('CSV avec virgules, guillemets et retours à la ligne dans une cellule', () => {
  const tricky = [normalizeGame({
    name: 'Jeu "spécial", édition',
    description: 'Ligne 1\nLigne 2, avec virgule et "guillemets"',
    minPlayers: 2, maxPlayers: 5, duration: 40,
  })];
  const back = parseImport(toCSV(tricky), 'x.csv').map(normalizeGame);
  assert.equal(back.length, 1);
  assert.equal(back[0].name, 'Jeu "spécial", édition');
  assert.equal(back[0].description, 'Ligne 1\nLigne 2, avec virgule et "guillemets"');
});
test('CSV à séparateur point-virgule et intitulés français', () => {
  const csv = 'Nom;Joueurs min;Joueurs max;Durée;Catégorie;Complexité;Favori\nCarcasse;2;5;35;Stratégie;Intermédiaire;oui';
  const [g] = parseImport(csv, 'fr.csv').map(normalizeGame);
  assert.equal(g.name, 'Carcasse');
  assert.equal(g.minPlayers, 2);
  assert.equal(g.maxPlayers, 5);
  assert.equal(g.duration, 35);
  assert.equal(g.category, 'strategie');
  assert.equal(g.complexity, 'intermediaire');
  assert.equal(g.favorite, true);
});
test('aller-retour JSON', () => {
  const back = parseImport(toJSON(games), 'export.json');
  assert.equal(back.length, games.length);
  assert.equal(back[0].name, games[0].name);
});
test('un JSON simple (tableau nu) est accepté', () => {
  const back = parseImport('[{"name":"Mini","minPlayers":1,"maxPlayers":2}]', 'a.json');
  assert.equal(back[0].name, 'Mini');
});
test('les fichiers illisibles lèvent une erreur explicite', () => {
  assert.throws(() => parseImport('{pas du json', 'a.json'), /illisible/i);
  assert.throws(() => parseImport('colonne1,colonne2\na,b', 'a.csv'), /nom/i);
  assert.throws(() => parseImport('Nom\n', 'a.csv'), /vide|exploitable/i);
});

console.log('\nTri');
test('tri par nom, durée et joueurs', () => {
  const byName = sortGames(games, 'name').map((g) => g.name);
  assert.deepEqual(byName, [...byName].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })));
  const byDuration = sortGames(games, 'duration').map((g) => g.duration);
  assert.deepEqual(byDuration, [...byDuration].sort((a, b) => a - b));
  const byPlayers = sortGames(games, 'players').map((g) => g.minPlayers);
  assert.deepEqual(byPlayers, [...byPlayers].sort((a, b) => a - b));
});

/* ---------- Bilan ---------- */
console.log(`\n${passed} test(s) réussi(s), ${failures.length} échec(s).\n`);
if (failures.length) process.exit(1);
