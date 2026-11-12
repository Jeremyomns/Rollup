/* =============================================================
   ui/cards.js — Carte visuelle d'un jeu + grille
   ============================================================= */

import { esc, icons, coverMarkup, badgeCategory, badgePlayers, badgeDuration } from './dom.js';

/** Carte cliquable menant à la fiche détaillée. */
export function gameCard(game) {
  return `
    <a class="game-card" href="#/jeu/${esc(game.id)}">
      <div class="game-card__media">
        ${coverMarkup(game)}
        ${game.favorite ? `<span class="game-card__fav" title="Favori" aria-label="Favori">${icons.star}</span>` : ''}
      </div>
      <div class="game-card__body">
        <h3 class="game-card__title">${esc(game.name)}</h3>
        <div class="game-card__meta">
          ${badgePlayers(game)}
          ${badgeDuration(game)}
          ${badgeCategory(game)}
        </div>
      </div>
    </a>`;
}

export function gameGrid(games) {
  return `<div class="game-grid">${games.map(gameCard).join('')}</div>`;
}
