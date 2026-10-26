// Eigene, einfache SVG-Zeichnungen für Figuren und Gebäude.

const INK = '#1d1d1d';

function hairSvg(c) {
  const h = c.hairC;
  switch (c.hair) {
    case 'bald':
      return `<path d="M40 24 q4 -10 10 0 M50 24 q4 -10 10 0" fill="none" stroke="${INK}" stroke-width="1.6"/>
              <path d="M28 50 l4 -4 l2 6 l3 -5 l2 6" fill="none" stroke="${h}" stroke-width="2"/>`;
    case 'spiky':
      return `<polygon points="28,30 30,12 37,24 42,8 48,22 54,6 59,22 65,9 68,25 74,12 72,32" fill="${h}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
    case 'baby':
      return `<polygon points="34,28 38,16 44,24 50,12 56,24 62,16 66,28" fill="${h}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
    case 'tower':
      return `<path d="M30 34 C 22 -10, 30 -40, 50 -40 C 70 -40, 78 -10, 70 34 Z" fill="${h}" stroke="${INK}" stroke-width="1.5"/>
              <path d="M40 -20 q8 6 0 14 M58 -28 q-8 8 0 18 M48 0 q8 6 0 14" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>`;
    case 'beehive':
      return `<path d="M30 36 C 24 0, 36 -14, 50 -14 C 64 -14, 76 0, 70 36 Z" fill="${h}" stroke="${INK}" stroke-width="1.5"/>`;
    case 'long':
      return `<path d="M26 30 C 26 14, 74 14, 74 30 L 76 82 L 66 82 L 66 36 L 34 36 L 34 82 L 24 82 Z" fill="${h}" stroke="${INK}" stroke-width="1.5"/>`;
    case 'curly':
      return [[32,28],[40,22],[50,20],[60,22],[68,28],[30,38],[70,38]]
        .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="${h}" stroke="${INK}" stroke-width="1.2"/>`).join('');
    case 'big':
      return `<polygon points="50,-6 56,10 70,-2 68,16 86,10 76,26 94,30 76,38 90,50 72,48 74,60 62,48 50,40 38,48 26,60 28,48 10,50 24,38 6,30 24,26 14,10 32,16 30,-2 44,10" fill="${h}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`;
    case 'side':
      return `<path d="M27 40 C 24 14, 76 14, 73 40 C 66 30, 58 28, 44 30 L 40 26 L 36 32 C 32 33, 29 36, 27 40 Z" fill="${h}" stroke="${INK}" stroke-width="1.5"/>`;
    case 'flat':
      return `<path d="M27 38 C 26 16, 74 16, 73 38 C 60 30, 40 30, 27 38 Z" fill="${h}" stroke="${INK}" stroke-width="1.5"/>`;
    case 'mohawk':
      return `<path d="M27 38 C 26 16, 74 16, 73 38 C 60 32, 40 32, 27 38 Z" fill="${h}" stroke="${INK}" stroke-width="1.5"/>
              <path d="M72 34 q14 6 8 22 q-6 -8 -10 -12 Z" fill="${h}" stroke="${INK}" stroke-width="1.2"/>`;
    case 'pompadour':
      return `<path d="M27 38 C 22 10, 50 4, 72 14 C 80 18, 70 24, 62 22 C 54 28, 40 28, 27 38 Z" fill="${h}" stroke="${INK}" stroke-width="1.5"/>`;
    default:
      return '';
  }
}

function hatSvg(c) {
  if (c.hat === 'police') {
    return `<path d="M26 30 C 30 12, 70 12, 74 30 Z" fill="#2a3a7a" stroke="${INK}" stroke-width="1.5"/>
            <rect x="22" y="28" width="56" height="6" rx="3" fill="#1a2550" stroke="${INK}" stroke-width="1.2"/>
            <circle cx="50" cy="22" r="4" fill="#f0c020"/>`;
  }
  if (c.hat === 'duff') {
    return `<path d="M26 34 C 26 6, 74 6, 74 34 Z" fill="#d02020" stroke="${INK}" stroke-width="1.5"/>
            <rect x="34" y="20" width="32" height="10" rx="3" fill="#fff"/><text x="50" y="28.5" font-size="8" font-weight="900" text-anchor="middle" fill="#d02020" font-family="Arial">DUFF</text>`;
  }
  return '';
}

function alienSvg(c) {
  return `<path d="M22 112 L30 70 C 20 66, 18 20, 50 14 C 82 20, 80 66, 70 70 L78 112 Z" fill="${c.skin}" stroke="${INK}" stroke-width="1.8"/>
          <circle cx="50" cy="40" r="13" fill="#fff" stroke="${INK}" stroke-width="1.6"/><circle cx="50" cy="42" r="4" fill="${INK}"/>
          <path d="M36 66 q14 10 28 0" fill="#3a6a3a" stroke="${INK}" stroke-width="1.5"/>
          <path d="M30 86 q-14 6 -10 22 M70 86 q14 6 10 22" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;
}

// Figur als SVG-String. cosmetic: Eintrag aus COSMETICS oder null.
function avatarSvg(c, cosmetic, size = 64, headOnly = false) {
  const skin = c.skin || Y;
  const w = size, h = headOnly ? size : size * 1.6;
  let inner;
  if (c.alien) {
    inner = alienSvg(c);
  } else {
    const back = c.hair === 'long' || c.hair === 'big' ? hairSvg(c) : '';
    const front = c.hair === 'long' || c.hair === 'big' ? '' : hairSvg(c);
    inner = `
      ${back}
      <path d="M24 120 L28 92 C 30 86, 70 86, 72 92 L76 120 Z" fill="${c.shirt}" stroke="${INK}" stroke-width="1.8"/>
      <rect x="42" y="78" width="16" height="14" fill="${skin}" stroke="${INK}" stroke-width="1.5"/>
      ${c.pearls ? [36, 42, 50, 58, 64].map((x, i) => `<circle cx="${x}" cy="${90 + (i === 2 ? 2 : i % 2)}" r="2.6" fill="#fff" stroke="${INK}" stroke-width=".8"/>`).join('') : ''}
      <path d="M28 40 C 28 18, 72 18, 72 40 L 72 74 C 72 86, 28 86, 28 74 Z" fill="${skin}" stroke="${INK}" stroke-width="1.8"/>
      <circle cx="27" cy="58" r="5" fill="${skin}" stroke="${INK}" stroke-width="1.5"/>
      ${c.beard ? `<path d="M40 66 C 38 82, 62 84, 66 70 C 64 62, 50 62, 40 66 Z" fill="#d1b271" stroke="${INK}" stroke-width="1.2"/>` : ''}
      <circle cx="44" cy="46" r="9" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
      <circle cx="60" cy="46" r="9" fill="#fff" stroke="${INK}" stroke-width="1.6"/>
      <circle cx="46" cy="47" r="2.4" fill="${INK}"/><circle cx="62" cy="47" r="2.4" fill="${INK}"/>
      ${c.glasses ? `<circle cx="44" cy="46" r="11" fill="none" stroke="${INK}" stroke-width="2"/><circle cx="60" cy="46" r="11" fill="none" stroke="${INK}" stroke-width="2"/>` : ''}
      <path d="M52 52 C 64 52, 64 60, 54 60" fill="${skin}" stroke="${INK}" stroke-width="1.5"/>
      ${c.mustache ? `<path d="M44 64 C 50 60, 60 60, 64 64 C 58 66, 50 66, 44 64 Z" fill="${c.hairC}" stroke="${INK}" stroke-width="1"/>` : ''}
      ${c.pacifier ? `<circle cx="54" cy="70" r="6" fill="#e04040" stroke="${INK}" stroke-width="1.2"/><circle cx="54" cy="70" r="2.5" fill="#ffd0d0"/>`
                   : `<path d="M46 70 q8 6 16 0" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>`}
      ${front}
      ${hatSvg(c)}`;
  }
  let cos = '';
  if (cosmetic) {
    // Eigenes Icon (icons.js) statt Emoji-Text
    const art = IC[EMOJI_ICON[cosmetic.e.replace('\uFE0F', '')]] || '';
    const at = (x, y, sz) => `<svg x="${x}" y="${y}" width="${sz}" height="${sz}" viewBox="0 0 100 100" fill="none" stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round">${art}</svg>`;
    cos = cosmetic.face ? at(29, 23, 46) : at(26, (c.hair === 'tower' ? -24 : c.hair === 'beehive' ? -4 : 26) - 42, 48);
  }
  return `<svg class="avatar" viewBox="${headOnly ? '14 10 72 72' : '0 -44 100 168'}" width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">${inner}${cos}</svg>`;
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
