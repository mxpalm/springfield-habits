// Figuren aus Formen: Köpfe aus einfachen, symmetrischen Formen, Gesichter mit Stimmung und Sprech-Motiven.
// Die App ruft nur Faces.face(figur, stimmung, ausdruck) und Faces.svg(...); Figurdaten und Zeichnung liegen hier.
// Vorschau aller Figuren und Ausdrücke: tools/faces.html
const Faces = (() => {
  const INK = '#1d1d1d', SW = 4, MOUTH = '#6a1f24', TONGUE = '#ff7a8a', YEL = '#ffd23f';
  const sx = (x) => 200 - x; // Spiegelachse x = 100
  const stroke = (w = SW) => `stroke="${INK}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"`;

  // Figuren: Kopf, Augen-/Mund-Anker und Figur-eigene Details. Alle Maße im 200er-Raster.
  // back/front bekommen den Ausdruck e und die Stimmung m.
  const CHARS = [
    { id: 'blip', top: 74, rarity: 'epic', name: 'Blip', role: 'Besuch aus dem All', skin: '#7ed04a', fav: 'wow',
      // Ausnahme von den reinen Formen: Bohne aus zwei runden Enden mit weich geschwungener Delle oben, weiterhin symmetrisch
      head: (c) => `<path d="M16 114 C 16 88, 32 74, 54 74 C 76 74, 82 98, 100 98 C 118 98, 124 74, 146 74 C 168 74, 184 88, 184 114 C 184 144, 156 160, 100 160 C 44 160, 16 144, 16 114 Z" fill="${c.skin}" ${stroke()}/>`,
      back: (c, e, m) => { const top = m === 1 ? 64 : 52, lit = e.extra; return `<line x1="100" y1="98" x2="100" y2="${top}" ${stroke()}/>
        <ellipse cx="100" cy="${top - 2}" rx="${lit ? 15 : 11}" ry="${lit ? 8 : 5}" fill="${lit ? YEL : c.skin}" ${stroke()}/>`; },
      eye: { x: 42, y: 114, r: 15, p: 5.5 }, mouth: { x: 100, y: 130, w: 44, box: true },
      lines: { 1: ['Piep … Erdling? Bist du noch da?', 'Mein Antennen-Signal ist schwach.'],
               2: ['Erdling! Dein Wasserglas ist leer.', 'Piep. Läuft bei dir.'],
               3: ['Serie erkannt! Ich funke es nach Hause!', 'Auf meinem Planeten wärst du Kaiser!'] } },

    { id: 'olli', top: 38, rarity: 'common', starter: true, name: 'Olli', role: 'staunt über alles', skin: YEL, fav: 'wow',
      head: (c) => `<ellipse cx="100" cy="104" rx="44" ry="66" fill="${c.skin}" ${stroke()}/>`,
      front: (c, e) => { const r = e.extra ? 4.5 : 3; return `<circle cx="94" cy="100" r="${r}" fill="none" ${stroke(3)}/><circle cx="106" cy="100" r="${r}" fill="none" ${stroke(3)}/>`; },
      eye: { x: 84, y: 76, r: 9, p: 4 }, mouth: { x: 100, y: 126, w: 44, joy: 0.88 },
      lines: { 1: ['Ich hab heute noch nicht gestaunt.', 'Hm. Ist ruhig hier.'],
               2: ['Ein Schritt am Tag? Schaff ich!', 'Hast du das gesehen? Ich auch nicht.'],
               3: ['WAS? Schon wieder alles erledigt?!', 'Ich staune seit Tagen ohne Pause!'] } },

    { id: 'kalle', top: 66, rarity: 'common', starter: true, name: 'Kalle', role: 'fünf Locken, null Stress', skin: YEL, hair: '#7a4a22', fav: 'grin',
      back: (c, e, m) => { const y = e.extra ? 70 : m === 1 ? 90 : 82; return [64, 82, 100, 118, 136].map((x) => `<ellipse cx="${x}" cy="${y}" rx="9" ry="17" fill="${c.hair}" ${stroke()}/>`).join(''); },
      head: (c) => `<ellipse cx="100" cy="128" rx="66" ry="44" fill="${c.skin}" ${stroke()}/>`,
      front: () => `<circle cx="100" cy="132" r="3.5" fill="${INK}"/>`,
      eye: { x: 74, y: 116, r: 9, p: 3.5 }, mouth: { x: 100, y: 146, w: 52, joy: 0.75 },
      lines: { 1: ['Meine Locken hängen durch.', 'Frisur sitzt nicht. Gewohnheit auch nicht.'],
               2: ['Kamm drüber, weiter geht’s.', 'Frisur sitzt. Fast.'],
               3: ['Fünf Locken, fünf Tage am Stück!', 'Frisur sitzt, Gewohnheit sitzt!'] } },

    { id: 'aufschub', top: 62, rarity: 'epic', name: 'Aufschub', role: 'das Teufelchen der Ausreden', skin: '#e2402e', fav: 'grin', invert: true, brow: 'angry', fangs: true,
      back: (c) => `<path d="M140 146 C 172 150, 170 112, 178 92" fill="none" ${stroke()}/>
        <path d="M178 80 L 188 100 L 168 98 Z" fill="${c.skin}" ${stroke()}/>
        <path d="M62 82 L 58 44 L 86 66 Z M138 82 L 142 44 L 114 66 Z" fill="#fff4e0" ${stroke()}/>`,
      head: (c) => `<circle cx="100" cy="118" r="56" fill="${c.skin}" ${stroke()}/>`,
      eye: { x: 80, y: 108, r: 9, p: 3.5 }, mouth: { x: 100, y: 140, w: 42 },
      // Stimmung der Figur (umgekehrt zur Lage des Nutzers)
      lines: { 1: ['Grrr. Du ziehst das ja wirklich durch.', 'Das ist unfair. Ich hab Ausreden!'],
               2: ['Nur noch ein Video. Eins!', 'Mach das doch später …'],
               3: ['Hehehe. Die Couch hat gewonnen.', 'Morgen ist auch noch ein Tag. Und übermorgen!'] } },

    { id: 'rundi', top: 50, rarity: 'common', starter: true, name: 'Rundi', role: 'trocken wie Knäckebrot', skin: YEL, fav: 'silly',
      head: (c) => `<circle cx="100" cy="110" r="60" fill="${c.skin}" ${stroke()}/>`,
      eye: { x: 80, y: 98, r: 9, p: 4 }, mouth: { x: 100, y: 134, w: 42 },
      lines: { 1: ['Mhm.', 'Auch okay.'],
               2: ['Ich bin rund. Und zufrieden.', 'Heute? Gut.'],
               3: ['Ich bin sehr rund. Und sehr zufrieden.', 'Heute? Gut. Morgen? Auch gut!'] } },

    { id: 'krume', top: 30, rarity: 'common', name: 'Krume', role: 'Brotscheibe mit Kruste', skin: '#f6e2b3', fav: 'grin',
      // Ausnahme von den reinen Formen: Toastscheibe mit Taille. Kruste wird bei Vernachlässigung dunkler.
      back: (c, e, m) => {
        const d = 'M100 30 C 128 30, 146 34, 146 56 C 146 78, 132 86, 134 100 C 136 116, 154 128, 152 148 C 150 166, 126 170, 100 170 C 74 170, 50 166, 48 148 C 46 128, 64 116, 66 100 C 68 86, 54 78, 54 56 C 54 34, 72 30, 100 30 Z';
        const crust = { 1: '#93561f', 2: '#b8732e', 3: '#d08b35' }[m];
        return `<clipPath id="brot"><path d="${d}"/></clipPath>
          <path d="${d}" fill="${c.skin}" stroke="${crust}" stroke-width="18" clip-path="url(#brot)"/>
          <path d="${d}" fill="none" ${stroke()}/>`;
      },
      head: () => '',
      eye: { x: 80, y: 64, r: 9, p: 4 }, mouth: { x: 100, y: 134, w: 40 },
      lines: { 1: ['Ich werd langsam trocken.', 'Kein Belag, keine Laune.'],
               2: ['Frisch geschnitten und bereit.', 'Scheibe für Scheibe, Tag für Tag.'],
               3: ['Ich bin heute extra knusprig!', 'Mit Butter wär das jetzt perfekt!'] } },

    { id: 'pi', top: 58, name: 'Professor Pi', role: 'Quest-Guide, kennt die Studien', rarity: 'common', starter: true, skin: YEL, fav: 'wow',
      head: (c) => `<circle cx="100" cy="114" r="56" fill="${c.skin}" ${stroke()}/>`,
      front: () => `<path d="M72 64 H 128 L 126 74 Q 100 80 74 74 Z" fill="#2a2a3a" ${stroke(3)}/>
        <path d="M100 40 L 152 56 L 100 72 L 48 56 Z" fill="#3a3a4e" ${stroke(3)}/>
        <path d="M100 56 L 146 62 V 80" fill="none" stroke="#f2c230" stroke-width="3" stroke-linecap="round"/><circle cx="146" cy="83" r="4" fill="#f2c230" ${stroke(2)}/>
        <circle cx="80" cy="106" r="15" fill="rgba(255,255,255,.2)" ${stroke(3.5)}/><circle cx="120" cy="106" r="15" fill="rgba(255,255,255,.2)" ${stroke(3.5)}/>
        <path d="M95 104 Q 100 100 105 104" fill="none" ${stroke(3.5)}/>`,
      eye: { x: 80, y: 106, r: 9, p: 4 }, mouth: { x: 100, y: 140, w: 40 },
      lines: { 1: ['Die Daten sagen: Wir sollten reden.', 'Ein kleiner Schritt ist immer noch ein Schritt.'],
               2: ['Laut Studien wirkt das. Weiter so!', 'Wenn-dann-Pläne sind mein Lieblingstrick.'],
               3: ['Signifikant gut! p kleiner 0,05!', 'Das ist lehrbuchreif. Ich schreib’s auf!'] } },

    { id: 'quadri', top: 58, name: 'Quadri', role: 'liebt Ordnung', rarity: 'common', skin: '#7ccbea', fav: 'grin',
      back: () => `<path d="M100 62 C 100 44, 116 40, 118 50 C 120 58, 108 60, 108 52" fill="none" ${stroke()}/>`,
      head: (c) => `<rect x="44" y="58" width="112" height="112" rx="24" fill="${c.skin}" ${stroke()}/>`,
      eye: { x: 78, y: 104, r: 10, p: 4.5 }, mouth: { x: 100, y: 138, w: 46 },
      lines: { 1: ['Hier ist es unordentlich geworden.', 'Vier Ecken, null Plan.'],
               2: ['Alles an seinem Platz.', 'Schön ordentlich. Weiter so.'],
               3: ['Perfekt rechtwinklig, dein Tag!', 'Ordnung ist mein Lieblingsgefühl!'] } },

    { id: 'rauti', top: 40, name: 'Rauti', role: 'immer auf der Spitze', rarity: 'common', skin: '#c9a2ee', fav: 'silly',
      head: (c) => `<path d="M100 40 L 158 108 L 100 176 L 42 108 Z" fill="${c.skin}" ${stroke()}/>`,
      eye: { x: 86, y: 102, r: 8, p: 3.5 }, mouth: { x: 100, y: 130, w: 34 },
      lines: { 1: ['Ich steh grad auf der Kippe.', 'Spitze ist das gerade nicht.'],
               2: ['Kurs halten, Spitze voraus.', 'Du bist genau auf dem Punkt.'],
               3: ['Einfach spitze, wirklich!', 'Ich dreh mich vor Freude im Kreis!'] } },

    { id: 'zwiebi', top: 44, name: 'Zwiebi', role: 'bringt alle zum Weinen – vor Stolz', rarity: 'common', skin: '#ecc9ee', fav: 'wow',
      // Trieb: hängt in Stimmung 1, steht in 2, sprießt in 3
      back: (c, e, m) => { const d = { 1: 'M100 52 C 100 40, 86 36, 78 46 M100 52 C 100 40, 114 36, 122 46',
                                        2: 'M100 52 C 96 42, 90 36, 84 32 M100 52 C 104 42, 110 36, 116 32',
                                        3: 'M100 52 C 94 40, 88 34, 80 30 M100 52 C 106 40, 112 34, 120 30 M100 52 V 30' }[m];
        return `<path d="${d}" fill="none" stroke="#3a9a4a" stroke-width="6" stroke-linecap="round"/>`; },
      head: (c) => `<path d="M100 44 C 108 64, 156 74, 156 118 C 156 152, 130 170, 100 170 C 70 170, 44 152, 44 118 C 44 74, 92 64, 100 44 Z" fill="${c.skin}" ${stroke()}/>
        <path d="M78 74 C 60 100, 62 146, 80 166 M122 74 C 140 100, 138 146, 120 166" fill="none" stroke="#c99ccc" stroke-width="3"/>`,
      eye: { x: 82, y: 112, r: 9, p: 4 }, mouth: { x: 100, y: 142, w: 40 },
      lines: { 1: ['Ich könnte heulen.', 'Meine Schichten fühlen sich leer an.'],
               2: ['Schicht für Schicht wird das was.', 'Ich treibe langsam aus.'],
               3: ['Ich weine vor Stolz!', 'So viele Schichten Erfolg!'] } },

    { id: 'luna', top: 54, name: 'Luna', role: 'Nachteule', rarity: 'common', skin: '#f4e49a', fav: 'grin',
      head: (c) => `<path d="M38 148 C 38 86, 66 54, 100 54 C 134 54, 162 86, 162 148 Q 162 160, 150 160 H 50 Q 38 160, 38 148 Z" fill="${c.skin}" ${stroke()}/>
        <circle cx="60" cy="138" r="6" fill="#e2cc70"/><circle cx="140" cy="138" r="6" fill="#e2cc70"/><circle cx="100" cy="70" r="5" fill="#e2cc70"/>`,
      eye: { x: 80, y: 106, r: 9, p: 4 }, mouth: { x: 100, y: 134, w: 40 },
      lines: { 1: ['Gähn … ist es schon wieder Tag?', 'Heute bin ich nur ein halber Mond.'],
               2: ['Ich nehme zu. Du auch, an Routine.', 'Ruhig und gleichmäßig, wie die Nacht.'],
               3: ['Ich bin heute Vollmond!', 'Du strahlst heller als ich!'] } },

    { id: 'pille', top: 40, name: 'Pille', role: 'Vitaminbombe', rarity: 'common', skin: '#ffffff', fav: 'silly',
      head: () => `<rect x="60" y="40" width="80" height="138" rx="40" fill="#fff"/>
        <path d="M60 109 V 80 A 40 40 0 0 1 140 80 V 109 Z" fill="#f2665a"/>
        <path d="M60 109 H 140" ${stroke(3)}/><rect x="60" y="40" width="80" height="138" rx="40" fill="none" ${stroke()}/>`,
      eye: { x: 84, y: 90, r: 9, p: 4 }, mouth: { x: 100, y: 138, w: 36 },
      lines: { 1: ['Ich wirke nur, wenn man mich nimmt.', 'Packungsbeilage: täglich anwenden.'],
               2: ['Eine Dosis Routine, bitte.', 'Wirkt schon. Merkst du’s?'],
               3: ['Volle Wirkung erreicht!', 'Nebenwirkung: gute Laune!'] } },

    { id: 'tropf', top: 32, name: 'Tropf', role: 'erinnert ans Trinken', rarity: 'common', skin: '#82ccf6', fav: 'wow',
      head: (c) => `<path d="M100 32 C 114 62, 154 94, 154 130 C 154 160, 130 178, 100 178 C 70 178, 46 160, 46 130 C 46 94, 86 62, 100 32 Z" fill="${c.skin}" ${stroke()}/>`,
      eye: { x: 82, y: 122, r: 9, p: 4 }, mouth: { x: 100, y: 152, w: 36 },
      lines: { 1: ['Ich trockne langsam aus …', 'Ein Glas Wasser? Bitte?'],
               2: ['Tropfen für Tropfen füllt sich das Glas.', 'Prost – mit Wasser!'],
               3: ['Ich bin ein ganzer Ozean!', 'Bestens bewässert!'] } },

    { id: 'stachel', top: 56, name: 'Stachel', role: 'harte Schale, weicher Kern', rarity: 'common', skin: '#74c45e', fav: 'grin',
      back: () => [92, 122, 152].map((y) => `<path d="M58 ${y} l-14 -5 M142 ${y} l14 -5" ${stroke(3)}/>`).join(''),
      head: (c) => `<rect x="54" y="56" width="92" height="122" rx="44" fill="${c.skin}" ${stroke()}/>
        <path d="M78 64 V 172 M122 64 V 172" stroke="#5aa648" stroke-width="3"/>`,
      // Blüte erst ab Stimmung 2
      front: (c, e, m) => m === 1 ? '' : [0, 72, 144, 216, 288].map((a) => { const r = a * Math.PI / 180;
        return `<circle cx="${100 + Math.sin(r) * 9}" cy="${48 - Math.cos(r) * 9}" r="7" fill="#ff7ab0" ${stroke(2.5)}/>`; }).join('') + `<circle cx="100" cy="48" r="5" fill="#ffe14d" ${stroke(2)}/>`,
      eye: { x: 82, y: 102, r: 9, p: 4 }, mouth: { x: 100, y: 138, w: 38 },
      lines: { 1: ['Lass mich. Ich bin heute stachelig.', 'Wenig Wasser, wenig Laune.'],
               2: ['Außen stachlig, innen stolz.', 'Ich wachse langsam. Wie du.'],
               3: ['Ich blühe! Ich blühe wirklich!', 'Selbst Kakteen freuen sich mal!'] } },

    { id: 'mokka', top: 57, name: 'Mokka', role: 'Morgenroutine in Tassenform', rarity: 'common', skin: '#f4e9d8', fav: 'wow',
      // Henkel als Ausnahme von der Symmetrie, Dampf je nach Stimmung
      back: (c, e, m) => {
        const steam = { 1: [], 2: [100], 3: [76, 100, 124] }[m].map((x) => `<path d="M${x} 56 q -8 -8 0 -14 q 8 -6 0 -14" fill="none" stroke="#b9b0a8" stroke-width="4" stroke-linecap="round"/>`).join('');
        const h = 'M150 92 C 182 92, 182 142, 150 142';
        return `${steam}<path d="${h}" fill="none" stroke="${INK}" stroke-width="18" stroke-linecap="round"/><path d="${h}" fill="none" stroke="${c.skin}" stroke-width="10" stroke-linecap="round"/>`; },
      head: (c) => `<path d="M48 66 H 152 V 158 Q 152 174, 136 174 H 64 Q 48 174, 48 158 Z" fill="${c.skin}" ${stroke()}/><ellipse cx="100" cy="66" rx="52" ry="9" fill="#7a4a2a" ${stroke()}/>`,
      eye: { x: 80, y: 106, r: 9, p: 4 }, mouth: { x: 100, y: 140, w: 40 },
      lines: { 1: ['Kalt. Ich bin ganz kalt.', 'Wer trinkt mich eigentlich noch?'],
               2: ['Frisch gebrüht und bereit.', 'Morgenroutine? Ich bin dabei.'],
               3: ['Ich dampfe vor Begeisterung!', 'Ein doppelter Espresso Motivation!'] } },

    { id: 'wolki', top: 54, name: 'Wolki', role: 'träumt gern vor sich hin', rarity: 'common', skin: '#f6f9ff', fav: 'silly',
      // Wolke aus Kreisen: erst alle mit dicker Kontur, dann alle gefüllt darüber, so bleibt nur der Außenrand
      head: (c) => { const C = [[62, 124, 30], [138, 124, 30], [80, 98, 30], [120, 98, 30], [100, 84, 30], [100, 134, 40], [72, 148, 24], [128, 148, 24]];
        return C.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${INK}" stroke="${INK}" stroke-width="8"/>`).join('')
          + C.map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c.skin}"/>`).join(''); },
      eye: { x: 84, y: 114, r: 9, p: 4 }, mouth: { x: 100, y: 144, w: 38 },
      lines: { 1: ['Heute ist alles grau.', 'Ich zieh einfach weiter …'],
               2: ['Leicht bewölkt, aber gut gelaunt.', 'Ich schweb so vor mich hin.'],
               3: ['Wolke sieben!', 'Ich schwebe vor Freude!'] } },

    { id: 'eiko', top: 34, name: 'Eiko', role: 'frisch geschlüpft', rarity: 'common', skin: '#fbf3df', fav: 'wow',
      head: (c) => `<path d="M100 34 C 134 34, 156 92, 156 126 C 156 158, 132 178, 100 178 C 68 178, 44 158, 44 126 C 44 92, 66 34, 100 34 Z" fill="${c.skin}" ${stroke()}/>`,
      // In Stimmung 1 angeknackst
      front: (c, e, m) => m === 1 ? `<path d="M76 64 l8 8 l8 -8 l8 10 l8 -10 l8 8 l8 -8" fill="none" ${stroke(3)}/>` : '',
      eye: { x: 82, y: 112, r: 9, p: 4 }, mouth: { x: 100, y: 146, w: 40 },
      lines: { 1: ['Ich bin heute etwas angeknackst.', 'Noch nicht ganz geschlüpft.'],
               2: ['Frisch und munter!', 'Jeden Tag ein bisschen mehr Schale ab.'],
               3: ['Ich bin hartgekocht motiviert!', 'Wie aus dem Ei gepellt, dieser Tag!'] } },

    { id: 'sterni', top: 42, name: 'Sterni', role: 'glänzt bei jeder Serie', rarity: 'rare', skin: '#ffab52', fav: 'grin',
      head: (c) => `<path d="${starPath(100, 114, 72, 38)}" fill="${c.skin}" ${stroke()}/>`,
      eye: { x: 88, y: 108, r: 7, p: 3 }, mouth: { x: 100, y: 128, w: 28 },
      lines: { 1: ['Mein Glanz ist ziemlich matt.', 'Heute leuchte ich auf Sparflamme.'],
               2: ['Ich funkel ein bisschen.', 'Ein Sternchen fürs Dranbleiben!'],
               3: ['Ich strahle! Wegen dir!', 'Fünf Zacken, fünf Sterne!'] } },

    { id: 'hexa', top: 50, name: 'Hexa', role: 'fleißig wie eine Biene', rarity: 'rare', skin: '#f6b73c', fav: 'grin',
      back: () => `<path d="M84 62 L 72 36 M116 62 L 128 36" ${stroke()}/><circle cx="72" cy="36" r="6" fill="${INK}"/><circle cx="128" cy="36" r="6" fill="${INK}"/>`,
      head: (c) => `<path d="${polyPath(100, 114, 64, 6)}" fill="${c.skin}" ${stroke()}/>`,
      eye: { x: 80, y: 106, r: 9, p: 4 }, mouth: { x: 100, y: 140, w: 40 },
      lines: { 1: ['Die Waben sind leer.', 'Summ … nur noch ganz leise.'],
               2: ['Fleißig, fleißig, Zelle für Zelle.', 'Summ summ, läuft.'],
               3: ['Honig überall! Was für ein Tag!', 'Ich summe die ganze Zeit!'] } },

    { id: 'birne', top: 46, name: 'Frau Birne', role: 'hat immer einen klugen Spruch', rarity: 'rare', skin: '#c9dd6c', fav: 'silly',
      back: () => `<path d="M100 50 C 100 40, 102 34, 106 30" fill="none" stroke="#6a4a2a" stroke-width="5" stroke-linecap="round"/>
        <path d="M104 36 C 114 26, 128 28, 132 34 C 124 42, 110 42, 104 36 Z" fill="#5ab04a" ${stroke(2.5)}/>`,
      head: (c) => `<path d="M100 46 C 118 46, 124 68, 124 82 C 124 98, 158 110, 158 138 C 158 164, 132 178, 100 178 C 68 178, 42 164, 42 138 C 42 110, 76 98, 76 82 C 76 68, 82 46, 100 46 Z" fill="${c.skin}" ${stroke()}/>`,
      eye: { x: 84, y: 126, r: 9, p: 4 }, mouth: { x: 100, y: 154, w: 36 },
      lines: { 1: ['Ich bin heute etwas matschig.', 'Na, Birne leer?'],
               2: ['Gut gereift, würde ich sagen.', 'Kluge Birne, kluger Plan.'],
               3: ['Ich bin saftig vor Stolz!', 'Volltreffer, du schlaue Birne!'] } },

    { id: 'funki', top: 42, name: 'Funki', role: 'hat die Ideen', rarity: 'rare', skin: '#fff3a6', fav: 'wow',
      // Strahlen in Stimmung 3 und bei wow
      back: (c, e, m) => (e.extra || m === 3) ? [-70, -35, 0, 35, 70].map((a) => { const r = a * Math.PI / 180;
        return `<path d="M${100 + Math.sin(r) * 58} ${96 - Math.cos(r) * 58} L ${100 + Math.sin(r) * 68} ${96 - Math.cos(r) * 68}" stroke="#ffb020" stroke-width="5" stroke-linecap="round"/>`; }).join('') : '',
      head: (c) => `<path d="M80 136 C 54 124, 48 104, 48 90 C 48 62, 72 42, 100 42 C 128 42, 152 62, 152 90 C 152 104, 146 124, 120 136 Z" fill="${c.skin}" ${stroke()}/>
        <rect x="78" y="136" width="44" height="30" rx="5" fill="#b9bcc6" ${stroke()}/><path d="M80 146 H 120 M80 156 H 120" stroke="${INK}" stroke-width="2.5"/>
        <path d="M90 166 H 110 Q 108 176, 100 176 Q 92 176, 90 166 Z" fill="#6a6d78" ${stroke(3)}/>`,
      eye: { x: 82, y: 88, r: 9, p: 4 }, mouth: { x: 100, y: 116, w: 36 },
      lines: { 1: ['Mir geht gerade kein Licht auf.', 'Flacker … flacker …'],
               2: ['Da kommt eine Idee!', 'Ich glimme schon.'],
               3: ['Mir geht ein Licht auf!', 'Volle Leuchtkraft!'] } },

    { id: 'akku', top: 40, name: 'Akku', role: 'lädt mit Schlaf', rarity: 'rare', skin: '#eceef2', fav: 'grin',
      // Ladestand zeigt die Stimmung: rot, gelb, grün
      head: (c, e, m) => { const lv = { 1: 0.28, 2: 0.6, 3: 0.92 }[m], col = { 1: '#f2665a', 2: '#f6c24a', 3: '#6cd06a' }[m], top = 174 - 118 * lv;
        return `<rect x="84" y="40" width="32" height="14" rx="4" fill="#9aa0aa" ${stroke()}/>
          <rect x="56" y="52" width="88" height="126" rx="16" fill="${c.skin}"/>
          <path d="M60 ${top} H 140 V 162 Q 140 174, 128 174 H 72 Q 60 174, 60 162 Z" fill="${col}"/>
          <rect x="56" y="52" width="88" height="126" rx="16" fill="none" ${stroke()}/>`; },
      eye: { x: 82, y: 98, r: 9, p: 4 }, mouth: { x: 100, y: 134, w: 38 },
      lines: { 1: ['Akku fast leer. Schlaf wär gut.', 'Ich brauch dringend Energie.'],
               2: ['Halb voll. Ich bin Optimist.', 'Lade weiter …'],
               3: ['Voll geladen!', 'Hundert Prozent Energie!'] } },

    { id: 'keimi', top: 86, name: 'Keimi', role: 'wächst jeden Tag ein bisschen', rarity: 'rare', skin: '#dc7c4e', fav: 'grin',
      // Pflanze im Topf: hängt in Stimmung 1, wächst in 2, blüht in 3
      back: (c, e, m) => {
        const up = 'M100 66 C 90 56, 78 54, 72 58 C 78 68, 90 70, 100 66 Z M100 66 C 110 56, 122 54, 128 58 C 122 68, 110 70, 100 66 Z';
        const down = 'M100 74 C 88 72, 80 80, 78 92 C 88 90, 96 84, 100 74 Z M100 74 C 112 72, 120 80, 122 92 C 112 90, 104 84, 100 74 Z';
        const flower = m === 3 ? [0, 72, 144, 216, 288].map((a) => { const r = a * Math.PI / 180;
          return `<circle cx="${100 + Math.sin(r) * 8}" cy="${42 - Math.cos(r) * 8}" r="6" fill="#ff8ac0" ${stroke(2.5)}/>`; }).join('') + `<circle cx="100" cy="42" r="4.5" fill="#ffe14d" ${stroke(2)}/>` : '';
        return `<path d="M100 92 V ${{ 1: 74, 2: 56, 3: 46 }[m]}" stroke="#3a9a4a" stroke-width="5" stroke-linecap="round"/><path d="${m === 1 ? down : up}" fill="#5cc04a" ${stroke(2.5)}/>${flower}`; },
      head: (c) => `<path d="M58 100 H 142 L 132 172 Q 131 178, 125 178 H 75 Q 69 178, 68 172 Z" fill="${c.skin}" ${stroke()}/><rect x="50" y="86" width="100" height="20" rx="6" fill="#c4643a" ${stroke()}/>`,
      eye: { x: 84, y: 134, r: 9, p: 4 }, mouth: { x: 100, y: 160, w: 32 }, browLift: 0, // Topfrand sitzt direkt über den Augen
      lines: { 1: ['Ich lass die Blätter hängen.', 'Ein bisschen Gießen wär nett.'],
               2: ['Ich wachse! Langsam, aber ich wachse.', 'Ein neues Blatt. Wie schön.'],
               3: ['Ich blühe auf!', 'Schau mal, eine Blüte!'] } },

    { id: 'buh', top: 42, name: 'Buh', role: 'verjagt Ausreden', rarity: 'rare', skin: '#f3f5ff', fav: 'silly',
      head: (c) => `<path d="M48 170 V 98 C 48 64, 72 42, 100 42 C 128 42, 152 64, 152 98 V 170 Q 139 156, 126 170 Q 113 156, 100 170 Q 87 156, 74 170 Q 61 156, 48 170 Z" fill="${c.skin}" ${stroke()}/>`,
      eye: { x: 82, y: 98, r: 10, p: 4.5 }, mouth: { x: 100, y: 130, w: 38 },
      lines: { 1: ['Buh … ich bin nur noch halb da.', 'Hier spukt es vor lauter Ausreden.'],
               2: ['Buh! Erschreckt? Gut so.', 'Ich verjage Ausreden.'],
               3: ['BUUUH! Ausreden, verschwindet!', 'Sogar Gespenster feiern mal!'] } },

    { id: 'sprinkel', top: 48, name: 'Sprinkel', role: 'die Währung der Stadt', rarity: 'epic', skin: '#e9b36e', fav: 'grin',
      head: (c) => { const ring = (R, r) => `M${100 - R} 112 a ${R} ${R} 0 1 0 ${2 * R} 0 a ${R} ${R} 0 1 0 ${-2 * R} 0 Z M${100 - r} 112 a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0 Z`;
        const sp = [[70, 70, '#ff6a8a'], [130, 70, '#ff6a8a'], [56, 110, '#6ac8ff'], [144, 110, '#6ac8ff'], [66, 142, '#ffe14d'], [134, 142, '#ffe14d'], [100, 62, '#8ae06a']];
        return `<path d="${ring(64, 18)}" fill="${c.skin}" fill-rule="evenodd" ${stroke()}/>
          <path d="${ring(56, 25)}" fill="#7a4428" fill-rule="evenodd"/>
          <circle cx="100" cy="112" r="18" fill="none" ${stroke()}/>
          ${sp.map(([x, y, col]) => `<rect x="${x - 2.5}" y="${y - 6}" width="5" height="12" rx="2.5" fill="${col}"/>`).join('')}`; },
      eye: { x: 76, y: 90, r: 9, p: 4 }, mouth: { x: 100, y: 148, w: 34 },
      lines: { 1: ['Meine Glasur bröckelt.', 'Ich fühl mich ganz trocken.'],
               2: ['Frisch glasiert!', 'Jeder Donut zählt.'],
               3: ['Streusel-Party!', 'Du verdienst eine ganze Schachtel!'] } },

    { id: 'bolzen', top: 60, name: 'Bolzen', role: 'zählt jede Minute', rarity: 'epic', skin: '#b9c3cd', fav: 'wow',
      back: (c, e, m) => `<line x1="100" y1="62" x2="100" y2="42" ${stroke()}/><circle cx="100" cy="38" r="8" fill="${e.extra || m === 3 ? '#ff5a4a' : '#8a9099'}" ${stroke()}/>
        <rect x="34" y="96" width="16" height="30" rx="5" fill="#8a9099" ${stroke()}/><rect x="150" y="96" width="16" height="30" rx="5" fill="#8a9099" ${stroke()}/>`,
      head: (c) => `<rect x="46" y="60" width="108" height="106" rx="16" fill="${c.skin}" ${stroke()}/>
        <circle cx="58" cy="72" r="3" fill="#7a828c"/><circle cx="142" cy="72" r="3" fill="#7a828c"/><circle cx="58" cy="154" r="3" fill="#7a828c"/><circle cx="142" cy="154" r="3" fill="#7a828c"/>`,
      eye: { x: 78, y: 102, r: 11, p: 4.5 }, mouth: { x: 100, y: 138, w: 46, box: true },
      lines: { 1: ['Fehler 404: Motivation nicht gefunden.', 'Energie niedrig. Bitte warten.'],
               2: ['System läuft stabil.', 'Fortschritt wird gespeichert.'],
               3: ['Leistung bei 110 Prozent!', 'Piep piep! Rekord erkannt!'] } },

    { id: 'sonni', top: 58, name: 'Sonni', role: 'geht nur bei Serien richtig auf', rarity: 'legendary', skin: '#ffcc3a', fav: 'grin',
      // Strahlen werden mit der Stimmung länger
      back: (c, e, m) => { const L = { 1: 10, 2: 16, 3: 22 }[m], n = 12, R = 48;
        const p = (a, rr) => `${(100 + Math.sin(a) * rr).toFixed(1)} ${(110 - Math.cos(a) * rr).toFixed(1)}`;
        return Array.from({ length: n }, (_, i) => { const a = i * 2 * Math.PI / n;
          return `<path d="M${p(a - 0.15, R)} L ${p(a, R + L)} L ${p(a + 0.15, R)} Z" fill="#ff9a2a" ${stroke(3)}/>`; }).join(''); },
      head: (c) => `<circle cx="100" cy="110" r="52" fill="${c.skin}" ${stroke()}/>`,
      eye: { x: 82, y: 102, r: 9, p: 4 }, mouth: { x: 100, y: 132, w: 40 },
      lines: { 1: ['Heute versteck ich mich hinter Wolken.', 'Ich geh nur halb auf.'],
               2: ['Sonnig, mit Aussicht auf mehr.', 'Ich wärm mich langsam auf.'],
               3: ['Ich scheine nur für dich!', 'Strahlender geht’s nicht!'] } },

    { id: 'kaese', top: 48, name: 'König Käse', role: 'regiert über alle Snacks', rarity: 'legendary', skin: '#ffd54a', fav: 'grin',
      head: (c) => `<path d="M100 48 L 162 170 H 38 Z" fill="${c.skin}" ${stroke()}/>
        <circle cx="100" cy="84" r="6" fill="#e8b42a"/><circle cx="62" cy="158" r="6" fill="#e8b42a"/><circle cx="138" cy="158" r="6" fill="#e8b42a"/>`,
      front: () => `<path d="M84 52 V 34 L 92 42 L 100 30 L 108 42 L 116 34 V 52 Z" fill="#ffc21a" ${stroke(3)}/><circle cx="100" cy="30" r="3.5" fill="#e0405a"/>`,
      eye: { x: 88, y: 122, r: 8, p: 3.5 }, mouth: { x: 100, y: 148, w: 34 },
      lines: { 1: ['Mein Königreich wird löchrig.', 'Ein König ohne Untertanen …'],
               2: ['Gut gereift, mein Volk!', 'Das Reich gedeiht.'],
               3: ['Ein Hoch auf dich, mein Champion!', 'Ich schlage dich zum Ritter!'] } },

    { id: 'knorz', top: 50, name: 'Opa Knorz', role: 'weiß: Gutes braucht Zeit', rarity: 'legendary', skin: '#ecc88e', fav: 'silly',
      head: (c) => `<circle cx="100" cy="112" r="62" fill="#8a5a32" ${stroke()}/><circle cx="100" cy="112" r="52" fill="${c.skin}"/>
        <circle cx="100" cy="112" r="40" fill="none" stroke="#d2a56a" stroke-width="2.5"/><circle cx="100" cy="112" r="26" fill="none" stroke="#d2a56a" stroke-width="2.5"/>`,
      front: () => `<path d="M66 86 q 14 -12 28 0 M106 86 q 14 -12 28 0" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round"/>`,
      eye: { x: 80, y: 104, r: 9, p: 4 }, mouth: { x: 100, y: 136, w: 38 },
      lines: { 1: ['Zu meiner Zeit gab’s auch Durchhänger.', 'Ein neuer Ring dauert eben.'],
               2: ['Jahresring für Jahresring.', 'Gut Ding will Weile haben.'],
               3: ['So schnell wächst nicht mal Bambus!', 'Das schreib ich mir in die Ringe!'] } },
  ];

  // Reihenfolge nach Seltenheit; Starter zuerst
  const GROUPS = { starter: 'Starter', common: 'Gewöhnlich', rare: 'Selten', epic: 'Episch', legendary: 'Legendär' };
  const groupOf = (c) => c.starter ? 'starter' : c.rarity;
  CHARS.sort((a, b) => Object.keys(GROUPS).indexOf(groupOf(a)) - Object.keys(GROUPS).indexOf(groupOf(b)));

  // Regelmäßiges Vieleck und Stern, Spitze oben (symmetrisch zur Mittelachse)
  function polyPath(cx, cy, R, n) {
    return Array.from({ length: n }, (_, i) => { const a = i * 2 * Math.PI / n; return `${i ? 'L' : 'M'}${(cx + Math.sin(a) * R).toFixed(1)} ${(cy - Math.cos(a) * R).toFixed(1)}`; }).join(' ') + ' Z';
  }
  function starPath(cx, cy, R, r, n = 5) {
    return Array.from({ length: n * 2 }, (_, i) => { const a = i * Math.PI / n, rr = i % 2 ? r : R; return `${i ? 'L' : 'M'}${(cx + Math.sin(a) * rr).toFixed(1)} ${(cy - Math.cos(a) * rr).toFixed(1)}`; }).join(' ') + ' Z';
  }

  // Stimmungen nach Skizze: 1 neutral (Strich-Mund), 2 Lächeln, 3 breiter Bohnen-Mund.
  // Blinzeln behält den Mund der Stimmung. talk = Rede-Motive (Mundformen), aus denen beim Sprechen gezogen wird.
  const MOODS = {
    1: { idle: { eyes: 'open', mouth: 'flat' },  blink: { eyes: 'closed', mouth: 'flat' },
         talk: ['slit', 'dot', 'osmall', 'teethOval'] },
    2: { idle: { eyes: 'open', mouth: 'smile' }, blink: { eyes: 'closed', mouth: 'smile' },
         talk: ['halfD', 'o', 'round', 'tri', 'teethOval', 'bean'] },
    3: { idle: { eyes: 'open', mouth: 'joy' }, blink: { eyes: 'closed', mouth: 'joy' },
         talk: ['halfD', 'wide', 'bean', 'round', 'tri'] },
  };
  const TALK = ['slit', 'dot', 'osmall', 'o', 'round', 'tri', 'teethOval', 'bean', 'halfD', 'wide'];
  const SPECIAL = {
    wow:   { eyes: 'wide', brow: 'high', mouth: 'O', extra: true },
    grin:  { eyes: 'content', mouth: 'teeth' },
    silly: { eyes: 'open', brow: 'arch', mouth: 'silly', extra: true },
    worried: { eyes: 'open', mouth: 'brace', calm: true },
  };
  const BASE = ['idle', 'blink'];

  const moodOf = (c, m) => c.invert ? 4 - m : m;
  const expr = (c, m, k) => {
    const md = MOODS[moodOf(c, m)];
    const e = SPECIAL[k] || md[k] || { eyes: 'open', brow: md.brow, mouth: k.slice(5) };
    return c.brow && e.eyes !== 'closed' && !e.calm ? { ...e, brow: c.brow } : e;
  };

  function oneEye(c, kind, x) {
    const E = c.eye, y = E.y, s = stroke();
    switch (kind) {
      case 'closed': return `<path d="M${x - E.r} ${y} h${E.r * 2}" ${s}/>`;
      case 'content': return `<path d="M${x - E.r} ${y - 2} Q ${x} ${y + E.r * 1.3} ${x + E.r} ${y - 2}" fill="none" ${s}/>`;
      case 'wide': return `<circle cx="${x}" cy="${y}" r="${E.r * 1.35}" fill="#fff" ${s}/><circle cx="${x}" cy="${y}" r="${E.p * 0.8}" fill="${INK}"/>`;
      default: return `<circle cx="${x}" cy="${y}" r="${E.r}" fill="#fff" ${s}/><circle cx="${x}" cy="${y}" r="${E.p}" fill="${INK}"/>`;
    }
  }

  function brows(c, kind) {
    if (!kind) return '';
    const E = c.eye, w = E.r + 3, y = E.y - E.r - 8;
    const one = (x, mir) => {
      const f = (v) => mir ? sx(v) : v;
      if (kind === 'angry') return `M${f(x - w)} ${y - 8} L ${f(x + w)} ${y + 2}`;
      const lift = kind === 'high' ? (c.browLift ?? -8) : 0;
      return `M${f(x - w)} ${y + lift + 3} Q ${f(x)} ${y + lift - 7} ${f(x + w)} ${y + lift + 3}`;
    };
    return `<path d="${one(E.x)} ${one(E.x, true)}" fill="none" ${stroke(SW + 0.5)}/>`;
  }

  // Offener Mund: D-Form (flache Oberkante) oder bei Blip eine abgerundete Box
  function openPath(c, x, top, w, h) {
    if (c.mouth.box) return `M${x - w / 2 + h / 2} ${top} H ${x + w / 2 - h / 2} A ${h / 2} ${h / 2} 0 0 1 ${x + w / 2 - h / 2} ${top + h} H ${x - w / 2 + h / 2} A ${h / 2} ${h / 2} 0 0 1 ${x - w / 2 + h / 2} ${top} Z`;
    return `M${x - w / 2} ${top} H ${x + w / 2} C ${x + w / 2} ${top + h * 1.33}, ${x - w / 2} ${top + h * 1.33}, ${x - w / 2} ${top} Z`;
  }

  function mouth(c, kind) {
    const M = c.mouth, x = M.x, y = M.y, w = M.w, h = w / 2, s = stroke();
    const fangs = (top) => c.fangs ? `<path d="M${x - w * 0.3} ${top} l5 10 l5 -10 Z M${x + w * 0.3} ${top} l-5 10 l-5 -10 Z" fill="#fff" ${stroke(2.5)}/>` : '';
    switch (kind) {
      case 'flat': return `<path d="M${x - h * 0.75} ${y} h${h * 1.5}" ${s}/>${fangs(y + 1)}`;
      case 'smile': return `<path d="M${x - h} ${y - 2} Q ${x} ${y + h * 0.9} ${x + h} ${y - 2}" fill="none" ${s}/>${fangs(y + 2)}`;
      case 'slit': return `<rect x="${x - w * 0.24}" y="${y - 3}" width="${w * 0.48}" height="8" rx="4" fill="${MOUTH}" ${s}/>`;
      case 'osmall': return `<ellipse cx="${x}" cy="${y + 2}" rx="${w * 0.09}" ry="${w * 0.12}" fill="${MOUTH}" ${s}/>`;
      case 'o': return `<ellipse cx="${x}" cy="${y + 4}" rx="${w * 0.15}" ry="${w * 0.2}" fill="${MOUTH}" ${s}/>`;
      case 'O': return `<ellipse cx="${x}" cy="${y + 8}" rx="${w * 0.2}" ry="${w * 0.32}" fill="${MOUTH}" ${s}/>`;
      case 'halfD': { const ww = w * 0.72, hh = w * 0.3, top = y - 3;
        return `<path d="${openPath(c, x, top, ww, hh)}" fill="${MOUTH}" ${s}/>${fangs(top)}`; }
      case 'D': { const top = y - 5, hh = w * 0.46;
        return `<path d="${openPath(c, x, top, w, hh)}" fill="${MOUTH}" ${s}/><ellipse cx="${x}" cy="${top + hh * 0.78}" rx="${w * 0.2}" ry="${w * 0.08}" fill="${TONGUE}"/>${fangs(top)}`; }
      case 'teeth': { const ww = w * 1.12, top = y - 6, hh = w * 0.5, d = openPath(c, x, top, ww, hh), th = hh * 0.36;
        const cols = [-0.3, -0.1, 0.1, 0.3].map((f) => `M${x + ww * f} ${top} v${th}`).join(' ');
        return `<clipPath id="cl${c.id}${kind}"><path d="${d}"/></clipPath><path d="${d}" fill="${MOUTH}"/>
          <g clip-path="url(#cl${c.id}${kind})"><rect x="${x - ww}" y="${top}" width="${ww * 2}" height="${th}" fill="#fff"/><path d="M${x - ww} ${top + th} H ${x + ww} ${cols}" stroke="${INK}" stroke-width="2.5"/></g>
          <path d="${d}" fill="none" ${s}/>`; }
      case 'joy': { // Bohnen-Mund mit oberer Zahnreihe: runde Enden, oben sanft eingedellt, unten bauchig. M.joy: Größe pro Figur
        const jw = w * (M.joy || 1), a = jw * 0.56, r = jw * 0.17, t = y - 6, d = jw * 0.12, b = t + jw * 0.56, e = t + r;
        const L = x - a, R = x + a, k = r * 0.55, q = (a - r) * 0.5, th = jw * 0.15;
        const top = `C ${L + r + q} ${t}, ${x - q} ${t + d}, ${x} ${t + d} C ${x + q} ${t + d}, ${R - r - q} ${t}, ${R - r} ${t}`;
        const shape = `M${L} ${e} C ${L} ${e - k}, ${L + r - k} ${t}, ${L + r} ${t} ${top} C ${R - r + k} ${t}, ${R} ${e - k}, ${R} ${e}
          C ${R} ${e + (b - e) * 0.8}, ${x + a * 0.55} ${b}, ${x} ${b} C ${x - a * 0.55} ${b}, ${L} ${e + (b - e) * 0.8}, ${L} ${e} Z`;
        // Oberkante als dicke weiße Linie, auf den Mund beschnitten = Zahnreihe; Trennstriche folgen grob der Delle
        const edge = (px) => { const u = Math.min(1, Math.abs(px - x) / (a - r)); return t + d * (1 - u * u); };
        const gaps = [-0.5, 0, 0.5].map((f) => { const px = x + f * (a - r); return `M${px} ${t - 2} V ${edge(px) + th}`; }).join(' ');
        return `<clipPath id="jy${c.id}"><path d="${shape}"/></clipPath><path d="${shape}" fill="${MOUTH}"/>
          <g clip-path="url(#jy${c.id})"><path d="M${L - 6} ${t} H ${L + r} ${top} H ${R + 6}" fill="none" stroke="#fff" stroke-width="${th * 2}"/>
          <path d="${gaps}" stroke="${INK}" stroke-width="2"/></g>
          <path d="${shape}" fill="none" ${s}/>${fangs(t + d - 1)}`; }
      case 'dot': return `<circle cx="${x}" cy="${y + 1}" r="3.5" fill="${INK}"/>`;
      case 'round': return `<circle cx="${x}" cy="${y + 5}" r="${w * 0.17}" fill="${MOUTH}" ${s}/>`;
      case 'wide': return `<ellipse cx="${x}" cy="${y + 6}" rx="${w * 0.38}" ry="${w * 0.19}" fill="${MOUTH}" ${s}/><ellipse cx="${x}" cy="${y + 6 + w * 0.1}" rx="${w * 0.18}" ry="${w * 0.06}" fill="${TONGUE}"/>${fangs(y + 6 - w * 0.19)}`;
      case 'tri': { const a = w * 0.24, b = y + w * 0.34;
        return `<path d="M${x} ${y - 6} L ${x + a} ${b} Q ${x} ${b + 7} ${x - a} ${b} Z" fill="${MOUTH}" ${s}/>`; }
      case 'bean': { const a = h * 0.85;
        return `<path d="M${x - a} ${y - 3} Q ${x} ${y + h * 0.3} ${x + a} ${y - 3} Q ${x + a * 1.15} ${y + h * 0.85} ${x} ${y + h * 0.85} Q ${x - a * 1.15} ${y + h * 0.85} ${x - a} ${y - 3} Z" fill="${MOUTH}" ${s}/>${fangs(y - 1)}`; }
      case 'teethOval': { const rx = w * 0.34, ry = w * 0.2, cy = y + 5;
        return `<clipPath id="to${c.id}"><ellipse cx="${x}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath><ellipse cx="${x}" cy="${cy}" rx="${rx}" ry="${ry}" fill="#fff"/>
          <path d="M${x - rx} ${cy} H ${x + rx} M${x - rx * 0.5} ${cy - ry} v${ry * 2} M${x} ${cy - ry} v${ry * 2} M${x + rx * 0.5} ${cy - ry} v${ry * 2}" stroke="${INK}" stroke-width="2.2" clip-path="url(#to${c.id})"/>
          <ellipse cx="${x}" cy="${cy}" rx="${rx}" ry="${ry}" fill="none" ${s}/>`; }
      case 'brace': return `<path d="M${x - h} ${y + 6} C ${x - h} ${y}, ${x - 8} ${y + 3}, ${x} ${y - 5} C ${x + 8} ${y + 3}, ${x + h} ${y}, ${x + h} ${y + 6}" fill="none" ${s}/>`;
      case 'silly': return `<path d="M${x - 6} ${y + h * 0.4} v9 a6 6 0 0 0 12 0 v-9 Z" fill="${TONGUE}" ${stroke(3)}/>
        <path d="M${x - h} ${y - 2} Q ${x} ${y + h * 0.9} ${x + h} ${y - 2} M${x - h - 4} ${y - 8} q -3 6 3 10 M${x + h + 4} ${y - 8} q 3 6 -3 10" fill="none" ${s}/>`;
    }
    return '';
  }

  function face(c, m, k) {
    const e = expr(c, m, k), mc = moodOf(c, m), E = c.eye;
    return `${c.back ? c.back(c, e, mc) : ''}${c.head(c, e, mc)}
      ${oneEye(c, e.eyes, E.x)}${oneEye(c, e.eyes, sx(E.x))}${brows(c, e.brow)}
      ${c.front ? c.front(c, e, mc) : ''}${mouth(c, e.mouth)}`;
  }
  // Ein Gesicht als <svg>. ids (clipPath) bekommen eine laufende Nummer, damit mehrere Gesichter auf einer Seite sich nicht stören.
  let uid = 0;
  function svg(inner, attrs = '', box = '0 26 200 156') {
    const u = ++uid;
    inner = inner.replace(/id="([^"]+)"/g, `id="$1-${u}"`).replace(/url\(#([^)]+)\)/g, `url(#$1-${u})`);
    return `<svg viewBox="${box}" ${attrs} xmlns="http://www.w3.org/2000/svg">${inner}</svg>`;
  }

  // Sprechfolge: zufällige Rede-Motive der Stimmung ohne direkte Wiederholung, dazu Spezial-Ausdrücke je nach Stimmung
  const pickOne = (a) => a[Math.floor(Math.random() * a.length)];
  function talkSeq(c, m) {
    const mc = moodOf(c, m), pool = MOODS[mc].talk, seq = [];
    for (let i = 0; i < 7; i++) { let k; do k = 'talk:' + pickOne(pool); while (k === seq[i - 1]); seq.push(k); }
    if (mc === 1) { seq[3] = 'blink'; seq[5] = 'worried'; }
    if (mc === 2) seq[3] = c.fav;
    if (mc === 3) { seq[2] = c.fav; seq[5] = pickOne(['wow', 'grin', 'silly'].filter((k) => k !== c.fav)); }
    return seq;
  }

  // Ein Spruch passend zur Stimmung (Aufschub tickt umgekehrt)
  const line = (c, m) => pickOne(c.lines[moodOf(c, m)]);

  return { CHARS, GROUPS, groupOf, MOODS, TALK, SPECIAL, BASE, moodOf, face, svg, talkSeq, line, sx };
})();
