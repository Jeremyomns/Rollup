/* =============================================================
   pages/home.js — Accueil : compteurs, filtres, « Trouve-moi un jeu »
   ============================================================= */

import { store } from '../store.js';
import { uiState } from '../state.js';
import {
  filterGames, pickRandomGame, hasActiveFilters,
  playersLabel, durationLabel, categoryLabel, complexityLabel,
} from '../model.js';
import { qs, esc, icons, coverMarkup, emptyState, badgeCategory, badgeComplexity } from '../ui/dom.js';
import { filtersPanel, bindFilters } from '../ui/filters.js';
import { rollDice, ROLLING_LABEL } from '../ui/dice.js';

export function renderHome(root) {
  const { filters } = uiState;

  /* ---------- Rendu statique de la page ---------- */
  root.innerHTML = `
    <section class="hero">
      <h1>Qu'est-ce qu'on sort ce soir ?</h1>
      <p>Choisis le nombre de joueurs et le temps que vous avez, Rollup s'occupe du reste.</p>
      <div class="hero__stats">
        <div class="hero__stat"><b data-role="total">0</b><span>jeux dans la collection</span></div>
        <div class="hero__stat"><b data-role="matching">0</b><span>jeux correspondant aux filtres</span></div>
        <div class="hero__stat"><b data-role="favorites">0</b><span>favoris</span></div>
      </div>
    </section>

    <div class="panel draw-zone">
      <button type="button" class="btn-draw" data-action="draw">
        ${icons.dice} Trouve-moi un jeu
      </button>
      <p class="field__hint" style="margin-top:.7rem" data-role="draw-hint"></p>
      <div data-role="draw-result"></div>
    </div>

    <div data-role="filters"></div>

    <p style="text-align:center">
      <a class="btn btn--ghost" href="#/bibliotheque">Voir toute ma bibliothèque</a>
    </p>
  `;

  const filtersHost = qs('[data-role="filters"]', root);
  const resultHost = qs('[data-role="draw-result"]', root);
  const hintHost = qs('[data-role="draw-hint"]', root);
  const drawBtn = qs('[data-action="draw"]', root);

  /* ---------- Rafraîchissement ---------- */
  function matchingGames() {
    return filterGames(store.getAll(), filters);
  }

  function refreshCounters() {
    const all = store.getAll();
    const matching = matchingGames();
    qs('[data-role="total"]', root).textContent = all.length;
    qs('[data-role="matching"]', root).textContent = matching.length;
    qs('[data-role="favorites"]', root).textContent = all.filter((g) => g.favorite).length;
    drawBtn.disabled = rolling || matching.length === 0;

    hintHost.textContent = all.length === 0
      ? 'Ta bibliothèque est vide : ajoute un premier jeu ou installe les jeux de démonstration depuis les Paramètres.'
      : matching.length === 0
        ? 'Aucun jeu ne correspond aux filtres actuels.'
        : hasActiveFilters(filters)
          ? `Le tirage se fera parmi ${matching.length} jeu${matching.length > 1 ? 'x' : ''} correspondant à tes filtres.`
          : `Le tirage se fera parmi l'ensemble de la collection (${matching.length} jeu${matching.length > 1 ? 'x' : ''}).`;
    return matching;
  }

  function renderFiltersPanel() {
    const matching = matchingGames();
    filtersHost.innerHTML = filtersPanel(filters, { matching: matching.length, total: store.count() });
  }

  /** Carte de présentation du jeu tiré au sort. */
  function renderDraw(game) {
    if (!game) {
      resultHost.innerHTML = '';
      uiState.lastDrawId = null;
      return;
    }
    uiState.lastDrawId = game.id;
    resultHost.innerHTML = `
      <div class="draw-result card" style="padding:clamp(1rem,2.5vw,1.6rem);text-align:left">
        <div class="draw-result__inner">
          <div class="draw-result__cover">${coverMarkup(game)}</div>
          <div>
            <p class="draw-result__eyebrow" style="margin:0 0 .2rem">Ce soir, vous jouez à</p>
            <h2 style="font-size:clamp(1.3rem,1rem + 1.4vw,1.9rem);margin-bottom:.5rem">
              ${esc(game.name)} ${game.favorite ? icons.star.replace('<svg', '<svg style="width:20px;height:20px;fill:var(--accent);vertical-align:-3px"') : ''}
            </h2>
            <div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-bottom:.8rem">
              <span class="badge">${icons.users}${esc(playersLabel(game))}</span>
              <span class="badge">${icons.clock}${esc(durationLabel(game.duration))}</span>
              ${badgeCategory(game)}
              ${badgeComplexity(game)}
              ${game.played ? '' : '<span class="badge badge--accent">Jamais joué</span>'}
            </div>
            ${game.description ? `<p style="color:var(--text-soft);margin:0">${esc(game.description)}</p>` : ''}
            <div class="draw-result__actions">
              <button type="button" class="btn btn--accent" data-action="redraw">${icons.dice} Un autre jeu</button>
              <a class="btn btn--primary" href="#/jeu/${esc(game.id)}">Voir la fiche</a>
            </div>
          </div>
        </div>
      </div>`;
  }

  /** Message dédié quand aucun jeu ne correspond. */
  function renderNoMatch() {
    uiState.lastDrawId = null;
    resultHost.innerHTML = emptyState({
      title: 'Aucun jeu ne correspond',
      text: store.count() === 0
        ? "Ta bibliothèque est encore vide. Ajoute un jeu pour lancer ton premier tirage."
        : 'Aucun jeu de ta collection ne satisfait tous les filtres sélectionnés. Élargis un critère (durée ou nombre de joueurs) pour relancer le tirage.',
      actions: store.count() === 0
        ? `<a class="btn btn--primary" href="#/ajouter">${icons.plus} Ajouter un jeu</a>`
        : '<button type="button" class="btn btn--primary" data-action="reset-filters">Réinitialiser les filtres</button>',
    });
  }

  /* ---------- Actions ---------- */
  let rolling = false;
  const drawLabel = drawBtn.innerHTML;

  /** Lance le dé puis annonce le jeu tiré. */
  async function draw() {
    if (rolling) return;                      // un lancer à la fois
    const candidates = refreshCounters();
    if (!candidates.length) { renderNoMatch(); return; }

    rolling = true;
    drawBtn.disabled = true;
    drawBtn.innerHTML = `${icons.dice} ${ROLLING_LABEL}`;

    await rollDice(resultHost, candidates.length);

    // On recalcule après l'animation : les filtres ont pu changer entre-temps.
    const matching = matchingGames();
    rolling = false;
    drawBtn.innerHTML = drawLabel;

    if (!matching.length) { renderNoMatch(); refreshCounters(); return; }
    renderDraw(pickRandomGame(matching, uiState.lastDrawId));
    refreshCounters();
  }

  drawBtn.addEventListener('click', draw);

  resultHost.addEventListener('click', (e) => {
    if (e.target.closest('[data-action="redraw"]')) draw();
    if (e.target.closest('[data-action="reset-filters"]')) {
      Object.assign(filters, {
        players: null, durations: [], categories: [], complexities: [],
        favoritesOnly: false, played: 'all',
      });
      onFiltersChange();
    }
  });

  /** Les filtres ont changé : compteurs, panneau, et contrôle du tirage affiché. */
  function onFiltersChange() {
    const matching = refreshCounters();
    renderFiltersPanel();
    // Règle clé : ne jamais laisser affiché un jeu qui ne respecte plus les filtres.
    // (on ne touche à rien pendant un lancer : le dé occupe la zone de résultat)
    if (!rolling && uiState.lastDrawId && !matching.some((g) => g.id === uiState.lastDrawId)) {
      renderDraw(null);
    }
  }

  bindFilters(filtersHost, filters, onFiltersChange);

  /* ---------- Premier affichage ---------- */
  refreshCounters();
  renderFiltersPanel();
}
