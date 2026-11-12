/* =============================================================
   io.js — Import / export de la bibliothèque (JSON et CSV)
   + lecture et redimensionnement des images de couverture.
   ============================================================= */

import { CATEGORIES, COMPLEXITIES } from './model.js';

/* ---------- Champs exportés (ordre des colonnes CSV) ---------- */
const FIELDS = [
  'name', 'image', 'minPlayers', 'maxPlayers', 'duration',
  'category', 'complexity', 'description', 'favorite', 'played',
];

/** Normalise un intitulé de colonne : « Durée (min) » → « duree(min) » */
const slug = (s) =>
  String(s ?? '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[\s_-]+/g, '');

/** Intitulés acceptés à l'import, en français comme en anglais. */
const HEADER_ALIASES = {
  name:        ['name', 'nom', 'jeu', 'titre'],
  image:       ['image', 'couverture', 'cover', 'imageurl', 'url'],
  minPlayers:  ['minplayers', 'joueursmin', 'minjoueurs', 'min'],
  maxPlayers:  ['maxplayers', 'joueursmax', 'maxjoueurs', 'max'],
  duration:    ['duration', 'duree', 'dureemin', 'dureeminutes', 'temps'],
  category:    ['category', 'categorie', 'type'],
  complexity:  ['complexity', 'complexite', 'niveau', 'difficulte'],
  description: ['description', 'commentaire', 'commentaires', 'notes', 'note'],
  favorite:    ['favorite', 'favori', 'favoris', 'coupdecoeur'],
  played:      ['played', 'joue', 'dejajoue', 'deja'],
};

/* =============================================================
   EXPORT
   ============================================================= */

export function toJSON(games) {
  return JSON.stringify(
    {
      app: 'rollup',
      version: 1,
      exportedAt: new Date().toISOString(),
      count: games.length,
      games,
    },
    null,
    2
  );
}

/** Échappe une valeur CSV selon la RFC 4180. */
function csvCell(value, delimiter) {
  const s = String(value ?? '');
  return /["\n\r]/.test(s) || s.includes(delimiter) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCSV(games, delimiter = ',') {
  const lines = [FIELDS.join(delimiter)];
  for (const g of games) {
    lines.push(FIELDS.map((f) => csvCell(g[f], delimiter)).join(delimiter));
  }
  // Le BOM permet à Excel d'ouvrir le fichier en UTF-8 sans casser les accents.
  return `﻿${lines.join('\r\n')}`;
}

/** Déclenche le téléchargement d'un contenu texte. */
export function downloadText(filename, content, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function timestampedName(base, ext) {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${base}-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}.${ext}`;
}

/* =============================================================
   IMPORT
   ============================================================= */

/** Analyseur CSV tolérant (guillemets, retours à la ligne dans les cellules). */
function parseCSV(text) {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/)[0] ?? '';
  // Détection du séparateur : virgule, point-virgule ou tabulation.
  const delimiter = [',', ';', '\t']
    .map((d) => ({ d, n: (firstLine.match(new RegExp(`\\${d}`, 'g')) || []).length }))
    .sort((a, b) => b.n - a.n)[0].d;

  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i += 1) {
    const char = clean[i];

    if (quoted) {
      if (char === '"') {
        if (clean[i + 1] === '"') { cell += '"'; i += 1; }
        else quoted = false;
      } else cell += char;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (char === delimiter) { row.push(cell); cell = ''; continue; }
    if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    if (char === '\r') continue;
    cell += char;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => String(c).trim() !== ''));
}

/** Retrouve l'identifiant d'une catégorie / complexité depuis un libellé libre. */
function matchRef(list, value) {
  const s = slug(value);
  if (!s) return null;
  return list.find((item) => slug(item.id) === s || slug(item.label) === s)?.id ?? null;
}

/** Convertit une ligne brute en objet jeu (non encore normalisé). */
function rowToGame(headers, cells) {
  const raw = {};
  headers.forEach((h, i) => { raw[h] = cells[i]; });

  const get = (field) => {
    for (const alias of HEADER_ALIASES[field]) {
      if (raw[alias] !== undefined && String(raw[alias]).trim() !== '') return String(raw[alias]).trim();
    }
    return '';
  };

  return {
    name: get('name'),
    image: get('image'),
    minPlayers: get('minPlayers') || 1,
    maxPlayers: get('maxPlayers') || get('minPlayers') || 1,
    duration: get('duration') || 30,
    category: matchRef(CATEGORIES, get('category')) ?? 'autres',
    complexity: matchRef(COMPLEXITIES, get('complexity')) ?? 'facile',
    description: get('description'),
    favorite: get('favorite'),
    played: get('played'),
  };
}

/**
 * Analyse un fichier importé (JSON ou CSV) et renvoie une liste de jeux.
 * Lève une erreur explicite si le contenu est inexploitable.
 */
export function parseImport(text, filename = '') {
  const trimmed = text.trim();
  const looksJSON = filename.toLowerCase().endsWith('.json') || /^[[{]/.test(trimmed);

  if (looksJSON) {
    let data;
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new Error('Fichier JSON illisible (syntaxe invalide).');
    }
    const list = Array.isArray(data) ? data : data?.games;
    if (!Array.isArray(list)) throw new Error('JSON inattendu : un tableau de jeux ou un objet { "games": [...] } est attendu.');
    const games = list.filter((g) => String(g?.name ?? '').trim());
    if (!games.length) throw new Error('Aucun jeu nommé trouvé dans le fichier.');
    return games;
  }

  const rows = parseCSV(trimmed);
  if (rows.length < 2) throw new Error('CSV vide ou sans ligne de données.');

  const headers = rows[0].map(slug);
  if (!headers.some((h) => HEADER_ALIASES.name.includes(h))) {
    throw new Error('CSV invalide : aucune colonne de nom (name / nom / titre) détectée.');
  }
  const games = rows.slice(1).map((cells) => rowToGame(headers, cells)).filter((g) => g.name);
  if (!games.length) throw new Error('Aucune ligne exploitable dans le CSV.');
  return games;
}

/* =============================================================
   IMAGES DE COUVERTURE
   ============================================================= */

/**
 * Lit un fichier image et le redimensionne en data URL JPEG.
 * Indispensable : LocalStorage est limité (~5 Mo), une photo brute le remplit.
 */
export function readImageFile(file, maxSize = 600, quality = 0.78) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Ce fichier n’est pas une image.'));
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      reject(new Error('Image trop lourde (12 Mo maximum).'));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image illisible ou format non pris en charge.'));
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export function readTextFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsText(file, 'utf-8');
  });
}
