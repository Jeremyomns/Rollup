/* =============================================================
   pages/detail.js — Fiche détaillée d'un jeu
   ============================================================= */

import { store } from '../store.js';
import { playersLabel, durationLabel, categoryLabel, complexityLabel, acceptsPlayers } from '../model.js';
import { uiState } from '../state.js';
import { qs, esc, icons, toast, confirmDialog, coverMarkup, badgeCategory, badgeComplexity } from '../ui/dom.js';
import { navigate } from '../router.js';

export function renderDetail(root, params) {
  const game = store.getById(params.id);

  if (!game) {
    root.innerHTML = `
      <div class="panel">
        <h1>Jeu introuvable</h1>
        <p>Ce jeu n'est plus dans ta bibliothèque (il a peut-être été supprimé).</p>
        <a class="btn btn--primary" href="#/bibliotheque">Retour à la bibliothèque</a>
      </div>`;
    return;
  }

  const current = uiState.filters.players;
  const compatible = acceptsPlayers(game, current);

  root.innerHTML = `
    <a class="back-link" href="#/bibliotheque">${icons.back} Ma bibliothèque</a>

    <div class="panel detail">
      <div class="detail__cover">${coverMarkup(game)}</div>

      <div>
        <div class="detail__badges">
          ${badgeCategory(game)}
          ${badgeComplexity(game)}
          ${game.favorite ? `<span class="badge badge--accent">${icons.star} Favori</span>` : ''}
          <span class="badge ${game.played ? '' : 'badge--outline'}">${game.played ? 'Déjà joué' : 'Jamais joué'}</span>
          ${current !== null && !compatible ? `<span class="badge badge--outline">Incompatible avec ${current} joueur${current > 1 ? 's' : ''}</span>` : ''}
        </div>

        <h1 style="margin-bottom:.2rem">${esc(game.name)}</h1>
        <p style="color:var(--text-faint);font-size:.85rem">
          Ajouté le ${esc(new Date(game.createdAt).toLocaleDateString('fr-FR'))}
          ${game.updatedAt && game.updatedAt !== game.createdAt
            ? ` · modifié le ${esc(new Date(game.updatedAt).toLocaleDateString('fr-FR'))}` : ''}
        </p>

        <div class="detail__facts">
          <div class="detail__fact"><span>Joueurs</span><b>${esc(playersLabel(game))}</b></div>
          <div class="detail__fact"><span>Durée moyenne</span><b>${esc(durationLabel(game.duration))}</b></div>
          <div class="detail__fact"><span>Catégorie</span><b>${esc(categoryLabel(game.category))}</b></div>
          <div class="detail__fact"><span>Complexité</span><b>${esc(complexityLabel(game.complexity))}</b></div>
        </div>

        ${game.description
          ? `<div class="detail__note">${esc(game.description)}</div>`
          : '<p style="color:var(--text-faint)">Aucun commentaire personnel pour ce jeu.</p>'}

        <div class="detail__actions">
          <a class="btn btn--primary" href="#/jeu/${esc(game.id)}/modifier">${icons.edit} Modifier</a>
          <button type="button" class="btn btn--ghost" data-action="favorite">
            ${icons.star} ${game.favorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          </button>
          <button type="button" class="btn btn--ghost" data-action="played">
            ${icons.check} Marquer comme ${game.played ? 'jamais joué' : 'déjà joué'}
          </button>
          <button type="button" class="btn btn--danger" data-action="delete">${icons.trash} Supprimer</button>
        </div>
      </div>
    </div>
  `;

  /* ---------- Actions ---------- */
  qs('[data-action="favorite"]', root).addEventListener('click', async () => {
    const updated = await store.toggleFavorite(game.id);
    toast(updated.favorite ? 'Ajouté aux favoris.' : 'Retiré des favoris.', 'success');
    renderDetail(root, params); // re-rendu local pour refléter le changement
  });

  qs('[data-action="played"]', root).addEventListener('click', async () => {
    const updated = await store.togglePlayed(game.id);
    toast(updated.played ? 'Marqué comme déjà joué.' : 'Marqué comme jamais joué.', 'success');
    renderDetail(root, params);
  });

  qs('[data-action="delete"]', root).addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Supprimer ce jeu ?',
      message: `« ${game.name} » sera définitivement retiré de ta bibliothèque. Cette action est irréversible.`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    await store.remove(game.id);
    if (uiState.lastDrawId === game.id) uiState.lastDrawId = null;
    toast('Jeu supprimé.', 'success');
    navigate('/bibliotheque');
  });
}
