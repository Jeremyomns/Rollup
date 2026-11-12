# Rollup — ma ludothèque

Catalogue personnel de jeux de société : enregistrer sa collection, la filtrer
(nombre de joueurs présents, durée, catégorie, complexité, favoris, déjà joué)
et laisser le hasard trancher avec le bouton **« Trouve-moi un jeu »**.

- 100 % front-end : HTML, CSS et JavaScript natifs (modules ES), **aucune étape de build**
- Données stockées dans le navigateur (LocalStorage), import/export JSON et CSV
- Responsive : grille de 3 cartes par ligne sur ordinateur, 2 sur mobile
- Dockerisé (nginx), prêt pour un hébergement sur serveur perso

## 1. Lancer en local

L'application utilise des modules ES : il faut la servir en HTTP
(un double-clic sur `index.html` ne fonctionne pas, le navigateur bloque les modules en `file://`).

```bash
# Option 1 — Python (déjà installé sur macOS et Linux)
cd rollup
python3 -m http.server 8080
# → http://localhost:8080

# Option 2 — Node, sans rien installer durablement
npx serve . -l 8080

# Option 3 — Docker
docker compose up -d --build
# → http://localhost:8080
```

Au premier lancement, 12 jeux fictifs sont installés pour que l'application ne soit pas vide.
Ils se suppriment en un clic depuis **Paramètres → Tout supprimer** (ils ne reviennent pas ensuite).

## 2. Arborescence

```
rollup/
├── index.html                 Coquille de l'application (en-tête, nav, conteneur)
├── manifest.webmanifest       Installation sur l'écran d'accueil mobile
├── css/
│   └── styles.css             Feuille de style unique (variables de design en haut)
├── assets/
│   └── favicon.svg            Logo
├── js/
│   ├── app.js                 Point d'entrée : init des données, lancement du routeur
│   ├── router.js              Routeur par hash (#/...)
│   ├── model.js               LOGIQUE MÉTIER : référentiels, validation, filtres, tirage
│   ├── store.js               DONNÉES : persistance LocalStorage (adaptateur remplaçable)
│   ├── io.js                  Import/export JSON et CSV, redimensionnement des images
│   ├── seed.js                Les 12 jeux de démonstration
│   ├── state.js               État d'interface partagé (filtres, tri, dernier tirage)
│   ├── ui/
│   │   ├── dom.js             Briques communes : échappement, icônes, badges, toasts, modale
│   │   ├── filters.js         Panneau de filtres partagé Accueil / Bibliothèque
│   │   ├── dice.js            Lancer de dé 3D affiché pendant le tirage
│   │   └── cards.js           Carte de jeu et grille
│   └── pages/
│       ├── home.js            Accueil : compteurs, filtres, « Trouve-moi un jeu »
│       ├── library.js         Ma bibliothèque : recherche, tri, grille
│       ├── form.js            Ajouter / modifier un jeu
│       ├── detail.js          Fiche jeu
│       └── settings.js        Paramètres : sauvegarde, import, stockage
├── tests/
│   └── logic.test.mjs         29 tests de la logique métier (filtres, tirage, CSV)
├── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

Les trois couches sont séparées : **données** (`store.js`), **logique métier** (`model.js`,
sans aucune référence au DOM) et **interface** (`ui/`, `pages/`). Une page ne lit jamais
LocalStorage directement, et `model.js` est testable en Node sans navigateur.

## 3. Tests

```bash
node tests/logic.test.mjs
```

Couvre les bornes des tranches de durée, la combinaison des filtres, la règle
« le tirage ne sort jamais des filtres actifs », la normalisation des données
et les aller-retours CSV / JSON (y compris virgules et guillemets dans les cellules).

## 4. Déploiement sur le serveur perso

### Docker seul

```bash
docker build -t rollup .
docker run -d --name rollup --restart unless-stopped -p 8080:80 rollup
```

### Docker Compose

```bash
docker compose up -d --build        # port 8080 par défaut
ROLLUP_PORT=9000 docker compose up -d   # pour changer de port
```

Le conteneur expose le port **80**, répond sur **`/healthz`** et tourne en
système de fichiers **lecture seule** (rien à persister côté serveur : les données
vivent dans le navigateur).

### Dokploy

1. Pousser le dossier sur un dépôt Git (ou le copier sur le serveur).
2. Dokploy → **Create Application** → type **Compose** (ou **Dockerfile** si tu
   préfères laisser Dokploy gérer le port).
3. Source : le dépôt, branche `main`, chemin du compose : `docker-compose.yml`.
4. **Domains** : ajouter le domaine, service `rollup`, port conteneur `80`, HTTPS activé.
5. **Deploy**. Les redéploiements suivants se font par simple `git push` + *Deploy*.

En type *Compose*, tu peux retirer la section `ports:` du fichier si tu laisses
Traefik router directement vers le conteneur.

## 5. Données

Un jeu est stocké sous cette forme :

| Champ | Type | Remarque |
|---|---|---|
| `name` | texte | obligatoire |
| `image` | texte | URL `https://…` ou image importée (data URL) |
| `minPlayers` / `maxPlayers` | entier | le filtre « joueurs » teste `min ≤ n ≤ max` |
| `duration` | entier | minutes |
| `category` | `strategie`, `cooperation`, `ambiance`, `reflexion`, `familial`, `cartes`, `autres` |
| `complexity` | `facile`, `intermediaire`, `expert` |
| `description` | texte | commentaire personnel |
| `favorite` / `played` | booléen | utilisés par les filtres |

**Sauvegarde.** Paramètres → *Exporter en JSON* (fidèle, images comprises) ou
*Exporter en CSV* (lisible dans Excel / Numbers). À l'import, les intitulés de colonnes
français ou anglais sont reconnus (`nom`, `joueurs min`, `durée`, `catégorie`…), le
séparateur `,` `;` ou tabulation est détecté automatiquement, et tu choisis entre
*ajouter* et *remplacer*.

**Limite à connaître.** LocalStorage plafonne vers 5 Mo : les images importées sont
redimensionnées (600 px, JPEG) mais restent coûteuses. Pour une grosse collection
illustrée, préférer des URL d'images. La page Paramètres affiche l'espace consommé.

## 6. Faire évoluer le projet

- **Synchronisation Airtable / Supabase** : tout passe par `store.js`. Il suffit d'écrire
  un adaptateur exposant `load()` et `save(games)` et de le passer à `createStore()`
  dans `js/store.js` — aucune page n'est à modifier. Même principe pour IndexedDB si la
  collection devient trop lourde pour LocalStorage.
- **Nouveau champ** (éditeur, année, note…) : ajouter la valeur par défaut dans
  `emptyGame()` et `normalizeGame()` (`model.js`), le champ dans `pages/form.js`,
  son affichage dans `pages/detail.js` / `ui/cards.js`, et la colonne dans `FIELDS` (`io.js`).
- **Nouveau filtre** : ajouter la clé dans `emptyFilters()` et sa règle dans
  `matchesFilters()` (`model.js`), puis un groupe de puces dans `ui/filters.js`.
- **Changer la palette** : les variables de couleur sont regroupées en haut de `css/styles.css`.
- **Lancer de dé** : `DICE_SETTINGS` en haut de `js/ui/dice.js` — `duration` (2500 ms, durée
  du jet) et `pause` (260 ms de temps mort avant l'annonce du jeu). La trajectoire, les rebonds
  et le freinage sont dans les images clés `dice-throw` / `dice-spin` de `css/styles.css` ;
  `--from` règle la distance d'où partent les dés. Pour revenir à un seul dé, supprimer
  l'appel `diceSlot('b')` dans `diceMarkup()`.

Licence : usage personnel.
