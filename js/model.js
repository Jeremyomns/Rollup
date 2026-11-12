/* =============================================================
   model.js — LOGIQUE MÉTIER (aucune dépendance au DOM ni au stockage)
   Définit : les référentiels (catégories, complexités, durées),
   la création / validation d'un jeu, le moteur de filtres et le tirage.
   ============================================================= */

/* ---------- Référentiels ---------- */

export const CATEGORIES = [
  { id: 'strategie',   label: 'Stratégie' },
  { id: 'cooperation', label: 'Coopération' },
  { id: 'ambiance',    label: 'Ambiance' },
  { id: 'reflexion',   label: 'Réflexion' },
  { id: 'familial',    label: 'Familial' },
  { id: 'cartes',      label: 'Cartes' },
  { id: 'autres',      label: 'Autres' },
];

export const COMPLEXITIES = [
  { id: 'facile',        label: 'Facile' },
  { id: 'intermediaire', label: 'Intermédiaire' },
  { id: 'expert',        label: 'Expert' },
];

/** Tranches de durée (en minutes). `match` reçoit la durée du jeu. */
export const DURATION_BUCKETS = [
  { id: 'lt15',    label: 'Moins de 15 min', match: (d) => d < 15 },
  { id: '15-30',   label: '15 à 30 min',     match: (d) => d >= 15 && d <= 30 },
  { id: '30-45',   label: '30 à 45 min',     match: (d) => d > 30 && d <= 45 },
  { id: '45-60',   label: '45 min à 1 h',    match: (d) => d > 45 && d <= 60 },
  { id: '60-120',  label: '1 h à 2 h',       match: (d) => d > 60 && d <= 120 },
  { id: 'gt120',   label: 'Plus de 2 h',     match: (d) => d > 120 },
];

/** Options du filtre « nombre de joueurs ». 8 signifie « 8 et plus ». */
export const PLAYER_OPTIONS = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
  { value: 5, label: '5' },
  { value: 6, label: '6' },
  { value: 7, label: '7' },
  { value: 8, label: '8 et +' },
];

export const PLAYED_OPTIONS = [
  { value: 'all',    label: 'Peu importe' },
  { value: 'played', label: 'Déjà joués' },
  { value: 'never',  label: 'Jamais joués' },
];

export const SORT_OPTIONS = [
  { value: 'recent',   label: 'Ajout récent' },
  { value: 'name',     label: 'Nom (A → Z)' },
  { value: 'duration', label: 'Durée croissante' },
  { value: 'players',  label: 'Nombre de joueurs' },
];

/* ---------- Petits utilitaires de libellés ---------- */

export const categoryLabel = (id) =>
  CATEGORIES.find((c) => c.id === id)?.label ?? 'Autres';

export const complexityLabel = (id) =>
  COMPLEXITIES.find((c) => c.id === id)?.label ?? 'Facile';

/** « 2 à 4 joueurs », « 1 joueur », « 4 joueurs » */
export function playersLabel(game) {
  if (game.minPlayers === game.maxPlayers) {
    return `${game.minPlayers} joueur${game.minPlayers > 1 ? 's' : ''}`;
  }
  return `${game.minPlayers} à ${game.maxPlayers} joueurs`;
}

/** 45 → « 45 min » ; 90 → « 1 h 30 » ; 120 → « 2 h » */
export function durationLabel(minutes) {
  const m = Number(minutes) || 0;
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest === 0 ? `${h} h` : `${h} h ${String(rest).padStart(2, '0')}`;
}

/* ---------- Création et validation d'un jeu ---------- */

function newId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Valeurs par défaut d'un formulaire vierge. */
export function emptyGame() {
  return {
    id: null,
    name: '',
    image: '',
    minPlayers: 2,
    maxPlayers: 4,
    duration: 30,
    category: 'strategie',
    complexity: 'facile',
    description: '',
    favorite: false,
    played: false,
  };
}

/**
 * Normalise un objet quelconque (formulaire, import CSV/JSON) en un jeu valide.
 * Les valeurs absentes ou aberrantes sont ramenées à des valeurs sûres.
 */
export function normalizeGame(input = {}) {
  const toInt = (v, fallback) => {
    // Une valeur absente ou vide doit retomber sur la valeur par défaut,
    // et non sur 0 (Number('') vaut 0).
    if (v === '' || v === null || v === undefined) return fallback;
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? n : fallback;
  };
  const toBool = (v) => {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    return ['true', 'oui', 'yes', '1', 'x'].includes(String(v ?? '').trim().toLowerCase());
  };

  let minPlayers = Math.min(Math.max(toInt(input.minPlayers, 1), 1), 99);
  let maxPlayers = Math.min(Math.max(toInt(input.maxPlayers, minPlayers), 1), 99);
  if (maxPlayers < minPlayers) [minPlayers, maxPlayers] = [maxPlayers, minPlayers];

  const category = CATEGORIES.some((c) => c.id === input.category) ? input.category : 'autres';
  const complexity = COMPLEXITIES.some((c) => c.id === input.complexity) ? input.complexity : 'facile';
  const now = new Date().toISOString();

  return {
    id: input.id || newId(),
    name: String(input.name ?? '').trim(),
    image: String(input.image ?? '').trim(),
    minPlayers,
    maxPlayers,
    duration: Math.min(Math.max(toInt(input.duration, 30), 1), 6000),
    category,
    complexity,
    description: String(input.description ?? '').trim(),
    favorite: toBool(input.favorite),
    played: toBool(input.played),
    createdAt: input.createdAt || now,
    updatedAt: now,
  };
}

/**
 * Valide les données saisies.
 * @returns {Object} dictionnaire { champ: message } — vide si tout est correct.
 */
export function validateGame(input) {
  const errors = {};
  const name = String(input.name ?? '').trim();
  const min = Number(input.minPlayers);
  const max = Number(input.maxPlayers);
  const duration = Number(input.duration);

  if (!name) errors.name = 'Le nom du jeu est obligatoire.';
  else if (name.length > 120) errors.name = '120 caractères maximum.';

  if (!Number.isFinite(min) || min < 1) errors.minPlayers = 'Au moins 1 joueur.';
  if (!Number.isFinite(max) || max < 1) errors.maxPlayers = 'Au moins 1 joueur.';
  if (Number.isFinite(min) && Number.isFinite(max) && max < min) {
    errors.maxPlayers = 'Le maximum doit être supérieur ou égal au minimum.';
  }
  if (!Number.isFinite(duration) || duration < 1) errors.duration = 'Indique une durée en minutes (au moins 1).';
  if (duration > 6000) errors.duration = 'Durée trop élevée (6000 min maximum).';

  const img = String(input.image ?? '').trim();
  if (img && !/^(https?:\/\/|data:image\/)/i.test(img)) {
    errors.image = 'Indique une URL commençant par http(s):// ou importe un fichier.';
  }
  return errors;
}

/* ---------- Moteur de filtres ---------- */

export function emptyFilters() {
  return {
    search: '',
    players: null,        // nombre de joueurs présents (8 = 8 et plus)
    durations: [],        // ids de tranches de durée (OU logique)
    categories: [],       // ids de catégories (OU logique)
    complexities: [],     // ids de complexités (OU logique)
    favoritesOnly: false,
    played: 'all',        // 'all' | 'played' | 'never'
  };
}

/** Un filtre est-il actif ? (utile pour afficher/masquer « Réinitialiser ») */
export function hasActiveFilters(f) {
  return Boolean(
    f.search.trim() ||
    f.players !== null ||
    f.durations.length ||
    f.categories.length ||
    f.complexities.length ||
    f.favoritesOnly ||
    f.played !== 'all'
  );
}

/** Le jeu accepte-t-il ce nombre de joueurs ? (8 = « 8 et plus ») */
export function acceptsPlayers(game, count) {
  if (count === null || count === undefined) return true;
  if (count >= 8) return game.maxPlayers >= 8;
  return game.minPlayers <= count && count <= game.maxPlayers;
}

/** Un jeu passe-t-il tous les filtres actifs ? (ET entre les groupes) */
export function matchesFilters(game, filters) {
  const f = { ...emptyFilters(), ...filters };

  const term = f.search.trim().toLowerCase();
  if (term) {
    const haystack = `${game.name} ${game.description}`.toLowerCase();
    if (!haystack.includes(term)) return false;
  }
  if (!acceptsPlayers(game, f.players)) return false;

  if (f.durations.length) {
    const buckets = DURATION_BUCKETS.filter((b) => f.durations.includes(b.id));
    if (!buckets.some((b) => b.match(game.duration))) return false;
  }
  if (f.categories.length && !f.categories.includes(game.category)) return false;
  if (f.complexities.length && !f.complexities.includes(game.complexity)) return false;
  if (f.favoritesOnly && !game.favorite) return false;
  if (f.played === 'played' && !game.played) return false;
  if (f.played === 'never' && game.played) return false;

  return true;
}

export function filterGames(games, filters) {
  return games.filter((g) => matchesFilters(g, filters));
}

export function sortGames(games, sortBy = 'recent') {
  const list = [...games];
  switch (sortBy) {
    case 'name':
      return list.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    case 'duration':
      return list.sort((a, b) => a.duration - b.duration || a.name.localeCompare(b.name, 'fr'));
    case 'players':
      return list.sort((a, b) => a.minPlayers - b.minPlayers || a.maxPlayers - b.maxPlayers);
    case 'recent':
    default:
      return list.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
}

/**
 * Tirage aléatoire parmi une liste DÉJÀ filtrée.
 * `excludeId` évite de retirer deux fois de suite le même jeu
 * (sauf s'il n'y a qu'un seul résultat).
 */
export function pickRandomGame(candidates, excludeId = null) {
  if (!candidates.length) return null;
  let pool = candidates;
  if (excludeId && candidates.length > 1) {
    pool = candidates.filter((g) => g.id !== excludeId);
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
