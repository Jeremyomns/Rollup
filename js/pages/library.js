/* =============================================================
   pages/library.js — Ma bibliothèque : recherche, tri, filtres, grille
   ============================================================= */

import { store } from '../store.js';
import { uiState } from '../state.js';
import { filterGames, sortGames, SORT_OPTIONS } from '../model.js';
import { qs, esc, icons, emptyState } from '../ui/dom.js';
import { gameGrid } from '../ui/cards.js';
import { filtersPanel, bindFilters } from '../ui/filters.js';

export function renderLibrary(root) {
  const { filters } = uiState;

  root.innerHTML = `
    <div class="page-head">
      <div>
        <h1>Ma bibliothèque</h1>
        <p data-role="subtitle"></p>
      </div>
      <a class="btn btn--primary" href="#/ajouter">${icons.plus} Ajouter un jeu</a>
    </div>

    <div class="library__toolbar">
      <div class="library__search">
        <label class="visually-hidden" for="search">Rechercher un jeu par son nom</label>
        ${icons.search}
        <input type="search" id="search" placeholder="Rechercher un jeu…" value="${esc(filters.search)}" autocomplete="off">
      </div>
      <label class="visually-hidden" for="sort">Trier</label>
      <select id="sort" style="width:auto;min-width:170px">
        ${SORT_OPTIONS.map((o) => `<option value="${o.value}" ${uiState.sortBy === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
      </select>
    </div>

    <div data-role="filters"></div>
    <div data-role="results"></div>
  `;

  const filtersHost = qs('[data-role="filters"]', root);
  const resultsHost = qs('[data-role="results"]', root);
  const subtitle = qs('[data-role="subtitle"]', root);

  function refresh({ withFilters = true } = {}) {
    const all = store.getAll();
    const matching = sortGames(filterGames(all, filters), uiState.sortBy);

    subtitle.textContent = all.length
      ? `${matching.length} jeu${matching.length > 1 ? 'x' : ''} affiché${matching.length > 1 ? 's' : ''} sur ${all.length} au total.`
      : 'Aucun jeu enregistré pour le moment.';

    if (withFilters) {
      filtersHost.innerHTML = filtersPanel(filters, { matching: matching.length, total: all.length });
    } else {
      // Mise à jour légère du compteur pendant la frappe dans la recherche.
      const counter = qs('[data-role="count"]', filtersHost);
      if (counter) counter.innerHTML = `<b>${matching.length}</b> jeu${matching.length > 1 ? 'x' : ''} sur ${all.length}`;
    }

    if (!all.length) {
      resultsHost.innerHTML = emptyState({
        title: 'Bibliothèque vide',
        text: 'Ajoute ton premier jeu, ou installe les 12 jeux de démonstration depuis les Paramètres pour voir l’application en action.',
        actions: `<a class="btn btn--primary" href="#/ajouter">${icons.plus} Ajouter un jeu</a>
                  <a class="btn btn--ghost" href="#/parametres">Ouvrir les paramètres</a>`,
      });
      return;
    }
    if (!matching.length) {
      resultsHost.innerHTML = emptyState({
        title: 'Aucun résultat',
        text: 'Aucun jeu ne correspond à cette combinaison de filtres. Élargis un critère ou réinitialise les filtres.',
        actions: '<button type="button" class="btn btn--primary" data-action="reset-filters">Réinitialiser les filtres</button>',
      });
      return;
    }
    resultsHost.innerHTML = gameGrid(matching);
  }

  /* ---------- Écouteurs ---------- */
  bindFilters(filtersHost, filters, () => refresh());

  // Le bouton de l'état vide réutilise la même action que le panneau.
  resultsHost.addEventListener('click', (e) => {
    if (!e.target.closest('[data-action="reset-filters"]')) return;
    Object.assign(filters, {
      players: null, durations: [], categories: [], complexities: [],
      favoritesOnly: false, played: 'all',
    });
    refresh();
  });

  qs('#search', root).addEventListener('input', (e) => {
    filters.search = e.target.value;
    refresh({ withFilters: false }); // on ne redessine pas les filtres pour ne pas perdre le focus
  });

  qs('#sort', root).addEventListener('change', (e) => {
    uiState.sortBy = e.target.value;
    refresh({ withFilters: false });
  });

  refresh();
}
