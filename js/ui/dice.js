/* =============================================================
   ui/dice.js — Lancer de dé animé avant l'annonce du jeu tiré
   Un cube 3D (dé à 6 faces) tourne, puis retombe sur une face.
   ============================================================= */

/**
 * Réglages du lancer. `duration` est la durée totale en millisecondes
 * (animation + atterrissage) : baisse-la pour un tirage plus nerveux.
 */
export const DICE_SETTINGS = {
  duration: 2500,
  /** Petit temps d'arrêt entre l'immobilisation des dés et l'annonce du jeu. */
  pause: 260,
};

/** Disposition des points de chaque face, en cases d'une grille 3×3. */
const PIPS = {
  1: [[2, 2]],
  2: [[1, 1], [3, 3]],
  3: [[1, 1], [2, 2], [3, 3]],
  4: [[1, 1], [1, 3], [3, 1], [3, 3]],
  5: [[1, 1], [1, 3], [2, 2], [3, 1], [3, 3]],
  6: [[1, 1], [1, 3], [2, 1], [2, 3], [3, 1], [3, 3]],
};

const FACE_POSITIONS = ['front', 'back', 'right', 'left', 'top', 'bottom'];

function faceMarkup(position, value) {
  const pips = PIPS[value]
    .map(([row, col]) => `<span class="dice__pip" style="grid-row:${row};grid-column:${col}"></span>`)
    .join('');
  return `<div class="dice__face dice__face--${position}">${pips}</div>`;
}

/** Valeurs des 6 faces, mélangées à chaque lancer. */
function shuffledFaces() {
  const values = [1, 2, 3, 4, 5, 6];
  for (let i = values.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [values[i], values[j]] = [values[j], values[i]];
  }
  return values;
}

/** Un dé : le cube et son ombre portée. `variant` vaut 'a' ou 'b'. */
function diceSlot(variant) {
  const faces = shuffledFaces();
  const modifier = variant === 'b' ? ' dice--b' : '';
  return `
    <div class="dice-slot${variant === 'b' ? ' dice-slot--b' : ''}">
      <div class="dice${modifier}" data-role="dice" aria-hidden="true">
        ${FACE_POSITIONS.map((pos, i) => faceMarkup(pos, faces[i])).join('')}
      </div>
      <span class="dice-slot__shadow${variant === 'b' ? ' dice-slot__shadow--b' : ''}" aria-hidden="true"></span>
    </div>`;
}

/** Balisage du jet : deux dés désynchronisés, plus la légende. */
export function diceMarkup(candidateCount) {
  const count = Number(candidateCount) || 0;
  return `
    <div class="dice-stage" data-role="dice-stage" role="status" aria-live="polite">
      <div class="dice-stage__board">
        ${diceSlot('a')}
        ${diceSlot('b')}
      </div>
      <p class="dice-stage__caption">
        Le sort en est jeté… <b>${count}</b> jeu${count > 1 ? 'x' : ''} dans le chapeau
      </p>
    </div>`;
}

/**
 * Lance les dés dans `host` : entrée par la gauche, rebonds, freinage, arrêt.
 * Toutes les animations durent `--roll` ; le second dé reçoit un léger retard
 * pour qu'il s'immobilise après le premier, comme sur une vraie table.
 * @returns {Promise<void>} résolue une fois les dés arrêtés.
 */
export function rollDice(host, candidateCount, options = {}) {
  const reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  const total = reduced ? 400 : (options.duration ?? DICE_SETTINGS.duration);
  const pause = reduced ? 60 : (options.pause ?? DICE_SETTINGS.pause);
  const stagger = reduced ? 0 : Math.round(total * 0.07); // décalage du second dé

  host.innerHTML = diceMarkup(candidateCount);

  const stage = host.querySelector('[data-role="dice-stage"]');
  stage?.style.setProperty('--roll', `${total}ms`);

  // Le second dé part un chouïa plus tard : les deux ne s'arrêtent pas ensemble.
  host.querySelectorAll('.dice-slot--b, .dice-slot--b *').forEach((node) => {
    node.style.animationDelay = `${stagger}ms`;
  });

  // Arrêt complet = fin du jet le plus tardif, puis un court temps mort
  // avant d'annoncer le jeu.
  return new Promise((resolve) => setTimeout(resolve, total + stagger + pause));
}

/** Libellé du bouton pendant le lancer (évite les doubles clics). */
export const ROLLING_LABEL = 'Le dé roule…';
