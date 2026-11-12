/* =============================================================
   router.js — Routeur minimaliste basé sur le hash (#/...)
   Avantage : l'application fonctionne derrière n'importe quel serveur
   de fichiers statiques (nginx, Docker) sans règle de réécriture.
   ============================================================= */

import { qs, qsa } from './ui/dom.js';
import { renderHome } from './pages/home.js';
import { renderLibrary } from './pages/library.js';
import { renderForm } from './pages/form.js';
import { renderDetail } from './pages/detail.js';
import { renderSettings } from './pages/settings.js';

const ROUTES = [
  { path: /^\/$/,                        view: renderHome,     nav: '/',             title: 'Accueil' },
  { path: /^\/bibliotheque$/,            view: renderLibrary,  nav: '/bibliotheque', title: 'Ma bibliothèque' },
  { path: /^\/ajouter$/,                 view: renderForm,     nav: '/ajouter',      title: 'Ajouter un jeu' },
  { path: /^\/jeu\/([^/]+)\/modifier$/,  view: renderForm,     nav: '/bibliotheque', title: 'Modifier un jeu', keys: ['id'] },
  { path: /^\/jeu\/([^/]+)$/,            view: renderDetail,   nav: '/bibliotheque', title: 'Fiche du jeu',    keys: ['id'] },
  { path: /^\/parametres$/,              view: renderSettings, nav: '/parametres',   title: 'Paramètres' },
];

export function currentPath() {
  const hash = location.hash.replace(/^#/, '');
  return hash.startsWith('/') ? hash : '/';
}

export function navigate(path) {
  const target = `#${path.startsWith('/') ? path : `/${path}`}`;
  if (location.hash === target) renderCurrent();
  else location.hash = target;
}

function markActiveNav(nav) {
  qsa('[data-route]').forEach((link) => {
    const active = link.dataset.route === nav;
    link.classList.toggle('is-active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}

/** Redessine la page courante (utilisé après une modification des données). */
export function refresh() {
  renderCurrent();
}

function renderCurrent() {
  const root = qs('#app');
  const path = currentPath();

  for (const route of ROUTES) {
    const match = path.match(route.path);
    if (!match) continue;

    const params = {};
    (route.keys ?? []).forEach((key, i) => { params[key] = decodeURIComponent(match[i + 1]); });

    document.title = `${route.title} · Rollup`;
    markActiveNav(route.nav);
    root.innerHTML = '';
    route.view(root, params);
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }

  // Route inconnue : page 404 sobre
  document.title = 'Page introuvable · Rollup';
  markActiveNav('/');
  root.innerHTML = `
    <div class="panel" style="text-align:center">
      <h1>Page introuvable</h1>
      <p>Cette adresse ne correspond à aucune page de Rollup.</p>
      <a class="btn btn--primary" href="#/">Retour à l'accueil</a>
    </div>`;
}

export function startRouter() {
  if (!location.hash) location.replace('#/');
  window.addEventListener('hashchange', renderCurrent);
  renderCurrent();
}
