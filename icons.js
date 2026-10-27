// Eigene Cartoon-Icons statt System-Emoji.
// Die Emoji im Code und in den Daten bleiben als Schlüssel; iconize() ersetzt sie im DOM durch diese SVGs.
// Stil wie ICON in art.js: 100er-Raster, schwarze Kontur 6, flache Simpsons-Farben.

const IC = (() => {
  const K = '#1d1d1d', YE = '#ffd90f', PI = '#ff8ab8', BL = '#4aa8ff', SKY = '#9fd8ff', GR = '#7ad04a', DG = '#3f9a3a',
    OR = '#ff9a3c', RE = '#ff5a4e', CR = '#fff8e0', GY = '#d8dde4', BR = '#b9773f', PU = '#a98bff', TN = '#f4d3a0', DK = '#3a3a4a';
  // Linie mit schwarzer Kontur (Cartoon-Strich)
  const ol = (d, c, w = 8) => `<path d="${d}" stroke="${K}" stroke-width="${w + 8}"/><path d="${d}" stroke="${c}" stroke-width="${w}"/>`;
  const thin = (d, w = 4) => `<path d="${d}" stroke-width="${w}"/>`;
  const noSign = `<circle cx="50" cy="50" r="40" stroke-width="16"/><path d="M22 22 L78 78" stroke-width="16"/><circle cx="50" cy="50" r="40" stroke="${RE}" stroke-width="8"/><path d="M22 22 L78 78" stroke="${RE}" stroke-width="8"/>`;
  const arrowLoop = (c) => `${ol('M22 46 C22 32 32 26 44 26 H66', c)}<path d="M62 12 L82 26 L62 40 Z" fill="${c}"/>${ol('M78 54 C78 68 68 74 56 74 H34', c)}<path d="M38 60 L18 74 L38 88 Z" fill="${c}"/>`;
  const head = (cx, cy, r) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${YE}"/>`;
  const star4 = (x, y, s, c) => `<path d="M${x} ${y - s} C${x + s * 0.15} ${y - s * 0.15} ${x + s * 0.15} ${y - s * 0.15} ${x + s} ${y} C${x + s * 0.15} ${y + s * 0.15} ${x + s * 0.15} ${y + s * 0.15} ${x} ${y + s} C${x - s * 0.15} ${y + s * 0.15} ${x - s * 0.15} ${y + s * 0.15} ${x - s} ${y} C${x - s * 0.15} ${y - s * 0.15} ${x - s * 0.15} ${y - s * 0.15} ${x} ${y - s} Z" fill="${c}" stroke-width="5"/>`;

  return {
    // --- Spielsystem ---
    donut: `<circle cx="50" cy="50" r="42" fill="#e8a860"/><path d="M50 14 C76 14 88 34 84 52 C78 46 72 58 64 52 C56 60 48 50 40 58 C30 52 22 60 16 52 C12 32 26 14 50 14 Z" fill="#ff7eb6" stroke-width="5"/><circle cx="50" cy="50" r="12" fill="${CR}"/><g stroke-width="5"><path d="M30 30 l6 4" stroke="#3ac0f0"/><path d="M62 24 l6 -2" stroke="${YE}"/><path d="M72 38 l4 6" stroke="${GR}"/><path d="M38 22 l-2 6" stroke="#fff"/></g>`,
    fire: `<path d="M50 6 C62 26 82 38 80 62 C78 82 64 92 50 92 C34 92 20 82 20 62 C20 46 30 38 34 24 C42 32 44 38 46 44 C50 32 52 20 50 6 Z" fill="${OR}"/><path d="M50 50 C58 60 64 66 62 76 C60 84 54 88 50 88 C44 88 38 84 38 76 C38 68 44 62 50 50 Z" fill="${YE}" stroke-width="5"/>`,
    trophy: `<path d="M30 24 C14 24 14 46 34 50 M70 24 C86 24 86 46 66 50" stroke-width="7"/><path d="M28 12 H72 V38 C72 56 62 66 50 66 C38 66 28 56 28 38 Z" fill="${YE}"/><rect x="43" y="66" width="14" height="12" fill="${YE}"/><rect x="28" y="78" width="44" height="12" rx="3" fill="${BR}"/><path d="M40 24 V40" stroke="#fff" stroke-width="5"/>`,
    medal: `<path d="M26 8 H44 L56 40 H38 Z" fill="${BL}"/><path d="M74 8 H56 L44 40 H62 Z" fill="${RE}"/><circle cx="50" cy="64" r="26" fill="${YE}"/><path d="M50 50 L54 60 L64 60 L56 67 L59 77 L50 71 L41 77 L44 67 L36 60 L46 60 Z" fill="${OR}" stroke-width="4"/>`,
    freeze: `<path d="M50 12 L86 30 L50 48 L14 30 Z" fill="#e6f6ff"/><path d="M14 30 L50 48 V90 L14 72 Z" fill="${SKY}"/><path d="M86 30 L50 48 V90 L86 72 Z" fill="#62bdf2"/><path d="M24 44 V58 M32 50 V54" stroke="#fff" stroke-width="5"/>`,
    lock: `${ol('M32 46 V32 C32 12 68 12 68 32 V46', GY, 8)}<rect x="20" y="44" width="60" height="44" rx="9" fill="${YE}"/><circle cx="50" cy="62" r="6" fill="${K}"/><path d="M50 64 V76" stroke-width="7"/>`,
    check: ol('M20 52 L42 74 L82 28', GR, 12),
    cross: ol('M26 26 L74 74 M74 26 L26 74', RE, 12),
    boom: `<path d="M50 4 L60 30 L88 18 L74 44 L96 56 L68 62 L76 92 L52 72 L30 94 L32 66 L4 62 L26 46 L12 20 L40 30 Z" fill="${OR}"/><path d="M50 30 L56 44 L72 40 L62 54 L72 66 L56 62 L50 76 L44 62 L28 66 L38 54 L28 40 L44 44 Z" fill="${YE}" stroke-width="4"/>`,
    party: `<path d="M12 90 L34 38 L64 68 Z" fill="${YE}"/><path d="M22 66 L44 82 M28 52 L54 74" stroke="${RE}" stroke-width="6"/><path d="M12 90 L34 38 L64 68 Z"/><path d="M48 30 C50 18 60 16 62 8" stroke-width="5"/><path d="M70 52 C80 48 86 54 94 50" stroke-width="5"/><circle cx="74" cy="24" r="6" fill="${PI}" stroke-width="4"/><circle cx="88" cy="34" r="4" fill="${BL}" stroke-width="3"/><rect x="58" y="36" width="9" height="9" fill="${GR}" stroke-width="3" transform="rotate(20 62 40)"/>`,
    sparkle: `${star4(42, 54, 32, YE)}${star4(76, 22, 16, '#fff')}${star4(80, 78, 10, PI)}`,
    money: `<path d="M36 28 L28 12 L42 18 L50 8 L58 18 L72 12 L64 28 Z" fill="${GR}"/><path d="M36 28 C22 42 14 56 16 70 C18 84 32 92 50 92 C68 92 82 84 84 70 C86 56 78 42 64 28 Z" fill="${GR}"/><path d="M60 50 C56 44 40 44 40 53 C40 62 60 60 60 70 C60 80 44 80 38 74 M50 40 V84" stroke="${CR}" stroke-width="6"/>`,
    gift: `<rect x="14" y="40" width="72" height="50" rx="4" fill="${RE}"/><rect x="8" y="28" width="84" height="16" rx="4" fill="${RE}"/><path d="M50 28 V90" stroke="${YE}" stroke-width="10"/><path d="M50 28 V90 M45 28 V90 M55 28 V90" stroke-width="0"/><path d="M50 28 C36 8 22 18 34 28 Z M50 28 C64 8 78 18 66 28 Z" fill="${YE}"/>`,
    stats: `<path d="M12 12 V88 H92" stroke-width="7"/><rect x="22" y="52" width="16" height="34" fill="${BL}"/><rect x="44" y="30" width="16" height="56" fill="${GR}"/><rect x="66" y="42" width="16" height="44" fill="${OR}"/>`,
    trend: `<path d="M12 12 V88 H92" stroke-width="7"/>${ol('M22 72 L42 52 L56 62 L80 34', GR, 8)}<path d="M68 26 H88 V46 Z" fill="${GR}"/>`,
    // --- Steuerung ---
    play: `<path d="M30 16 L84 50 L30 84 Z" fill="${GR}"/>`,
    pause: `<rect x="24" y="18" width="18" height="64" rx="5" fill="${YE}"/><rect x="58" y="18" width="18" height="64" rx="5" fill="${YE}"/>`,
    stop: `<rect x="22" y="22" width="56" height="56" rx="9" fill="${RE}"/>`,
    stopwatch: `<rect x="40" y="6" width="20" height="10" rx="3" fill="${GY}"/><path d="M50 16 V22 M78 26 L84 20" stroke-width="7"/><circle cx="50" cy="56" r="34" fill="${CR}"/><path d="M50 56 V34" stroke-width="7"/><path d="M50 56 L64 64" stroke-width="6"/><circle cx="50" cy="56" r="4" fill="${K}"/>`,
    alarm: `<circle cx="24" cy="22" r="13" fill="${YE}"/><circle cx="76" cy="22" r="13" fill="${YE}"/><path d="M30 84 L22 94 M70 84 L78 94" stroke-width="7"/><circle cx="50" cy="56" r="34" fill="${RE}"/><circle cx="50" cy="56" r="24" fill="${CR}"/><path d="M50 56 V40 M50 56 L62 62" stroke-width="6"/>`,
    bell: `<path d="M50 8 V18" stroke-width="7"/><path d="M22 70 C28 62 26 52 28 42 C30 28 40 20 50 20 C60 20 70 28 72 42 C74 52 72 62 78 70 Z" fill="${YE}"/><rect x="14" y="66" width="72" height="12" rx="6" fill="${OR}"/><circle cx="50" cy="86" r="8" fill="${BR}"/><path d="M8 36 C6 44 6 52 10 60 M92 36 C94 44 94 52 90 60" stroke-width="5"/>`,
    repeat: arrowLoop(BL),
    refresh: `${ol('M80 50 A30 30 0 1 1 66 24', GR, 8)}<path d="M54 10 L80 18 L66 40 Z" fill="${GR}"/>`,
    flip: `<path d="M18 36 H78 M66 22 L80 36 L66 50 M82 64 H22 M34 50 L20 64 L34 78" stroke-width="9"/>`,
    up: `<path d="M38 88 H62 V48 H80 L50 12 L20 48 H38 Z" fill="${GR}"/>`,
    down: `<path d="M38 12 H62 V52 H80 L50 88 L20 52 H38 Z" fill="${BL}"/>`,
    dblDown: `${ol('M24 20 L50 44 L76 20', BL, 9)}${ol('M24 54 L50 78 L76 54', BL, 9)}`,
    pin: `<path d="M50 92 C50 92 20 60 20 38 C20 20 34 8 50 8 C66 8 80 20 80 38 C80 60 50 92 50 92 Z" fill="${RE}"/><circle cx="50" cy="38" r="12" fill="${CR}"/>`,
    question: `${ol('M32 34 C32 20 42 12 52 12 C64 12 70 22 70 32 C70 48 52 46 52 64', OR, 10)}<circle cx="52" cy="84" r="8" fill="${OR}"/>`,
    // --- Verbindung ---
    smile: `${head(50, 50, 40)}<circle cx="36" cy="42" r="5" fill="${K}"/><circle cx="64" cy="42" r="5" fill="${K}"/><path d="M30 58 C38 74 62 74 70 58"/>`,
    phone: `<path d="M22 10 H38 L46 32 L34 42 C40 56 46 62 58 68 L68 56 L90 62 V80 C90 86 84 92 76 92 C40 90 10 60 8 24 C8 16 14 10 22 10 Z" fill="${RE}"/><path d="M60 12 C74 14 86 26 88 40 M60 26 C68 28 72 32 74 40" stroke-width="5"/>`,
    crystal: `<path d="M26 78 H74 L84 92 H16 Z" fill="${BR}"/><circle cx="50" cy="44" r="36" fill="${PU}"/><path d="M30 34 C32 24 40 16 50 14" stroke="#fff" stroke-width="6"/>${star4(60, 50, 12, '#fff')}`,
    globe: `<circle cx="50" cy="50" r="40" fill="${BL}"/><ellipse cx="50" cy="50" rx="17" ry="40" stroke-width="5"/><path d="M10 50 H90 M17 30 H83 M17 70 H83" stroke-width="5"/>`,
    people: `<path d="M48 64 C52 58 58 54 66 54 C82 54 92 66 92 90 H60" fill="${GR}"/>${head(66, 32, 17)}<path d="M8 90 C8 70 20 60 36 60 C52 60 64 70 64 90 Z" fill="${BL}"/>${head(36, 38, 18)}`,
    search: `${ol('M62 62 L86 86', BR, 12)}<circle cx="42" cy="42" r="28" fill="${SKY}"/><path d="M28 34 C30 28 36 24 42 24" stroke="#fff" stroke-width="6"/>`,
    gear: `<g transform="translate(50 50)">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<rect x="-9" y="-46" width="18" height="22" rx="3" fill="${GY}" transform="rotate(${a})"/>`).join('')}<circle r="31" fill="${GY}"/><circle r="12" fill="#fff"/></g>`,
    // --- Bau & Laden ---
    hammer: `<g transform="rotate(-40 50 50)"><rect x="44" y="34" width="13" height="60" rx="4" fill="${BR}"/><rect x="24" y="10" width="54" height="26" rx="5" fill="${GY}"/></g>`,
    box: `<path d="M50 10 L88 28 L50 46 L12 28 Z" fill="#f0c890"/><path d="M12 28 L50 46 V90 L12 72 Z" fill="#d49a5c"/><path d="M88 28 L50 46 V90 L88 72 Z" fill="#b97e44"/><path d="M31 19 L69 37 V50" stroke-width="5"/>`,
    palette: `<path d="M50 10 C24 10 8 30 8 50 C8 74 28 90 48 90 C60 90 62 80 56 74 C52 68 56 60 64 60 H76 C86 60 92 52 92 44 C92 24 72 10 50 10 Z" fill="${TN}"/><circle cx="30" cy="36" r="8" fill="${RE}" stroke-width="5"/><circle cx="52" cy="26" r="8" fill="${YE}" stroke-width="5"/><circle cx="74" cy="36" r="8" fill="${BL}" stroke-width="5"/><circle cx="26" cy="60" r="8" fill="${GR}" stroke-width="5"/>`,
    cart: `<path d="M8 18 H22 L32 66 H80"/><path d="M26 30 H88 L80 56 H31 Z" fill="#fff"/><path d="M44 30 L46 56 M62 30 L62 56" stroke-width="4"/><circle cx="38" cy="80" r="8" fill="${YE}"/><circle cx="74" cy="80" r="8" fill="${YE}"/>`,
    house: `<rect x="62" y="16" width="12" height="24" fill="${BR}"/><rect x="22" y="46" width="56" height="44" fill="#ffb36b"/><path d="M10 52 L50 14 L90 52 Z" fill="${RE}"/><rect x="43" y="62" width="16" height="28" fill="${BR}"/><rect x="26" y="58" width="12" height="12" fill="${SKY}" stroke-width="4"/>`,
    couch: `<rect x="16" y="22" width="68" height="34" rx="10" fill="#c98b5a"/><rect x="8" y="44" width="20" height="36" rx="8" fill="#c98b5a"/><rect x="72" y="44" width="20" height="36" rx="8" fill="#c98b5a"/><rect x="24" y="54" width="52" height="26" rx="4" fill="#dca06c"/><path d="M50 54 V80" stroke-width="4"/><path d="M16 80 V90 M84 80 V90" stroke-width="7"/>`,
    // --- Kosmetik ---
    tophat: `<ellipse cx="50" cy="80" rx="42" ry="10" fill="${DK}"/><path d="M28 18 H72 V80 C60 84 40 84 28 80 Z" fill="${DK}"/><rect x="28" y="60" width="44" height="10" fill="${RE}"/>`,
    gradcap: `<path d="M28 44 V66 C40 76 60 76 72 66 V44" fill="${DK}"/><path d="M50 16 L94 36 L50 56 L6 36 Z" fill="${DK}"/><path d="M50 36 L80 48 V68" stroke="${YE}" stroke-width="5"/><circle cx="80" cy="72" r="6" fill="${YE}" stroke-width="4"/>`,
    cap: `<path d="M44 62 H90 C98 62 98 72 90 72 H44 Z" fill="${BL}"/><path d="M14 64 C14 36 30 24 48 24 C66 24 80 36 80 64 Z" fill="${BL}"/><circle cx="48" cy="22" r="5" fill="${RE}" stroke-width="4"/><path d="M48 26 V62" stroke-width="4"/>`,
    blossom: `<g transform="translate(50 50)">${[0, 72, 144, 216, 288].map((a) => `<circle cx="0" cy="-24" r="17" fill="${PI}" transform="rotate(${a})"/>`).join('')}<circle r="13" fill="${YE}"/></g>`,
    shades: `<path d="M8 36 H92" stroke-width="7"/><path d="M12 36 H44 V48 C44 62 32 66 24 64 C14 62 12 52 12 36 Z" fill="${DK}"/><path d="M56 36 H88 C88 52 86 62 76 64 C68 66 56 62 56 48 Z" fill="${DK}"/><path d="M20 44 L28 52 M64 44 L72 52" stroke="#fff" stroke-width="4"/>`,
    hardhat: `<rect x="4" y="64" width="92" height="12" rx="6" fill="${YE}"/><path d="M14 66 C14 36 30 20 50 20 C70 20 86 36 86 66 Z" fill="${YE}"/><path d="M42 22 V64 M58 22 V64" stroke-width="5"/><path d="M24 50 C26 40 32 32 40 28" stroke="#fff" stroke-width="5"/>`,
    bow: `<path d="M50 50 L12 24 L14 76 Z" fill="${PI}"/><path d="M50 50 L88 24 L86 76 Z" fill="${PI}"/><circle cx="50" cy="50" r="11" fill="${RE}"/>`,
    helmet: `<rect x="6" y="64" width="88" height="12" rx="6" fill="#6f7f45"/><path d="M16 66 C16 36 32 20 50 20 C68 20 84 36 84 66 Z" fill="#8a9a55"/><path d="M30 46 L36 52 M58 34 L64 40" stroke="#5a6838" stroke-width="5"/>`,
    crown: `<path d="M12 74 L16 28 L34 50 L50 18 L66 50 L84 28 L88 74 Z" fill="${YE}"/><rect x="12" y="72" width="76" height="14" rx="3" fill="${YE}"/><circle cx="50" cy="56" r="6" fill="${RE}" stroke-width="4"/><circle cx="30" cy="79" r="4" fill="${BL}" stroke-width="3"/><circle cx="70" cy="79" r="4" fill="${BL}" stroke-width="3"/>`,
    // --- Körper & Gesundheit ---
    walk: `${head(56, 16, 11)}${ol('M54 30 L46 58 M52 38 L36 50 M52 38 L66 50 M46 58 L34 86 M46 58 L62 86', BL, 8)}`,
    run: `${head(62, 16, 11)}${ol('M58 30 L46 56 M56 36 L72 46 M56 36 L36 40 L28 52 M46 56 L64 68 L60 88 M46 56 L32 72 L14 70', OR, 8)}`,
    meditate: `<path d="M12 76 C24 62 76 62 88 76 C76 88 24 88 12 76 Z" fill="${BL}"/><path d="M38 38 H62 L68 68 H32 Z" fill="${OR}"/>${ol('M40 44 L28 62 L36 70 M60 44 L72 62 L64 70', YE, 7)}${head(50, 24, 13)}<path d="M42 22 C44 25 46 25 48 22 M52 22 C54 25 56 25 58 22 M45 30 C48 32 52 32 55 30" stroke-width="3.5"/><path d="M16 30 C12 24 12 18 16 12 M84 30 C88 24 88 18 84 12" stroke="${PU}" stroke-width="5"/>`,
    muscle: `<path d="M8 62 C16 44 40 36 52 48 L58 36 C56 24 62 14 72 14 C84 14 90 24 84 34 L80 42 C84 58 84 76 74 86 C56 92 28 90 8 86 Z" fill="${YE}"/><path d="M24 60 C32 52 42 52 48 58" stroke-width="5"/><path d="M64 24 C68 21 72 21 77 24" stroke-width="4"/><path d="M14 36 L20 42 M24 28 L28 36" stroke="${OR}" stroke-width="5"/>`,
    sleep: `<circle cx="46" cy="54" r="38" fill="${YE}"/><path d="M24 50 C28 56 36 56 40 50 M52 50 C56 56 64 56 68 50" stroke-width="5"/><ellipse cx="46" cy="72" rx="6" ry="5" fill="${K}"/><path d="M70 6 H90 L70 26 H90" stroke-width="5" stroke="${BL}"/>`,
    exhale: `<circle cx="42" cy="54" r="36" fill="${YE}"/><path d="M22 48 C26 54 32 54 36 48 M46 48 C50 54 56 54 60 48" stroke-width="5"/><circle cx="56" cy="70" r="5" fill="${K}"/><path d="M66 70 C76 64 84 74 94 68 M68 80 C78 76 84 84 92 80" stroke="${SKY}" stroke-width="6"/>`,
    brain: `<path d="M50 20 C42 12 24 14 22 28 C10 32 10 52 20 56 C16 70 30 82 44 76 L50 78 L56 76 C70 82 84 70 80 56 C90 52 90 32 78 28 C76 14 58 12 50 20 Z" fill="${PI}"/>${thin('M50 20 V76 M30 38 C36 34 42 40 36 48 M70 38 C64 34 58 40 64 48 M28 60 C34 56 40 62 38 68 M72 60 C66 56 60 62 62 68')}`,
    tooth: `<path d="M24 22 C24 12 40 10 50 16 C60 10 76 12 76 22 C76 42 70 52 68 72 C66 88 58 88 56 72 C55 64 45 64 44 72 C42 88 34 88 32 72 C30 52 24 42 24 22 Z" fill="#fff"/><path d="M34 24 C34 20 38 18 42 20" stroke="${SKY}" stroke-width="5"/>`,
    toothbrush: `<g transform="rotate(-35 50 50)"><rect x="10" y="44" width="62" height="14" rx="7" fill="${BL}"/><rect x="66" y="40" width="26" height="18" rx="4" fill="#fff"/><path d="M70 40 V28 M77 40 V28 M84 40 V28 M90 40 V30" stroke="${SKY}" stroke-width="5"/><path d="M68 28 H92" stroke-width="0"/></g>`,
    pill: `<g transform="rotate(-45 50 50)"><rect x="32" y="10" width="36" height="80" rx="18" fill="#fff"/><path d="M32 50 V28 C32 4 68 4 68 28 V50 Z" fill="${RE}"/></g>`,
    noSmoke: `<rect x="14" y="44" width="62" height="14" fill="#fff"/><rect x="62" y="44" width="16" height="14" fill="${OR}"/><path d="M84 40 C80 32 88 28 84 20" stroke="${GY}" stroke-width="5"/>${noSign}`,
    noPhone: `<rect x="32" y="14" width="36" height="72" rx="8" fill="${GY}"/><rect x="38" y="24" width="24" height="46" fill="${SKY}" stroke-width="4"/>${noSign}`,
    footprints: `<ellipse cx="32" cy="64" rx="12" ry="20" fill="${TN}"/><ellipse cx="68" cy="40" rx="12" ry="20" fill="${TN}"/>${[[24, 38], [32, 36], [40, 40]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${TN}" stroke-width="3"/>`).join('')}${[[60, 14], [68, 12], [76, 16]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${TN}" stroke-width="3"/>`).join('')}`,
    sneaker: `<path d="M8 70 V40 C8 34 16 32 20 36 C28 44 38 46 46 40 L54 34 C66 42 80 50 88 56 C94 60 94 70 88 70 Z" fill="#fff"/><rect x="6" y="70" width="88" height="12" rx="6" fill="${GY}"/><path d="M30 52 L58 60 M60 46 L50 56" stroke="${RE}" stroke-width="6"/>`,
    dumbbell: `<path d="M22 50 H78" stroke-width="10"/><rect x="10" y="26" width="16" height="48" rx="4" fill="${BL}"/><rect x="74" y="26" width="16" height="48" rx="4" fill="${BL}"/><rect x="2" y="36" width="10" height="28" rx="3" fill="${BL}"/><rect x="88" y="36" width="10" height="28" rx="3" fill="${BL}"/>`,
    bolt: `<path d="M58 6 L20 54 H46 L38 94 L80 40 H54 Z" fill="${YE}"/>`,
    skull: `<path d="M50 10 C26 10 12 26 12 46 C12 58 20 66 28 70 V86 H72 V70 C80 66 88 58 88 46 C88 26 74 10 50 10 Z" fill="#fff"/><circle cx="35" cy="46" r="10" fill="${K}"/><circle cx="65" cy="46" r="10" fill="${K}"/><path d="M50 58 L45 66 H55 Z" fill="${K}" stroke-width="4"/><path d="M40 76 V86 M50 76 V86 M60 76 V86" stroke-width="4"/>`,
    // --- Essen & Trinken ---
    coffee: `<path d="M36 6 C30 14 42 18 36 26 M54 6 C48 14 60 18 54 26" stroke="${GY}" stroke-width="5"/><path d="M70 46 C88 46 88 72 70 72" stroke-width="8"/><rect x="18" y="34" width="54" height="54" rx="10" fill="#fff"/><rect x="18" y="56" width="54" height="10" fill="${RE}" stroke-width="0"/><rect x="18" y="34" width="54" height="54" rx="10"/>`,
    drop: `<path d="M50 8 C64 30 80 46 80 64 C80 82 66 92 50 92 C34 92 20 82 20 64 C20 46 36 30 50 8 Z" fill="#4fb6ff"/><path d="M34 62 C34 72 40 78 48 80" stroke="#fff" stroke-width="6"/>`,
    salad: `<circle cx="34" cy="40" r="14" fill="${GR}"/><circle cx="56" cy="34" r="16" fill="${DG}"/><circle cx="72" cy="44" r="10" fill="${RE}"/><path d="M10 50 H90 C90 74 72 90 50 90 C28 90 10 74 10 50 Z" fill="#fff"/><path d="M20 62 H80" stroke="${BL}" stroke-width="5"/>`,
    apple: `<path d="M50 30 C40 20 16 22 16 48 C16 72 32 90 44 88 C48 87 52 87 56 88 C68 90 84 72 84 48 C84 22 60 20 50 30 Z" fill="${RE}"/><path d="M50 30 C50 22 52 16 56 10" stroke-width="6"/><path d="M56 20 C62 10 74 10 78 14 C70 24 62 24 56 20 Z" fill="${GR}" stroke-width="5"/><path d="M30 44 C30 38 34 34 38 34" stroke="#fff" stroke-width="5"/>`,
    broccoli: `<path d="M40 56 L36 90 H64 L60 56 Z" fill="#b7e08a"/><path d="M22 58 C8 56 8 36 22 34 C20 18 40 10 50 20 C60 10 80 18 78 34 C92 36 92 56 78 58 Z" fill="${DG}"/><circle cx="36" cy="40" r="5" fill="${GR}" stroke-width="0"/><circle cx="60" cy="32" r="5" fill="${GR}" stroke-width="0"/>`,
    cereal: `<circle cx="34" cy="44" r="7" fill="${OR}" stroke-width="4"/><circle cx="50" cy="40" r="7" fill="${YE}" stroke-width="4"/><circle cx="66" cy="44" r="7" fill="${OR}" stroke-width="4"/><path d="M60 34 L84 10" stroke-width="7"/><path d="M10 48 H90 C90 72 72 88 50 88 C28 88 10 72 10 48 Z" fill="${BL}"/><path d="M28 62 H72" stroke="#fff" stroke-width="5"/>`,
    sandwich: `<path d="M12 44 C12 22 88 22 88 44 Z" fill="${TN}"/><path d="M8 50 C18 42 28 58 38 50 C48 42 58 58 68 50 C78 42 88 58 94 50 L92 60 H8 Z" fill="${GR}"/><rect x="12" y="58" width="76" height="10" fill="${RE}"/><rect x="10" y="68" width="80" height="16" rx="6" fill="${TN}"/>`,
    pasta: `<ellipse cx="50" cy="66" rx="44" ry="22" fill="#fff"/><path d="M24 62 C30 44 40 58 46 46 C52 34 60 56 66 44 C72 34 80 50 76 62 C64 74 36 74 24 62 Z" fill="${YE}"/><circle cx="50" cy="52" r="9" fill="${RE}" stroke-width="5"/>`,
    plate: `<circle cx="50" cy="52" r="32" fill="#fff"/><circle cx="50" cy="52" r="20" fill="${CR}" stroke-width="4"/><path d="M8 18 V40 C8 46 14 46 14 40 M14 18 V88 M20 18 V40 C20 46 14 46 14 40" stroke-width="5"/><path d="M88 88 V16 C80 22 78 40 88 50" fill="${GY}" stroke-width="5"/>`,
    softdrink: `${ol('M54 22 L66 4', '#fff', 6)}<path d="M22 22 H78 L70 92 H30 Z" fill="${RE}"/><rect x="18" y="16" width="64" height="10" rx="4" fill="#fff"/><path d="M30 50 H72" stroke="#fff" stroke-width="5"/>`,
    milk: `<path d="M24 10 H76 L68 92 H32 Z" fill="#e6f6ff"/><path d="M27 38 H73 L68 92 H32 Z" fill="#fff"/><path d="M27 38 C40 32 58 44 73 38" stroke-width="5"/>`,
    tap: `<path d="M14 26 H52 C62 26 68 32 68 42 V50" stroke-width="14"/><path d="M14 26 H52 C62 26 68 32 68 42 V50" stroke="${GY}" stroke-width="6"/><rect x="24" y="12" width="20" height="10" rx="3" fill="${BL}"/><path d="M68 56 C74 66 78 70 78 76 C78 82 74 86 68 86 C62 86 58 82 58 76 C58 70 62 66 68 56 Z" fill="#4fb6ff"/>`,
    bubbles: `<circle cx="36" cy="60" r="24" fill="#d7f0ff"/><circle cx="72" cy="34" r="16" fill="#d7f0ff"/><circle cx="74" cy="76" r="9" fill="#d7f0ff"/><path d="M24 54 C24 48 28 44 34 42 M66 28 C68 24 72 22 76 24" stroke="#fff" stroke-width="5"/>`,
    yellowDot: `<circle cx="50" cy="50" r="34" fill="${YE}"/>`,
    // --- Natur & Wetter ---
    tree: `<rect x="43" y="56" width="14" height="34" fill="${BR}"/><path d="M24 62 C8 60 10 34 26 34 C24 14 48 8 56 20 C72 12 90 28 80 44 C94 56 80 72 66 64 C58 74 40 74 34 64 C30 66 26 64 24 62 Z" fill="${GR}"/>`,
    herb: `${ol('M50 92 C50 70 48 46 56 14', DG, 5)}<path d="M50 66 C36 66 24 58 20 46 C34 44 46 52 50 66 Z" fill="${GR}" stroke-width="5"/><path d="M52 46 C64 46 76 38 80 26 C66 24 54 32 52 46 Z" fill="${GR}" stroke-width="5"/><path d="M54 28 C46 24 40 16 40 8 C50 10 56 18 54 28 Z" fill="${GR}" stroke-width="5"/>`,
    daisy: `<g transform="translate(50 50)">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<ellipse cx="0" cy="-26" rx="9" ry="16" fill="#fff" transform="rotate(${a})" stroke-width="5"/>`).join('')}<circle r="14" fill="${YE}"/></g>`,
    sun: `<g transform="translate(50 50)">${[0, 45, 90, 135, 180, 225, 270, 315].map((a) => `<path d="M0 -30 V-44" stroke-width="8" transform="rotate(${a})"/>`).join('')}<circle r="22" fill="${YE}"/></g>`,
    moon: `<path d="M60 10 C34 12 16 34 20 58 C24 80 48 94 70 88 C80 86 88 80 92 72 C68 76 46 60 46 38 C46 26 52 16 60 10 Z" fill="${YE}"/>${star4(76, 24, 10, '#fff')}`,
    sunrise: `<path d="M50 14 V22 M20 26 L26 32 M80 26 L74 32 M8 52 H16 M84 52 H92" stroke-width="7"/><path d="M22 64 C22 46 34 34 50 34 C66 34 78 46 78 64 Z" fill="${OR}"/><rect x="6" y="64" width="88" height="24" rx="4" fill="${BL}"/><path d="M22 74 H46 M58 80 H78" stroke="#fff" stroke-width="5"/>`,
    rainbow: `<path d="M12 78 A38 38 0 0 1 88 78" stroke-width="34"/><path d="M12 78 A38 38 0 0 1 88 78" stroke="${RE}" stroke-width="7" transform="translate(0 0)"/><path d="M21 78 A29 29 0 0 1 79 78" stroke="${YE}" stroke-width="7"/><path d="M30 78 A20 20 0 0 1 70 78" stroke="${BL}" stroke-width="7"/><ellipse cx="18" cy="80" rx="14" ry="9" fill="#fff"/><ellipse cx="82" cy="80" rx="14" ry="9" fill="#fff"/>`,
    balloon: `<path d="M50 74 C44 82 56 86 50 96" stroke-width="4"/><path d="M44 78 L50 70 L56 78 Z" fill="${RE}" stroke-width="4"/><ellipse cx="50" cy="40" rx="28" ry="32" fill="${RE}"/><path d="M34 30 C36 22 42 18 48 16" stroke="#fff" stroke-width="5"/>`,
    heart: `<path d="M50 86 C30 70 10 56 10 36 C10 22 20 14 32 14 C40 14 46 18 50 26 C54 18 60 14 68 14 C80 14 90 22 90 36 C90 56 70 70 50 86 Z" fill="${YE}"/><path d="M24 32 C24 28 28 24 32 24" stroke="#fff" stroke-width="5"/>`,
    frog: `<circle cx="30" cy="30" r="15" fill="${GR}"/><circle cx="70" cy="30" r="15" fill="${GR}"/><path d="M12 62 C12 42 28 34 50 34 C72 34 88 42 88 62 C88 80 72 88 50 88 C28 88 12 80 12 62 Z" fill="${GR}"/><path d="M22 36 C26 40 34 40 38 36" stroke="${GR}" stroke-width="8"/><path d="M62 36 C66 40 74 40 78 36" stroke="${GR}" stroke-width="8"/><circle cx="30" cy="28" r="8" fill="#fff" stroke-width="4"/><circle cx="70" cy="28" r="8" fill="#fff" stroke-width="4"/><circle cx="31" cy="29" r="3.5" fill="${K}" stroke-width="0"/><circle cx="71" cy="29" r="3.5" fill="${K}" stroke-width="0"/><path d="M28 64 C38 74 62 74 72 64" stroke-width="5"/>`,
    bug: `<path d="M74 22 L80 8 M84 26 L94 16" stroke-width="5"/>${[[22, 70], [38, 64], [54, 58]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="14" fill="${GR}"/>`).join('')}<circle cx="74" cy="40" r="17" fill="${YE}"/><circle cx="80" cy="36" r="3.5" fill="${K}" stroke-width="0"/><path d="M70 48 C74 52 80 52 84 48" stroke-width="4"/>`,
    turtle: `<path d="M24 74 V84 M44 76 V86 M60 76 V86 M78 72 V82" stroke-width="9"/><circle cx="88" cy="58" r="9" fill="#a8e07a"/><path d="M12 70 C12 40 30 28 48 28 C66 28 80 40 80 70 Z" fill="${GR}"/><path d="M30 68 L38 48 H58 L66 68 M38 48 L48 32 L58 48" stroke-width="4"/>`,
    dog: `<path d="M28 24 C12 26 8 54 18 62 C24 52 26 44 30 36 Z" fill="#7a4a2a"/><path d="M72 24 C88 26 92 54 82 62 C76 52 74 44 70 36 Z" fill="#7a4a2a"/><path d="M28 30 C28 16 72 16 72 30 V56 C72 74 62 86 50 86 C38 86 28 74 28 56 Z" fill="#c98b5a"/><ellipse cx="50" cy="66" rx="14" ry="11" fill="${TN}"/><ellipse cx="50" cy="60" rx="7" ry="5" fill="${K}"/><circle cx="40" cy="44" r="4" fill="${K}" stroke-width="0"/><circle cx="60" cy="44" r="4" fill="${K}" stroke-width="0"/>`,
    // --- Lernen, Arbeit, Dinge ---
    book: `<path d="M8 28 V86 C22 80 38 80 50 88 C62 80 78 80 92 86 V28" fill="${BL}"/><path d="M50 24 C38 16 22 16 12 22 V78 C22 72 38 72 50 80 Z" fill="#fff"/><path d="M50 24 C62 16 78 16 88 22 V78 C78 72 62 72 50 80 Z" fill="#fff"/>${thin('M20 34 C28 31 36 31 42 34 M20 46 C28 43 36 43 42 46 M58 34 C64 31 72 31 80 34 M58 46 C64 43 72 43 80 46')}`,
    books: `<rect x="12" y="64" width="76" height="20" rx="3" fill="${RE}"/><rect x="18" y="44" width="66" height="20" rx="3" fill="${BL}"/><rect x="14" y="24" width="68" height="20" rx="3" fill="${GR}"/>${thin('M22 74 H70 M28 54 H74 M24 34 H72')}`,
    greenBook: `<rect x="20" y="10" width="60" height="80" rx="5" fill="${GR}"/><rect x="20" y="10" width="14" height="80" rx="4" fill="${DG}"/><rect x="44" y="26" width="26" height="14" rx="2" fill="#fff" stroke-width="4"/>`,
    notebook: `<rect x="22" y="10" width="62" height="80" rx="6" fill="${PI}"/>${[22, 38, 54, 70].map((y) => `<path d="M14 ${y} H30" stroke-width="5"/>`).join('')}<rect x="44" y="26" width="30" height="14" rx="2" fill="#fff" stroke-width="4"/>`,
    memo: `<rect x="14" y="10" width="56" height="78" rx="5" fill="#fff"/>${thin('M24 28 H58 M24 42 H58 M24 56 H46')}<g transform="rotate(40 70 60)"><rect x="63" y="22" width="14" height="50" rx="2" fill="${YE}"/><path d="M63 72 L70 86 L77 72 Z" fill="${TN}" stroke-width="5"/><rect x="63" y="16" width="14" height="8" rx="2" fill="${PI}" stroke-width="5"/></g>`,
    notepad: `<rect x="16" y="16" width="68" height="76" rx="6" fill="#fff8b0"/>${[28, 42, 56, 70].map((x) => `<path d="M${x} 8 V24" stroke-width="5"/>`).join('')}${thin('M26 40 H74 M26 54 H74 M26 68 H60')}`,
    clipboard: `<rect x="18" y="14" width="64" height="78" rx="7" fill="${BR}"/><rect x="28" y="26" width="44" height="58" fill="#fff" stroke-width="4"/><rect x="36" y="8" width="28" height="14" rx="4" fill="${GY}"/>${thin('M36 42 H64 M36 54 H64 M36 66 H54')}`,
    calendar: `<rect x="10" y="18" width="80" height="72" rx="8" fill="#fff"/><path d="M10 26 C10 22 14 18 18 18 H82 C86 18 90 22 90 26 V40 H10 Z" fill="${RE}"/><path d="M30 10 V26 M70 10 V26" stroke-width="7"/>${[[28, 56], [50, 56], [72, 56], [28, 74], [50, 74]].map(([x, y]) => `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" rx="2" fill="${K}" stroke-width="0"/>`).join('')}`,
    dividers: `<path d="M10 30 H38 L44 22 H62 L68 30 H90 V84 H10 Z" fill="${OR}"/><path d="M10 40 H90 V88 H10 Z" fill="${YE}"/><path d="M22 54 H52" stroke-width="5"/>`,
    puzzle: `<path d="M18 30 H38 C34 22 38 12 46 12 C54 12 58 22 54 30 H74 V50 C82 46 92 50 92 58 C92 66 82 70 74 66 V88 H18 Z" fill="${PU}"/>`,
    target: `<circle cx="46" cy="54" r="38" fill="#fff"/><circle cx="46" cy="54" r="26" fill="${RE}"/><circle cx="46" cy="54" r="14" fill="#fff"/><circle cx="46" cy="54" r="5" fill="${RE}" stroke-width="4"/><path d="M46 54 L84 16" stroke-width="7"/><path d="M76 10 L90 4 L86 18 L94 24 L80 28 Z" fill="${YE}" stroke-width="5"/>`,
    dice: `<rect x="16" y="16" width="68" height="68" rx="14" fill="#fff" transform="rotate(-8 50 50)"/>${[[34, 36], [50, 50], [66, 64], [66, 36], [34, 64]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="${K}" stroke-width="0"/>`).join('')}`,
    laptop: `<rect x="16" y="16" width="68" height="48" rx="5" fill="${GY}"/><rect x="23" y="23" width="54" height="34" fill="${SKY}" stroke-width="4"/><path d="M6 72 H94 L88 86 H12 Z" fill="${GY}"/>`,
    bulb: `<path d="M50 8 C30 8 18 24 18 42 C18 56 28 62 34 70 V76 H66 V70 C72 62 82 56 82 42 C82 24 70 8 50 8 Z" fill="${YE}"/><rect x="34" y="76" width="32" height="8" fill="${GY}"/><rect x="38" y="84" width="24" height="8" rx="4" fill="${GY}"/><path d="M40 54 L46 44 L50 54 L54 44 L60 54" stroke-width="4"/><path d="M30 34 C32 26 38 20 46 20" stroke="#fff" stroke-width="5"/>`,
    plug: `${ol('M50 70 C50 86 30 86 24 94', GY, 6)}<path d="M38 10 V30 M62 10 V30" stroke-width="9"/><path d="M26 30 H74 V52 C74 64 64 72 50 72 C36 72 26 64 26 52 Z" fill="#fff"/>`,
    rocket: `<path d="M40 66 L50 94 L60 66 Z" fill="${OR}"/><path d="M34 52 L18 74 L36 70 Z" fill="${RE}"/><path d="M66 52 L82 74 L64 70 Z" fill="${RE}"/><path d="M50 6 C66 20 70 42 66 68 H34 C30 42 34 20 50 6 Z" fill="#fff"/><circle cx="50" cy="38" r="10" fill="${SKY}"/>`,
    bus: `<rect x="10" y="16" width="80" height="62" rx="12" fill="${YE}"/><rect x="18" y="26" width="64" height="22" rx="3" fill="${SKY}" stroke-width="4"/><path d="M50 26 V48" stroke-width="4"/><circle cx="28" cy="80" r="9" fill="${DK}"/><circle cx="72" cy="80" r="9" fill="${DK}"/><circle cx="20" cy="62" r="4" fill="#fff" stroke-width="3"/><circle cx="80" cy="62" r="4" fill="#fff" stroke-width="3"/>`,
    map: `<path d="M10 22 L36 14 L64 22 L90 14 V78 L64 86 L36 78 L10 86 Z" fill="#fff3b0"/>${thin('M36 14 V78 M64 22 V86')}<path d="M18 66 C28 56 40 64 48 52 C54 44 62 48 68 40" stroke="${RE}" stroke-width="4" stroke-dasharray="2 8"/><path d="M68 32 L80 44 M80 32 L68 44" stroke="${RE}" stroke-width="6"/>`,
    pen: `<g transform="rotate(45 50 50)"><rect x="40" y="6" width="20" height="56" rx="6" fill="${BL}"/><path d="M40 62 H60 L50 92 Z" fill="${GY}"/><path d="M50 74 V86" stroke-width="4"/></g>`,
    shower: `<path d="M20 92 V30 C20 16 32 10 42 14 L52 20" stroke-width="12"/><path d="M20 92 V30 C20 16 32 10 42 14 L52 20" stroke="${GY}" stroke-width="5"/><path d="M42 20 L74 30 L66 46 L36 36 Z" fill="${GY}"/><path d="M44 50 L40 60 M56 54 L52 66 M68 56 L64 68 M50 70 L46 80 M62 74 L58 84" stroke="${BL}" stroke-width="5"/>`,
    bath: `<path d="M24 36 V20 C24 12 36 12 36 20" stroke-width="7"/><path d="M8 48 H92 V60 C92 76 80 82 66 82 H34 C20 82 8 76 8 60 Z" fill="#fff"/><path d="M14 48 C24 40 30 52 40 46 C50 40 56 52 66 46 C76 40 82 50 88 46" stroke="${BL}" stroke-width="6"/><circle cx="56" cy="34" r="6" fill="#d7f0ff" stroke-width="4"/><circle cx="70" cy="28" r="4" fill="#d7f0ff" stroke-width="3"/><path d="M24 82 L20 92 M76 82 L80 92" stroke-width="7"/>`,
    bed: `<rect x="6" y="26" width="10" height="60" rx="3" fill="${BR}"/><rect x="14" y="52" width="80" height="20" fill="${BL}"/><rect x="18" y="38" width="26" height="16" rx="7" fill="#fff"/><path d="M42 50 H94 V72 H42 Z" fill="${PI}"/><path d="M90 72 V86" stroke-width="7"/>`,
    broom: `${ol('M78 10 L48 54', BR, 7)}<path d="M40 48 L58 60 L46 92 C34 90 18 82 12 72 Z" fill="${YE}"/><path d="M40 48 L58 60" stroke="${RE}" stroke-width="10"/>${thin('M24 76 L40 62 M32 84 L46 66')}`,
    guitar: `<g transform="rotate(40 50 50)"><rect x="44" y="2" width="12" height="46" fill="${BR}"/><rect x="40" y="0" width="20" height="12" rx="3" fill="${DK}"/><path d="M50 40 C64 40 70 48 66 58 C76 64 76 84 62 92 C56 96 44 96 38 92 C24 84 24 64 34 58 C30 48 36 40 50 40 Z" fill="${OR}"/><circle cx="50" cy="66" r="7" fill="${K}"/><path d="M42 84 H58" stroke-width="5"/></g>`,
    family: `<ellipse cx="20" cy="34" rx="13" ry="28" fill="#3a6cf0"/>${head(20, 68, 13)}<circle cx="16" cy="64" r="4" fill="#fff" stroke-width="3.5"/><circle cx="17" cy="64" r="1.8" fill="${K}" stroke-width="0"/><circle cx="25" cy="64" r="4" fill="#fff" stroke-width="3.5"/><circle cx="26" cy="64" r="1.8" fill="${K}" stroke-width="0"/><path d="M80 66 L71 64 L73 48 L78 56 L82 46 L86 56 L91 48 L93 64 L80 66 Z" fill="${YE}" stroke-width="4"/>${head(82, 72, 12)}<circle cx="78" cy="70" r="4" fill="#fff" stroke-width="3.5"/><circle cx="79" cy="70" r="1.8" fill="${K}" stroke-width="0"/><circle cx="87" cy="70" r="4" fill="#fff" stroke-width="3.5"/><circle cx="88" cy="70" r="1.8" fill="${K}" stroke-width="0"/>${head(50, 58, 20)}<path d="M36 68 C40 82 60 82 64 68 C56 74 44 74 36 68 Z" fill="#c9a36a" stroke-width="4"/><path d="M44 40 C45 33 49 33 50 40 M50 40 C51 33 55 33 56 40" stroke-width="4"/><circle cx="44" cy="54" r="5" fill="#fff" stroke-width="3.5"/><circle cx="45" cy="54" r="1.8" fill="${K}" stroke-width="0"/><circle cx="56" cy="54" r="5" fill="#fff" stroke-width="3.5"/><circle cx="57" cy="54" r="1.8" fill="${K}" stroke-width="0"/>`,
    pray: `<path d="M50 12 C42 12 38 20 38 30 L34 60 L20 72 L34 88 L50 74 Z" fill="${YE}"/><path d="M50 12 C58 12 62 20 62 30 L66 60 L80 72 L66 88 L50 74 Z" fill="${YE}"/><path d="M14 18 L22 24 M86 18 L78 24 M50 0 V4" stroke-width="5"/>`,
    handshake: `<rect x="2" y="40" width="22" height="30" rx="4" fill="${BL}"/><rect x="76" y="40" width="22" height="30" rx="4" fill="${OR}"/><path d="M22 42 C34 32 50 32 60 38 L78 44 V66 C68 74 50 76 36 70 L22 66 Z" fill="${YE}"/>${thin('M44 52 L58 62 M50 46 L64 56 M38 58 L50 66')}`,
    loveLetter: `<rect x="10" y="24" width="80" height="56" rx="6" fill="#fff"/><path d="M10 30 L50 58 L90 30" stroke-width="6"/><path d="M50 52 C44 46 36 44 36 38 C36 32 44 30 50 36 C56 30 64 32 64 38 C64 44 56 46 50 52 Z" fill="${RE}" stroke-width="4"/>`,
    speech: `<path d="M16 16 H84 C90 16 92 20 92 26 V62 C92 68 88 72 84 72 H46 L24 90 L28 72 H16 C10 72 8 68 8 62 V26 C8 20 10 16 16 16 Z" fill="#fff"/><circle cx="32" cy="44" r="5" fill="${K}" stroke-width="0"/><circle cx="50" cy="44" r="5" fill="${K}" stroke-width="0"/><circle cx="68" cy="44" r="5" fill="${K}" stroke-width="0"/>`,
  };
})();

// Emoji (Schlüssel im Code) → eigenes Icon
const EMOJI_ICON = {
  '🍩': 'donut', '🔥': 'fire', '🏆': 'trophy', '🏅': 'medal', '🧊': 'freeze', '🔒': 'lock', '✓': 'check', '✔': 'check', '✗': 'cross', '✕': 'cross', '❌': 'cross',
  '💥': 'boom', '🎉': 'party', '✨': 'sparkle', '💰': 'money', '🎁': 'gift', '📊': 'stats', '📈': 'trend',
  '▶': 'play', '⏸': 'pause', '■': 'stop', '⏹': 'stop', '⏱': 'stopwatch', '⏰': 'alarm', '🔔': 'bell', '🔁': 'repeat', '🔄': 'refresh', '⇋': 'flip', '⬆': 'up', '⬇': 'down', '⏬': 'dblDown',
  '📍': 'pin', '❓': 'question', '🔍': 'search', '⚙': 'gear',
  '🔨': 'hammer', '📦': 'box', '🎨': 'palette', '🛒': 'cart', '🏠': 'house', '🛋': 'couch',
  '🎩': 'tophat', '🎓': 'gradcap', '🧢': 'cap', '🌸': 'blossom', '🕶': 'shades', '⛑': 'hardhat', '🎀': 'bow', '🪖': 'helmet', '👑': 'crown',
  '🚶': 'walk', '🏃': 'run', '🧘': 'meditate', '💪': 'muscle', '😴': 'sleep', '😮‍💨': 'exhale', '🧠': 'brain', '🦷': 'tooth', '🪥': 'toothbrush', '💊': 'pill', '💀': 'skull',
  '🚭': 'noSmoke', '📵': 'noPhone', '👣': 'footprints', '👟': 'sneaker', '🏋': 'dumbbell', '⚡': 'bolt',
  '☕': 'coffee', '💧': 'drop', '🥗': 'salad', '🍎': 'apple', '🥦': 'broccoli', '🥣': 'cereal', '🥪': 'sandwich', '🍝': 'pasta', '🍽': 'plate',
  '🥤': 'softdrink', '🥛': 'milk', '🚰': 'tap', '🫧': 'bubbles', '🟡': 'yellowDot',
  '🌳': 'tree', '🌿': 'herb', '🌼': 'daisy', '☀': 'sun', '🌙': 'moon', '🌅': 'sunrise', '🌈': 'rainbow', '🎈': 'balloon', '💛': 'heart',
  '🐸': 'frog', '🐛': 'bug', '🐢': 'turtle', '🐕': 'dog',
  '📖': 'book', '📚': 'books', '📗': 'greenBook', '📓': 'notebook', '📝': 'memo', '🗒': 'notepad', '📋': 'clipboard', '🗓': 'calendar', '🗂': 'dividers',
  '🧩': 'puzzle', '🎯': 'target', '🎲': 'dice', '💻': 'laptop', '💡': 'bulb', '🔌': 'plug', '🚀': 'rocket', '🚌': 'bus', '🗺': 'map', '✍': 'pen',
  '🚿': 'shower', '🛁': 'bath', '🛏': 'bed', '🧹': 'broom', '🎸': 'guitar', '👨‍👩‍👧‍👦': 'family', '🙏': 'pray', '🤝': 'handshake', '💌': 'loveLetter', '💬': 'speech',
  '🙂': 'smile', '📞': 'phone', '🔮': 'crystal', '🌐': 'globe', '👥': 'people',
};

function ic(name, size) {
  const s = size ? ` width="${size}" height="${size}"` : '';
  return `<svg class="icn" viewBox="0 0 100 100"${s} fill="none" stroke="#1d1d1d" stroke-width="6" stroke-linejoin="round" stroke-linecap="round" aria-hidden="true">${IC[name] || ''}</svg>`;
}

// Text-Knoten nach Emoji durchsuchen und durch Icons ersetzen (nicht in Eingabefeldern).
const EMOJI_RE = new RegExp('(?:' + Object.keys(EMOJI_ICON).sort((a, b) => b.length - a.length).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\uFE0F?', 'gu');
const ICON_SKIP = new Set(['TEXTAREA', 'INPUT', 'OPTION', 'SCRIPT', 'STYLE', 'TITLE', 'svg']);
function iconizeText(node) {
  const txt = node.nodeValue;
  EMOJI_RE.lastIndex = 0;
  if (!EMOJI_RE.test(txt)) return;
  for (let p = node.parentNode; p; p = p.parentNode) if (ICON_SKIP.has(p.nodeName)) return;
  const tpl = document.createElement('template');
  tpl.innerHTML = txt.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))
    .replace(EMOJI_RE, (m) => ic(EMOJI_ICON[m.replace('️', '')]));
  node.replaceWith(tpl.content);
}
function iconize(root) {
  if (root.nodeType === 3) return iconizeText(root);
  if (root.nodeType !== 1 || ICON_SKIP.has(root.nodeName)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const hits = [];
  while (walker.nextNode()) hits.push(walker.currentNode);
  hits.forEach(iconizeText);
}
new MutationObserver((muts) => {
  for (const m of muts) {
    if (m.type === 'characterData') iconizeText(m.target);
    else m.addedNodes.forEach(iconize);
  }
}).observe(document.documentElement, { childList: true, subtree: true, characterData: true });
