// Isometrische Cartoon-Grafiken (eigene Zeichnungen) für Gebäude und Deko.
// Jede Grafik wird als SVG erzeugt: Grundfläche s×s Kacheln, Ankerpunkt = untere Ecke der Raute.

const TW = 64, TH = 32;          // Kachel-Breite/-Höhe in Welt-Pixeln
const OUT = '#1d1d1d';           // Konturfarbe
const SW = 2.2;                  // Konturstärke
const GLASS = '#bfe6ff', DOOR = '#8a4f2e';

function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = [...h].map((c) => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgb2hex(a) { return '#' + a.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join(''); }
const shade = (h, f) => rgb2hex(hex2rgb(h).map((v) => v * f));
const tint = (h, f) => rgb2hex(hex2rgb(h).map((v) => v + (255 - v) * f));

let _gid = 0;
// flip: gespiegelte Variante (u und v vertauscht), Schrift bleibt lesbar
function isoArt(s, extra, draw, flip = false) {
  const W = s * TW, H = s * TH + extra;
  const P0 = (u, v, z = 0) => [W / 2 + (u - v) * TW / 2, H - s * TH + (u + v) * TH / 2 - z];
  const P = flip ? (u, v, z = 0) => P0(v, u, z) : P0;
  const ANG = flip ? -26.565 : 26.565;
  const f = (n) => Math.round(n * 10) / 10;
  const pts = (a) => a.map((p) => f(p[0]) + ',' + f(p[1])).join(' ');
  const st = (sw = SW) => `stroke="${OUT}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"`;
  const RX = (r) => r * TW / Math.SQRT2, RY = (r) => r * TH / Math.SQRT2;
  const g = {
    W, H, P, s, f, ANG,
    poly: (a, fill, sw = SW) => `<polygon points="${pts(a)}" fill="${fill}" ${sw ? st(sw) : ''}/>`,
    line: (a, col = OUT, sw = SW) => `<polyline points="${pts(a)}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`,
    shadow(uc, vc, r, a = 0.2) { const [x, y] = P(uc, vc); return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(RX(r))}" ry="${f(RY(r))}" fill="rgba(0,0,0,${a})"/>`; },
    box(u0, v0, u1, v1, z0, z1, col, o = {}) {
      const sw = o.sw ?? SW;
      const lc = o.left || col, rc = o.right || shade(col, 0.78);
      let out = g.poly([P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)], flip ? rc : lc, sw)
        + g.poly([P(u1, v1, z0), P(u1, v0, z0), P(u1, v0, z1), P(u1, v1, z1)], flip ? lc : rc, sw);
      if (!o.noTop) out += g.poly([P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)], o.top || tint(col, 0.2), sw);
      return out;
    },
    flat(u0, v0, u1, v1, z, col) {
      const i = 0.08;
      return g.poly([P(u0, v0, z), P(u1, v0, z), P(u1, v1, z), P(u0, v1, z)], col)
        + g.poly([P(u0 + i, v0 + i, z), P(u1 - i, v0 + i, z), P(u1 - i, v1 - i, z), P(u0 + i, v1 - i, z)], shade(col, 0.88), 1.2);
    },
    // Satteldach. axis 'u': First parallel zur linken Wand, Giebel rechts. axis 'v': Giebel vorne links.
    gable(u0, v0, u1, v1, zt, rh, col, axis = 'u', wall = '#ffffff', o = 0.12) {
      const z = zt - 2;
      if (axis === 'u') {
        const vm = (v0 + v1) / 2, R0 = P(u0 - o, vm, zt + rh), R1 = P(u1 + o, vm, zt + rh);
        return g.poly([P(u0 - o, v0 - o, z), P(u1 + o, v0 - o, z), R1, R0], shade(col, 0.82))
          + g.poly([P(u1, v1, zt), P(u1, v0, zt), P(u1, vm, zt + rh)], shade(wall, 0.78))
          + g.poly([P(u0 - o, v1 + o, z), P(u1 + o, v1 + o, z), R1, R0], col)
          + g.line([P(u0 - o + 0.15, (vm + v1) / 2 + 0.05, zt + rh / 2), P(u1 + o - 0.15, (vm + v1) / 2 + 0.05, zt + rh / 2)], 'rgba(0,0,0,.18)', 1.4);
      }
      const um = (u0 + u1) / 2, R0 = P(um, v0 - o, zt + rh), R1 = P(um, v1 + o, zt + rh);
      return g.poly([P(u0 - o, v0 - o, z), P(u0 - o, v1 + o, z), R1, R0], tint(col, 0.08))
        + g.poly([P(u0, v1, zt), P(u1, v1, zt), P(um, v1, zt + rh)], wall)
        + g.poly([P(u1 + o, v0 - o, z), P(u1 + o, v1 + o, z), R1, R0], shade(col, 0.8))
        + g.line([P((um + u1) / 2 + 0.05, v0 - o + 0.15, zt + rh / 2), P((um + u1) / 2 + 0.05, v1 + o - 0.15, zt + rh / 2)], 'rgba(0,0,0,.18)', 1.4);
    },
    // Walmdach / Pyramide
    hip(u0, v0, u1, v1, zt, rh, col, o = 0.12) {
      const z = zt - 2, du = u1 - u0, dv = v1 - v0, half = Math.min(du, dv) / 2, um = (u0 + u1) / 2, vm = (v0 + v1) / 2;
      const c00 = P(u0 - o, v0 - o, z), c10 = P(u1 + o, v0 - o, z), c11 = P(u1 + o, v1 + o, z), c01 = P(u0 - o, v1 + o, z);
      const L = col, R = shade(col, 0.78), B = shade(col, 0.9);
      if (du >= dv) {
        const Ra = P(u0 + half, vm, zt + rh), Rb = P(u1 - half, vm, zt + rh);
        return g.poly([c00, c10, Rb, Ra], B) + g.poly([c00, c01, Ra], B) + g.poly([c01, c11, Rb, Ra], L) + g.poly([c11, c10, Rb], R);
      }
      const Ra = P(um, v0 + half, zt + rh), Rb = P(um, v1 - half, zt + rh);
      return g.poly([c00, c01, Rb, Ra], B) + g.poly([c00, c10, Ra], B) + g.poly([c01, c11, Rb], L) + g.poly([c11, c10, Ra, Rb], R);
    },
    // Fenster auf der linken (vorderen) Wand bei v, bzw. rechten Wand bei u
    winL(u0, u1, v, za, zb, fill = GLASS, cross = true) {
      const um = (u0 + u1) / 2, zm = (za + zb) / 2;
      return g.poly([P(u0, v, za), P(u1, v, za), P(u1, v, zb), P(u0, v, zb)], fill, 1.8)
        + (cross ? g.line([P(um, v, za), P(um, v, zb)], OUT, 1.2) + g.line([P(u0, v, zm), P(u1, v, zm)], OUT, 1.2) : '')
        + g.line([P(u0 + (u1 - u0) * 0.2, v, zb - 2), P(u0 + (u1 - u0) * 0.38, v, zb - (zb - za) * 0.45)], 'rgba(255,255,255,.85)', 1.6);
    },
    winR(v0, v1, u, za, zb, fill = GLASS, cross = true) {
      const vm = (v0 + v1) / 2, zm = (za + zb) / 2, fc = shade(fill, 0.86);
      return g.poly([P(u, v1, za), P(u, v0, za), P(u, v0, zb), P(u, v1, zb)], fc, 1.8)
        + (cross ? g.line([P(u, vm, za), P(u, vm, zb)], OUT, 1.2) + g.line([P(u, v1, zm), P(u, v0, zm)], OUT, 1.2) : '');
    },
    bandL: (u0, u1, v, za, zb, col) => g.poly([P(u0, v, za), P(u1, v, za), P(u1, v, zb), P(u0, v, zb)], col, 1.4),
    bandR: (v0, v1, u, za, zb, col) => g.poly([P(u, v1, za), P(u, v0, za), P(u, v0, zb), P(u, v1, zb)], shade(col, 0.82), 1.4),
    // Schrift auf Wänden (perspektivisch geneigt)
    textL(u0, u1, v, z, txt, size, fill = '#fff', strokeCol = OUT) {
      const [x, y] = P((u0 + u1) / 2, v, z);
      return `<text transform="translate(${f(x)} ${f(y)}) skewY(${ANG})" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="${size}" text-anchor="middle" fill="${fill}" stroke="${strokeCol}" stroke-width="${size / 5}" paint-order="stroke" stroke-linejoin="round">${txt}</text>`;
    },
    textR(v0, v1, u, z, txt, size, fill = '#fff', strokeCol = OUT) {
      const [x, y] = P(u, (v0 + v1) / 2, z);
      return `<text transform="translate(${f(x)} ${f(y)}) skewY(${-ANG})" font-family="Arial Black, Arial, Helvetica, sans-serif" font-weight="900" font-size="${size}" text-anchor="middle" fill="${fill}" stroke="${strokeCol}" stroke-width="${size / 5}" paint-order="stroke" stroke-linejoin="round">${txt}</text>`;
    },
    ell(uc, vc, r, z, fill, sw = SW) { const [x, y] = P(uc, vc, z); return `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(RX(r))}" ry="${f(RY(r))}" fill="${fill}" ${sw ? st(sw) : ''}/>`; },
    // Zylinder mit Cartoon-Schattierung
    cyl(uc, vc, r, z0, z1, col, o = {}) {
      const id = 'c' + (++_gid);
      const [cx, yb] = P(uc, vc, z0), yt = yb - (z1 - z0), rx = RX(r), ry = RY(r);
      const top = o.noTop ? '' : `<ellipse cx="${f(cx)}" cy="${f(yt)}" rx="${f(rx)}" ry="${f(ry)}" fill="${o.top || tint(col, 0.2)}" ${st()}/>`;
      return `<defs><linearGradient id="${id}" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${tint(col, 0.12)}"/><stop offset=".58" stop-color="${col}"/><stop offset=".59" stop-color="${shade(col, 0.8)}"/><stop offset="1" stop-color="${shade(col, 0.74)}"/></linearGradient></defs>
        <path d="M${f(cx - rx)} ${f(yt)} L${f(cx - rx)} ${f(yb)} A${f(rx)} ${f(ry)} 0 0 0 ${f(cx + rx)} ${f(yb)} L${f(cx + rx)} ${f(yt)} A${f(rx)} ${f(ry)} 0 0 1 ${f(cx - rx)} ${f(yt)} Z" fill="url(#${id})" ${st()}/>${top}`;
    },
    // Kegel (Zelt, Turmspitze)
    cone(uc, vc, r, z0, h, col) {
      const [cx, yb] = P(uc, vc, z0), rx = RX(r), ry = RY(r), id = 'k' + (++_gid);
      return `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="${tint(col, 0.15)}"/><stop offset=".55" stop-color="${col}"/><stop offset=".56" stop-color="${shade(col, 0.8)}"/><stop offset="1" stop-color="${shade(col, 0.74)}"/></linearGradient></defs>
        <path d="M${f(cx - rx)} ${f(yb)} L${f(cx)} ${f(yb - h)} L${f(cx + rx)} ${f(yb)} A${f(rx)} ${f(ry)} 0 0 1 ${f(cx - rx)} ${f(yb)} Z" fill="url(#${id})" ${st()}/>`;
    },
    // Wolkiger Klecks (Baumkrone, Busch, Dampf) – Kreise in Bildschirm-Koordinaten relativ zu (x, y)
    blob(x, y, circles, col, o = {}) {
      const id = 'b' + (++_gid);
      const cs = circles.map(([dx, dy, r]) => `<circle cx="${f(x + dx)}" cy="${f(y + dy)}" r="${r}"/>`).join('');
      const sh = o.shade || shade(col, 0.78), hi = o.hi || tint(col, 0.3);
      const maxR = Math.max(...circles.map((c) => c[2]));
      return `<defs><clipPath id="${id}">${cs}</clipPath></defs>
        <g fill="${OUT}" stroke="${OUT}" stroke-width="${(o.sw || SW) * 2}">${cs}</g>
        <g fill="${col}">${cs}</g>
        <g clip-path="url(#${id})"><circle cx="${f(x + maxR * 0.9)}" cy="${f(y + maxR * 1.1)}" r="${maxR * 1.5}" fill="${sh}"/>
        <circle cx="${f(x - maxR * 0.5)}" cy="${f(y - maxR * 0.6)}" r="${maxR * 0.55}" fill="${hi}" opacity=".8"/></g>`;
    },
    circ: (x, y, r, fill, sw = SW) => `<circle cx="${f(x)}" cy="${f(y)}" r="${r}" fill="${fill}" ${sw ? st(sw) : ''}/>`,
    path: (d, fill, sw = SW) => `<path d="${d}" fill="${fill}" ${sw ? st(sw) : ''}/>`,
  };
  const body = draw(g);
  return { W, H, svg: (scale = 1) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W * scale}" height="${H * scale}">${body}</svg>` };
}

// Riesen-Donut als frei stehende Grafik (Bildschirm-Koordinaten)
function donutBill(g, x, y, r) {
  const f = g.f, ri = r * 0.36;
  let sprinkles = '';
  const cols = ['#3ac0f0', '#ffe040', '#7ad04a', '#fff', '#e04040'];
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7 + 0.3, rr = r * 0.68;
    const sx = x + Math.cos(a) * rr, sy = y + Math.sin(a) * rr * 0.9 - 2;
    sprinkles += `<line x1="${f(sx)}" y1="${f(sy)}" x2="${f(sx + 3)}" y2="${f(sy + 2)}" stroke="${cols[i % 5]}" stroke-width="2.4" stroke-linecap="round"/>`;
  }
  return `<path d="M${f(x - r)} ${f(y)} a${r} ${r} 0 1 0 ${2 * r} 0 a${r} ${r} 0 1 0 ${-2 * r} 0 Z M${f(x - ri)} ${f(y)} a${ri} ${ri} 0 1 1 ${2 * ri} 0 a${ri} ${ri} 0 1 1 ${-2 * ri} 0 Z" fill="#e8a860" fill-rule="evenodd" stroke="${OUT}" stroke-width="${SW}"/>
    <path d="M${f(x - r * 0.9)} ${f(y - r * 0.1)} C ${f(x - r * 0.9)} ${f(y - r)}, ${f(x + r * 0.9)} ${f(y - r)}, ${f(x + r * 0.92)} ${f(y - r * 0.05)} C ${f(x + r * 0.7)} ${f(y + r * 0.2)}, ${f(x + r * 0.55)} ${f(y + r * 0.45)}, ${f(x + r * 0.3)} ${f(y + r * 0.6)} C ${f(x)} ${f(y + r * 0.5)}, ${f(x - r * 0.4)} ${f(y + r * 0.7)}, ${f(x - r * 0.6)} ${f(y + r * 0.4)} C ${f(x - r * 0.8)} ${f(y + r * 0.35)}, ${f(x - r * 0.95)} ${f(y + r * 0.2)}, ${f(x - r * 0.9)} ${f(y - r * 0.1)} Z M${f(x - ri * 1.15)} ${f(y)} a${ri * 1.15} ${ri * 1.15} 0 1 1 ${2.3 * ri} 0 a${ri * 1.15} ${ri * 1.15} 0 1 1 ${-2.3 * ri} 0 Z" fill="#ff7eb6" fill-rule="evenodd" stroke="${OUT}" stroke-width="${SW}"/>
    ${sprinkles}`;
}

// Baumkrone im Springfield-Stil
const canopy = (g, x, y, k = 1, col = '#5cbf3a') => g.blob(x, y, [[0, -6 * k, 15 * k], [-12 * k, 3 * k, 11 * k], [12 * k, 3 * k, 11 * k], [0, 8 * k, 12 * k], [-7 * k, -15 * k, 9 * k], [8 * k, -13 * k, 9 * k]], col);

const ISO_ART = {
  /* ---------- Gebäude ---------- */
  simpsonhouse: { s: 3, h: 84, draw: (g) => {
    const wall = '#f7b07a', roof = '#8a4637';
    return g.shadow(1.6, 1.6, 1.7)
      + g.poly([g.P(1.15, 2.75), g.P(1.5, 2.75), g.P(1.5, 3), g.P(1.15, 3)], '#d8d0bc', 1.2)
      + g.box(0.25, 0.4, 2.05, 2.75, 0, 40, wall, { noTop: true })
      + g.winL(0.42, 0.85, 2.75, 7, 20) + g.winL(0.42, 0.85, 2.75, 25, 35) + g.winL(1.6, 1.95, 2.75, 25, 35)
      + g.poly([g.P(1.15, 2.75, 0), g.P(1.5, 2.75, 0), g.P(1.5, 2.75, 21), g.P(1.15, 2.75, 21)], DOOR, 1.8)
      + g.circ(...g.P(1.44, 2.75, 10), 1.3, '#ffd23f', 1)
      + g.winR(0.6, 1.15, 2.05, 24, 35)
      + g.gable(0.25, 0.4, 2.05, 2.75, 40, 24, roof, 'u', wall)
      + g.box(0.55, 0.85, 0.82, 1.12, 56, 74, '#c46a4a')
      + g.box(2.05, 1.35, 2.85, 2.75, 0, 22, wall, { noTop: true })
      + g.poly([g.P(2.13, 2.75, 1), g.P(2.77, 2.75, 1), g.P(2.77, 2.75, 17), g.P(2.13, 2.75, 17)], '#efe6d2', 1.6)
      + g.line([g.P(2.13, 2.75, 6), g.P(2.77, 2.75, 6)], OUT, 1) + g.line([g.P(2.13, 2.75, 11), g.P(2.77, 2.75, 11)], OUT, 1)
      + g.gable(2.05, 1.35, 2.85, 2.75, 22, 11, roof, 'v', wall);
  } },
  flanders: { s: 3, h: 70, draw: (g) => {
    const wall = '#b9da8f';
    return g.shadow(1.5, 1.5, 1.6) + g.box(0.3, 0.35, 2.7, 2.65, 0, 34, wall, { noTop: true })
      + g.winL(0.5, 0.95, 2.65, 18, 29) + g.winL(1.95, 2.4, 2.65, 18, 29) + g.winL(0.5, 0.95, 2.65, 4, 13)
      + g.poly([g.P(1.3, 2.65, 0), g.P(1.65, 2.65, 0), g.P(1.65, 2.65, 20), g.P(1.3, 2.65, 20)], '#f2f2f2', 1.8)
      + g.winR(0.7, 1.2, 2.7, 16, 27) + g.winR(1.7, 2.2, 2.7, 16, 27)
      + g.hip(0.3, 0.35, 2.7, 2.65, 34, 26, '#7a4a3a')
      + g.box(1.05, 2.65, 1.9, 2.95, 0, 3, '#d8d0c0');
  } },
  kwikemart: { s: 3, h: 70, draw: (g) => {
    const wall = '#efe4c2';
    return g.shadow(1.5, 1.5, 1.6) + g.box(0.2, 0.3, 2.8, 2.7, 0, 34, wall, { noTop: true })
      + g.bandL(0.2, 2.8, 2.7, 22, 28, '#2e9a5a') + g.bandL(0.2, 2.8, 2.7, 28, 34, '#f28c28')
      + g.bandR(0.3, 2.7, 2.8, 22, 28, '#2e9a5a') + g.bandR(0.3, 2.7, 2.8, 28, 34, '#f28c28')
      + g.winL(0.4, 1.7, 2.7, 3, 19) + g.winL(2.0, 2.55, 2.7, 0, 19, '#9fd4f2', false)
      + g.winR(0.6, 2.3, 2.8, 5, 18)
      + g.flat(0.2, 0.3, 2.8, 2.7, 34, '#d6cbab')
      + g.box(0.7, 1.3, 2.3, 1.42, 34, 54, '#2e9a5a', { top: '#f28c28' })
      + g.textL(0.7, 2.3, 1.42, 40.5, 'KWIK-E-MART', 10.5, '#ffe14d')
      + g.box(0.35, 2.85, 0.55, 3.0, 0, 12, '#d02828');
  } },
  moes: { s: 2, h: 52, draw: (g) => {
    const wall = '#7b6a5d';
    let bricks = '';
    for (let z = 6; z < 28; z += 6) bricks += g.line([g.P(1.82, 1.6, z), g.P(1.82, 1.2, z)], 'rgba(0,0,0,.25)', 1);
    return g.shadow(1, 1, 1.05) + g.box(0.2, 0.25, 1.8, 1.75, 0, 30, wall, { noTop: true }) + bricks
      + g.poly([g.P(0.7, 1.75, 0), g.P(1.05, 1.75, 0), g.P(1.05, 1.75, 18), g.P(0.7, 1.75, 18)], '#3d2b20', 1.8)
      + g.winL(1.25, 1.55, 1.75, 9, 17, '#ffd36a', false)
      + g.bandL(0.4, 1.6, 1.75, 21, 28, '#2a2a2a') + g.textL(0.4, 1.6, 1.75, 23, 'MOE’S', 7.5, '#ff5a4a', '#2a2a2a')
      + g.flat(0.2, 0.25, 1.8, 1.75, 30, '#5a4c42');
  } },
  krustyburger: { s: 2, h: 66, draw: (g) => g.shadow(1, 1, 1.05)
    + g.box(0.2, 0.25, 1.8, 1.75, 0, 26, '#fff3c4', { noTop: true })
    + g.bandL(0.2, 1.8, 1.75, 20, 26, '#e8402e') + g.bandR(0.25, 1.75, 1.8, 20, 26, '#e8402e')
    + g.winL(0.35, 1.2, 1.75, 3, 16) + g.poly([g.P(1.35, 1.75, 0), g.P(1.65, 1.75, 0), g.P(1.65, 1.75, 17), g.P(1.35, 1.75, 17)], '#9fd4f2', 1.8)
    + g.winR(0.5, 1.5, 1.8, 4, 15)
    + g.flat(0.2, 0.25, 1.8, 1.75, 26, '#d8cfa8')
    + g.box(0.95, 0.95, 1.05, 1.05, 26, 40, '#888')
    + g.box(0.45, 0.9, 1.55, 1.0, 40, 58, '#e8402e', { top: '#ffd23f' })
    + g.textL(0.45, 1.55, 1.0, 46, 'KRUSTY', 9, '#ffd23f') },
  lardlad: { s: 2, h: 76, draw: (g) => {
    const [x, y] = g.P(1, 1, 50);
    return g.shadow(1, 1, 1.05) + g.box(0.2, 0.25, 1.8, 1.75, 0, 24, '#ffc6dc', { noTop: true })
      + g.winL(0.35, 1.15, 1.75, 3, 15) + g.poly([g.P(1.3, 1.75, 0), g.P(1.6, 1.75, 0), g.P(1.6, 1.75, 16), g.P(1.3, 1.75, 16)], DOOR, 1.8)
      + g.bandL(0.25, 1.75, 1.75, 17, 23, '#ffffff') + g.textL(0.25, 1.75, 1.75, 18.5, 'DONUTS', 6.5, '#e05090', '#fff')
      + g.winR(0.5, 1.5, 1.8, 4, 15, '#ffe0ec')
      + g.flat(0.2, 0.25, 1.8, 1.75, 24, '#e898b8')
      + g.box(0.95, 0.95, 1.05, 1.05, 24, 34, '#9a8a8a') + donutBill(g, x, y, 21);
  } },
  church: { s: 2, h: 100, draw: (g) => {
    const wall = '#f2ead8', roof = '#8a5a4a';
    const [cx, cy] = g.P(1.0, 1.82, 82);
    return g.shadow(1, 1, 1.05) + g.box(0.3, 0.3, 1.7, 1.55, 0, 26, wall, { noTop: true })
      + g.winR(0.5, 0.8, 1.7, 8, 20, '#7ab8f0') + g.winR(1.0, 1.3, 1.7, 8, 20, '#f0b84a')
      + g.gable(0.3, 0.3, 1.7, 1.55, 26, 20, roof, 'v', wall)
      + g.box(0.72, 1.35, 1.28, 1.85, 0, 56, wall, { noTop: true })
      + g.poly([g.P(0.88, 1.85, 0), g.P(1.12, 1.85, 0), g.P(1.12, 1.85, 16), g.P(1.0, 1.85, 21), g.P(0.88, 1.85, 16)], DOOR, 1.8)
      + g.winL(0.86, 1.14, 1.85, 32, 44, '#7ab8f0')
      + g.hip(0.72, 1.35, 1.28, 1.85, 56, 24, roof, 0.06)
      + g.line([[cx, cy], [cx, cy - 16]], OUT, 3) + g.line([[cx - 5, cy - 11], [cx + 5, cy - 11]], OUT, 3);
  } },
  comics: { s: 2, h: 52, draw: (g) => g.shadow(1, 1, 1.05)
    + g.box(0.2, 0.25, 1.8, 1.75, 0, 28, '#c8c2e8', { noTop: true })
    + g.winL(0.35, 1.25, 1.75, 3, 15) + g.poly([g.P(1.35, 1.75, 0), g.P(1.65, 1.75, 0), g.P(1.65, 1.75, 16), g.P(1.35, 1.75, 16)], '#6a5aa8', 1.8)
    + g.bandL(0.3, 1.7, 1.75, 18, 26, '#6a5aa8') + g.textL(0.3, 1.7, 1.75, 20, 'COMICS', 7.5, '#ffe14d')
    + g.winR(0.5, 1.5, 1.8, 5, 17)
    + g.flat(0.2, 0.25, 1.8, 1.75, 28, '#8a7ac8') },
  school: { s: 3, h: 84, draw: (g) => {
    let w = '';
    for (const u of [0.4, 0.85, 1.85, 2.3]) for (const z of [6, 22]) w += g.winL(u, u + 0.3, 2.65, z, z + 10);
    for (const v of [0.6, 1.3, 2.0]) for (const z of [6, 22]) w += g.winR(v, v + 0.35, 2.8, z, z + 10);
    const [fx, fy] = g.P(0.35, 2.92, 0);
    return g.shadow(1.5, 1.5, 1.6) + g.box(0.2, 0.4, 2.8, 2.65, 0, 36, '#d9774a', { noTop: true }) + w
      + g.poly([g.P(1.3, 2.65, 0), g.P(1.7, 2.65, 0), g.P(1.7, 2.65, 18), g.P(1.3, 2.65, 18)], '#6a3a22', 1.8)
      + g.bandL(1.05, 1.95, 2.65, 22, 30, '#fff') + g.textL(1.05, 1.95, 2.65, 24, 'SCHULE', 6.5, '#d9774a', '#fff')
      + g.flat(0.2, 0.4, 2.8, 2.65, 36, '#a85a3a')
      + g.box(1.2, 1.2, 1.8, 1.8, 36, 50, '#e8e0d0', { noTop: true }) + g.hip(1.2, 1.2, 1.8, 1.8, 50, 14, '#7a3a2a', 0.05)
      + g.line([[fx, fy], [fx, fy - 74]], '#555', 2.4) + g.poly([[fx, fy - 74], [fx + 16, fy - 69], [fx, fy - 64]], '#e8402e', 1.6);
  } },
  bowlarama: { s: 2, h: 84, draw: (g) => {
    const [x, y] = g.P(1, 1, 30);
    return g.shadow(1, 1, 1.05) + g.box(0.2, 0.25, 1.8, 1.75, 0, 26, '#e6e6f2', { noTop: true })
      + g.bandL(0.2, 1.8, 1.75, 19, 26, '#d04040') + g.textL(0.2, 1.8, 1.75, 20.5, 'BOWL', 7, '#fff')
      + g.winL(0.35, 1.1, 1.75, 3, 14) + g.poly([g.P(1.3, 1.75, 0), g.P(1.6, 1.75, 0), g.P(1.6, 1.75, 16), g.P(1.3, 1.75, 16)], '#9fd4f2', 1.8)
      + g.winR(0.5, 1.5, 1.8, 4, 14)
      + g.flat(0.2, 0.25, 1.8, 1.75, 26, '#c8c8d6')
      + g.path(`M${x} ${y - 46} c 9 0 9 12 5 18 c -2 4 7 10 7 22 c 0 8 -5 6 -12 6 c -7 0 -12 2 -12 -6 c 0 -12 9 -18 7 -22 c -4 -6 -4 -18 5 -18 Z`, '#fff')
      + g.path(`M${x - 6} ${y - 28} h 12 v 4 h -12 Z`, '#e8402e', 1.2);
  } },
  police: { s: 2, h: 50, draw: (g) => g.shadow(1, 1, 1.05)
    + g.box(0.2, 0.25, 1.8, 1.75, 0, 30, '#c4ccdc', { noTop: true })
    + g.bandL(0.2, 1.8, 1.75, 21, 28, '#2a4a9a') + g.textL(0.2, 1.8, 1.75, 22.5, 'POLIZEI', 6.5, '#fff')
    + g.winL(0.35, 0.8, 1.75, 6, 16) + g.poly([g.P(1.0, 1.75, 0), g.P(1.35, 1.75, 0), g.P(1.35, 1.75, 17), g.P(1.0, 1.75, 17)], '#2a4a9a', 1.8)
    + g.winL(1.45, 1.7, 1.75, 6, 16) + g.winR(0.5, 0.9, 1.8, 8, 18) + g.winR(1.1, 1.5, 1.8, 8, 18)
    + g.flat(0.2, 0.25, 1.8, 1.75, 30, '#9aa4b8')
    + g.cyl(0.8, 1.0, 0.1, 30, 36, '#e8402e') + g.cyl(1.15, 1.0, 0.1, 30, 36, '#3a7af0') },
  retirement: { s: 3, h: 84, draw: (g) => {
    const wall = '#cdb48f';
    let m = '';
    for (let u = 0.35; u < 2.6; u += 0.42) m += g.box(u, 2.48, u + 0.2, 2.65, 34, 40, wall);
    for (let v = 0.4; v < 2.3; v += 0.42) m += g.box(2.53, v, 2.7, v + 0.2, 34, 40, wall);
    return g.shadow(1.5, 1.5, 1.6) + g.box(0.3, 0.35, 2.7, 2.65, 0, 34, wall, { noTop: true })
      + g.winL(0.5, 0.8, 2.65, 14, 26, '#f0d890') + g.winL(1.0, 1.3, 2.65, 14, 26, '#f0d890')
      + g.poly([g.P(1.5, 2.65, 0), g.P(1.85, 2.65, 0), g.P(1.85, 2.65, 16), g.P(1.675, 2.65, 21), g.P(1.5, 2.65, 16)], DOOR, 1.8)
      + g.winR(0.6, 0.9, 2.7, 14, 26, '#f0d890') + g.winR(1.3, 1.6, 2.7, 14, 26, '#f0d890')
      + g.flat(0.3, 0.35, 2.7, 2.65, 34, '#b49a76') + m
      + g.cyl(2.6, 2.55, 0.38, 0, 52, wall) + g.cone(2.6, 2.55, 0.48, 52, 30, '#6a5a8a')
      + g.textL(0.4, 1.4, 2.65, 4, 'RUHESITZ', 5, '#fff');
  } },
  townhall: { s: 3, h: 96, draw: (g) => {
    const wall = '#ede6d6';
    let cols = g.poly([g.P(0.55, 2.55, 0), g.P(2.45, 2.55, 0), g.P(2.45, 2.55, 26), g.P(0.55, 2.55, 26)], '#8a8478', 1.6);
    for (let u = 0.6; u < 2.45; u += 0.3) cols += g.box(u, 2.6, u + 0.13, 2.74, 0, 26, '#fbf8f0', { top: '#fff' });
    const [dx, dy] = g.P(1.5, 1.5, 58);
    return g.shadow(1.5, 1.5, 1.6) + g.box(0.3, 0.45, 2.7, 2.55, 0, 34, wall, { noTop: true })
      + g.winR(0.7, 1.1, 2.7, 10, 24) + g.winR(1.6, 2.0, 2.7, 10, 24) + cols
      + g.box(0.5, 2.55, 2.5, 2.8, 26, 34, '#fbf8f0') + g.textL(0.5, 2.5, 2.8, 27.5, 'RATHAUS', 6, '#7a8a9a', '#fbf8f0')
      + g.gable(0.3, 0.45, 2.7, 2.55, 34, 22, '#8a9aa8', 'v', '#fbf8f0')
      + g.path(`M${g.f(dx - 22)} ${g.f(dy + 8)} C ${g.f(dx - 22)} ${g.f(dy - 26)}, ${g.f(dx + 22)} ${g.f(dy - 26)}, ${g.f(dx + 22)} ${g.f(dy + 8)} Z`, '#9ab8a8')
      + g.line([[dx, dy - 18], [dx, dy - 30]], OUT, 2.5)
      + g.box(0.5, 2.8, 2.5, 3.0, 0, 4, '#d8d0c0');
  } },
  cinema: { s: 2, h: 70, draw: (g) => {
    let dots = '';
    for (let u = 0.45; u < 1.6; u += 0.16) dots += g.circ(...g.P(u, 2.0, 18.5), 1.4, '#ffe14d', 0.8);
    return g.shadow(1, 1, 1.05) + g.box(0.2, 0.25, 1.8, 1.75, 0, 32, '#e4a14f', { noTop: true })
      + g.poly([g.P(0.7, 1.75, 0), g.P(1.3, 1.75, 0), g.P(1.3, 1.75, 14), g.P(0.7, 1.75, 14)], '#9fd4f2', 1.8)
      + g.winR(0.5, 1.5, 1.8, 6, 20, '#f6d27a')
      + g.box(0.35, 1.75, 1.65, 2.0, 14, 26, '#fff', { top: '#e8402e' }) + g.textL(0.35, 1.65, 2.0, 16.5, 'KINO', 8, '#e8402e', '#fff') + dots
      + g.flat(0.2, 0.25, 1.8, 1.75, 32, '#b47a34')
      + g.box(1.68, 1.55, 1.85, 1.72, 26, 66, '#e8402e', { top: '#ffd23f' }) + g.textR(1.55, 1.72, 1.85, 46, 'AZTEC', 5, '#ffe14d');
  } },
  hospital: { s: 3, h: 104, draw: (g) => {
    let w = '';
    for (const u of [0.45, 0.85, 1.25]) for (const z of [34, 48, 62]) w += g.winL(u, u + 0.25, 1.7, z, z + 8, '#9fd4f2', false);
    for (const v of [0.5, 0.95]) for (const z of [34, 48, 62]) w += g.winR(v, v + 0.25, 1.75, z, z + 8, '#9fd4f2', false);
    const [x, y] = g.P(1.1, 1.0, 84);
    return g.shadow(1.5, 1.5, 1.6) + g.box(0.3, 0.3, 1.75, 1.7, 0, 76, '#f4f4f4', { noTop: true }) + w
      + g.flat(0.3, 0.3, 1.75, 1.7, 76, '#d8dde4')
      + g.circ(x, y, 11, '#fff') + g.path(`M${x - 3} ${y - 8} h6 v5 h5 v6 h-5 v5 h-6 v-5 h-5 v-6 h5 Z`, '#e8402e', 1.2)
      + g.box(0.3, 1.7, 2.7, 2.7, 0, 28, '#f4f4f4', { noTop: true })
      + g.winL(0.5, 1.0, 2.7, 8, 20, '#9fd4f2') + g.winL(1.9, 2.4, 2.7, 8, 20, '#9fd4f2')
      + g.poly([g.P(1.3, 2.7, 0), g.P(1.7, 2.7, 0), g.P(1.7, 2.7, 18), g.P(1.3, 2.7, 18)], '#9fd4f2', 1.8)
      + g.bandL(1.15, 1.85, 2.7, 20, 26, '#e8402e') + g.textL(1.15, 1.85, 2.7, 21.3, 'KLINIK', 5, '#fff')
      + g.box(1.75, 0.3, 2.7, 1.7, 0, 28, '#f4f4f4', { noTop: true }) + g.winR(0.6, 1.4, 2.7, 8, 20, '#9fd4f2')
      + g.flat(0.3, 1.7, 2.7, 2.7, 28, '#d8dde4') + g.flat(1.75, 0.3, 2.7, 1.7, 28, '#d8dde4');
  } },
  plant: { s: 4, h: 128, draw: (g) => {
    const tower = (uc, vc) => {
      const [cx, yb] = g.P(uc, vc, 0), yt = yb - 78, rb = 0.62 * TW / 1.414, rt = 0.42 * TW / 1.414, rw = 0.36 * TW / 1.414;
      const ryb = rb / 2, ryt = rt / 2, id = 't' + (++_gid), f = g.f;
      return `<defs><linearGradient id="${id}" x1="0" x2="1"><stop offset="0" stop-color="#e2e4d4"/><stop offset=".58" stop-color="#cfd2bc"/><stop offset=".59" stop-color="#a9ac98"/><stop offset="1" stop-color="#9a9d8a"/></linearGradient></defs>
        <path d="M${f(cx - rb)} ${f(yb)} Q ${f(cx - rw)} ${f(yb - 46)} ${f(cx - rt)} ${f(yt)} L ${f(cx + rt)} ${f(yt)} Q ${f(cx + rw)} ${f(yb - 46)} ${f(cx + rb)} ${f(yb)} A ${f(rb)} ${f(ryb)} 0 0 1 ${f(cx - rb)} ${f(yb)} Z" fill="url(#${id})" stroke="${OUT}" stroke-width="${SW}" stroke-linejoin="round"/>
        <ellipse cx="${f(cx)}" cy="${f(yt)}" rx="${f(rt)}" ry="${f(ryt)}" fill="#6f7262" stroke="${OUT}" stroke-width="${SW}"/>
        <ellipse cx="${f(cx)}" cy="${f(yt + 1)}" rx="${f(rt * 0.75)}" ry="${f(ryt * 0.6)}" fill="#9cff6a" opacity=".55"/>
        ${g.blob(cx, yt - 18, [[0, 0, 12], [-11, 4, 9], [11, 3, 9], [4, -10, 9]], '#ffffff', { shade: '#dfe6ea', hi: '#ffffff', sw: 1.4 })}`;
    };
    const [rx, ry] = g.P(2.6, 2.75, 22);
    return g.shadow(2, 2, 2.2) + g.poly([g.P(0.1, 0.1), g.P(3.9, 0.1), g.P(3.9, 3.9), g.P(0.1, 3.9)], '#c8c8bc', 1.6)
      + tower(1.0, 1.0) + tower(1.0, 2.55)
      + g.cyl(3.4, 0.6, 0.14, 0, 70, '#e8402e', { top: '#555' })
      + g.box(1.9, 1.6, 3.7, 3.6, 0, 34, '#b9b9a8', { noTop: true })
      + g.winL(2.05, 2.5, 3.6, 12, 24, '#9fd4f2') + g.winL(3.0, 3.5, 3.6, 12, 24, '#9fd4f2')
      + g.winR(1.9, 2.4, 3.7, 12, 24, '#9fd4f2') + g.winR(2.8, 3.3, 3.7, 12, 24, '#9fd4f2')
      + g.poly([g.P(2.55, 3.6, 0), g.P(2.95, 3.6, 0), g.P(2.95, 3.6, 18), g.P(2.55, 3.6, 18)], '#5a5a50', 1.8)
      + `<g transform="translate(${g.f(rx)} ${g.f(ry)}) skewY(${g.ANG})"><circle r="8" fill="#ffe14d" stroke="${OUT}" stroke-width="1.8"/>
          <path d="M0 0 L-6 -3.5 A7 7 0 0 1 -3.5 -6 Z M0 0 L6 -3.5 A7 7 0 0 0 3.5 -6 Z M0 0 L-2.6 6.4 A7 7 0 0 0 2.6 6.4 Z" fill="${OUT}"/><circle r="1.6" fill="${OUT}"/></g>`
      + g.flat(1.9, 1.6, 3.7, 3.6, 34, '#9a9a8a')
      + g.box(2.3, 2.0, 2.7, 2.4, 34, 42, '#8a8a7a');
  } },
  burnsmanor: { s: 4, h: 104, draw: (g) => {
    const wall = '#e3d9bd';
    let w = '', cols = '';
    for (const u of [0.7, 1.15, 2.6, 3.05]) for (const z of [8, 30]) w += g.winL(u, u + 0.3, 3.2, z, z + 12, '#3a4a5a');
    for (const v of [1.0, 1.6, 2.2]) for (const z of [8, 30]) w += g.winR(v, v + 0.3, 3.6, z, z + 12, '#3a4a5a');
    for (let u = 1.6; u < 2.45; u += 0.27) cols += g.box(u, 3.25, u + 0.1, 3.35, 0, 42, '#fbf8f0');
    return g.shadow(2, 2, 2.2) + g.box(0.4, 0.6, 3.6, 3.2, 0, 50, wall, { noTop: true }) + w
      + g.poly([g.P(1.85, 3.2, 0), g.P(2.2, 3.2, 0), g.P(2.2, 3.2, 22), g.P(1.85, 3.2, 22)], '#3a2a1a', 1.8)
      + g.hip(0.4, 0.6, 3.6, 3.2, 50, 30, '#3f5a46')
      + g.box(1.5, 3.2, 2.55, 3.4, 42, 46, '#fbf8f0') + cols
      + g.box(1.4, 3.4, 2.65, 3.75, 0, 3, '#d8d0c0')
      + canopy(g, ...g.P(0.6, 3.6, 10), 0.6, '#3f8a3a') + canopy(g, ...g.P(3.6, 3.6, 10), 0.6, '#3f8a3a');
  } },
  treehouse: { s: 2, h: 104, draw: (g) => {
    const [cx, cy] = g.P(0.8, 0.8, 78);
    let ladder = g.line([g.P(1.25, 1.62, 0), g.P(1.25, 1.62, 44)], '#7a4a2a', 2.4) + g.line([g.P(1.45, 1.62, 0), g.P(1.45, 1.62, 44)], '#7a4a2a', 2.4);
    for (let z = 6; z < 44; z += 7) ladder += g.line([g.P(1.25, 1.62, z), g.P(1.45, 1.62, z)], '#7a4a2a', 2);
    return g.shadow(1, 1, 1) + canopy(g, cx, cy, 1.6)
      + g.cyl(0.9, 0.9, 0.2, 0, 44, '#8b5a2b')
      + g.box(0.4, 0.4, 1.6, 1.6, 40, 44, '#a87850')
      + g.box(0.55, 0.55, 1.35, 1.35, 44, 62, '#c49a6c', { noTop: true })
      + g.winL(0.7, 0.95, 1.35, 50, 58, '#4a3a2a', false) + g.winR(0.75, 1.05, 1.35, 49, 57, '#4a3a2a', false)
      + g.gable(0.55, 0.55, 1.35, 1.35, 62, 12, '#6b8e3a', 'u', '#c49a6c', 0.08) + ladder;
  } },

  /* ---------- Deko ---------- */
  tree: { s: 1, h: 62, draw: (g) => { const [x, y] = g.P(0.5, 0.5, 42); return g.shadow(0.5, 0.5, 0.42) + g.cyl(0.5, 0.5, 0.09, 0, 26, '#8b5a2b', { noTop: true }) + canopy(g, x, y); } },
  pine: { s: 1, h: 74, draw: (g) => {
    const [x, y] = g.P(0.5, 0.5, 0), c = '#2f8f4a';
    const tri = (yb, w, h) => g.path(`M${x - w} ${yb} L${x} ${yb - h} L${x + w} ${yb} Q ${x} ${yb + 6} ${x - w} ${yb} Z`, c) + g.path(`M${x} ${yb - h} L${x + w} ${yb} Q ${x + w * 0.4} ${yb + 4} ${x} ${yb + 3} Z`, shade(c, 0.78), 0);
    return g.shadow(0.5, 0.5, 0.38) + g.cyl(0.5, 0.5, 0.07, 0, 14, '#7a4a2a', { noTop: true }) + tri(y - 12, 20, 26) + tri(y - 30, 16, 24) + tri(y - 46, 11, 22);
  } },
  bush: { s: 1, h: 26, draw: (g) => { const [x, y] = g.P(0.5, 0.5, 9); return g.shadow(0.5, 0.5, 0.42) + g.blob(x, y, [[0, -2, 11], [-11, 3, 8], [11, 3, 8], [0, 6, 8]], '#4fae3a'); } },
  flowers: { s: 1, h: 20, draw: (g) => {
    let d = '';
    const cols = ['#ff7eb6', '#ffe14d', '#fff', '#ff5a4a', '#b07af0'];
    [[0.3, 0.35], [0.6, 0.3], [0.45, 0.55], [0.72, 0.6], [0.3, 0.72], [0.6, 0.78]].forEach(([u, v], i) => {
      const [x, y] = g.P(u, v, 6);
      d += g.line([[x, y + 5], [x, y]], '#3f8a2a', 1.6) + g.circ(x, y - 1, 3.4, cols[i % 5], 1.4) + g.circ(x, y - 1, 1.2, '#ffd23f', 0);
    });
    return g.box(0.15, 0.15, 0.85, 0.85, 0, 5, '#8b5a2b', { top: '#6a4a2a' }) + d;
  } },
  rock: { s: 1, h: 20, draw: (g) => { const [x, y] = g.P(0.5, 0.5, 6); return g.shadow(0.5, 0.5, 0.36) + g.blob(x, y, [[0, 0, 9], [-8, 3, 7], [8, 4, 6]], '#a8a8a0'); } },
  couch: { s: 1, h: 26, draw: (g) => {
    const c = '#9a76a6';
    return g.shadow(0.5, 0.5, 0.45) + g.box(0.12, 0.22, 0.88, 0.38, 0, 17, c) + g.box(0.12, 0.38, 0.88, 0.78, 0, 7, shade(c, 0.9))
      + g.box(0.24, 0.4, 0.5, 0.74, 7, 10, tint(c, 0.2), { sw: 1.4 }) + g.box(0.5, 0.4, 0.76, 0.74, 7, 10, tint(c, 0.2), { sw: 1.4 })
      + g.box(0.12, 0.38, 0.24, 0.78, 0, 12, c) + g.box(0.76, 0.38, 0.88, 0.78, 0, 12, c);
  } },
  tv: { s: 1, h: 44, draw: (g) => {
    const [x, y] = g.P(0.5, 0.5, 28);
    return g.shadow(0.5, 0.5, 0.35) + g.box(0.3, 0.3, 0.7, 0.7, 0, 8, '#7a4a2a') + g.box(0.28, 0.32, 0.72, 0.68, 8, 26, '#5a3a22')
      + g.winL(0.33, 0.62, 0.68, 11, 23, '#7ac8f0', false) + g.circ(...g.P(0.67, 0.68, 17), 1.4, '#ffd23f', 1)
      + g.line([[x, y], [x - 8, y - 14]], OUT, 1.6) + g.line([[x, y], [x + 9, y - 13]], OUT, 1.6);
  } },
  trash: { s: 1, h: 30, draw: (g) => g.shadow(0.5, 0.5, 0.3) + g.cyl(0.5, 0.5, 0.22, 0, 18, '#8a9aa6', { top: '#6a7a86' }) + g.cyl(0.5, 0.5, 0.06, 18, 21, '#6a7a86') },
  car: { s: 2, h: 34, draw: (g) => {
    const c = '#f48fb1';
    const wheel = (u, v) => { const [x, y] = g.P(u, v, 5); return `<ellipse cx="${g.f(x)}" cy="${g.f(y)}" rx="5" ry="6" fill="#2a2a2a" stroke="${OUT}" stroke-width="1.8"/><ellipse cx="${g.f(x)}" cy="${g.f(y)}" rx="2" ry="2.5" fill="#bbb"/>`; };
    return g.shadow(1, 1, 0.75) + wheel(0.55, 0.62) + wheel(1.45, 0.62)
      + g.box(0.3, 0.65, 1.7, 1.3, 4, 14, c) + wheel(0.55, 1.32) + wheel(1.45, 1.32)
      + g.box(0.62, 0.72, 1.3, 1.22, 14, 23, c, { top: tint(c, 0.25) })
      + g.winL(0.68, 0.96, 1.22, 15, 21, GLASS, false) + g.winL(1.0, 1.26, 1.22, 15, 21, GLASS, false) + g.winR(0.78, 1.16, 1.3, 15, 21, GLASS, false)
      + g.bandR(0.75, 0.9, 1.7, 8, 11, '#ffe9a0') + g.bandR(1.05, 1.2, 1.7, 8, 11, '#ffe9a0');
  } },
  skate: { s: 1, h: 12, draw: (g) => g.shadow(0.5, 0.5, 0.3) + g.box(0.22, 0.42, 0.78, 0.58, 3, 5, '#e8452e', { top: '#f26a4a' })
    + g.circ(...g.P(0.3, 0.6, 2), 1.8, '#ffd23f', 1) + g.circ(...g.P(0.7, 0.6, 2), 1.8, '#ffd23f', 1) },
  busstop: { s: 1, h: 64, draw: (g) => {
    const [x, y] = g.P(0.75, 0.3, 0);
    return g.shadow(0.5, 0.5, 0.35) + g.line([[x, y], [x, y - 48]], '#555', 2.6) + g.circ(x, y - 50, 8, '#3a7af0') + `<text x="${x}" y="${y - 47}" font-family="Arial Black" font-size="9" text-anchor="middle" fill="#fff">H</text>`
      + g.box(0.2, 0.45, 0.7, 0.75, 6, 9, '#a87850') + g.box(0.25, 0.68, 0.3, 0.73, 0, 6, '#555') + g.box(0.6, 0.68, 0.65, 0.73, 0, 6, '#555');
  } },
  hotdog: { s: 1, h: 52, draw: (g) => {
    const [x, y] = g.P(0.5, 0.5, 40);
    return g.shadow(0.5, 0.5, 0.4) + g.box(0.2, 0.3, 0.8, 0.7, 6, 20, '#e04040', { top: '#ddd' })
      + g.circ(...g.P(0.35, 0.72, 4), 3.5, '#2a2a2a', 1.4) + g.circ(...g.P(0.7, 0.72, 4), 3.5, '#2a2a2a', 1.4)
      + g.line([g.P(0.5, 0.5, 20), [x, y]], '#555', 1.8)
      + g.path(`M${x - 20} ${y + 4} Q ${x} ${y - 16} ${x + 20} ${y + 4} Z`, '#fff') + g.path(`M${x - 7} ${y - 4} Q ${x} ${y - 10} ${x + 7} ${y - 4} L ${x + 9} ${y + 3} Q ${x} ${y + 1} ${x - 9} ${y + 3} Z`, '#e8402e', 1.2);
  } },
  fountain: { s: 2, h: 44, draw: (g) => {
    const [x, y] = g.P(1, 1, 30);
    return g.shadow(1, 1, 0.85) + g.cyl(1, 1, 0.78, 0, 9, '#c4c4cc', { top: '#9aa' }) + g.ell(1, 1, 0.66, 9, '#6fc4f4', 1.4)
      + g.cyl(1, 1, 0.12, 9, 24, '#c4c4cc') + g.cyl(1, 1, 0.32, 24, 27, '#c4c4cc', { top: '#6fc4f4' })
      + `<path d="M${x} ${y} q -10 -10 -18 10 M${x} ${y} q 10 -10 18 10 M${x} ${y} q 0 -14 0 -10" fill="none" stroke="#6fc4f4" stroke-width="2.6" stroke-linecap="round"/>`;
  } },
  tirefire: { s: 1, h: 64, draw: (g) => {
    const [x, y] = g.P(0.5, 0.5, 14);
    return g.shadow(0.5, 0.5, 0.45) + g.cyl(0.35, 0.6, 0.2, 0, 6, '#2a2a2a', { top: '#444' }) + g.cyl(0.62, 0.38, 0.2, 0, 6, '#2a2a2a', { top: '#444' }) + g.cyl(0.5, 0.5, 0.2, 6, 12, '#2a2a2a', { top: '#444' })
      + g.blob(x + 4, y - 40, [[0, 0, 8], [-8, 4, 6], [7, 4, 6], [3, -8, 6]], '#8a8a8a', { shade: '#6a6a6a' })
      + g.path(`M${x - 12} ${y} C ${x - 16} ${y - 14}, ${x - 6} ${y - 18}, ${x - 4} ${y - 30} C ${x + 2} ${y - 20}, ${x + 6} ${y - 24}, ${x + 6} ${y - 34} C ${x + 14} ${y - 22}, ${x + 16} ${y - 10}, ${x + 12} ${y} Z`, '#f2851e')
      + g.path(`M${x - 6} ${y} C ${x - 8} ${y - 8}, ${x - 2} ${y - 10}, ${x} ${y - 18} C ${x + 4} ${y - 10}, ${x + 8} ${y - 8}, ${x + 6} ${y} Z`, '#ffe14d', 1.4);
  } },
  bus: { s: 2, h: 40, draw: (g) => {
    let w = '';
    for (let u = 0.45; u < 1.5; u += 0.25) w += g.winL(u, u + 0.18, 1.35, 15, 23, GLASS, false);
    const wheel = (u, v) => g.circ(...g.P(u, v, 5), 5, '#2a2a2a', 1.8);
    return g.shadow(1, 1, 0.8) + wheel(0.55, 0.65) + wheel(1.5, 0.65) + g.box(0.25, 0.65, 1.75, 1.35, 4, 27, '#f7c600', { top: '#ffe066' })
      + w + g.bandL(0.25, 1.75, 1.35, 9, 11, '#2a2a2a') + wheel(0.55, 1.37) + wheel(1.5, 1.37) + g.winR(0.75, 1.25, 1.75, 15, 23, GLASS, false);
  } },
  statue: { s: 2, h: 96, draw: (g) => {
    const [x, y] = g.P(1, 1, 24), c = '#5f8f6f';
    return g.shadow(1, 1, 0.8) + g.box(0.55, 0.55, 1.45, 1.45, 0, 6, '#bdb4a2') + g.box(0.7, 0.7, 1.3, 1.3, 6, 24, '#d0c8b6')
      + g.path(`M${x - 8} ${y} L${x - 6} ${y - 24} L${x + 6} ${y - 24} L${x + 8} ${y} Z`, c)
      + g.path(`M${x - 11} ${y - 22} L${x - 9} ${y - 46} Q ${x} ${y - 52} ${x + 9} ${y - 46} L${x + 11} ${y - 22} Z`, c)
      + g.circ(x, y - 54, 8, c) + g.path(`M${x - 9} ${y - 57} Q ${x} ${y - 70} ${x + 9} ${y - 57} Z`, shade(c, 0.75))
      + g.path(`M${x + 8} ${y - 58} q 10 2 12 12`, 'none') + g.line([[x + 10, y - 44], [x + 20, y - 70]], shade(c, 0.7), 3);
  } },
  monorail: { s: 2, h: 70, draw: (g) => {
    let w = '';
    for (let u = 0.4; u < 1.6; u += 0.28) w += g.winL(u, u + 0.18, 1.2, 50, 57, '#fff', false);
    return g.shadow(1, 1, 0.5) + g.box(0.85, 0.85, 1.15, 1.15, 0, 38, '#c0c0c8') + g.box(0.15, 0.85, 1.85, 1.15, 38, 44, '#9a9aa6')
      + g.box(0.2, 0.8, 1.8, 1.2, 44, 62, '#4fa3e0', { top: '#8ac8f0' }) + w + g.bandL(0.2, 1.8, 1.2, 46, 48, '#ffd23f');
  } },
  circus: { s: 2, h: 86, draw: (g) => {
    const [x, y] = g.P(1, 1, 22);
    let stripes = '';
    for (const dx of [-30, -14, 2, 18]) stripes += g.path(`M${x} ${y - 46} L${x + dx} ${y + 6} L${x + dx + 8} ${y + 8} Z`, '#e8402e', 1.2);
    return g.shadow(1, 1, 0.9) + g.cyl(1, 1, 0.82, 0, 22, '#e8402e') + g.poly([g.P(1.35, 1.82, 0), g.P(1.6, 1.74, 0), g.P(1.6, 1.74, 16), g.P(1.35, 1.82, 16)], '#3a1a1a', 1.4)
      + g.cone(1, 1, 0.9, 22, 48, '#fff8f0') + stripes
      + g.line([[x, y - 46], [x, y - 60]], OUT, 2) + g.poly([[x, y - 60], [x + 12, y - 56], [x, y - 52]], '#ffd23f', 1.4);
  } },
  bigdonut: { s: 1, h: 76, draw: (g) => { const [x, y] = g.P(0.5, 0.5, 52); return g.shadow(0.5, 0.5, 0.35) + g.cyl(0.5, 0.5, 0.07, 0, 34, '#888', { noTop: true }) + donutBill(g, x, y, 19); } },
  wheel: { s: 3, h: 150, draw: (g) => {
    const [cx, cy] = g.P(1.5, 1.5, 96), r = 74, cols = ['#e8402e', '#3a7af0', '#ffd23f', '#7cc242', '#ff7eb6', '#9b4fd1', '#f28c28', '#3ac0f0'];
    const [b1x, b1y] = g.P(0.9, 2.1), [b2x, b2y] = g.P(2.1, 0.9);
    let sp = '', gon = '';
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, px = cx + Math.cos(a) * r, py = cy + Math.sin(a) * r;
      sp += g.line([[cx, cy], [px, py]], '#555', 2);
      gon += g.path(`M${g.f(px - 7)} ${g.f(py + 2)} h14 v9 q -7 5 -14 0 Z`, cols[i]);
    }
    return g.shadow(1.5, 1.5, 1.2) + g.line([[b1x, b1y], [cx, cy], [b2x, b2y]], '#666', 5) + `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${OUT}" stroke-width="6"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#f2f2f2" stroke-width="3"/>`
      + sp + gon + g.circ(cx, cy, 7, '#ffd23f');
  } },
  rocket: { s: 2, h: 128, draw: (g) => {
    const [x, y] = g.P(1, 1, 0), [tx, ty] = g.P(1, 1, 92);
    return g.shadow(1, 1, 0.7) + g.path(`M${x - 14} ${y - 2} L${x - 26} ${y + 4} L${x - 14} ${y - 26} Z`, '#e8402e') + g.cyl(1, 1, 0.34, 0, 80, '#f4f4f4', { noTop: true })
      + g.path(`M${x + 14} ${y - 2} L${x + 26} ${y + 4} L${x + 14} ${y - 26} Z`, shade('#e8402e', 0.8))
      + g.path(`M${tx - 15.4} ${ty + 13} Q ${tx - 14} ${ty - 14} ${tx} ${ty - 30} Q ${tx + 14} ${ty - 14} ${tx + 15.4} ${ty + 13} A 15.4 7.7 0 0 1 ${tx - 15.4} ${ty + 13} Z`, '#e8402e')
      + g.circ(x, y - 54, 7, GLASS, 2) + g.bandL(0.66, 1.34, 1.34, 18, 24, '#3a7af0');
  } },
  ufo: { s: 2, h: 100, draw: (g) => {
    const [x, y] = g.P(1, 1, 62);
    return g.ell(1, 1, 0.55, 0, 'rgba(120,255,120,.25)', 0) + `<path d="M${x - 14} ${y + 6} L${x - 34} ${y + 62} L${x + 34} ${y + 62} L${x + 14} ${y + 6} Z" fill="rgba(150,255,140,.35)"/>`
      + g.path(`M${x - 18} ${y - 4} Q ${x - 16} ${y - 26} ${x} ${y - 26} Q ${x + 16} ${y - 26} ${x + 18} ${y - 4} Z`, '#a8f0c0')
      + `<ellipse cx="${x}" cy="${y}" rx="44" ry="13" fill="#b0b8c4" stroke="${OUT}" stroke-width="${SW}"/><ellipse cx="${x}" cy="${y - 3}" rx="30" ry="6" fill="#d8dee6"/>`
      + [-30, -15, 0, 15, 30].map((d) => g.circ(x + d, y + 4, 2.6, '#ffe14d', 1.2)).join('');
  } },
  lamp: { s: 1, h: 64, draw: (g) => {
    const [x, y] = g.P(0.5, 0.5, 0);
    return g.shadow(0.5, 0.5, 0.18) + g.line([[x, y], [x, y - 50]], '#3a3a3a', 3) + g.path(`M${x} ${y - 50} q 0 -6 8 -6`, 'none') + g.line([[x, y - 50], [x + 8, y - 54]], '#3a3a3a', 2.4)
      + g.path(`M${x + 3} ${y - 54} L${x + 13} ${y - 54} L${x + 11} ${y - 49} L${x + 5} ${y - 49} Z`, '#ffe680', 1.6);
  } },
  hedge: { s: 1, h: 22, draw: (g) => {
    const [x, y] = g.P(0.5, 0.5, 14);
    return g.box(0.08, 0.2, 0.92, 0.8, 0, 12, '#3f9a36', { top: '#5cbf3a' }) + g.blob(x, y, [[-14, 0, 6], [-5, -2, 7], [5, -2, 7], [14, 0, 6]], '#5cbf3a', { sw: 1.4 });
  } },
  fence: { s: 1, h: 24, draw: (g) => {
    let o = '';
    for (let u = 0.1; u < 0.95; u += 0.2) o += g.box(u, 0.8, u + 0.09, 0.89, 0, 14, '#fbfbfb', { top: '#fff', sw: 1.2 });
    return g.box(0.05, 0.82, 0.97, 0.86, 4, 7, '#ececec', { sw: 1.2 }) + g.box(0.05, 0.82, 0.97, 0.86, 9, 11, '#ececec', { sw: 1.2 }) + o;
  } },
  hydrant: { s: 1, h: 26, draw: (g) => g.shadow(0.5, 0.5, 0.2) + g.cyl(0.5, 0.5, 0.11, 0, 14, '#e8402e') + g.cyl(0.5, 0.5, 0.14, 14, 16, '#c02020') + g.cyl(0.5, 0.5, 0.06, 16, 19, '#e8402e')
    + g.circ(...g.P(0.5, 0.62, 9), 2, '#c02020', 1.2) },
  bench: { s: 1, h: 22, draw: (g) => g.shadow(0.5, 0.5, 0.36) + g.box(0.2, 0.42, 0.25, 0.47, 0, 7, '#444') + g.box(0.75, 0.42, 0.8, 0.47, 0, 7, '#444')
    + g.box(0.15, 0.3, 0.85, 0.36, 7, 17, '#a87850') + g.box(0.15, 0.36, 0.85, 0.6, 7, 9, '#c49a6c') },
  mailbox: { s: 1, h: 34, draw: (g) => {
    const [x, y] = g.P(0.5, 0.5, 18);
    return g.shadow(0.5, 0.5, 0.2) + g.box(0.47, 0.47, 0.53, 0.53, 0, 16, '#7a4a2a') + g.box(0.4, 0.38, 0.6, 0.62, 16, 24, '#3a7af0', { top: '#5a9af8' })
      + g.line([[x + 6, y - 6], [x + 6, y - 14]], '#e8402e', 2) + g.poly([[x + 6, y - 14], [x + 12, y - 12], [x + 6, y - 10]], '#e8402e', 1.2);
  } },
};

// Bild-Cache für SVG-Strings
const _isoCache = {};
function isoArtOf(id, flip = false) {
  const k = flip ? id + ':f' : id;
  if (!_isoCache[k]) { const a = ISO_ART[id]; _isoCache[k] = isoArt(a.s, a.h, a.draw, flip); }
  return _isoCache[k];
}
function isoPreview(id, px = 84) {
  const a = isoArtOf(id), k = px / Math.max(a.W, a.H);
  return a.svg(1).replace(/width="[^"]+" height="[^"]+"/, `width="${Math.round(a.W * k)}" height="${Math.round(a.H * k)}"`);
}
