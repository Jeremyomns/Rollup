/* =============================================================
   pages/settings.js — Paramètres : sauvegarde, import, données de démo
   ============================================================= */

import { store, StorageFullError } from '../store.js';
import { SEED_GAMES } from '../seed.js';
import { uiState, resetFilters } from '../state.js';
import { qs, esc, icons, toast, confirmDialog } from '../ui/dom.js';
import { toJSON, toCSV, downloadText, timestampedName, parseImport, readTextFile } from '../io.js';
import { navigate } from '../router.js';

export function renderSettings(root) {
  function usageMarkup() {
    const { bytes, limit, ratio } = store.usage();
    const kb = (bytes / 1024).toFixed(0);
    const pct = Math.round(ratio * 100);
    const cls = ratio > 0.9 ? 'meter__fill--full' : ratio > 0.7 ? 'meter__fill--warn' : '';
    return `
      <p class="field__hint" style="margin-bottom:.4rem">
        ${kb} Ko utilisés sur ~${Math.round(limit / 1024 / 1024)} Mo disponibles (${pct} %)
      </p>
      <div class="meter"><div class="meter__fill ${cls}" style="width:${Math.max(pct, 2)}%"></div></div>`;
  }

  function render() {
    root.innerHTML = `
      <div class="page-head">
        <div>
          <h1>Paramètres</h1>
          <p>Sauvegarde, restauration et gestion de tes données.</p>
        </div>
      </div>

      <section class="panel">
        <div class="panel__head"><h2 class="panel__title">Sauvegarder ma bibliothèque</h2></div>
        <div class="settings-row">
          <div class="settings-row__text">
            <b>Export JSON</b>
            <span>Sauvegarde complète et fidèle (images comprises). Format recommandé pour restaurer.</span>
          </div>
          <button type="button" class="btn btn--primary" data-action="export-json">${icons.download} Exporter en JSON</button>
        </div>
        <div class="settings-row">
          <div class="settings-row__text">
            <b>Export CSV</b>
            <span>Lisible dans Excel, Numbers ou Google Sheets pour retravailler la liste.</span>
          </div>
          <button type="button" class="btn btn--ghost" data-action="export-csv">${icons.download} Exporter en CSV</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel__head"><h2 class="panel__title">Importer des jeux</h2></div>
        <div class="settings-row">
          <div class="settings-row__text">
            <b>Fichier JSON ou CSV</b>
            <span>Colonnes reconnues : nom, image, joueurs min/max, durée, catégorie, complexité, description, favori, joué.</span>
          </div>
          <label class="btn btn--primary" style="cursor:pointer">
            ${icons.upload} Choisir un fichier
            <input type="file" accept=".json,.csv,.txt,application/json,text/csv" data-role="import-file" class="visually-hidden">
          </label>
        </div>
        <p class="field__hint">Au moment de l'import, tu choisis d'ajouter à la bibliothèque existante ou de la remplacer.</p>
      </section>

      <section class="panel">
        <div class="panel__head"><h2 class="panel__title">Données de démonstration</h2></div>
        <div class="settings-row">
          <div class="settings-row__text">
            <b>${SEED_GAMES.length} jeux fictifs</b>
            <span>Couvrent toutes les catégories, complexités et durées : pratique pour tester les filtres et le tirage.</span>
          </div>
          <button type="button" class="btn btn--ghost" data-action="seed">Installer les jeux de démo</button>
        </div>
      </section>

      <section class="panel">
        <div class="panel__head"><h2 class="panel__title">Stockage</h2></div>
        <div style="margin-bottom:1rem">${usageMarkup()}</div>
        <p class="field__hint" style="margin-bottom:1rem">
          Les données sont enregistrées dans ce navigateur (${esc(store.adapterName)}), sur cet appareil uniquement.
          Pense à exporter régulièrement en JSON. Astuce : des URLs d'images consomment beaucoup moins d'espace que des fichiers importés.
        </p>
        <div class="settings-row">
          <div class="settings-row__text">
            <b>Vider la bibliothèque</b>
            <span>Supprime tous les jeux enregistrés dans ce navigateur. Irréversible.</span>
          </div>
          <button type="button" class="btn btn--danger" data-action="wipe">${icons.trash} Tout supprimer</button>
        </div>
      </section>
    `;
    bind();
  }

  function bind() {
    qs('[data-action="export-json"]', root).addEventListener('click', () => {
      if (!store.count()) { toast('Rien à exporter : la bibliothèque est vide.', 'error'); return; }
      downloadText(timestampedName('rollup', 'json'), toJSON(store.getAll()), 'application/json;charset=utf-8');
      toast('Export JSON téléchargé.', 'success');
    });

    qs('[data-action="export-csv"]', root).addEventListener('click', () => {
      if (!store.count()) { toast('Rien à exporter : la bibliothèque est vide.', 'error'); return; }
      downloadText(timestampedName('rollup', 'csv'), toCSV(store.getAll()), 'text/csv;charset=utf-8');
      toast('Export CSV téléchargé.', 'success');
    });

    qs('[data-role="import-file"]', root).addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      try {
        const text = await readTextFile(file);
        const games = parseImport(text, file.name);

        let mode = 'merge';
        if (store.count()) {
          const replace = await confirmDialog({
            title: `${games.length} jeu${games.length > 1 ? 'x' : ''} détecté${games.length > 1 ? 's' : ''}`,
            message: `Ta bibliothèque contient déjà ${store.count()} jeu${store.count() > 1 ? 'x' : ''}. Remplacer toute la bibliothèque, ou ajouter ces jeux aux existants ?`,
            confirmLabel: 'Remplacer',
            cancelLabel: 'Ajouter',
          });
          mode = replace ? 'replace' : 'merge';
        }

        if (mode === 'replace') {
          await store.replaceAll(games);
          toast(`Bibliothèque remplacée : ${games.length} jeu${games.length > 1 ? 'x' : ''} importé${games.length > 1 ? 's' : ''}.`, 'success');
        } else {
          const { added, updated } = await store.merge(games);
          toast(`${added} ajouté${added > 1 ? 's' : ''}, ${updated} mis à jour.`, 'success');
        }
        resetFilters();
        uiState.lastDrawId = null;
        render();
      } catch (err) {
        if (err instanceof StorageFullError) toast(err.message, 'error', 6000);
        else toast(err.message || 'Import impossible.', 'error', 5000);
      }
    });

    qs('[data-action="seed"]', root).addEventListener('click', async () => {
      const { added, updated } = await store.merge(SEED_GAMES);
      store.setMeta('seeded', true);
      toast(`Démo installée : ${added} jeu${added > 1 ? 'x' : ''} ajouté${added > 1 ? 's' : ''}${updated ? `, ${updated} mis à jour` : ''}.`, 'success');
      render();
    });

    qs('[data-action="wipe"]', root).addEventListener('click', async () => {
      const ok = await confirmDialog({
        title: 'Vider la bibliothèque ?',
        message: `Les ${store.count()} jeux enregistrés seront définitivement supprimés de ce navigateur. Exporte une sauvegarde avant si besoin.`,
        confirmLabel: 'Tout supprimer',
        danger: true,
      });
      if (!ok) return;
      await store.replaceAll([]);
      store.setMeta('seeded', true); // on ne réinstalle pas la démo automatiquement
      resetFilters();
      uiState.lastDrawId = null;
      toast('Bibliothèque vidée.', 'success');
      navigate('/');
    });
  }

  render();
}
