// Eigene, einfache SVG-Zeichnungen für Figuren und Gebäude.

const INK = '#1d1d1d';

// Figur als SVG-String: Kopf aus faces.js in der aktuellen Stimmung. cosmetic: Eintrag aus COSMETICS oder null.
// headOnly: quadratischer Ausschnitt für runde Rahmen. k: Ausdruck (idle, blink, talk:…, wow …).
// data-* merkt sich alles, damit Blinzeln und Sprechen das Bild später austauschen können.
function avatarSvg(c, cosmetic, size = 64, headOnly = false, k = 'idle') {
  let inner = Faces.face(c, userMood(), k), y0 = 26;
  if (cosmetic) {
    // Eigenes Icon (icons.js) statt Emoji-Text
    const art = IC[EMOJI_ICON[cosmetic.e.replace('\uFE0F', '')]] || '';
    const at = (x, y, sz) => `<svg x="${x}" y="${y}" width="${sz}" height="${sz}" viewBox="0 0 100 100" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">${art}</svg>`;
    if (cosmetic.face) {
      const E = c.eye, w = Faces.sx(E.x) - E.x + E.r * 2 + 28;
      inner += at(100 - w / 2, E.y - w / 2, w);
    } else {
      const hy = c.top + 18 - 92;
      inner += at(54, hy, 92);
      y0 = Math.min(y0, hy + 8);
    }
  }
  const box = headOnly ? '10 16 180 180' : `0 ${y0} 200 ${182 - y0}`;
  const h = headOnly ? size : Math.round(size * (182 - y0) / 200);
  return Faces.svg(inner, `class="avatar" width="${size}" height="${h}" data-c="${c.id}" data-co="${cosmetic?.id || ''}" data-s="${size}" data-h="${headOnly ? 1 : ''}"`, box);
}

// App-Logo: Donut
function donutSvg(size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="50" cy="50" r="44" fill="#e8a860" stroke="${INK}" stroke-width="5"/>
    <path d="M50 12 C 78 12, 90 34, 86 52 C 80 46, 74 58, 66 52 C 58 60, 48 50, 40 58 C 30 52, 22 60, 14 52 C 10 30, 24 12, 50 12 Z" fill="#ff7eb6" stroke="${INK}" stroke-width="4"/>
    <circle cx="50" cy="50" r="13" fill="#fff8e0" stroke="${INK}" stroke-width="5"/>
    <g stroke-width="5" stroke-linecap="round"><path d="M30 30 l6 4" stroke="#3ac0f0"/><path d="M62 24 l6 -2" stroke="#ffe040"/><path d="M72 38 l4 6" stroke="#7ad04a"/><path d="M38 22 l-2 6" stroke="#fff"/></g>
  </svg>`;
}

// Cartoon-Icons für runde Buttons
const ICON = {
  pencil: `<svg viewBox="0 0 100 100" width="30" height="30" aria-hidden="true"><g transform="rotate(45 50 50)" stroke="${INK}" stroke-width="6" stroke-linejoin="round">
    <rect x="38" y="6" width="24" height="16" rx="5" fill="#ff8ab8"/><rect x="38" y="22" width="24" height="8" fill="#c8c8c8"/><rect x="38" y="30" width="24" height="42" fill="#ffd90f"/>
    <path d="M38 72 L50 94 L62 72 Z" fill="#f4d3a0"/><path d="M45.5 86 L50 94 L54.5 86 Z" fill="${INK}" stroke-width="2"/></g></svg>`,
  cart: `<svg viewBox="0 0 100 100" width="32" height="32" aria-hidden="true"><g stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" fill="none">
    <path d="M8 18 H22 L32 66 H80"/><path d="M26 30 H88 L80 56 H31 Z" fill="#fff"/><path d="M44 30 L46 56 M62 30 L62 56" stroke-width="4"/></g>
    <circle cx="38" cy="80" r="8" fill="#ffd90f" stroke="${INK}" stroke-width="6"/><circle cx="74" cy="80" r="8" fill="#ffd90f" stroke="${INK}" stroke-width="6"/></svg>`,
  gear: `<svg viewBox="0 0 100 100" width="28" height="28" aria-hidden="true"><g transform="translate(50 50)" stroke="${INK}" stroke-width="6" stroke-linejoin="round">
    ${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="-9" y="-46" width="18" height="22" rx="3" fill="#d8dde4" transform="rotate(${a})"/>`).join('')}
    <circle r="31" fill="#d8dde4"/><circle r="12" fill="#fff"/></g></svg>`,
  back: `<svg viewBox="0 0 100 100" width="24" height="24" aria-hidden="true"><path d="M62 16 L28 50 L62 84" fill="none" stroke="${INK}" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
};
