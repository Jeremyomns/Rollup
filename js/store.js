/* =============================================================
   store.js — COUCHE DONNÉES (persistance)
   La logique métier et l'interface ne parlent qu'au `store`.
   Pour brancher Airtable / une API plus tard : écrire un adaptateur
   exposant la même interface (load / save) et le passer à createStore().
   ============================================================= */

import { normalizeGame } from './model.js';

const GAMES_KEY = 'rollup.games.v1';
const META_KEY = 'rollup.meta.v1';

/** Erreur « stockage plein » pour un message clair côté interface. */
export class StorageFullError extends Error {
  constructor() {
    super("L'espace de stockage du navigateur est plein. Supprime des images lourdes ou utilise des URLs d'images.");
    this.name = 'StorageFullError';
  }
}

/* ---------- Adaptateur LocalStorage (V1) ---------- */
export function createLocalStorageAdapter(key = GAMES_KEY) {
  return {
    name: 'localStorage',

    async load() {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(normalizeGame) : [];
      } catch (err) {
        console.error('[store] lecture impossible, données ignorées :', err);
        return [];
      }
    },

    async save(games) {
      try {
        localStorage.setItem(key, JSON.stringify(games));
      } catch (err) {
        if (err?.name === 'QuotaExceededError' || err?.code === 22) throw new StorageFullError();
        throw err;
      }
    },
  };
}

/* ---------- Store ---------- */
export function createStore(adapter) {
  let games = [];
  let ready = false;
  const listeners = new Set();

  const notify = () => listeners.forEach((fn) => fn(games));

  async function persist() {
    await adapter.save(games);
    notify();
  }

  return {
    /** Charge les données une seule fois au démarrage. */
    async init() {
      if (ready) return games;
      games = await adapter.load();
      ready = true;
      return games;
    },

    /** Abonnement aux changements ; retourne la fonction de désabonnement. */
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },

    getAll() {
      return games;
    },

    getById(id) {
      return games.find((g) => g.id === id) ?? null;
    },

    count() {
      return games.length;
    },

    async add(input) {
      const game = normalizeGame({ ...input, id: null, createdAt: new Date().toISOString() });
      games = [game, ...games];
      await persist();
      return game;
    },

    async update(id, patch) {
      const current = this.getById(id);
      if (!current) throw new Error('Jeu introuvable.');
      const updated = normalizeGame({ ...current, ...patch, id, createdAt: current.createdAt });
      games = games.map((g) => (g.id === id ? updated : g));
      await persist();
      return updated;
    },

    async remove(id) {
      games = games.filter((g) => g.id !== id);
      await persist();
    },

    async toggleFavorite(id) {
      const g = this.getById(id);
      if (!g) return null;
      return this.update(id, { favorite: !g.favorite });
    },

    async togglePlayed(id) {
      const g = this.getById(id);
      if (!g) return null;
      return this.update(id, { played: !g.played });
    },

    /** Remplace toute la bibliothèque (import « remplacer », réinitialisation). */
    async replaceAll(list) {
      games = list.map(normalizeGame);
      await persist();
      return games;
    },

    /**
     * Ajoute une liste importée sans écraser l'existant.
     * Les doublons sont repérés par nom (insensible à la casse) et mis à jour.
     */
    async merge(list) {
      let added = 0;
      let updated = 0;
      const byName = new Map(games.map((g) => [g.name.toLowerCase(), g]));

      for (const raw of list) {
        const incoming = normalizeGame(raw);
        if (!incoming.name) continue;
        const existing = byName.get(incoming.name.toLowerCase());
        if (existing) {
          const merged = { ...incoming, id: existing.id, createdAt: existing.createdAt };
          games = games.map((g) => (g.id === existing.id ? merged : g));
          updated += 1;
        } else {
          games = [incoming, ...games];
          byName.set(incoming.name.toLowerCase(), incoming);
          added += 1;
        }
      }
      await persist();
      return { added, updated };
    },

    /* ---- Métadonnées (drapeaux internes, ex. « démo déjà installée ») ---- */
    getMeta(name, fallback = null) {
      try {
        const meta = JSON.parse(localStorage.getItem(META_KEY) || '{}');
        return name in meta ? meta[name] : fallback;
      } catch {
        return fallback;
      }
    },

    setMeta(name, value) {
      try {
        const meta = JSON.parse(localStorage.getItem(META_KEY) || '{}');
        meta[name] = value;
        localStorage.setItem(META_KEY, JSON.stringify(meta));
      } catch (err) {
        console.warn('[store] métadonnée non enregistrée :', err);
      }
    },

    /** Estimation de l'occupation du stockage (pour la page Paramètres). */
    usage() {
      const bytes = new Blob([localStorage.getItem(GAMES_KEY) || '']).size;
      const limit = 5 * 1024 * 1024; // ~5 Mo, limite habituelle de LocalStorage
      return { bytes, limit, ratio: Math.min(bytes / limit, 1) };
    },

    adapterName: adapter.name,
  };
}

/** Instance unique utilisée par toute l'application. */
export const store = createStore(createLocalStorageAdapter());
