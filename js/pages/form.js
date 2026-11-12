/* =============================================================
   pages/form.js — Ajouter / modifier un jeu
   ============================================================= */

import { store, StorageFullError } from '../store.js';
import { CATEGORIES, COMPLEXITIES, emptyGame, validateGame } from '../model.js';
import { qs, qsa, esc, icons, toast, coverMarkup } from '../ui/dom.js';
import { readImageFile } from '../io.js';
import { navigate } from '../router.js';

export function renderForm(root, params = {}) {
  const editing = Boolean(params.id);
  const game = editing ? store.getById(params.id) : emptyGame();

  if (editing && !game) {
    root.innerHTML = `<div class="panel"><h1>Jeu introuvable</h1>
      <p>Ce jeu n'existe plus dans ta bibliothèque.</p>
      <a class="btn btn--primary" href="#/bibliotheque">Retour à la bibliothèque</a></div>`;
    return;
  }

  // Copie de travail : rien n'est écrit tant que le formulaire n'est pas validé.
  const draft = { ...game };

  root.innerHTML = `
    <a class="back-link" href="${editing ? `#/jeu/${esc(game.id)}` : '#/bibliotheque'}">${icons.back} Retour</a>
    <div class="page-head">
      <div>
        <h1>${editing ? 'Modifier le jeu' : 'Ajouter un jeu'}</h1>
        <p>Les champs marqués d'un astérisque sont obligatoires.</p>
      </div>
    </div>

    <form class="panel" novalidate>
      <div class="field">
        <label for="name">Nom du jeu *</label>
        <input type="text" id="name" name="name" value="${esc(draft.name)}" maxlength="120" required
               autocomplete="off" placeholder="Ex. Les Cités de Sable">
        <p class="field__error" data-error="name" hidden></p>
      </div>

      <fieldset class="field">
        <span class="field__legend">Couverture du jeu</span>
        <div class="cover-editor">
          <div class="cover-preview" data-role="preview">${coverMarkup(draft.name ? draft : { ...draft, name: draft.name || 'Nouveau jeu' })}</div>
          <div class="cover-editor__fields">
            <label class="visually-hidden" for="image">URL de l'image</label>
            <input type="url" id="image" name="image" value="${esc(draft.image.startsWith('data:') ? '' : draft.image)}"
                   placeholder="https://… (URL de la couverture)">
            <p class="field__error" data-error="image" hidden></p>
            <p class="field__hint">…ou importe un fichier depuis ton appareil (redimensionné automatiquement).</p>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem">
              <label class="btn btn--ghost" style="cursor:pointer">
                ${icons.upload} Choisir un fichier
                <input type="file" accept="image/*" data-role="file" class="visually-hidden">
              </label>
              <button type="button" class="btn btn--ghost" data-action="clear-image" ${draft.image ? '' : 'hidden'}>
                Retirer l'image
              </button>
            </div>
          </div>
        </div>
      </fieldset>

      <div class="grid-3">
        <div class="field">
          <label for="minPlayers">Joueurs minimum *</label>
          <input type="number" id="minPlayers" name="minPlayers" min="1" max="99" step="1" value="${esc(draft.minPlayers)}" required>
          <p class="field__error" data-error="minPlayers" hidden></p>
        </div>
        <div class="field">
          <label for="maxPlayers">Joueurs maximum *</label>
          <input type="number" id="maxPlayers" name="maxPlayers" min="1" max="99" step="1" value="${esc(draft.maxPlayers)}" required>
          <p class="field__error" data-error="maxPlayers" hidden></p>
        </div>
        <div class="field">
          <label for="duration">Durée moyenne (minutes) *</label>
          <input type="number" id="duration" name="duration" min="1" max="6000" step="5" value="${esc(draft.duration)}" required>
          <p class="field__error" data-error="duration" hidden></p>
        </div>
      </div>

      <div class="grid-2">
        <div class="field">
          <label for="category">Catégorie</label>
          <select id="category" name="category">
            ${CATEGORIES.map((c) => `<option value="${c.id}" ${draft.category === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="complexity">Niveau de complexité</label>
          <select id="complexity" name="complexity">
            ${COMPLEXITIES.map((c) => `<option value="${c.id}" ${draft.complexity === c.id ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}
          </select>
        </div>
      </div>

      <div class="field">
        <label for="description">Description ou commentaire personnel</label>
        <textarea id="description" name="description" maxlength="1200"
                  placeholder="Ce que tu en penses, avec qui il passe bien, les règles à relire avant…">${esc(draft.description)}</textarea>
      </div>

      <div class="grid-2">
        <label class="switch field">
          <input type="checkbox" name="favorite" ${draft.favorite ? 'checked' : ''}>
          <span class="switch__track"></span>
          <span class="switch__label">${icons.star} Jeu favori</span>
        </label>
        <label class="switch field">
          <input type="checkbox" name="played" ${draft.played ? 'checked' : ''}>
          <span class="switch__track"></span>
          <span class="switch__label">Déjà joué</span>
        </label>
      </div>

      <div style="display:flex;gap:.6rem;flex-wrap:wrap;margin-top:.5rem">
        <button type="submit" class="btn btn--primary">${icons.check} ${editing ? 'Enregistrer les modifications' : 'Ajouter à ma bibliothèque'}</button>
        <a class="btn btn--ghost" href="${editing ? `#/jeu/${esc(game.id)}` : '#/bibliotheque'}">Annuler</a>
      </div>
    </form>
  `;

  const form = qs('form', root);
  const preview = qs('[data-role="preview"]', root);
  const clearBtn = qs('[data-action="clear-image"]', root);

  /* ---------- Gestion de la couverture ---------- */
  function refreshPreview() {
    preview.innerHTML = coverMarkup({
      name: qs('#name', form).value || 'Nouveau jeu',
      image: draft.image,
    });
    clearBtn.hidden = !draft.image;
  }

  qs('#image', form).addEventListener('input', (e) => {
    draft.image = e.target.value.trim();
    refreshPreview();
  });

  qs('[data-role="file"]', form).addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      draft.image = await readImageFile(file);
      qs('#image', form).value = '';          // une image importée remplace l'URL
      refreshPreview();
      toast('Image importée et redimensionnée.', 'success');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      e.target.value = '';
    }
  });

  clearBtn.addEventListener('click', () => {
    draft.image = '';
    qs('#image', form).value = '';
    refreshPreview();
  });

  qs('#name', form).addEventListener('input', refreshPreview);

  /* ---------- Validation ---------- */
  function showErrors(errors) {
    qsa('[data-error]', form).forEach((node) => {
      const field = node.dataset.error;
      const input = qs(`[name="${field}"]`, form);
      const message = errors[field];
      node.textContent = message ?? '';
      node.hidden = !message;
      input?.classList.toggle('is-invalid', Boolean(message));
      if (input) input.setAttribute('aria-invalid', message ? 'true' : 'false');
    });
    const first = Object.keys(errors)[0];
    if (first) qs(`[name="${first}"]`, form)?.focus();
  }

  form.addEventListener('input', (e) => {
    // On efface l'erreur dès que l'utilisateur corrige le champ.
    const name = e.target.name;
    const node = qs(`[data-error="${name}"]`, form);
    if (node && !node.hidden) { node.hidden = true; e.target.classList.remove('is-invalid'); }
  });

  /* ---------- Enregistrement ---------- */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    const payload = {
      ...draft,
      name: data.name,
      image: draft.image,                       // la source d'image fait foi côté brouillon
      minPlayers: data.minPlayers,
      maxPlayers: data.maxPlayers,
      duration: data.duration,
      category: data.category,
      complexity: data.complexity,
      description: data.description,
      favorite: form.querySelector('[name="favorite"]').checked,
      played: form.querySelector('[name="played"]').checked,
    };

    const errors = validateGame(payload);
    if (Object.keys(errors).length) {
      showErrors(errors);
      toast('Le formulaire contient des erreurs.', 'error');
      return;
    }
    showErrors({});

    try {
      if (editing) {
        await store.update(game.id, payload);
        toast('Jeu mis à jour.', 'success');
        navigate(`/jeu/${game.id}`);
      } else {
        const created = await store.add(payload);
        toast(`« ${created.name} » ajouté à la bibliothèque.`, 'success');
        navigate(`/jeu/${created.id}`);
      }
    } catch (err) {
      if (err instanceof StorageFullError) toast(err.message, 'error', 6000);
      else { console.error(err); toast('Enregistrement impossible.', 'error'); }
    }
  });
}
