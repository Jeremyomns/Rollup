/* =============================================================
   app.js — Point d'entrée : initialise les données puis lance le routeur
   ============================================================= */

import { store } from './store.js';
import { SEED_GAMES } from './seed.js';
import { startRouter, refresh, currentPath } from './router.js';
import { installCoverFallback, toast, qs } from './ui/dom.js';

async function bootstrap() {
  installCoverFallback();

  try {
    await store.init();

    // Premier lancement : on installe les jeux de démonstration une seule fois.
    // (Supprimables depuis Paramètres ; jamais réinstallés ensuite.)
    if (store.count() === 0 && !store.getMeta('seeded', false)) {
      await store.merge(SEED_GAMES);
      store.setMeta('seeded', true);
    }
  } catch (err) {
    console.error('[app] initialisation des données impossible :', err);
    toast('Les données locales n’ont pas pu être chargées.', 'error', 6000);
  }

  startRouter();

  // Toute modification des données redessine la page courante
  // (compteurs de l'accueil, grille de la bibliothèque, etc.).
  store.subscribe(() => {
    // Les pages gèrent elles-mêmes leur re-rendu après une action locale ;
    // ici on ne rafraîchit que les écrans de liste.
    const path = currentPath();
    if (path === '/' || path === '/bibliotheque') refresh();
  });
}

if (qs('#app')) bootstrap();
