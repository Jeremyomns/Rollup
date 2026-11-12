/* =============================================================
   ui/filters.js — Panneau de filtres partagé (Accueil + Bibliothèque)
   Tous les filtres sont combinables et se rafraîchissent instantanément.
   ============================================================= */

import {
  CATEGORIES, COMPLEXITIES, DURATION_BUCKETS, PLAYER_OPTIONS, PLAYED_OPTIONS,
  hasActiveFilters,
} from '../model.js';
import { esc, icons } from './dom.js';

/* ---------- Fabriques de puces ---------- */

/** Puces à sélection unique (bouton + aria-pressed) : joueurs, statut joué. */
function toggleChips(name, options, current) {
  return options
    .map((opt) => {
      const on = String(current) === String(opt.value);
      return `<button type="button" class="chip__label ${on ? 'is-on' : ''}"
                data-filter="${name}" data-value="${esc(opt.value)}" aria-pressed="${on}">${esc(opt.label)}</button>`;
    })
    .join('');
}

/** Puces à sélection multiple (cases à cocher) : durées, catégories, complexités. */
function checkChips(name, options, selected) {
  return options
    .map((opt, i) => {
      const id = `f-${name}-${i}`;
      const checked = selected.includes(opt.id) ? 'checked' : '';
      return `<span class="chip">
                <input type="checkbox" id="${id}" data-filter="${name}" value="${esc(opt.id)}" ${checked}>
                <label class="chip__label" for="${id}">${esc(opt.label)}</label>
              </span>`;
    })
    .join('');
}

/* ---------- Rendu du panneau ---------- */

/**
 * @param {Object} filters   état courant des filtres
 * @param {Object} counts    { matching, total }
 */
export function filtersPanel(filters, counts) {
  const active = hasActiveFilters(filters);
  return `
    <section class="panel filters" aria-label="Filtres">
      <div class="panel__head">
        <h2 class="panel__title">Filtres</h2>
        <div style="display:flex;align-items:center;gap:.8rem;flex-wrap:wrap">
          <span class="filters__count" data-role="count">
            <b>${counts.matching}</b> jeu${counts.matching > 1 ? 'x' : ''} sur ${counts.total}
          </span>
          <button type="button" class="btn btn--ghost" data-action="reset-filters" ${active ? '' : 'disabled'}>
            Réinitialiser
          </button>
        </div>
      </div>

      <div class="filters__grid">
        <div class="filters__group">
          <span class="filters__legend">Nombre de joueurs présents</span>
          <div class="chips">${toggleChips('players', PLAYER_OPTIONS, filters.players)}</div>
        </div>

        <div class="filters__group">
          <span class="filters__legend">Durée de partie</span>
          <div class="chips">${checkChips('durations', DURATION_BUCKETS, filters.durations)}</div>
        </div>

        <div class="filters__group">
          <span class="filters__legend">Catégorie</span>
          <div class="chips">${checkChips('categories', CATEGORIES, filters.categories)}</div>
        </div>

        <div class="filters__group">
          <span class="filters__legend">Complexité</span>
          <div class="chips">${checkChips('complexities', COMPLEXITIES, filters.complexities)}</div>
        </div>

        <div class="filters__group">
          <span class="filters__legend">Déjà joué</span>
          <div class="chips">${toggleChips('played', PLAYED_OPTIONS, filters.played)}</div>
        </div>

        <div class="filters__group">
          <span class="filters__legend">Favoris</span>
          <label class="switch">
            <input type="checkbox" data-filter="favoritesOnly" ${filters.favoritesOnly ? 'checked' : ''}>
            <span class="switch__track"></span>
            <span class="switch__label">${icons.star} Favoris uniquement</span>
          </label>
        </div>
      </div>
    </section>`;
}

/**
 * Branche les écouteurs du panneau. `onChange` est appelé après chaque
 * modification pour que la page recalcule ses résultats.
 */
export function bindFilters(root, filters, onChange) {
  // Cases à cocher (durées, catégories, complexités) et interrupteur favoris
  root.addEventListener('change', (e) => {
    const input = e.target.closest('input[data-filter]');
    if (!input) return;
    const key = input.dataset.filter;

    if (key === 'favoritesOnly') {
      filters.favoritesOnly = input.checked;
    } else if (Array.isArray(filters[key])) {
      const set = new Set(filters[key]);
      input.checked ? set.add(input.value) : set.delete(input.value);
      filters[key] = [...set];
    }
    onChange();
  });

  // Puces à sélection unique (joueurs, statut joué) et réinitialisation
  root.addEventListener('click', (e) => {
    const chip = e.target.closest('button[data-filter]');
    if (chip) {
      const key = chip.dataset.filter;
      const raw = chip.dataset.value;

      if (key === 'players') {
        const value = Number(raw);
        filters.players = filters.players === value ? null : value; // reclic = désélection
      } else if (key === 'played') {
        filters.played = filters.played === raw ? 'all' : raw;
      }
      onChange();
      return;
    }

    if (e.target.closest('[data-action="reset-filters"]')) {
      const search = filters.search;
      Object.assign(filters, {
        players: null, durations: [], categories: [], complexities: [],
        favoritesOnly: false, played: 'all', search,
      });
      onChange();
    }
  });
}
