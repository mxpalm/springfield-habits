// Isometrische Stadt: Rendering, Kamera, Figuren, Bau-Modus.
'use strict';

/* ---------- Karte (Daten) ---------- */
const hash2 = (x, y) => { let h = (x * 374761393 + y * 668265263) >>> 0; h = ((h ^ (h >>> 13)) * 1274126177) >>> 0; return (h % 1000) / 1000; };
const plotRange = () => { const p = S.map.plot, a = Math.floor((S.map.G - p) / 2); return [a, a + p]; };
const inPlot = (x, y) => { const [a, b] = plotRange(); return x >= a && y >= a && x < b && y < b; };
const isWater = (t) => t === 'water' || t === 'shallow' || t === 'deep';
function terrainAt(x, y) {
  if (inPlot(x, y)) return S.map.tiles[`${x},${y}`] || 'grass';
  const [a, b] = plotRange();
  const d = Math.max(a - x, x - b + 1, a - y, y - b + 1);
  if (d <= 1) return 'shallow';
  if (d <= 3 && hash2(x, y) < (d === 2 ? 0.65 : 0.3)) return 'shallow';
  return 'deep';
}
const occupied = (x, y, ignore) => S.map.objects.find((o) => {
  if (o.uid === ignore) return false;
  const s = byId(ITEMS, o.item).s;
  return x >= o.x && x < o.x + s && y >= o.y && y < o.y + s;
});
function canPlace(item, x, y, ignore) {
  for (let i = 0; i < item.s; i++) for (let j = 0; j < item.s; j++) {
    const tx = x + i, ty = y + j;
    if (!inPlot(tx, ty) || isWater(terrainAt(tx, ty)) || occupied(tx, ty, ignore)) return false;
  }
  return true;
}
const walkable = (x, y) => inPlot(x, y) && !isWater(terrainAt(x, y)) && !occupied(x, y);
const ownedCount = (id) => (S.inventory[id] || 0) + S.map.objects.filter((o) => o.item === id).length;

function freshMap() { return { v: 2, G: WORLD_G, plot: LAND[0].size, tiles: {}, objects: [] }; }
// Alte Karten (Version 1) → alles ins Inventar, neue Insel
function migrateMap() {
  if (S.map && S.map.v === 2) return;
  for (const o of (S.map && S.map.objects) || []) if (byId(ITEMS, o.item)) S.inventory[o.item] = (S.inventory[o.item] || 0) + 1;
  S.map = freshMap();
  save();
}
function placeStarter() {
  const [a] = plotRange(), c = a + 4;
  const put = (item, x, y) => S.map.objects.push({ uid: uid(), item, x, y, flip: false });
  put('couch', c, c + 1); put('tv', c + 1, c + 3); put('tree', c - 2, c - 2); put('tree', c + 4, c - 1); put('bush', c - 2, c + 3);
  for (let i = -1; i < 7; i++) S.map.tiles[`${c + 3},${c + i}`] = 'sidewalk';
}

/* ---------- Welt-Renderer ---------- */
const World = (() => {
  const cv = $('#world'), ctx = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1;
  const cam = { x: 0, y: 0, z: 1 };
  let geo = null, running = false, last = 0;
  const imgs = new Map();
  const walkers = {};
  let talk = null; // { id, text, until }
  const B = { on: false, tray: 'items', paint: null, ghost: null };

  const isoX = (x, y) => (x - y) * TW / 2;
  const isoY = (x, y) => (x + y) * TH / 2;
  const toScreen = (wx, wy) => [(wx - cam.x) * cam.z + W / 2, (wy - cam.y) * cam.z + H / 2];
  const toWorld = (sx, sy) => [(sx - W / 2) / cam.z + cam.x, (sy - H / 2) / cam.z + cam.y];
  function tileAt(sx, sy) {
    const [wx, wy] = toWorld(sx, sy);
    return [Math.floor(wy / TH + wx / TW), Math.floor(wy / TH - wx / TW)];
  }

  /* --- Bilder --- */
  function image(key, make, w, h) {
    let e = imgs.get(key);
    if (!e) {
      const img = new Image();
      e = { img, ok: false };
      img.onload = () => { e.ok = true; };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(make());
      imgs.set(key, e);
    }
    return e.ok ? e.img : null;
  }
  const objImage = (id, flip) => image('o:' + id + (flip ? ':f' : ''), () => isoArtOf(id, flip).svg(3));
  const charImage = (c) => { const cos = S.chars[c.id]?.cosmetic || ''; return image(`c:${c.id}:${cos}`, () => avatarSvg(c, cosmeticOf(c.id), 180)); };

  /* --- Kachel-Geometrie (zwischengespeichert, neu bei Kartenänderung) --- */
  function diamond(p, x, y, lift = 0) {
    const X = isoX(x, y), Y = isoY(x, y) - lift;
    p.moveTo(X, Y); p.lineTo(X + TW / 2, Y + TH / 2); p.lineTo(X, Y + TH); p.lineTo(X - TW / 2, Y + TH / 2); p.closePath();
  }
  function buildGeo() {
    const G = S.map.G, fills = new Map(), add = (col) => { if (!fills.has(col)) fills.set(col, new Path2D()); return fills.get(col); };
    const cliffL = new Path2D(), cliffR = new Path2D(), gridLand = new Path2D(), gridWater = new Path2D(), roads = new Path2D(), paving = new Path2D(), sparks = [];
    const dots = { '#ff7eb6': new Path2D(), '#ffffff': new Path2D(), '#ffe14d': new Path2D() };
    const D = 7;
    const waterFills = [], landFills = [];
    for (let y = 0; y < G; y++) for (let x = 0; x < G; x++) {
      const t = terrainAt(x, y), T = TERRAIN[t], water = isWater(t);
      const col = T.alt && (x + y) % 2 ? T.alt : T.color;
      const p = add(col);
      (water ? waterFills : landFills).includes(col) || (water ? waterFills : landFills).push(col);
      diamond(p, x, y);
      diamond(water ? gridWater : gridLand, x, y);
      const X = isoX(x, y), Y = isoY(x, y);
      if (water) { if (hash2(x + 7, y) < 0.06) sparks.push([X + (hash2(x, y + 3) - 0.5) * 30, Y + TH / 2, hash2(y, x) * 6.28]); continue; }
      if (isWater(terrainAt(x, y + 1))) { cliffL.moveTo(X - TW / 2, Y + TH / 2); cliffL.lineTo(X, Y + TH); cliffL.lineTo(X, Y + TH + D); cliffL.lineTo(X - TW / 2, Y + TH / 2 + D); cliffL.closePath(); }
      if (isWater(terrainAt(x + 1, y))) { cliffR.moveTo(X, Y + TH); cliffR.lineTo(X + TW / 2, Y + TH / 2); cliffR.lineTo(X + TW / 2, Y + TH / 2 + D); cliffR.lineTo(X, Y + TH + D); cliffR.closePath(); }
      if (t === 'road') {
        const c = [X, Y + TH / 2], nb = [[1, 0, X + 16, Y + 24], [0, 1, X - 16, Y + 24], [-1, 0, X - 16, Y + 8], [0, -1, X + 16, Y + 8]].filter(([dx, dy]) => terrainAt(x + dx, y + dy) === 'road');
        if (!nb.length) { roads.moveTo(X - 8, Y + 12); roads.lineTo(X + 8, Y + 20); }
        for (const [, , ex, ey] of nb) { roads.moveTo(c[0], c[1]); roads.lineTo(ex, ey); }
      }
      if (t === 'sidewalk' || t === 'plaza') { paving.moveTo(X - 16, Y + 8); paving.lineTo(X + 16, Y + 24); paving.moveTo(X + 16, Y + 8); paving.lineTo(X - 16, Y + 24); }
      if (t === 'flowers') {
        const k = Object.keys(dots);
        for (let i = 0; i < 3; i++) { const px = X + (hash2(x * 3 + i, y) - 0.5) * 36, py = Y + 8 + hash2(x, y * 3 + i) * 16; dots[k[i]].moveTo(px + 2.2, py); dots[k[i]].arc(px, py, 2.2, 0, 6.29); }
      }
    }
    geo = { fills, waterFills, landFills, cliffL, cliffR, gridLand, gridWater, roads, paving, dots, sparks };
  }
  const invalidate = () => { geo = null; };

  /* --- Figuren --- */
  function randomFreeNear(cx, cy) {
    const free = [];
    const [a, b] = plotRange();
    for (let y = a; y < b; y++) for (let x = a; x < b; x++) if (walkable(x, y)) free.push([x, y, Math.abs(x - cx) + Math.abs(y - cy)]);
    if (!free.length) return null;
    free.sort((p, q) => p[2] - q[2]);
    return free[Math.floor(Math.random() * Math.min(free.length, 12))];
  }
  function updateWalkers(dt) {
    const home = unlocked().filter((c) => S.chars[c.id].home !== false);
    for (const id of Object.keys(walkers)) if (!home.find((c) => c.id === id)) delete walkers[id];
    const [a, b] = plotRange(), mid = (a + b) / 2;
    for (const c of home) {
      let w = walkers[c.id];
      if (!w || (!w.moving && !walkable(w.x, w.y))) {
        const p = randomFreeNear(w ? w.x : mid, w ? w.y : mid);
        if (!p) continue;
        w = walkers[c.id] = { x: p[0], y: p[1], fx: p[0], fy: p[1], tx: p[0], ty: p[1], moving: false, t: 0, wait: Math.random() * 2000, face: 1 };
      }
      if (w.moving) {
        w.t += dt / 850;
        if (w.t >= 1) { w.moving = false; w.x = w.tx; w.y = w.ty; w.fx = w.x; w.fy = w.y; w.wait = 700 + Math.random() * 3200; }
        else { w.fx = w.x + (w.tx - w.x) * w.t; w.fy = w.y + (w.ty - w.y) * w.t; }
      } else if ((w.wait -= dt) <= 0) {
        const opts = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [w.x + dx, w.y + dy]).filter(([x, y]) => walkable(x, y) && !Object.values(walkers).some((o) => o !== w && o.tx === x && o.ty === y));
        if (opts.length) {
          const [tx, ty] = pick(opts);
          w.tx = tx; w.ty = ty; w.t = 0; w.moving = true;
          const dsx = (tx - ty) - (w.x - w.y);
          if (dsx) w.face = dsx > 0 ? 1 : -1;
        } else w.wait = 1500;
      }
    }
  }
  const CW = 34, CH = CW * 1.68;
  function walkerScreen(id) {
    const w = walkers[id];
    if (!w) return null;
    const bob = w.moving ? Math.abs(Math.sin(w.t * Math.PI * 2)) * 3 : 0;
    const wx = isoX(w.fx + 0.5, w.fy + 0.5), wy = isoY(w.fx + 0.5, w.fy + 0.5) - bob;
    return { wx, wy, top: toScreen(wx, wy - CH), feet: toScreen(wx, wy) };
  }

  /* --- Zeichnen --- */
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    W = window.innerWidth; H = appHeight();
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
  }
  function clampCam() {
    const [a, b] = plotRange(), m = 6;
    const minX = isoX(a - m, b + m), maxX = isoX(b + m, a - m), minY = isoY(a - m, a - m), maxY = isoY(b + m, b + m);
    cam.x = Math.max(minX, Math.min(maxX, cam.x));
    cam.y = Math.max(minY, Math.min(maxY, cam.y));
    cam.z = Math.max(0.35, Math.min(3, cam.z));
  }
  function centerCam() {
    const [a, b] = plotRange(), c = (a + b) / 2;
    cam.x = isoX(c, c); cam.y = isoY(c, c) - 20;
    cam.z = Math.min(2.2, Math.max(0.5, W / ((b - a) * TW * 0.78)));
  }

  function draw(t) {
    if (!geo) buildGeo();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = TERRAIN.deep.color;
    ctx.fillRect(0, 0, cv.width, cv.height);
    const z = cam.z * dpr;
    ctx.setTransform(z, 0, 0, z, dpr * (W / 2 - cam.x * cam.z), dpr * (H / 2 - cam.y * cam.z));
    const px = 1 / cam.z;

    for (const col of geo.waterFills) { ctx.fillStyle = col; ctx.fill(geo.fills.get(col)); }
    ctx.strokeStyle = 'rgba(255,255,255,.09)'; ctx.lineWidth = px; ctx.stroke(geo.gridWater);
    // Glitzern auf dem Wasser
    ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const [sx, sy, ph] of geo.sparks) {
      const k = (Math.sin(t / 700 + ph) + 1) / 2;
      if (k < 0.35) continue;
      ctx.globalAlpha = (k - 0.35) * 1.5;
      ctx.beginPath(); ctx.moveTo(sx - 5, sy); ctx.quadraticCurveTo(sx, sy - 3, sx + 5, sy); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#b07a42'; ctx.fill(geo.cliffL);
    ctx.fillStyle = '#8a5a2e'; ctx.fill(geo.cliffR);
    ctx.strokeStyle = '#1d1d1d'; ctx.lineWidth = 1.4; ctx.lineJoin = 'round'; ctx.stroke(geo.cliffL); ctx.stroke(geo.cliffR);
    for (const col of geo.landFills) { ctx.fillStyle = col; ctx.fill(geo.fills.get(col)); }
    ctx.strokeStyle = 'rgba(0,0,0,.12)'; ctx.lineWidth = px; ctx.stroke(geo.gridLand); ctx.stroke(geo.paving);
    ctx.save(); ctx.setLineDash([5, 5]); ctx.strokeStyle = '#fff6c0'; ctx.lineWidth = 2; ctx.stroke(geo.roads); ctx.restore();
    for (const [col, p] of Object.entries(geo.dots)) { ctx.fillStyle = col; ctx.fill(p); }

    // Bau-Modus: Grundstücksrand + Vorschau
    if (B.on) {
      const [a, b] = plotRange();
      ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = '#ffd90f'; ctx.lineWidth = 3 * px;
      ctx.beginPath(); ctx.moveTo(isoX(a, a), isoY(a, a)); ctx.lineTo(isoX(b, a), isoY(b, a)); ctx.lineTo(isoX(b, b), isoY(b, b)); ctx.lineTo(isoX(a, b), isoY(a, b)); ctx.closePath(); ctx.stroke(); ctx.restore();
      if (B.ghost) {
        const it = byId(ITEMS, B.ghost.item), ok = canPlace(it, B.ghost.x, B.ghost.y, B.ghost.uid);
        const p = new Path2D(), g = B.ghost;
        p.moveTo(isoX(g.x, g.y), isoY(g.x, g.y)); p.lineTo(isoX(g.x + it.s, g.y), isoY(g.x + it.s, g.y)); p.lineTo(isoX(g.x + it.s, g.y + it.s), isoY(g.x + it.s, g.y + it.s)); p.lineTo(isoX(g.x, g.y + it.s), isoY(g.x, g.y + it.s)); p.closePath();
        ctx.fillStyle = ok ? 'rgba(80,220,90,.45)' : 'rgba(240,70,60,.5)'; ctx.fill(p);
        ctx.strokeStyle = ok ? '#2a9a3a' : '#c02020'; ctx.lineWidth = 2 * px; ctx.stroke(p);
      }
    }

    // Objekte & Figuren nach Tiefe sortiert
    const list = [];
    for (const o of S.map.objects) {
      if (B.ghost && B.ghost.uid === o.uid) continue;
      const s = byId(ITEMS, o.item).s;
      list.push({ d: o.x + o.y + 2 * (s - 1), o });
    }
    if (B.ghost) list.push({ d: B.ghost.x + B.ghost.y + 2 * (byId(ITEMS, B.ghost.item).s - 1) + 0.1, o: B.ghost, ghost: true });
    for (const [id, w] of Object.entries(walkers)) list.push({ d: w.fx + w.fy + 0.05, w: id });
    list.sort((p, q) => p.d - q.d);
    for (const e of list) {
      if (e.o) drawObject(e.o, e.ghost, t);
      else drawWalker(e.w);
    }
    // Sprechblase
    const bub = $('#bubble');
    if (talk && t < talk.until && walkers[talk.id]) {
      const p = walkerScreen(talk.id);
      bub.hidden = false; bub.textContent = talk.text;
      bub.style.left = Math.min(Math.max(p.top[0], 100), W - 100) + 'px'; bub.style.top = (p.top[1] - 6) + 'px';
    } else if (!bub.hidden) { bub.hidden = true; talk = null; }
  }
  function drawObject(o, ghost, t) {
    const it = byId(ITEMS, o.item), art = isoArtOf(it.id, o.flip), img = objImage(it.id, o.flip);
    if (!img) return;
    const s = it.s, bx = isoX(o.x + s, o.y + s), by = isoY(o.x + s, o.y + s);
    const w = art.W, h = art.H;
    ctx.save();
    if (ghost) ctx.globalAlpha = 0.6 + Math.sin(t / 200) * 0.15;
    ctx.drawImage(img, bx - w / 2, by - h, w, h);
    ctx.restore();
  }
  function drawWalker(id) {
    const c = byId(CHARACTERS, id), img = charImage(c), p = walkerScreen(id);
    if (!img || !p) return;
    const w = walkers[id];
    ctx.fillStyle = 'rgba(0,0,0,.2)';
    ctx.beginPath(); ctx.ellipse(isoX(w.fx + 0.5, w.fy + 0.5), isoY(w.fx + 0.5, w.fy + 0.5), 11, 5.5, 0, 0, 6.29); ctx.fill();
    ctx.save();
    ctx.translate(p.wx, p.wy);
    if (w.face < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -CW / 2, -CH + 3, CW, CH);
    ctx.restore();
  }

  function loop(t) {
    if (!running) return;
    const dt = Math.min(60, t - (last || t)); last = t;
    updateWalkers(dt);
    draw(t);
    requestAnimationFrame(loop);
  }
  function start() { if (running) return; running = true; last = 0; requestAnimationFrame(loop); }
  function stop() { running = false; $('#bubble').hidden = true; }

  /* --- Eingabe: Verschieben, Zoomen, Tippen, Malen --- */
  const ptrs = new Map();
  let pinch = null, dragged = false, downAt = 0, down0 = [0, 0], paintedAny = false;
  function paintAt(sx, sy) {
    const [x, y] = tileAt(sx, sy), t = B.paint;
    if (!inPlot(x, y) || terrainAt(x, y) === t) return;
    if (t === 'water' && occupied(x, y)) return;
    const price = TERRAIN[t].price;
    if (S.donuts < price) { toast('Nicht genug Donuts.'); return; }
    S.donuts -= price;
    if (t === 'grass') delete S.map.tiles[`${x},${y}`]; else S.map.tiles[`${x},${y}`] = t;
    paintedAny = true; invalidate();
  }
  cv.addEventListener('pointerdown', (e) => {
    cv.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 1) { dragged = false; downAt = performance.now(); down0 = [e.clientX, e.clientY]; if (B.on && B.paint && !B.ghost) paintAt(e.clientX, e.clientY); }
    if (ptrs.size === 2) {
      const [p, q] = [...ptrs.values()];
      const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), z: cam.z, w: toWorld(mx, my) };
      dragged = true;
    }
  });
  cv.addEventListener('pointermove', (e) => {
    const p = ptrs.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (ptrs.size === 2 && pinch) {
      const [a, b] = [...ptrs.values()];
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      cam.z = Math.max(0.35, Math.min(3, pinch.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d));
      cam.x = pinch.w[0] - (mx - W / 2) / cam.z; cam.y = pinch.w[1] - (my - H / 2) / cam.z;
      clampCam(); return;
    }
    if (Math.abs(dx) + Math.abs(dy) > 0) {
      if (!dragged && Math.hypot(e.clientX - down0[0], e.clientY - down0[1]) < 7) return;
      dragged = true;
      if (B.on && B.paint && !B.ghost) { paintAt(e.clientX, e.clientY); return; }
      cam.x -= dx / cam.z; cam.y -= dy / cam.z; clampCam();
    }
  });
  const up = (e) => {
    const had = ptrs.has(e.pointerId);
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (!had) return;
    if (paintedAny) { paintedAny = false; save(); renderHud(); }
    if (ptrs.size === 0 && !dragged && performance.now() - downAt < 450) tap(e.clientX, e.clientY);
  };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', (e) => { ptrs.delete(e.pointerId); pinch = null; });
  cv.addEventListener('wheel', (e) => {
    e.preventDefault();
    const w0 = toWorld(e.clientX, e.clientY);
    cam.z = Math.max(0.35, Math.min(3, cam.z * Math.exp(-e.deltaY * 0.0015)));
    cam.x = w0[0] - (e.clientX - W / 2) / cam.z; cam.y = w0[1] - (e.clientY - H / 2) / cam.z;
    clampCam();
  }, { passive: false });

  function pickWalker(sx, sy) {
    let best = null;
    for (const id of Object.keys(walkers)) {
      const p = walkerScreen(id), w = CW * cam.z * 0.6;
      if (sx > p.feet[0] - w && sx < p.feet[0] + w && sy > p.top[1] && sy < p.feet[1] + 6) {
        const d = walkers[id].fx + walkers[id].fy;
        if (!best || d > best.d) best = { id, d };
      }
    }
    return best && best.id;
  }
  function pickObject(sx, sy) {
    const [tx, ty] = tileAt(sx, sy);
    const o = occupied(tx, ty);
    if (o) return o;
    const sorted = [...S.map.objects].sort((p, q) => (q.x + q.y) - (p.x + p.y));
    for (const ob of sorted) {
      const it = byId(ITEMS, ob.item), art = isoArtOf(it.id);
      const [bx, by] = toScreen(isoX(ob.x + it.s, ob.y + it.s), isoY(ob.x + it.s, ob.y + it.s));
      const w = art.W * cam.z, h = (art.H - it.s * TH * 0.5) * cam.z;
      if (sx > bx - w * 0.35 && sx < bx + w * 0.35 && sy > by - h && sy < by - it.s * TH * 0.5 * cam.z) return ob;
    }
    return null;
  }
  function tap(sx, sy) {
    const [tx, ty] = tileAt(sx, sy);
    if (B.on) {
      if (B.ghost) {
        const it = byId(ITEMS, B.ghost.item), off = Math.floor((it.s - 1) / 2);
        [B.ghost.x, B.ghost.y] = nearestValid(it, tx - off, ty - off, B.ghost.uid, 1); ui(); return;
      }
      if (B.paint) return;
      const o = pickObject(sx, sy);
      if (o) { B.ghost = { item: o.item, x: o.x, y: o.y, flip: o.flip, uid: o.uid, ox: o.x, oy: o.y }; sound('start'); ui(); }
      return;
    }
    const id = pickWalker(sx, sy);
    if (id) { talk = { id, text: pick(byId(CHARACTERS, id).lines), until: performance.now() + 2800 }; walkers[id].wait = 2800; return; }
    const o = pickObject(sx, sy);
    if (o) {
      const it = byId(ITEMS, o.item);
      const b = $('#bubble');
      const [x, y] = toScreen(isoX(o.x + it.s / 2, o.y + it.s / 2), isoY(o.x + it.s / 2, o.y + it.s / 2) - isoArtOf(it.id).H * 0.55);
      talk = null; b.hidden = false; b.textContent = it.name; b.style.left = x + 'px'; b.style.top = y + 'px';
      clearTimeout(tap.t); tap.t = setTimeout(() => { if (!talk) b.hidden = true; }, 1800);
    }
  }

  // Nächste freie Position um (x, y) suchen – damit die Vorschau nicht auf Hindernissen landet
  function nearestValid(it, x, y, ignore, maxR = 6) {
    if (canPlace(it, x, y, ignore)) return [x, y];
    for (let r = 1; r <= maxR; r++) {
      let best = null;
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r || !canPlace(it, x + dx, y + dy, ignore)) continue;
        const d = dx * dx + dy * dy;
        if (!best || d < best[2]) best = [x + dx, y + dy, d];
      }
      if (best) return [best[0], best[1]];
    }
    return [x, y];
  }

  /* --- Bau-Modus UI --- */
  function centerTile() { return tileAt(W / 2, H * 0.45); }
  function ui() {
    const el = $('#buildui');
    if (!B.on) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;
    let bottom;
    if (B.ghost) {
      const it = byId(ITEMS, B.ghost.item), ok = canPlace(it, B.ghost.x, B.ghost.y, B.ghost.uid);
      bottom = `<div class="ghostbar card">
        <div class="ghostname">${esc(it.name)}</div>
        <div class="small muted center">${ok ? 'Tippe auf ein Feld zum Verschieben.' : 'Hier ist kein Platz – tippe woanders hin.'}</div>
        <div class="row" style="justify-content:center;margin-top:8px">
          <button class="btn white round" data-act="gCancel" aria-label="Abbrechen">✕</button>
          <button class="btn blue round" data-act="gFlip" aria-label="Spiegeln">⇋</button>
          ${B.ghost.uid ? '<button class="btn white round" data-act="gStore" aria-label="Einlagern">📦</button>' : ''}
          <button class="btn green" data-act="gOk" ${ok ? '' : 'disabled'}>✓ Platzieren</button>
        </div></div>`;
    } else {
      const inv = Object.entries(S.inventory).filter(([id, n]) => n > 0 && ISO_ART[id]);
      const tray = B.tray === 'items'
        ? (inv.length ? inv.map(([id, n]) => `<button class="slot" data-act="bPick" data-id="${id}"><span class="count">${n}</span><span class="pv">${isoPreview(id, 54)}</span><span class="nm">${esc(byId(ITEMS, id).name)}</span></button>`).join('')
          : `<div class="small muted" style="padding:10px">Inventar leer. Kauf Gebäude im <a href="#" data-act="tab" data-tab="shop">Laden</a>!</div>`)
        : Object.entries(TERRAIN).filter(([, t]) => t.paint).map(([id, t]) => `<button class="slot ${B.paint === id ? 'on' : ''}" data-act="bPaint" data-id="${id}"><span class="swatch" style="background:${t.color}"></span><span class="nm">${t.name}</span><span class="nm muted">${t.price ? t.price + ' 🍩' : 'gratis'}</span></button>`).join('');
      bottom = `<div class="tray card">
        <div class="seg"><button class="${B.tray === 'items' ? 'on' : ''}" data-act="bTray" data-t="items">🏠 Inventar</button><button class="${B.tray === 'paint' ? 'on' : ''}" data-act="bTray" data-t="paint">🎨 Gelände</button>
          <span class="grow"></span><button data-act="tab" data-tab="shop">🛒 Laden</button></div>
        <div class="small muted" style="margin:0 2px 6px">${B.tray === 'paint' ? (B.paint ? 'Wische über Felder zum Malen. Zwei Finger verschieben die Karte.' : 'Wähle ein Gelände zum Malen.') : 'Objekt wählen – oder ein Objekt in der Stadt antippen, um es zu bewegen.'}</div>
        <div class="slots">${tray}</div></div>`;
    }
    el.innerHTML = `<div class="buildtop"><span class="chip">🔨 Bau-Modus</span><button class="btn green" data-act="bDone">Fertig</button></div>${bottom}`;
  }

  Object.assign(actions, {
    build: () => { tab = 'home'; B.on = true; B.ghost = null; B.paint = null; render(); },
    bDone: () => { B.on = false; B.ghost = null; B.paint = null; render(); },
    bTray: (d) => { B.tray = d.t; B.paint = null; ui(); },
    bPick: (d) => {
      const it = byId(ITEMS, d.id), [cx, cy] = centerTile(), off = Math.floor((it.s - 1) / 2);
      const [gx, gy] = nearestValid(it, cx - off, cy - off, null);
      B.ghost = { item: d.id, x: gx, y: gy, flip: false, uid: null };
      ui();
    },
    bPaint: (d) => { B.paint = B.paint === d.id ? null : d.id; ui(); },
    gCancel: () => { B.ghost = null; ui(); },
    gFlip: () => { B.ghost.flip = !B.ghost.flip; ui(); },
    gStore: () => {
      S.map.objects = S.map.objects.filter((o) => o.uid !== B.ghost.uid);
      S.inventory[B.ghost.item] = (S.inventory[B.ghost.item] || 0) + 1;
      B.ghost = null; save(); ui();
    },
    gOk: () => {
      const g = B.ghost, it = byId(ITEMS, g.item);
      if (!canPlace(it, g.x, g.y, g.uid)) return;
      if (g.uid) Object.assign(S.map.objects.find((o) => o.uid === g.uid), { x: g.x, y: g.y, flip: g.flip });
      else {
        S.map.objects.push({ uid: uid(), item: g.item, x: g.x, y: g.y, flip: g.flip });
        if (--S.inventory[g.item] <= 0) delete S.inventory[g.item];
      }
      B.ghost = null; sound('buy'); save(); ui();
    },
  });

  window.addEventListener('resize', () => { resize(); clampCam(); });

  return {
    init() { resize(); centerCam(); clampCam(); },
    show(on) { cv.style.visibility = 'visible'; if (on) start(); else stop(); ui(); },
    invalidate, centerCam, ui,
    get building() { return B.on; },
    reset() { for (const k of Object.keys(walkers)) delete walkers[k]; B.on = false; B.ghost = null; invalidate(); centerCam(); },
  };
})();

boot();
