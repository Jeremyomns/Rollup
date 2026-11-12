/* =============================================================
   seed.js — Jeux de démonstration (fictifs)
   Ils couvrent volontairement toutes les catégories, toutes les
   complexités et toutes les tranches de durée, pour tester les filtres.
   Supprimables en un clic depuis la page Paramètres.
   ============================================================= */

export const SEED_GAMES = [
  {
    name: 'Les Cités de Sable',
    minPlayers: 2, maxPlayers: 4, duration: 90,
    category: 'strategie', complexity: 'expert',
    favorite: true, played: true,
    description: 'Pose d’ouvriers dans un désert en expansion. Grosse partie, le meilleur jeu de la collection pour une soirée à quatre.',
  },
  {
    name: 'Panique au Potager',
    minPlayers: 2, maxPlayers: 6, duration: 25,
    category: 'familial', complexity: 'facile',
    favorite: false, played: true,
    description: 'Course de légumes complètement absurde. Parfait pour jouer avec les neveux.',
  },
  {
    name: 'Le Dernier Rempart',
    minPlayers: 1, maxPlayers: 4, duration: 60,
    category: 'cooperation', complexity: 'intermediaire',
    favorite: true, played: true,
    description: 'Défense de donjon coopérative, jouable en solo. Monte en tension à chaque manche.',
  },
  {
    name: 'Vol de Nuit',
    minPlayers: 2, maxPlayers: 5, duration: 30,
    category: 'cartes', complexity: 'facile',
    favorite: false, played: true,
    description: 'Petit jeu de plis avec enchères secrètes. Tient dans une poche.',
  },
  {
    name: 'Grand Barouf',
    minPlayers: 4, maxPlayers: 10, duration: 20,
    category: 'ambiance', complexity: 'facile',
    favorite: true, played: true,
    description: 'Jeu d’ambiance pour grandes tablées, à sortir en fin de soirée.',
  },
  {
    name: 'Mécanique Céleste',
    minPlayers: 1, maxPlayers: 2, duration: 45,
    category: 'reflexion', complexity: 'expert',
    favorite: false, played: false,
    description: 'Casse-tête d’engrenages à deux. Encore sous blister, jamais sorti.',
  },
  {
    name: 'La Grande Traversée',
    minPlayers: 3, maxPlayers: 6, duration: 135,
    category: 'strategie', complexity: 'intermediaire',
    favorite: false, played: true,
    description: 'Jeu de développement maritime. Prévoir la soirée complète.',
  },
  {
    name: 'Chronos Paradox',
    minPlayers: 2, maxPlayers: 4, duration: 75,
    category: 'cooperation', complexity: 'expert',
    favorite: true, played: false,
    description: 'Coopératif avec voyages dans le temps et legacy léger. À tester bientôt.',
  },
  {
    name: 'Six Pieds sous Terre',
    minPlayers: 5, maxPlayers: 12, duration: 40,
    category: 'ambiance', complexity: 'intermediaire',
    favorite: false, played: false,
    description: 'Jeu de rôles cachés pour très grands groupes.',
  },
  {
    name: 'Les Marchands d’Ombre',
    minPlayers: 2, maxPlayers: 4, duration: 50,
    category: 'cartes', complexity: 'intermediaire',
    favorite: false, played: true,
    description: 'Construction de deck avec un marché commun qui évolue à chaque tour.',
  },
  {
    name: 'Éclair de Génie',
    minPlayers: 2, maxPlayers: 8, duration: 12,
    category: 'reflexion', complexity: 'facile',
    favorite: false, played: true,
    description: 'Mini-jeu de rapidité en moins d’un quart d’heure, idéal en apéritif de soirée.',
  },
  {
    name: 'Terres Oubliées',
    minPlayers: 1, maxPlayers: 5, duration: 180,
    category: 'autres', complexity: 'expert',
    favorite: false, played: false,
    description: 'Campagne narrative en plusieurs scénarios. Le gros morceau de l’étagère.',
  },
];
