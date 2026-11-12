/* =============================================================
   ui/dom.js — Briques d'interface réutilisables
   Échappement HTML, icônes, badges, couvertures, toasts, modale.
   ============================================================= */

import { categoryLabel, complexityLabel, durationLabel, playersLabel } from '../model.js';

/* ---------- Sélecteurs courts ---------- */
export const qs = (sel, root = document) => root.querySelector(sel);
export const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** Échappe toute donnée utilisateur insérée en HTML (anti-injection). */
export function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---------- Icônes (SVG inline) ---------- */
export const icons = {
  dice: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2m3.5 3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4m7 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4m-3.5-3.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4"/></svg>',
  star: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 17.3-5.2 3 1.4-5.9-4.5-4 6-.5L12 4.3l2.3 5.6 6 .5-4.5 4 1.4 5.9z"/></svg>',
  users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7m7 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6M9 13c-3.3 0-6 1.8-6 4v2h12v-2c0-2.2-2.7-4-6-4m7 .2c1.9.5 3 1.9 3 3.8v2h3v-2c0-1.9-1.8-3.4-4.4-3.7z"/></svg>',
  clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18m1 4v5.3l4 2.4-.8 1.3L11 13V7z"/></svg>',
  search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4a6 6 0 1 0 3.7 10.7l4.3 4.3 1.4-1.4-4.3-4.3A6 6 0 0 0 10 4m0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8"/></svg>',
  check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 16.2 5.3 12l-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z"/></svg>',
  trash: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h4v2H4V5h4zM6 8h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2z"/></svg>',
  edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 17.2 16.4 3.8l3.8 3.8L6.8 21H3zM18 2.2l2.6 2.6-1.5 1.5-2.6-2.6z"/></svg>',
  back: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 4 12l7 7 1.4-1.4L7.8 13H20v-2H7.8l4.6-4.6z"/></svg>',
  plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z"/></svg>',
  empty: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1m2 3v8h12V8zm2 2h3v4H8z"/></svg>',
  download: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 3h2v9l3.5-3.5 1.4 1.4L12 16 6.1 9.9l1.4-1.4L11 12zM5 18h14v2H5z"/></svg>',
  upload: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 6.1 9.1l1.4 1.4L11 7v9h2V7l3.5 3.5 1.4-1.4zM5 18h14v2H5z"/></svg>',
};

/* ---------- Couverture ---------- */

/** Teinte stable déduite du nom, pour les couvertures de remplacement. */
function hueFromName(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 360;
  return hash;
}

/** Initiales du jeu : « Les Cités de Sable » → « LC » */
function initials(name) {
  return name
    .split(/\s+/)
    .filter((w) => w.length > 2 || /^[A-ZÉÈÀÂÎÔÛ]/.test(w))
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('') || '?';
}

/** Dégradé déterministe servant de couverture de remplacement. */
function fallbackStyle(name) {
  const hue = hueFromName(name);
  return `background:linear-gradient(135deg,hsl(${hue} 70% 58%),hsl(${(hue + 42) % 360} 75% 48%))`;
}

/** Image de couverture, ou dégradé avec initiales si le jeu n'en a pas. */
export function coverMarkup(game) {
  if (game.image) {
    // Si l'image ne charge pas (URL morte), installCoverFallback() la remplace.
    return `<img class="cover-img" src="${esc(game.image)}" alt="Couverture de ${esc(game.name)}"
             loading="lazy" data-initials="${esc(initials(game.name))}" data-fallback-style="${esc(fallbackStyle(game.name))}">`;
  }
  return `<div class="cover-fallback" role="img" aria-label="Pas de couverture pour ${esc(game.name)}"
            style="${fallbackStyle(game.name)}">${esc(initials(game.name))}</div>`;
}

/**
 * Remplace les couvertures cassées par le dégradé d'initiales.
 * Écouteur unique en phase de capture (les erreurs d'image ne remontent pas).
 */
export function installCoverFallback() {
  document.addEventListener(
    'error',
    (event) => {
      const img = event.target;
      if (!(img instanceof HTMLImageElement) || !img.classList.contains('cover-img')) return;
      const div = document.createElement('div');
      div.className = 'cover-fallback';
      div.setAttribute('role', 'img');
      div.setAttribute('aria-label', img.alt || 'Couverture indisponible');
      div.setAttribute('style', img.dataset.fallbackStyle || '');
      div.textContent = img.dataset.initials || '?';
      img.replaceWith(div);
    },
    true
  );
}

/* ---------- Badges ---------- */
export const badgeCategory = (game) =>
  `<span class="badge badge--${esc(game.category)}">${esc(categoryLabel(game.category))}</span>`;

export const badgePlayers = (game) =>
  `<span class="badge">${icons.users}${esc(playersLabel(game))}</span>`;

export const badgeDuration = (game) =>
  `<span class="badge">${icons.clock}${esc(durationLabel(game.duration))}</span>`;

export const badgeComplexity = (game) =>
  `<span class="badge badge--outline">${esc(complexityLabel(game.complexity))}</span>`;

/* ---------- Toasts ---------- */
export function toast(message, type = 'info', duration = 3200) {
  const zone = qs('#toast-zone');
  if (!zone) return;
  const node = document.createElement('div');
  node.className = `toast toast--${type}`;
  node.textContent = message;
  zone.appendChild(node);
  setTimeout(() => {
    node.style.opacity = '0';
    setTimeout(() => node.remove(), 200);
  }, duration);
}

/* ---------- Modale de confirmation ---------- */
export function confirmDialog({
  title,
  message,
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  danger = false,
}) {
  return new Promise((resolve) => {
    const root = qs('#modal-root');
    root.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div class="modal__box">
          <h2 id="modal-title" style="font-size:1.15rem">${esc(title)}</h2>
          <p style="margin:0;color:var(--text-soft)">${esc(message)}</p>
          <div class="modal__actions">
            <button type="button" class="btn btn--ghost" data-act="cancel">${esc(cancelLabel)}</button>
            <button type="button" class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-act="ok">${esc(confirmLabel)}</button>
          </div>
        </div>
      </div>`;

    const close = (value) => {
      document.removeEventListener('keydown', onKey);
      root.innerHTML = '';
      resolve(value);
    };
    const onKey = (e) => { if (e.key === 'Escape') close(false); };

    qs('[data-act="ok"]', root).addEventListener('click', () => close(true));
    qs('[data-act="cancel"]', root).addEventListener('click', () => close(false));
    qs('.modal', root).addEventListener('click', (e) => { if (e.target.classList.contains('modal')) close(false); });
    document.addEventListener('keydown', onKey);
    qs('[data-act="ok"]', root).focus();
  });
}

/* ---------- État vide ---------- */
export function emptyState({ title, text, actions = '' }) {
  return `
    <div class="empty">
      ${icons.empty}
      <h3>${esc(title)}</h3>
      <p>${esc(text)}</p>
      ${actions ? `<div class="empty__actions">${actions}</div>` : ''}
    </div>`;
}
