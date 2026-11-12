/* =============================================================
   state.js — État d'interface partagé entre les pages
   (les données des jeux, elles, vivent dans store.js)
   ============================================================= */

import { emptyFilters } from './model.js';

export const uiState = {
  /** Filtres communs à l'Accueil et à la Bibliothèque. */
  filters: emptyFilters(),
  /** Tri de la bibliothèque. */
  sortBy: 'recent',
  /** Identifiant du dernier jeu tiré au sort (pour éviter les répétitions). */
  lastDrawId: null,
};

export function resetFilters() {
  uiState.filters = emptyFilters();
}
