// Spielinhalte: Figuren, Gebäude, Deko, Kosmetik, Gelände, Herausforderungen.
// Private Fan-Version für den Eigengebrauch. Grafiken sind eigene, einfache SVG-Zeichnungen.

const RARITY = {
  common:    { label: 'Gewöhnlich', color: '#7a8a99', weight: 60 },
  rare:      { label: 'Selten',     color: '#2f7fd6', weight: 25 },
  epic:      { label: 'Episch',     color: '#9b4fd1', weight: 12 },
  legendary: { label: 'Legendär',   color: '#e08a00', weight: 3 },
};

const Y = '#FFD90F';
// Figuren: Formen, Gesichter und Sprüche stehen in faces.js
const CHARACTERS = Faces.CHARS;

// Gebäude & Deko. s = Grundfläche (s×s Kacheln), lvl = benötigtes Level. Grafiken: isoart.js
const ITEMS = [
  // Gebäude
  { id: 'simpsonhouse', name: 'Simpsons-Haus',     kind: 'building', s: 3, price: 200,  lvl: 1 },
  { id: 'treehouse',    name: 'Baumhaus',          kind: 'building', s: 2, price: 180,  lvl: 2 },
  { id: 'moes',         name: 'Moe’s Taverne',     kind: 'building', s: 2, price: 250,  lvl: 2 },
  { id: 'kwikemart',    name: 'Kwik-E-Mart',       kind: 'building', s: 3, price: 350,  lvl: 3 },
  { id: 'krustyburger', name: 'Krusty Burger',     kind: 'building', s: 2, price: 280,  lvl: 3 },
  { id: 'flanders',     name: 'Flanders-Haus',     kind: 'building', s: 3, price: 300,  lvl: 4 },
  { id: 'lardlad',      name: 'Lard Lad Donuts',   kind: 'building', s: 2, price: 320,  lvl: 4 },
  { id: 'church',       name: 'Erste Kirche',      kind: 'building', s: 2, price: 350,  lvl: 4 },
  { id: 'comics',       name: 'Android’s Dungeon', kind: 'building', s: 2, price: 350,  lvl: 5 },
  { id: 'school',       name: 'Grundschule',       kind: 'building', s: 3, price: 500,  lvl: 5 },
  { id: 'bowlarama',    name: 'Bowlarama',         kind: 'building', s: 2, price: 400,  lvl: 6 },
  { id: 'police',       name: 'Polizeirevier',     kind: 'building', s: 2, price: 450,  lvl: 6 },
  { id: 'retirement',   name: 'Altersheim',        kind: 'building', s: 3, price: 600,  lvl: 7 },
  { id: 'townhall',     name: 'Rathaus',           kind: 'building', s: 3, price: 700,  lvl: 7 },
  { id: 'cinema',       name: 'Aztec-Kino',        kind: 'building', s: 2, price: 450,  lvl: 8 },
  { id: 'hospital',     name: 'Krankenhaus',       kind: 'building', s: 3, price: 800,  lvl: 8 },
  { id: 'plant',        name: 'Atomkraftwerk',     kind: 'building', s: 4, price: 1200, lvl: 10 },
  { id: 'burnsmanor',   name: 'Burns’ Villa',      kind: 'building', s: 4, price: 1500, lvl: 12 },
  // Deko
  { id: 'tree',      name: 'Baum',            kind: 'decor', s: 1, price: 20,   lvl: 1 },
  { id: 'pine',      name: 'Tanne',           kind: 'decor', s: 1, price: 25,   lvl: 1 },
  { id: 'bush',      name: 'Busch',           kind: 'decor', s: 1, price: 15,   lvl: 1 },
  { id: 'flowers',   name: 'Blumenbeet',      kind: 'decor', s: 1, price: 15,   lvl: 1 },
  { id: 'rock',      name: 'Fels',            kind: 'decor', s: 1, price: 10,   lvl: 1 },
  { id: 'couch',     name: 'Die Couch',       kind: 'decor', s: 1, price: 60,   lvl: 1 },
  { id: 'tv',        name: 'Fernseher',       kind: 'decor', s: 1, price: 50,   lvl: 1 },
  { id: 'fence',     name: 'Gartenzaun',      kind: 'decor', s: 1, price: 10,   lvl: 1 },
  { id: 'hedge',     name: 'Hecke',           kind: 'decor', s: 1, price: 15,   lvl: 1 },
  { id: 'trash',     name: 'Mülltonne',       kind: 'decor', s: 1, price: 10,   lvl: 1 },
  { id: 'mailbox',   name: 'Briefkasten',     kind: 'decor', s: 1, price: 20,   lvl: 1 },
  { id: 'lamp',      name: 'Laterne',         kind: 'decor', s: 1, price: 30,   lvl: 2 },
  { id: 'bench',     name: 'Parkbank',        kind: 'decor', s: 1, price: 30,   lvl: 2 },
  { id: 'hydrant',   name: 'Hydrant',         kind: 'decor', s: 1, price: 25,   lvl: 2 },
  { id: 'car',       name: 'Rosa Limousine',  kind: 'decor', s: 2, price: 80,   lvl: 2 },
  { id: 'skate',     name: 'Skateboard',      kind: 'decor', s: 1, price: 40,   lvl: 2 },
  { id: 'busstop',   name: 'Bushaltestelle',  kind: 'decor', s: 1, price: 40,   lvl: 2 },
  { id: 'hotdog',    name: 'Hotdog-Stand',    kind: 'decor', s: 1, price: 90,   lvl: 3 },
  { id: 'fountain',  name: 'Brunnen',         kind: 'decor', s: 2, price: 120,  lvl: 3 },
  { id: 'tirefire',  name: 'Reifenfeuer',     kind: 'decor', s: 1, price: 150,  lvl: 4 },
  { id: 'bus',       name: 'Schulbus',        kind: 'decor', s: 2, price: 150,  lvl: 4 },
  { id: 'statue',    name: 'Jebediah-Statue', kind: 'decor', s: 2, price: 250,  lvl: 5 },
  { id: 'monorail',  name: 'Monorail',        kind: 'decor', s: 2, price: 300,  lvl: 6 },
  { id: 'circus',    name: 'Krustyland-Zelt', kind: 'decor', s: 2, price: 300,  lvl: 7 },
  { id: 'bigdonut',  name: 'Riesen-Donut',    kind: 'decor', s: 1, price: 400,  lvl: 8 },
  { id: 'wheel',     name: 'Riesenrad',       kind: 'decor', s: 3, price: 500,  lvl: 9 },
  { id: 'rocket',    name: 'Rakete',          kind: 'decor', s: 2, price: 800,  lvl: 12 },
  { id: 'ufo',       name: 'Kangs UFO',       kind: 'decor', s: 2, price: 1000, lvl: 15 },
];

// Kosmetik: einmal kaufen, jede Figur kann sie tragen.
const COSMETICS = [
  { id: 'cap',     name: 'Kappe',            e: '🧢', price: 40,  lvl: 1 },
  { id: 'flower',  name: 'Blume',            e: '🌸', price: 50,  lvl: 1 },
  { id: 'shades',  name: 'Sonnenbrille',     e: '🕶️', price: 60,  lvl: 2, face: true },
  { id: 'tophat',  name: 'Zylinder',         e: '🎩', price: 80,  lvl: 3 },
  { id: 'helmet',  name: 'Bauhelm',          e: '⛑️', price: 90,  lvl: 3 },
  { id: 'bow',     name: 'Schleife',         e: '🎀', price: 100, lvl: 4 },
  { id: 'army',    name: 'Militärhelm',      e: '🪖', price: 120, lvl: 5 },
  { id: 'grad',    name: 'Doktorhut',        e: '🎓', price: 150, lvl: 6 },
  { id: 'donuthat',name: 'Donut-Krone',      e: '🍩', price: 200, lvl: 7 },
  { id: 'crown',   name: 'Krone',            e: '👑', price: 300, lvl: 10 },
];

// Gelände. paint: im Bau-Modus malbar
const TERRAIN = {
  grass:    { name: 'Gras',    color: '#8fd14f', alt: '#87c947', price: 0,  paint: true },
  road:     { name: 'Straße',  color: '#6b6e75', price: 10, paint: true },
  sidewalk: { name: 'Gehweg',  color: '#d9d3c2', price: 10, paint: true },
  plaza:    { name: 'Pflaster',color: '#e2a58a', price: 10, paint: true },
  sand:     { name: 'Sand',    color: '#f3dc96', price: 10, paint: true },
  dirt:     { name: 'Erde',    color: '#c08a52', price: 10, paint: true },
  flowers:  { name: 'Wiese',   color: '#a6dc6a', alt: '#9ed463', price: 10, paint: true },
  water:    { name: 'Wasser',  color: '#5cc0f0', price: 10, paint: true },
  shallow:  { name: 'Ufer',    color: '#5cc0f0' },
  deep:     { name: 'See',     color: '#2f8fd6' },
};

// Grundstücksgrößen (Kacheln pro Seite) und Preise
const LAND = [ { size: 10, price: 0 }, { size: 12, price: 300 }, { size: 14, price: 600 }, { size: 16, price: 1000 }, { size: 20, price: 1800 }, { size: 24, price: 3000 }, { size: 30, price: 5000 } ];
const WORLD_G = 40; // Weltgröße inkl. Wasser

const FREEZE_PRICE = 60; // Squishee-Freeze: rettet eine Streak an einem verpassten Tag

const CHALLENGE_POOL = [
  { type: 'habits',    target: 2,  reward: 10, text: 'Erledige 2 Gewohnheiten' },
  { type: 'habits',    target: 3,  reward: 15, text: 'Erledige 3 Gewohnheiten' },
  { type: 'allHabits', target: 1,  reward: 25, text: 'Erledige alle fälligen Gewohnheiten' },
  { type: 'focusMin',  target: 25, reward: 15, text: 'Fokussiere 25 Minuten' },
  { type: 'focusMin',  target: 60, reward: 30, text: 'Fokussiere 60 Minuten' },
  { type: 'sessions',  target: 2,  reward: 15, text: 'Schließe 2 Fokus-Sessions ab' },
  { type: 'journal',   target: 1,  reward: 10, text: 'Schreib ins Tagebuch' },
  { type: 'todos',     target: 2,  reward: 10, text: 'Hake 2 To-dos ab' },
];

const REWARDS = { habit: 5, habitMin: 3, todo: 5, journal: 5, habitXp: 2, journalXp: 5 };
