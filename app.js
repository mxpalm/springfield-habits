// Springfield Habits – Gewohnheiten, Fokus und eine eigene kleine Stadt.
'use strict';

/* ---------- Helfer ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => Math.random().toString(36).slice(2, 10);
const pad = (n) => String(n).padStart(2, '0');
const keyOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseKey = (k) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
const addDays = (k, n) => { const d = parseKey(k); d.setDate(d.getDate() + n); return keyOf(d); };
const diffDays = (a, b) => Math.round((parseKey(b) - parseKey(a)) / 864e5);
const today = () => keyOf(new Date());
const weekday = (k) => (parseKey(k).getDay() + 6) % 7; // 0 = Montag
const weekStart = (k) => addDays(k, -weekday(k));
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const fmtDate = (k) => parseKey(k).toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
const D = (n, size = 16) => `<span class="price">${donutSvg(size)}${n}</span>`;
const byId = (list, id) => list.find((x) => x.id === id);
const possessive = (n) => !n ? 'Dein' : /[sxzß]$/i.test(n) ? n + '’' : n + 's';
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ---------- Zustand ---------- */
const STORE = 'springfield-habits-v1';
function freshState() {
  return {
    v: 1, started: false, name: '', main: 'rundi',
    donuts: 50, xp: 0, freezes: 1,
    habits: [], log: {}, counts: {}, freezeUsed: {},
    sessions: [], focusRun: null,
    journal: {}, todos: [], challenges: { date: '', list: [] },
    inventory: {}, cosmeticsOwned: [],
    map: { v: 2, G: WORLD_G, plot: LAND[0].size, tiles: {}, objects: [] },
    chars: {}, // id -> { cosmetic, home: true }
    lastCheck: today(),
    settings: { strict: false, sound: true, vol: 0.7, music: false, focusMin: 25, breakMin: 5, hardcore: false, stopwatch: false, backupEvery: 7 },
  };
}
let S, loadErr = null, brokenRaw = null;
try { S = Object.assign(freshState(), JSON.parse(localStorage.getItem(STORE) || 'null') || {}); }
catch (e) {
  // Beschädigter Spielstand: nicht still überschreiben, sondern daneben aufheben
  loadErr = e; S = freshState();
  try { brokenRaw = localStorage.getItem(STORE); if (brokenRaw) localStorage.setItem(`${STORE}-kaputt-${Date.now()}`, brokenRaw); } catch { /* Speicher gesperrt */ }
}
S.settings = Object.assign(freshState().settings, S.settings);
// Schlägt Speichern fehl (Speicher voll oder gesperrt), einmal deutlich warnen statt still Daten zu verlieren
let saveFailed = false, moodCache = null;
const save = () => {
  moodCache = null;
  try { localStorage.setItem(STORE, JSON.stringify(S)); saveFailed = false; }
  catch (e) { console.warn(e); if (!saveFailed) { saveFailed = true; problem('save', e); } }
};

/* ---------- Fehlerschutz ---------- */
// Eigene Fehleranzeige, unabhängig vom restlichen UI (das ist im Fehlerfall evtl. kaputt)
const PROBLEM = {
  save: ['Speichern klappt gerade nicht', 'Der Speicher ist voll oder gesperrt. Deine letzten Änderungen sind vielleicht nicht gesichert. Mach jetzt ein Backup.'],
  load: ['Spielstand nicht lesbar', 'Dein gespeicherter Stand war beschädigt. Eine Kopie liegt sicher daneben. Lade dein letztes Backup über Mehr → Einstellungen → Import.'],
  crash: ['Hoppla, da hakt etwas', 'Ein Fehler ist aufgetreten. Deine Daten sind gespeichert. Mach zur Sicherheit ein Backup und lade die App neu.'],
};
function problem(kind, err) {
  if (document.getElementById('problem')) return;
  const [title, text] = PROBLEM[kind], el = document.createElement('div');
  const second = kind === 'crash' ? ['reload', 'Neu laden'] : ['close', 'Schließen'];
  el.id = 'problem'; el.className = 'problem';
  el.innerHTML = `<div class="card"><h2>${title}</h2><p>${text}</p>
    <details class="small muted"><summary>Details</summary><code>${esc(err?.message || err || '')}</code></details>
    <div class="row"><button class="btn green grow" type="button" data-p="${kind === 'load' && brokenRaw ? 'raw' : 'backup'}">${kind === 'load' && brokenRaw ? '⬇ Kopie sichern' : '☁ Backup sichern'}</button>
      <button class="btn white grow" type="button" data-p="${second[0]}">${second[1]}</button></div></div>`;
  el.addEventListener('click', (e) => {
    const p = e.target.closest('[data-p]')?.dataset.p;
    if (p === 'backup') backupNow().then((ok) => { if (ok) toast('☁ Backup gesichert.'); });
    if (p === 'raw') downloadFile(new File([brokenRaw], `springfield-kaputt-${today()}.json`, { type: 'application/json' }));
    if (p === 'reload') location.reload();
    if (p === 'close') el.remove();
  });
  document.body.appendChild(el);
}
// Nur Fehler aus den eigenen Skripten zeigen (nicht von Browser-Erweiterungen)
window.addEventListener('error', (e) => { if (e.filename && e.filename.startsWith(location.origin)) problem('crash', e.error || e.message); });
window.addEventListener('unhandledrejection', (e) => console.warn('Unbehandelt:', e.reason));

/* ---------- Level & Belohnungen ---------- */
const xpFor = (lvl) => 25 * lvl * (lvl - 1); // Gesamt-XP, um Level lvl zu erreichen
function levelInfo(xp = S.xp) {
  let l = 1;
  while (xp >= xpFor(l + 1)) l++;
  const base = xpFor(l), next = xpFor(l + 1);
  return { lvl: l, into: xp - base, need: next - base, pct: (xp - base) / (next - base) };
}
function reward(donuts, xp, msg) {
  const before = levelInfo().lvl;
  S.donuts = Math.max(0, S.donuts + donuts); S.xp = Math.max(0, S.xp + xp);
  const after = levelInfo().lvl;
  save();
  if (msg) toast(msg);
  if (after > before) {
    sound('level');
    toast(`🎉 Level ${after}! Neue Sachen im Laden.`);
  }
  renderHud();
}

/* ---------- Gewohnheiten ---------- */
// Pausen (einzeln oder mit der ganzen Quest): Tage darin sind nicht fällig – Streak und Fortschritt bleiben eingefroren.
const inPause = (h, k) => (h.pauses || []).some(([a, b]) => k >= a && (!b || k <= b));
const pausedWeek = (h, wk) => [0, 1, 2, 3, 4, 5, 6].some((i) => inPause(h, addDays(wk, i)));
const pauseStart = (h) => { (h.pauses = h.pauses || []).push([today(), null]); };
const pauseEnd = (h) => { const r = (h.pauses || []).find((x) => !x[1]); if (r) r[1] = addDays(today(), -1); };
function isDue(h, k) {
  if (k < h.created || inPause(h, k)) return false;
  const sc = h.schedule;
  if (sc.type === 'days') return sc.days.includes(weekday(k));
  if (sc.type === 'interval') return diffDays(h.created, k) % sc.n === 0;
  return true; // daily & weekly
}
const status = (h, k) => (S.log[h.id] || {})[k];
// Wie isDue, aber eine wöchentliche Gewohnheit ist frei, sobald das Wochenziel erreicht ist
const dueOn = (h, k) => isDue(h, k) && !(h.schedule.type === 'weekly' && !status(h, k) && weekCount(h, weekStart(k)) >= h.schedule.n);
const okStatus = (st) => st === 'done' || (st === 'min' && !S.settings.strict);
const frozen = (h, k) => (S.freezeUsed[h.id] || []).includes(k);

function weekCount(h, wk) {
  let c = 0;
  for (let i = 0; i < 7; i++) if (okStatus(status(h, addDays(wk, i)))) c++;
  return c;
}
// Zählt von Tag k rückwärts, solange fällige Tage erledigt (oder per Squishee gerettet) sind.
function streakBack(h, k) {
  let c = 0;
  for (let i = 0; i < 2000 && k >= h.created; i++, k = addDays(k, -1)) {
    if (!isDue(h, k)) continue;
    if (okStatus(status(h, k))) c++;
    else if (!frozen(h, k)) break;
  }
  return c;
}
function streak(h) {
  const t = today();
  if (h.schedule.type === 'weekly') {
    let wk = weekStart(t), c = 0;
    if (weekCount(h, wk) >= h.schedule.n) c++;
    wk = addDays(wk, -7);
    while (wk >= weekStart(h.created)) {
      if (weekCount(h, wk) >= h.schedule.n) c++;
      else if (!frozen(h, wk) && !pausedWeek(h, wk)) break;
      wk = addDays(wk, -7);
    }
    return c;
  }
  const st = status(h, t);
  if (okStatus(st)) return streakBack(h, t);
  if (st === 'skip' && !frozen(h, t)) return 0;
  return streakBack(h, addDays(t, -1));
}
function bestStreak(h) {
  if (h.schedule.type === 'weekly') return Math.max(h.best || 0, streak(h));
  let best = 0, cur = 0;
  for (let k = h.created, t = today(); k <= t; k = addDays(k, 1)) {
    if (!isDue(h, k)) continue;
    if (okStatus(status(h, k))) { cur++; best = Math.max(best, cur); }
    else if (!frozen(h, k) && k !== t) cur = 0;
  }
  return best;
}
function consistency(h, days = 30) {
  let due = 0, ok = 0;
  const t = today();
  if (h.schedule.type === 'weekly') {
    for (let i = 0; i < Math.ceil(days / 7); i++) {
      const wk = addDays(weekStart(t), -7 * i);
      if (addDays(wk, 6) < h.created) break;
      due += h.schedule.n; ok += Math.min(h.schedule.n, weekCount(h, wk));
    }
  } else {
    for (let i = 0; i < days; i++) {
      const k = addDays(t, -i);
      if (k < h.created) break;
      if (!isDue(h, k) || (i === 0 && !status(h, k))) continue;
      due++; if (okStatus(status(h, k))) ok++;
    }
  }
  return due ? Math.round((ok / due) * 100) : null;
}
// Quest-Gewohnheiten belohnen nach Schwierigkeit, Minimum gibt gut die Hälfte
function rewardOf(st, h) {
  const [d, x] = h && h.diff ? DIFF[h.diff].habit : [REWARDS.habit, REWARDS.habitXp];
  return st === 'done' ? [d, x] : st === 'min' ? [Math.ceil(d * 0.6), x] : [0, 0];
}
function setStatus(h, k, st) {
  const old = status(h, k);
  const next = old === st ? undefined : st;
  const sbOf = () => (h.schedule.type !== 'weekly' && okStatus(status(h, k)) ? streakBonus(streakBack(h, k)) : 0);
  const sbOld = sbOf();
  S.log[h.id] = S.log[h.id] || {};
  if (next) S.log[h.id][k] = next; else delete S.log[h.id][k];
  const sb = sbOf() - sbOld;
  const [od, ox] = rewardOf(old, h), [nd0, nx] = rewardOf(next, h), nd = nd0 + sb;
  if (okStatus(next) || next === 'min') {
    // Kombo: jede weitere erledigte Gewohnheit klingt höher, die letzte des Tages bekommt die Fanfare
    const due = S.habits.filter((x) => !x.archived && dueOn(x, k)), fin = (x) => okStatus(status(x, k)) || status(x, k) === 'min';
    const n = due.filter(fin).length;
    sound(n === due.length && n > 1 ? 'allDone' : next === 'min' ? 'min' : 'done', n);
    World.react(n === due.length && n > 1 ? 'allDone' : 'habit');
  } else sound(next === 'skip' ? 'skip' : 'undo');
  // Comeback-Bonus einmal pro Tag und Gewohnheit
  const cb = okStatus(next) && !okStatus(old) && !(h.comeback || []).includes(k) ? comebackBonus(h, k) : 0;
  if (cb) h.comeback = [...(h.comeback || []).slice(-20), k];
  reward(nd - od + cb, nx - ox, cb ? `+${nd - od + cb} 🍩 Comeback-Bonus! Schön, dass du wieder dabei bist.` : nd - od > 0 ? `+${nd - od} 🍩 ${Faces.line(mainChar(), userMood())}` : null);
  if (h.quest) questCheck();
}
/* ---------- Zähl-Gewohnheiten ---------- */
// z. B. 8 Gläser Wasser: jeder Tipp zählt eins hoch, Ziel erreicht = erledigt, Minimum erreicht = Minimum.
// Sichtbarer Fortschritt bis zum Ziel hilft dranzubleiben (Harkin et al. 2016).
const countOf = (h, k) => (S.counts?.[h.id] || {})[k] || 0;
const countStatus = (h, n) => (n >= h.count.goal ? 'done' : h.count.min && n >= h.count.min ? 'min' : undefined);
function setCount(h, k, n) {
  n = Math.max(0, Math.min(h.count.goal * 3, n));
  const c = (S.counts = S.counts || {})[h.id] = S.counts[h.id] || {};
  if (n) c[k] = n; else delete c[k];
  // „Heute nicht“ bleibt, bis wieder etwas gezählt wird
  const old = status(h, k), want = countStatus(h, n) || (old === 'skip' && !n ? 'skip' : undefined);
  if (want !== old) setStatus(h, k, want || old);
  else { sound('tap'); save(); }
}
const countLabel = (h, k) => `${countOf(h, k)} von ${h.count.goal}${h.count.unit ? ' ' + h.count.unit : ''}`;
function schedLabel(h) {
  const sc = h.schedule;
  if (sc.type === 'days') return sc.days.length === 7 ? 'Täglich' : sc.days.map((d) => DAYS[d]).join(' ');
  if (sc.type === 'interval') return `Alle ${sc.n} Tage`;
  if (sc.type === 'weekly') return `${sc.n}× pro Woche`;
  return 'Täglich';
}

// Verpasste Tage seit dem letzten Öffnen: Squishee-Freeze retten Streaks automatisch.
function processMissedDays() {
  const y = addDays(today(), -1);
  let k = addDays(S.lastCheck, 1);
  if (diffDays(k, y) > 60) k = addDays(y, -60);
  for (; k <= y; k = addDays(k, 1)) {
    for (const h of S.habits) {
      if (h.archived || h.schedule.type === 'weekly' || !isDue(h, k)) continue;
      if (okStatus(status(h, k)) || frozen(h, k)) continue;
      if (S.freezes > 0 && streakBack(h, addDays(k, -1)) > 0) {
        S.freezes--;
        (S.freezeUsed[h.id] = S.freezeUsed[h.id] || []).push(k);
        sound('freeze');
        toast(`🧊 Squishee-Freeze hat „${h.name}“ am ${parseKey(k).toLocaleDateString('de-DE')} gerettet!`);
      }
    }
  }
  S.lastCheck = keyOf(new Date(Math.max(parseKey(S.lastCheck), parseKey(y))));
  save();
}

/* ---------- Figuren ---------- */
const mainChar = () => byId(CHARACTERS, S.main) || CHARACTERS[0];
const unlocked = () => CHARACTERS.filter((c) => S.chars[c.id]);
const cosmeticOf = (id) => byId(COSMETICS, S.chars[id]?.cosmetic);
// Figuren-Umbau (v21): alte Figuren-IDs auf die Formen-Figuren gleicher Seltenheit umschreiben. Freischaltung, Kosmetik und Hauptfigur bleiben.
const OLD_CAST = { homer: 'rundi', marge: 'olli', bart: 'kalle', lisa: 'pi', ned: 'krume', milhouse: 'quadri', moe: 'rauti', barney: 'zwiebi',
  wiggum: 'luna', ralph: 'pille', nelson: 'tropf', krusty: 'stachel', cbg: 'mokka', lenny: 'wolki', carl: 'eiko', skinner: 'sterni', edna: 'hexa',
  willie: 'birne', hibbert: 'funki', frink: 'akku', smithers: 'keimi', abe: 'buh', burns: 'bolzen', bob: 'aufschub', duffman: 'sprinkel',
  kang: 'blip', maggie: 'sonni', moleman: 'knorz', grimes: 'kaese' };
function migrateCast() {
  if (OLD_CAST[S.main]) S.main = OLD_CAST[S.main];
  for (const [o, n] of Object.entries(OLD_CAST)) if (S.chars[o]) { S.chars[n] = S.chars[n] || S.chars[o]; delete S.chars[o]; }
}

/* ---------- Stimmung der Figuren ---------- */
// 1 vernachlässigt, 2 läuft, 3 gut dabei. Gilt für alle Figuren (Aufschub dreht sie in faces.js um).
// Zwischengespeichert bis zum nächsten save() oder Tageswechsel.
function userMood() {
  const t = today();
  if (moodCache?.t === t) return moodCache.m;
  const hs = S.habits.filter((h) => !h.archived && h.schedule.type !== 'weekly');
  // Fällige und erledigte Tage der letzten n Tage; heute zählt nur, was schon erledigt ist
  const tally = (n) => {
    let due = 0, ok = 0;
    for (let i = 0; i < n; i++) {
      const k = addDays(t, -i);
      for (const h of hs) {
        if (!isDue(h, k)) continue;
        const done = okStatus(status(h, k)) || frozen(h, k);
        if (i === 0 && !done) continue;
        due++; if (done) ok++;
      }
    }
    return { due, ok };
  };
  let m = 2;
  if (hs.length) {
    const r3 = tally(3), r7 = tally(7);
    if ((r3.due >= 2 && r3.ok === 0) || (r3.due >= 3 && r3.ok / r3.due < 1 / 3)) m = 1;
    else if (streakNow() >= 7 || (r7.due >= 5 && r7.ok / r7.due >= 0.8)) m = 3;
  }
  moodCache = { t, m };
  return m;
}

/* ---------- Lebendige Gesichter ---------- */
// Tauscht ein Avatar-SVG gegen denselben Kopf mit anderem Ausdruck und gibt das neue Element zurück
function swapFace(el, k) {
  const c = el?.isConnected && byId(CHARACTERS, el.dataset.c);
  if (!c) return null;
  const t = document.createElement('template');
  t.innerHTML = avatarSvg(c, byId(COSMETICS, el.dataset.co), +el.dataset.s, !!el.dataset.h, k);
  const n = t.content.firstElementChild;
  el.replaceWith(n);
  return n;
}
// Sprechen: Mund springt mit 2 Bildern pro Sekunde zwischen den Rede-Motiven der Stimmung
let talking = null;
function talkFace(el, ms = 2600) {
  const c = el && byId(CHARACTERS, el.dataset.c);
  if (!c) return;
  clearTimeout(talkFace.t);
  const seq = Faces.talkSeq(c, userMood()).slice(0, Math.max(1, Math.floor(ms / 500)));
  let i = 0;
  const step = () => {
    talking = el = swapFace(el, i < seq.length ? seq[i] : 'idle');
    if (el && i++ < seq.length) talkFace.t = setTimeout(step, 500); else talking = null;
  };
  step();
}
// Blinzeln im Leerlauf: ab und zu ein sichtbares Gesicht, in Stimmung 1 länger (müde)
setInterval(() => {
  if (document.hidden) return;
  const all = [...document.querySelectorAll('svg.avatar[data-c]')].filter((e) => e !== talking && e.getClientRects().length);
  if (!all.length) return;
  const el = swapFace(pick(all), 'blink');
  setTimeout(() => { if (el && el !== talking) swapFace(el, 'idle'); }, userMood() === 1 ? 450 : 160);
}, 1300);
function unlockChar(id) {
  S.chars[id] = S.chars[id] || { cosmetic: null, home: true };
  save();
}
function rollCharacter(minutes) {
  if (minutes < 10) return null;
  const chance = Math.min(0.1 + minutes * 0.006, 0.6);
  if (Math.random() > chance) return null;
  const locked = CHARACTERS.filter((c) => !S.chars[c.id]);
  if (!locked.length) return null;
  const total = locked.reduce((a, c) => a + RARITY[c.rarity].weight, 0);
  let r = Math.random() * total;
  for (const c of locked) { r -= RARITY[c.rarity].weight; if (r <= 0) return c; }
  return locked[0];
}

/* ---------- Fokus ---------- */
const run = () => S.focusRun;
function elapsedMs(r = run()) {
  if (!r) return 0;
  return (r.pauseStart || Date.now()) - r.start - r.pausedMs;
}
function startFocus(phase = 'focus') {
  const st = S.settings;
  S.focusRun = {
    phase, start: Date.now(), pausedMs: 0, pauseStart: null,
    stopwatch: phase === 'focus' && st.stopwatch,
    hardcore: phase === 'focus' && st.hardcore && !st.stopwatch,
    planned: (phase === 'focus' ? st.focusMin : st.breakMin) * 60000,
    note: '',
  };
  save(); wakeLock(true); sound('start');
  render();
}
function finishFocus(completed) {
  const r = run();
  if (!r) return;
  S.focusRun = null; wakeLock(false);
  if (completed) remindFocusDone(r);
  if (r.phase === 'break') { save(); sound('breakDone'); toast('Pause vorbei – weiter geht’s!'); render(); return; }
  const ms = completed && !r.stopwatch ? r.planned : elapsedMs(r);
  const minutes = Math.floor(ms / 60000);
  const sess = { start: r.start, end: Date.now(), minutes, hardcore: r.hardcore, completed, note: r.note, donuts: 0 };
  let html;
  if (r.hardcore && !completed) {
    sess.minutes = 0; sess.donuts = -10;
    S.sessions.push(sess);
    reward(-10, 0);
    sound('fail');
    html = `<div class="reveal"><div style="font-size:64px">💥</div><h2>D’oh! Hardcore abgebrochen</h2><p class="muted">Keine Belohnung und −10 🍩 Strafe.</p></div>`;
  } else if (minutes < 1) {
    save();
    toast('Zu kurz für Belohnungen.');
    render(); return;
  } else {
    const d = Math.max(1, Math.round((minutes / 2) * (r.hardcore ? 1.5 : 1)));
    sess.donuts = d;
    S.sessions.push(sess);
    const c = rollCharacter(minutes);
    if (c) unlockChar(c.id);
    reward(d, minutes);
    sound(c ? 'unlock' : 'focusDone');
    html = `<div class="reveal"><div style="font-size:56px">🍩</div><h2>${minutes} Minuten fokussiert!</h2>
      <p>+${d} Donuts · +${minutes} XP${r.hardcore ? ' · Hardcore ×1,5' : ''}</p>
      ${c ? `<div class="card" style="background:#fffbe0"><div class="pv">${avatarSvg(c, null, 90)}</div>
        <h3>Neue Figur: ${esc(c.name)}!</h3><div class="rar" style="color:${RARITY[c.rarity].color};font-weight:800">${RARITY[c.rarity].label}</div>
        <p class="small">„${esc(Faces.line(c, userMood()))}“</p></div>` : ''}
      </div>`;
  }
  render();
  openModal(`${html}<div class="row" style="margin-top:12px"><button class="btn secondary grow" data-act="close">Schließen</button>
    <button class="btn green grow" data-act="startBreak">☕ ${S.settings.breakMin} min Pause</button></div>`);
}
let wl = null;
async function wakeLock(on) {
  try {
    if (on && 'wakeLock' in navigator) wl = await navigator.wakeLock.request('screen');
    else if (!on && wl) { await wl.release(); wl = null; }
  } catch { /* nicht unterstützt */ }
}
const fmtMs = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); const h = Math.floor(s / 3600); return (h ? h + ':' + pad(Math.floor(s / 60) % 60) : pad(Math.floor(s / 60))) + ':' + pad(s % 60); };
const minutesToday = (k = today()) => S.sessions.filter((s) => keyOf(new Date(s.start)) === k).reduce((a, s) => a + s.minutes, 0);

/* ---------- Herausforderungen ---------- */
function seeded(seed) { let x = 0; for (const ch of seed) x = (x * 31 + ch.charCodeAt(0)) >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
function ensureChallenges() {
  const t = today();
  if (S.challenges.date === t) return;
  const rnd = seeded(t), pool = [...CHALLENGE_POOL], list = [], types = new Set();
  while (list.length < 3 && pool.length) {
    const c = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    if (types.has(c.type)) continue;
    types.add(c.type); list.push({ ...c, claimed: false });
  }
  S.challenges = { date: t, list }; save();
}
function challengeProgress(c) {
  const t = today();
  const active = S.habits.filter((h) => !h.archived);
  const doneToday = active.filter((h) => okStatus(status(h, t))).length;
  switch (c.type) {
    case 'habits': return doneToday;
    case 'allHabits': { const due = active.filter((h) => isDue(h, t) && h.schedule.type !== 'weekly'); return due.length && due.every((h) => okStatus(status(h, t))) ? 1 : 0; }
    case 'focusMin': return minutesToday();
    case 'sessions': return S.sessions.filter((s) => keyOf(new Date(s.start)) === t && s.completed && s.minutes > 0).length;
    case 'journal': return (S.journal[t] || '').trim() ? 1 : 0;
    case 'todos': return S.todos.filter((x) => x.done && x.doneAt === t).length;
  }
  return 0;
}
const openChallenges = () => { ensureChallenges(); return S.challenges.list.filter((c) => !c.claimed && challengeProgress(c) >= c.target).length; };

/* ---------- Backup ---------- */
// Die Daten liegen nur im Browser-Speicher. Den kann das System leeren (Platzmangel, lange nicht benutzt),
// also: dauerhaften Speicher anfragen und regelmäßig an ein Backup als Datei erinnern (z. B. iCloud Drive).
// Ganz automatisch geht ohne Server nicht – das Teilen-Menü braucht einen Tipp.
let persisted = null;
function initStorage() {
  const st = navigator.storage;
  if (!st?.persisted) return;
  // Nur installiert anfragen: im Browser-Tab fragt z. B. Firefox per Dialog nach
  (standalone && st.persist ? st.persist() : st.persisted()).then((p) => { persisted = p; }).catch(() => {});
}
function downloadFile(file) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file); a.download = file.name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
async function backupNow() {
  // Datum schon in die Datei schreiben, damit ein wiederhergestellter Stand nicht gleich wieder erinnert
  const prev = S.backupAt;
  S.backupAt = today();
  const file = new File([JSON.stringify(S, null, 1)], `springfield-backup-${today()}.json`, { type: 'application/json' });
  try {
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: 'Springfield-Backup' });
    else downloadFile(file);
  } catch (e) {
    if (e.name === 'AbortError') { S.backupAt = prev; return false; }
    downloadFile(file);
  }
  delete S.backupSnooze; save();
  return true;
}
// Fällig: nach der Erinnerungs-Spanne, frühestens 3 Tage nach der ersten Gewohnheit
function backupDue() {
  const every = S.settings.backupEvery, t = today();
  if (!every || !S.started || !S.habits.length || (S.backupSnooze && S.backupSnooze > t)) return false;
  if (S.backupAt) return diffDays(S.backupAt, t) >= every;
  return diffDays(S.habits.reduce((m, h) => (h.created < m ? h.created : m), t), t) >= 3;
}
function backupHtml() {
  if (!backupDue()) return '';
  const n = S.backupAt && diffDays(S.backupAt, today());
  return `<div class="card questcta"><span style="font-size:28px">☁</span><span class="grow"><b>Zeit für ein Backup</b><br><span class="small muted">${S.backupAt ? `Das letzte ist ${n} Tage her.` : 'Du hast noch keins.'} Ein Tipp, dann „In Dateien sichern“ und iCloud Drive wählen.</span>
    <span class="row" style="gap:8px;margin-top:8px"><button class="btn small green" data-act="backup">Jetzt sichern</button><button class="btn small white" data-act="backupLater">Später</button></span></span></div>`;
}

/* ---------- Sprechblase am HUD ---------- */
function sayAt(el, text) {
  const b = $('#bubble'), r = el.getBoundingClientRect();
  b.textContent = text; b.hidden = false;
  b.style.left = `${Math.min(Math.max(r.left + r.width / 2, 110), window.innerWidth - 110)}px`;
  b.style.top = `${r.bottom + 46}px`;
  clearTimeout(sayAt.t); sayAt.t = setTimeout(() => { b.hidden = true; }, 2600);
}

/* ---------- Rendering ---------- */
let tab = 'home', sub = null, shopCat = 'buildings';

const streakNow = () => S.habits.filter((h) => !h.archived).reduce((a, h) => Math.max(a, streak(h)), 0);
function renderHud() {
  const li = levelInfo(), c = mainChar();
  $('#hud').innerHTML = `
    <div class="hudpill">
      <button class="me" data-act="sayMain" aria-label="${esc(c.name)}"><span class="face">${avatarSvg(c, cosmeticOf(c.id), 30, true)}</span>
        <span class="lvl">Lvl ${li.lvl}<span class="xpbar"><i style="width:${li.pct * 100}%"></i></span></span></button>
      <span class="sep"></span><span class="hstat" title="Längste aktuelle Streak">🔥 ${streakNow()}</span>
      <span class="sep"></span><span class="hstat" title="Donuts">${donutSvg(17)} ${S.donuts.toLocaleString('de-DE')}</span>
    </div>
    <button class="rbtn small gear" data-act="tab" data-tab="more" aria-label="Mehr & Einstellungen">${ICON.gear}</button>`;
}
const pageHead = (title, toSub = false, parent = '') => `<div class="pagehead"><button class="rbtn small" ${toSub ? `data-act="sub" data-s="${parent}"` : 'data-act="tab" data-tab="home"'} aria-label="Zurück">${ICON.back}</button><h1>${title}</h1></div>`;

function homeHtml() {
  const t = today(), act = S.habits.filter((h) => !h.archived && dueOn(h, t));
  const done = act.filter((h) => okStatus(status(h, t))).length, c = mainChar(), r = run();
  return `<button class="todaychip" data-act="tab" data-tab="habits">📋 Heute ${done}/${act.length}${openChallenges() ? ' · 🎯' : ''}</button>
    <div class="homebar">
      <button class="rbtn" data-act="build" aria-label="Bauen">${ICON.pencil}</button>
      <div class="mainbtns">
        <button class="btn pink big checkin" data-act="tab" data-tab="habits"><span class="face">${avatarSvg(c, cosmeticOf(c.id), 34, true)}</span>CHECK-IN</button>
        <button class="btn blue focusbtn" data-act="tab" data-tab="focus">${r ? `⏱ <span id="homeclock">${fmtMs(r.stopwatch ? elapsedMs(r) : r.planned - elapsedMs(r))}</span>` : 'FOKUS'}</button>
      </div>
      <button class="rbtn" data-act="tab" data-tab="shop" aria-label="Laden">${ICON.cart}</button>
    </div>`;
}

function render() {
  const page = $('#page'), home = $('#homeui');
  resetViewport();
  setEdge(!S.started ? EDGE.page : tab === 'home' ? EDGE.world : tab === 'focus' ? EDGE.focus : EDGE.page);
  page.classList.toggle('focusmode', tab === 'focus' && S.started);
  Snd.music(tab === 'home' && S.started);
  document.body.classList.toggle('on-home', tab === 'home' && S.started);
  if (!S.started) {
    page.hidden = false; page.innerHTML = onboardingHtml(); home.hidden = true; $('#hud').innerHTML = '';
    World.show(true); return;
  }
  if (tab === 'home') {
    page.hidden = true; page.innerHTML = '';
    home.hidden = World.building; home.innerHTML = World.building ? '' : homeHtml();
    World.show(true);
  } else {
    page.hidden = false;
    if (tab === 'quiz' && !quiz) tab = 'habits';
    page.innerHTML = ({ habits: habitsView, focus: focusView, shop: shopView, more: moreView, quiz: quizView }[tab])();
    home.hidden = true;
    World.show(tab === 'focus');
  }
  renderHud();
}

function onboardingHtml() {
  const starters = CHARACTERS.filter((c) => c.starter);
  return `<h1 class="title" style="margin-top:28px">Willkommen in Springfield!</h1>
    <div class="card"><p>Erledige Gewohnheiten und Fokus-Sessions, verdiene <b>Donuts</b> und bau deine eigene Stadt. Mit etwas Glück ziehen neue Figuren ein.</p>
      <label class="f">Dein Name</label><input class="in" id="ob-name" type="text" placeholder="z. B. Max" maxlength="20">
      <label class="f">Wer bist du?</label>
      <div class="chargrid">${starters.map((c) => `<button class="charcard ${c.id === S.main ? '' : ''}" data-act="obPick" data-id="${c.id}" style="${c.id === S.main ? 'background:var(--yellow)' : ''}">
        <div class="pv">${avatarSvg(c, null, 70)}</div><div class="nm">${c.name}</div></button>`).join('')}</div>
      <button class="btn pink big block" style="margin-top:18px" data-act="obStart">Los geht’s!</button></div>`;
}

function todaySummary() {
  const t = today();
  const act = S.habits.filter((h) => !h.archived && dueOn(h, t));
  const done = act.filter((h) => okStatus(status(h, t))).length;
  return `${done}/${act.length} Gewohnheiten · ${minutesToday()} Fokus-Minuten`;
}

// Check-in: Datum blättern (bis 7 Tage zurück), Filter, einklappbare Gruppen, Wischen zum Abhaken.
let ckBack = 0;
const ckKey = () => addDays(today(), -ckBack);
const streakBonus = (n) => Math.min(5, Math.floor(n / 7));
function hostOf(h) {
  const q = h.quest && S.quests?.find((x) => x.id === h.quest);
  const g = q && goalOf(q);
  return (g && byId(CHARACTERS, g.host)) || mainChar();
}
function weekDots(h, k, big = false) {
  const t = today();
  let html = '';
  for (let i = 6; i >= 0; i--) {
    const d = addDays(k, -i), st = status(h, d);
    let cls = 'none';
    if (d < h.created) cls = 'pre';
    else if (st) cls = st;
    else if (frozen(h, d)) cls = 'ice';
    else if (!isDue(h, d)) cls = 'free';
    else if (d < t) cls = 'miss';
    html += `<i class="${cls}${d === k ? ' cur' : ''}" title="${DAYS[weekday(d)]}"><b>${big ? DAYS[weekday(d)] : DAYS[weekday(d)][0]}</b></i>`;
  }
  return `<div class="dots${big ? ' big' : ''}">${html}</div>`;
}
// Tageszeit-Abschnitte: die Uhrzeit der Erinnerung entscheidet, ohne Uhrzeit „Jederzeit“.
const SLOTS = [['morning', '🌅', 'Morgens'], ['midday', '☀️', 'Mittags'], ['evening', '🌙', 'Abends'], ['any', '📋', 'Jederzeit']];
const slotAt = (min) => (min < 11 * 60 ? 'morning' : min < 17 * 60 ? 'midday' : 'evening');
const slotOf = (h) => (h.remind ? slotAt(toMin(h.remind)) : 'any');
// Reihenfolge: Tageszeit, dann Uhrzeit; ohne Uhrzeit zuerst die täglichen, wöchentliche zuletzt
const slotRank = (h) => SLOTS.findIndex(([id]) => id === slotOf(h)) * 10000 + (h.remind ? toMin(h.remind) : 1440) + (h.schedule.type === 'weekly' ? 2000 : 0);
const finished = (st) => st === 'done' || st === 'min';

// Eine Zeile pro Gewohnheit: Name, eine Hinweiszeile, ein großer Haken. Alles Weitere steckt im Detail-Sheet.
function habitRow(h, k, { next = false, compact = false } = {}) {
  const st = status(h, k), s = streak(h), host = hostOf(h);
  const sub = h.count ? esc(countLabel(h, k)) : h.schedule.type === 'weekly' ? `${weekCount(h, weekStart(k))}/${h.schedule.n} diese Woche` : h.cue ? `📍 ${esc(h.cue)}` : h.remind ? `⏰ ${h.remind}` : '';
  const mark = st === 'done' ? ic('check') : st === 'min' ? '½' : st === 'skip' ? ic('cross') : '';
  const n = h.count && countOf(h, k);
  const btn = h.count
    ? `<button class="ckbtn cnt ${st || ''}" data-act="hc" data-id="${h.id}" style="--p:${Math.min(1, n / h.count.goal)}" aria-label="Eins mehr (${n} von ${h.count.goal})">${st === 'skip' ? ic('cross') : `<span class="cn">${n}<small>/${h.count.goal}</small></span>`}</button>`
    : `<button class="ckbtn ${st || ''}" data-act="hs" data-id="${h.id}" data-st="${st || 'done'}" aria-label="${st ? 'Zurücksetzen' : 'Erledigt'}">${mark}</button>`;
  return `<div class="hswipe ${compact ? 'compact' : ''}" data-id="${h.id}">
    <div class="swipebg"><span class="l">${ic('check')} Erledigt</span><span class="r">Heute nicht ${ic('cross')}</span></div>
    <div class="card habit hc hrow ${st || ''} ${next ? 'next' : ''} ${compact ? 'compact' : ''}">
      <div class="badge" data-act="hSheet" data-id="${h.id}"><span class="emo">${h.emoji}</span><span class="host">${avatarSvg(host, cosmeticOf(host.id), 30, true)}</span></div>
      <div class="grow body" data-act="hSheet" data-id="${h.id}">
        ${next ? '<span class="nextlbl">Als Nächstes</span>' : ''}
        <div class="name">${esc(h.name)}</div>
        ${sub && !compact ? `<div class="sub">${sub}</div>` : ''}
      </div>
      ${s && !compact ? `<span class="hstreak">🔥${s}</span>` : ''}
      ${btn}
    </div></div>`;
}
function foldGroup(key, icon, title, n, body, shutDefault) {
  const shut = S.ui?.fold?.[key] ?? shutDefault;
  return `<div class="hgroup ${shut ? 'shut' : ''}"><button class="ghead" data-act="ckFold" data-g="${esc(key)}" data-def="${shutDefault ? 1 : 0}"><span class="gic">${icon}</span><span class="grow">${esc(title)}</span><span class="gcount">${n}</span><span class="chev">${ic('down', 18)}</span></button>
    ${shut ? '' : body}</div>`;
}
function habitsView() {
  const k = ckKey();
  if (checkTab === 'quests') return `${pageHead('Check-in')}${checkinTabs()}${questsView()}`;
  const active = S.habits.filter((h) => !h.archived && k >= h.created);
  const due = active.filter((h) => dueOn(h, k) || status(h, k));
  // Zähl-Gewohnheit mit erreichtem Minimum bleibt oben, bis das Ziel geschafft ist
  const pending = (h) => !status(h, k) || (h.count && status(h, k) === 'min');
  const open = due.filter(pending).sort((a, b) => slotRank(a) - slotRank(b));
  const handled = due.filter((h) => !pending(h));
  const free = active.filter((h) => !due.includes(h));
  const doneN = due.filter((h) => finished(status(h, k))).length;
  const nextH = open[0], now = ckBack ? null : slotAt(nowMin()), c = mainChar();

  // Kopf: Datum, Fortschritt, Figur sagt, was jetzt dran ist
  const label = ckBack === 0 ? 'Heute' : ckBack === 1 ? 'Gestern' : `Vor ${ckBack} Tagen`;
  const say = !due.length ? 'Heute ist nichts fällig. Genieß den Tag!'
    : !open.length ? (doneN === due.length ? `Alles erledigt! ${Faces.line(c, userMood())}` : 'Alles abgehakt. Morgen wieder!')
    : ckBack ? 'Trag nach, was du an dem Tag geschafft hast.'
    : doneN === 0 ? 'Tipp auf den Kreis, sobald du etwas erledigt hast.'
    : `Noch ${open.length} – du schaffst das!`;
  const head = `<div class="card ckhead ${ckBack ? 'past' : ''}">
    <div class="ckdate"><button class="rbtn small" data-act="ckDay" data-d="1" ${ckBack >= 7 ? 'disabled' : ''} aria-label="Vorheriger Tag">${ICON.back}</button>
      <span><b>${label}</b> · ${parseKey(k).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
      ${ckBack ? `<button class="rbtn small fwd" data-act="ckDay" data-d="-1" aria-label="Nächster Tag">${ICON.back}</button>` : '<span class="sp"></span>'}</div>
    <div class="row"><span class="face">${avatarSvg(c, cosmeticOf(c.id), 56, true)}</span>
      <div class="grow"><div class="big">${due.length ? `${doneN} von ${due.length} erledigt` : 'Freier Tag'}</div>
        ${due.length ? `<div class="pbar big"><i style="width:${(doneN / due.length) * 100}%"></i></div>` : ''}
        <div class="say">${esc(say)}</div></div></div></div>`;

  // Offene Gewohnheiten nach Tageszeit
  const used = SLOTS.filter(([id]) => open.some((h) => slotOf(h) === id));
  const sections = used.map(([id, e, name]) => {
    const hs = open.filter((h) => slotOf(h) === id);
    // Nur „Jederzeit“ übrig: kein Abschnittstitel nötig
    const title = used.length > 1 || id !== 'any' ? `<div class="slothead">${e} ${name}${id === now ? '<span class="nowpill">jetzt</span>' : ''}</div>` : '';
    return title + hs.map((h) => habitRow(h, k, { next: h === nextH })).join('');
  }).join('');

  // Nur die nächste Quest-Aufgabe, der Rest liegt im Quests-Tab
  const tasks = [];
  if (!ckBack) for (const q of activeQuests()) for (const s of goalOf(q).subs) { const r = q.subs[s.key]; if (r && r.state === 'active' && s.type !== 'habit') tasks.push([q, s]); }
  // Neues Kapitel: erst Aufgaben wählen – das ist dann der nächste Schritt
  const pickQ = !ckBack && activeQuests().find((q) => needPick(q));
  const pickHtml = pickQ ? `<button class="card questcta pickcta" data-act="pickOpen" data-q="${pickQ.id}"><span style="font-size:28px">🧩</span><span class="grow"><b>Kapitel ${pickQ.stage + 1}: Aufgaben wählen</b><br><span class="small muted">${goalOf(pickQ).emoji} ${esc(goalOf(pickQ).name)} · such dir ${needPick(pickQ)} aus</span></span></button>` : '';
  const taskHtml = tasks.length ? `<div class="slothead">🎯 Quest-Aufgabe</div>${subRow(...tasks[0])}${tasks.length > 1 ? `<button class="linkbtn" data-act="ckTab" data-t="quests">+${tasks.length - 1} weitere unter „Quests“</button>` : ''}` : '';

  const paused = S.habits.filter((h) => h.paused && !h.qpause), pausedQ = (S.quests || []).filter((q) => q.status === 'paused');
  const pausedRows = [
    ...pausedQ.map((q) => `<div class="card row paused"><span style="font-size:24px">${goalOf(q).emoji}</span><span class="grow"><b>${esc(goalOf(q).name)}</b><br><span class="small muted">Quest · ${q.until ? 'bis ' + parseKey(q.until).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' }) : 'ohne Enddatum'}</span></span><button class="btn small" data-act="qResume" data-q="${q.id}">${ic('play', 14)} Fortsetzen</button></div>`),
    ...paused.map((h) => `<div class="card row paused"><span style="font-size:24px">${h.emoji}</span><b class="grow">${esc(h.name)}</b><button class="btn small" data-act="hResume" data-id="${h.id}">${ic('play', 14)} Fortsetzen</button></div>`)];
  // Geplantes Pausen-Ende erreicht: Neustart anbieten statt still weiterzupausieren
  const backQ = !ckBack && pausedQ.find((q) => q.until && q.until <= today());
  const backHtml = backQ ? `<div class="card questcta pickcta"><span style="font-size:28px">▶</span><span class="grow"><b>Pause vorbei: ${esc(goalOf(backQ).name)}</b><br><span class="small muted">Heute ist dein Neustart. Fortschritt und Streaks warten auf dich.</span>
    <span class="row" style="gap:8px;margin-top:8px"><button class="btn small green" data-act="qResume" data-q="${backQ.id}">Weitermachen</button><button class="btn small white" data-act="qSnooze" data-q="${backQ.id}">Noch 1 Woche</button></span></span></div>` : '';
  const empty = !active.length ? `<div class="card empty"><div class="pv">${avatarSvg(byId(CHARACTERS, 'pi'), null, 80)}</div><p><b>Noch keine Gewohnheiten.</b><br>Lass dir von Professor Pi Quests bauen oder leg selbst los.</p>
    ${S.quests?.length ? '' : '<button class="btn pink block" data-act="qzStart">Quests einrichten</button>'}</div>` : '';
  const topHtml = !ckBack && !pickQ ? topupCta() : '';
  return `${pageHead('Check-in')}${checkinTabs()}${head}${backHtml}${pickHtml}${topHtml}${empty}${sections}${taskHtml}${ckBack ? '' : backupHtml()}
    ${handled.length ? foldGroup('Abgehakt', '✓', 'Abgehakt', handled.length, handled.map((h) => habitRow(h, k, { compact: true })).join(''), false) : ''}
    ${free.length ? foldGroup('Heute frei', '🛋', ckBack ? 'An diesem Tag frei' : 'Heute frei', free.length, free.map((h) => habitRow(h, k, { compact: true })).join(''), true) : ''}
    ${pausedRows.length && !ckBack ? foldGroup('Pausiert', '⏸', 'Pausiert', pausedRows.length, pausedRows.join(''), true) : ''}
    ${active.length && !S.quests?.length ? `<button class="card questcta" data-act="qzStart"><span style="font-size:30px">🗺️</span><span class="grow"><b>Quests einrichten</b><br><span class="small muted">Professor Pi baut dir Ziele mit Methoden aus Studien.</span></span></button>` : ''}
    <button class="btn white block" data-act="newHabit">＋ Eigene Gewohnheit</button>
    <p class="small muted center">Wischen geht auch: rechts = erledigt, links = heute nicht.</p>`;
}
// Detail-Sheet: alle selteneren Aktionen und Infos zu einer Gewohnheit
function habitSheet(h) {
  const k = ckKey(), st = status(h, k), s = streak(h);
  const bonus = h.schedule.type === 'weekly' ? 0 : streakBonus(s + (finished(st) ? 0 : 1));
  const [d] = rewardOf('done', h), [dm] = rewardOf('min', h);
  const q = questOfHabit(h), sq = q && subOf(q, h.sub), host = hostOf(h);
  const opt = (val, label, hint) => `<button class="bigopt ${val} ${st === val ? 'on' : ''}" data-act="hsSheet" data-id="${h.id}" data-st="${val}"><span class="l">${label}</span><span class="h">${st === val ? 'Zurücksetzen' : hint}</span></button>`;
  openModal(`<div class="row hsh"><div class="badge"><span class="emo">${h.emoji}</span><span class="host">${avatarSvg(host, cosmeticOf(host.id), 30, true)}</span></div>
      <div class="grow"><h2 style="margin:0">${esc(h.name)}</h2><div class="small muted">${schedLabel(h)}${h.remind ? ` · ⏰ ${h.remind}` : ''}${h.diff ? ` · ${DIFF[h.diff].label}` : ''}</div></div></div>
    ${h.cue ? `<div class="woop"><b>Wenn-dann:</b> ${esc(h.cue)} → ${esc(h.name)}.</div>` : ''}
    ${h.count ? `<div class="counter"><button class="btn white round" data-act="hcSet" data-id="${h.id}" data-n="${countOf(h, k) - 1}" aria-label="Eins weniger" ${countOf(h, k) ? '' : 'disabled'}>−</button>
      <div class="cbig"><b>${countOf(h, k)}</b> / ${h.count.goal}<div class="small muted">${esc(h.count.unit || 'heute')}</div></div>
      <button class="btn green round" data-act="hcSet" data-id="${h.id}" data-n="${countOf(h, k) + 1}" aria-label="Eins mehr">+</button></div>
      <div class="small muted center">Ziel erreicht: +${d + bonus} 🍩${h.count.min ? ` · ab ${h.count.min}: Minimum, +${dm + bonus} 🍩` : ''}</div>` : ''}
    <div class="bigopts">
      ${h.count ? '' : opt('done', `${ic('check')} Erledigt`, `+${d + bonus} 🍩`)}
      ${h.minimum && !h.count ? opt('min', `½ Minimum: ${esc(h.minimum)}`, `+${dm + bonus} 🍩`) : ''}
      ${opt('skip', `${ic('cross')} Heute nicht`, 'kein Abzug')}
    </div>
    <div class="row small hstats"><span>🔥 Streak <b>${s}</b></span><span>🏆 Beste <b>${bestStreak(h)}</b></span>${h.schedule.type === 'weekly' ? '' : `<span>Bonus <b>+${streakBonus(s)}</b> 🍩</span>`}</div>
    ${weekDots(h, k, true)}
    <div class="row" style="margin-top:16px">${sq ? `<button class="btn white grow" data-act="subOpen" data-q="${q.id}" data-k="${sq.key}">🏆 Quest</button>` : ''}
      <button class="btn white grow" data-act="editHabit" data-id="${h.id}">✍ Bearbeiten</button><button class="btn secondary grow" data-act="close">Schließen</button></div>`);
}

// Wischen: rechts = erledigt, links = nicht gemacht
let swipe = null, swipeBlock = false;
document.addEventListener('pointerdown', (e) => {
  const card = e.target.closest('.hswipe .hc');
  if (!card || e.target.closest('.checks, .ckbtn')) return;
  swipe = { card, id: card.parentNode.dataset.id, x: e.clientX, y: e.clientY, dx: 0, on: false };
});
document.addEventListener('pointermove', (e) => {
  if (!swipe) return;
  const dx = e.clientX - swipe.x, dy = e.clientY - swipe.y;
  if (!swipe.on) {
    if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) { swipe = null; return; }
    if (Math.abs(dx) < 12) return;
    swipe.on = true; swipe.card.classList.add('dragging');
  }
  swipe.dx = Math.max(-140, Math.min(140, dx));
  swipe.card.style.transform = `translateX(${swipe.dx}px) rotate(${swipe.dx / 60}deg)`;
  swipe.card.parentNode.classList.toggle('goR', swipe.dx > 0);
  swipe.card.parentNode.classList.toggle('goL', swipe.dx < 0);
});
function swipeEnd() {
  if (!swipe) return;
  const { card, id, dx, on } = swipe;
  swipe = null;
  if (!on) return;
  swipeBlock = true; setTimeout(() => { swipeBlock = false; }, 50);
  card.classList.remove('dragging');
  if (Math.abs(dx) > 90) {
    const h = byId(S.habits, id), st = dx > 0 ? 'done' : 'skip';
    card.style.transform = `translateX(${dx > 0 ? 120 : -120}%)`;
    setTimeout(() => {
      if (h.count && st === 'done') setCount(h, ckKey(), Math.max(countOf(h, ckKey()), h.count.goal));
      else if (status(h, ckKey()) !== st) setStatus(h, ckKey(), st);
      render();
    }, 160);
  } else card.style.transform = '';
}
document.addEventListener('pointerup', swipeEnd);
document.addEventListener('pointercancel', swipeEnd);
document.addEventListener('click', (e) => { if (swipeBlock) { e.stopPropagation(); e.preventDefault(); } }, true);

const EMOJIS = ['💧', '🏃', '📚', '🧘', '💪', '🥗', '🦷', '😴', '🧹', '✍️', '🎸', '💊', '🚭', '📵', '🌅', '🧠', '💻', '🐕', '🚶', '🍎', '🙏', '💰', '🛏️', '🍩'];
let draft = null;
function habitForm(h) {
  draft = h ? JSON.parse(JSON.stringify(h)) : { id: null, name: '', emoji: '💧', group: '', minimum: '', schedule: { type: 'days', days: [0, 1, 2, 3, 4, 5, 6], n: 2 } };
  drawHabitForm();
}
function drawHabitForm() {
  const d = draft, sc = d.schedule;
  const groups = [...new Set(S.habits.map((h) => h.group).filter(Boolean))];
  openModal(`<h2 style="margin-top:0">${d.id ? 'Gewohnheit bearbeiten' : 'Neue Gewohnheit'}</h2>
    <label class="f">Name</label><input class="in" id="hf-name" type="text" value="${esc(d.name)}" placeholder="z. B. 2 Liter Wasser trinken" maxlength="40">
    <label class="f">Symbol</label><div class="emopick">${EMOJIS.map((e) => `<button class="${d.emoji === e ? 'on' : ''}" data-act="hfEmoji" data-e="${e}">${e}</button>`).join('')}</div>
    <label class="f">Art</label>
    <div class="seg fill">${[['check', 'Abhaken'], ['count', 'Zählen']].map(([t, l]) => `<button class="${(d.count ? 'count' : 'check') === t ? 'on' : ''}" data-act="hfKind" data-k="${t}">${l}</button>`).join('')}</div>
    ${d.count ? `<div class="row" style="margin-top:8px"><span>Ziel</span><input class="in" id="hf-cgoal" type="number" min="2" max="50" value="${d.count.goal}" style="width:80px">
      <input class="in grow" id="hf-cunit" type="text" value="${esc(d.count.unit || '')}" placeholder="z. B. Gläser" maxlength="16"><span>pro Tag</span></div>
      <p class="small muted" style="margin:6px 2px 0">Jeder Tipp auf den Kreis zählt eins hoch. Ziel erreicht = erledigt.</p>` : ''}
    <label class="f">Wie oft?</label>
    <div class="seg fill">${[['days', 'Wochentage'], ['interval', 'Alle N Tage'], ['weekly', 'N× / Woche']].map(([t, l]) => `<button class="${sc.type === t ? 'on' : ''}" data-act="hfType" data-t="${t}">${l}</button>`).join('')}</div>
    ${sc.type === 'days' ? `<div class="daypick">${DAYS.map((n, i) => `<button class="${sc.days.includes(i) ? 'on' : ''}" data-act="hfDay" data-i="${i}">${n}</button>`).join('')}</div>`
      : `<div class="row"><span>${sc.type === 'interval' ? 'Alle' : ''}</span><input class="in" id="hf-n" type="number" min="1" max="${sc.type === 'weekly' ? 7 : 30}" value="${sc.n}" style="width:90px"><span>${sc.type === 'interval' ? 'Tage' : 'mal pro Woche'}</span></div>`}
    <label class="f">Wenn-dann: wann genau? (optional)</label><input class="in" id="hf-cue" type="text" value="${esc(d.cue || '')}" placeholder="z. B. Nach dem Zähneputzen am Morgen" maxlength="60">
    ${d.count ? `<label class="f">Minimum für schlechte Tage (optional)</label><div class="row"><span>ab</span><input class="in" id="hf-cmin" type="number" min="0" max="49" value="${d.count.min || ''}" placeholder="–" style="width:80px"><span class="small muted grow">zählt als Minimum</span></div>`
      : `<label class="f">Minimum für schlechte Tage (optional)</label><input class="in" id="hf-min" type="text" value="${esc(d.minimum)}" placeholder="z. B. 1 Glas Wasser" maxlength="40">`}
    <label class="f">Erinnerung (optional)</label><div class="row"><input class="in" id="hf-remind" type="time" value="${esc(d.remind || '')}" style="width:140px">
      <span class="small muted grow">${remindSettings().on ? 'Leer lassen = keine Erinnerung' : 'Erinnerungen sind aus – einschalten unter Mehr → Erinnerungen.'}</span></div>
    <label class="f">Gruppe / Routine (optional)</label><input class="in" id="hf-group" type="text" list="hf-groups" value="${esc(d.group)}" placeholder="z. B. Morgenroutine" maxlength="24">
    <datalist id="hf-groups">${groups.map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
    ${d.id ? `<div class="row" style="margin-top:16px"><button class="btn white small" data-act="hfPause">${ic('pause', 16)} Pausieren</button><span class="grow"></span><button class="btn red small" data-act="hfDelete">Löschen</button></div>` : ''}
    <div class="row sheetbar"><button class="btn secondary grow" data-act="close">Abbrechen</button><button class="btn grow" data-act="hfSave">Speichern</button></div>`);
}
function readHabitForm() {
  draft.name = $('#hf-name').value.trim();
  if (draft.count) {
    const goal = Math.max(2, Math.min(50, +$('#hf-cgoal').value || draft.count.goal)), min = Math.max(0, Math.min(goal - 1, +$('#hf-cmin').value || 0));
    draft.count = { goal, min, unit: $('#hf-cunit').value.trim() };
    draft.minimum = min ? `${min} ${draft.count.unit}`.trim() : '';
  } else draft.minimum = $('#hf-min').value.trim();
  draft.group = $('#hf-group').value.trim();
  draft.remind = $('#hf-remind').value;
  draft.cue = $('#hf-cue').value.trim();
  const n = $('#hf-n');
  if (n) draft.schedule.n = Math.max(1, Math.min(+n.value || 1, draft.schedule.type === 'weekly' ? 7 : 30));
}

// Fokus-Szene: Figur sitzt auf der Couch, darüber eine Gedankenblase.
const COUCH = '#9a76a6';
function couchScene(c, think) {
  // Kopf sitzt vor der Rückenlehne auf dem Polster
  const fig = avatarSvg(c, cosmeticOf(c.id), 140).replace('class="avatar"', 'x="80" y="86"');
  return `<div class="fscene"><svg viewBox="0 0 300 252" width="300" height="252" aria-hidden="true" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round">
      <ellipse cx="150" cy="244" rx="132" ry="9" fill="rgba(0,0,0,.28)" stroke="none"/>
      <rect x="34" y="132" width="232" height="80" rx="22" fill="${COUCH}"/>
      ${fig}
      <rect x="58" y="194" width="184" height="34" rx="10" fill="#b493c0"/><path d="M150 196 V226" stroke-width="2.5"/>
      <rect x="18" y="164" width="48" height="66" rx="18" fill="${COUCH}"/><rect x="234" y="164" width="48" height="66" rx="18" fill="${COUCH}"/>
      <rect x="40" y="224" width="220" height="12" rx="5" fill="#7c5a88"/><path d="M50 236 V244 M250 236 V244" stroke-width="6" stroke-linecap="round"/>
    </svg><div class="thought">${ic(think)}</div></div>`;
}
const FOCUS_LINES = ['{n} ist voll konzentriert.', '{n} lässt sich nicht ablenken.', '{n} denkt angestrengt nach.', 'Pssst! {n} arbeitet.', '{n} ist im Tunnel.', 'Weiter so, {n}!'];
const BREAK_LINES = ['{n} macht Pause.', '{n} streckt die Beine.', 'Kurz durchatmen, {n}.'];
function focusLine(r, el, c) {
  const n = c.name, line = (arr) => arr[Math.floor(el / 20000) % arr.length].replace('{n}', n);
  if (!r) return `${n} wartet auf den Startschuss.`;
  if (r.pauseStart) return `${n} wartet auf dich.`;
  if (r.phase === 'break') return line(BREAK_LINES);
  if (!r.stopwatch && r.planned - el < 60000) return `${n} sieht schon die Ziellinie!`;
  if (r.hardcore && el < 20000) return `${n} ist im Hardcore-Modus. Kein Zurück!`;
  return line(FOCUS_LINES);
}
const focusThink = (r) => !r ? 'target' : r.pauseStart ? 'pause' : r.phase === 'break' ? 'donut' : r.hardcore ? 'fire' : 'brain';
const stopSign = (label) => `<button class="stopsign" type="button" aria-label="${label} – gedrückt halten">
    <svg viewBox="0 0 120 120" width="132" height="132" aria-hidden="true">
      <circle class="holdring" cx="60" cy="60" r="56" fill="none" stroke="${Y}" stroke-width="7" stroke-dasharray="352" stroke-dashoffset="352" transform="rotate(-90 60 60)"/>
      <polygon points="102.5,77.6 77.6,102.5 42.4,102.5 17.5,77.6 17.5,42.4 42.4,17.5 77.6,17.5 102.5,42.4" fill="#e8332a" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
      <polygon points="96,74.9 74.9,96 45.1,96 24,74.9 24,45.1 45.1,24 74.9,24 96,45.1" fill="none" stroke="#fff" stroke-width="3.5" stroke-linejoin="round"/>
      <text x="60" y="70" text-anchor="middle" font-family="Luckiest Guy, Nunito, sans-serif" font-size="27" fill="#fff" stroke="${INK}" stroke-width="2" paint-order="stroke">STOP</text>
    </svg></button>`;

function focusView() {
  const r = run(), st = S.settings, c = mainChar();
  if (r) {
    const el = elapsedMs(r), brk = r.phase === 'break';
    const pct = r.stopwatch ? (el % 3600000) / 3600000 : Math.min(1, el / r.planned);
    const mode = brk ? 'Pause' : r.hardcore ? 'Hardcore' : r.stopwatch ? 'Stoppuhr' : `Fokus · ${Math.round(r.planned / 60000)} min`;
    return `<div class="focus ${brk ? 'brk' : ''}">
      <div class="fhead"><button class="rbtn small" data-act="tab" data-tab="home" aria-label="Zur Stadt (Timer läuft weiter)">${ICON.back}</button><span class="chip">${mode}</span></div>
      ${couchScene(c, focusThink(r))}
      <p class="fline" id="fline">${esc(focusLine(r, el, c))}</p>
      <div class="ftimer" id="clock">${fmtMs(r.stopwatch ? el : r.planned - el)}</div>
      <div class="fbar"><i id="fbar" style="width:${(pct * 100).toFixed(1)}%"></i></div>
      <div class="fsub">${r.pauseStart ? 'pausiert' : r.stopwatch ? 'Stoppuhr läuft' : 'verbleibend'}</div>
      ${brk ? '' : `<input class="in fnote" id="fnote" type="text" value="${esc(r.note)}" placeholder="Woran arbeitest du?" maxlength="80">`}
      <div class="fctl">
        ${r.hardcore ? '<span class="fspace"></span>' : `<button class="rbtn" data-act="pause" aria-label="${r.pauseStart ? 'Weiter' : 'Pause'}">${ic(r.pauseStart ? 'play' : 'pause', 30)}</button>`}
        ${stopSign(brk ? 'Pause beenden' : 'Fokus beenden')}
        <span class="fspace"></span>
      </div>
      <p class="fhint">${brk ? 'STOP gedrückt halten beendet die Pause.' : r.hardcore ? 'Hardcore: Aufgeben kostet 10 🍩, durchhalten bringt ×1,5.' : r.stopwatch ? 'STOP gedrückt halten beendet und sammelt die Belohnung.' : 'STOP gedrückt halten bricht ab. Belohnung gibt es für die geschafften Minuten.'}</p>
    </div>`;
  }
  const sessToday = S.sessions.filter((s) => keyOf(new Date(s.start)) === today() && s.minutes > 0);
  const minToday = sessToday.reduce((a, s) => a + s.minutes, 0);
  return `<div class="focus">
    <div class="fhead"><button class="rbtn small" data-act="tab" data-tab="home" aria-label="Zurück">${ICON.back}</button><h1>Fokus</h1></div>
    ${couchScene(c, focusThink(null))}
    <p class="fline">${esc(focusLine(null, 0, c))}</p>
    <div class="ftimer">${st.stopwatch ? '00:00' : pad(st.focusMin) + ':00'}</div>
    ${st.stopwatch ? '<p class="fsub">Läuft, bis du beendest.</p>' : `<div class="chips fchips">${[15, 25, 45, 60, 90].map((m) => `<button class="${st.focusMin === m ? 'on' : ''}" data-act="fmin" data-m="${m}">${m}</button>`).join('')}
      <button data-act="fminCustom" aria-label="Eigene Dauer">…</button></div>`}
    <button class="btn green big block fgo" data-act="startFocus">${ic('play')} LOS!</button>
    <div class="card fopts">
      <div class="toggle"><span><b>Stoppuhr</b><br><span class="small muted">Ohne festes Ende</span></span><label class="switch"><input type="checkbox" data-act="set" data-k="stopwatch" ${st.stopwatch ? 'checked' : ''}><span></span></label></div>
      <div class="toggle"><span><b>Hardcore-Modus</b><br><span class="small muted">×1,5 Donuts, keine Pause, Abbruch −10</span></span><label class="switch"><input type="checkbox" data-act="set" data-k="hardcore" ${st.hardcore ? 'checked' : ''} ${st.stopwatch ? 'disabled' : ''}><span></span></label></div>
      <div class="toggle"><span><b>Pause danach</b></span><span class="chips">${[5, 10, 15].map((m) => `<button class="${st.breakMin === m ? 'on' : ''}" data-act="bmin" data-m="${m}">${m}</button>`).join('')}</span></div>
      <p class="small muted" style="margin:6px 0 0">1 XP pro Minute · 1 🍩 pro 2 Minuten · ab 10 Minuten Chance auf eine neue Figur</p>
    </div>
    <div class="card fsess"><b>Heute: ${sessToday.length} ${sessToday.length === 1 ? 'Session' : 'Sessions'} · ${minToday} min</b>
      ${sessToday.slice().reverse().map((s) => `<div class="row small" style="padding:4px 0"><span>${new Date(s.start).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
      <b>${s.minutes} min</b><span class="grow muted">${esc(s.note || '')}</span>${s.hardcore ? '💀' : ''}<span>+${s.donuts}🍩</span></div>`).join('')}</div>
  </div>`;
}
let clockTimer = null;
function tickClock() {
  const r = run();
  if (!r) return;
  const el = elapsedMs(r);
  if (!r.stopwatch && el >= r.planned) { finishFocus(true); return; }
  const hc = $('#homeclock');
  if (hc) hc.textContent = fmtMs(r.stopwatch ? el : r.planned - el);
  const c = $('#clock');
  if (c) {
    c.textContent = fmtMs(r.stopwatch ? el : r.planned - el);
    const pct = r.stopwatch ? (el % 3600000) / 3600000 : el / r.planned;
    const bar = $('#fbar');
    if (bar) bar.style.width = (Math.min(1, pct) * 100).toFixed(1) + '%';
    const fl = $('#fline'), txt = focusLine(r, el, mainChar());
    if (fl && fl.textContent !== txt) fl.textContent = txt;
  }
  document.title = `${fmtMs(r.stopwatch ? el : r.planned - el)} · Springfield`;
}

// STOP-Schild: gedrückt halten statt antippen, damit man nicht aus Versehen abbricht.
let holdTimer = null;
document.addEventListener('pointerdown', (e) => {
  const b = e.target.closest('.stopsign');
  if (!b || !run()) return;
  e.preventDefault();
  b.classList.add('holding');
  holdTimer = setTimeout(() => { holdTimer = null; b.classList.remove('holding'); actions.stopFocus(); }, 900);
});
function holdEnd() {
  if (!holdTimer) return;
  clearTimeout(holdTimer); holdTimer = null;
  document.querySelectorAll('.stopsign.holding').forEach((b) => b.classList.remove('holding'));
  toast('STOP gedrückt halten, um zu beenden.');
}
document.addEventListener('pointerup', holdEnd);
document.addEventListener('pointercancel', holdEnd);
document.addEventListener('keydown', (e) => { if ((e.key === 'Enter' || e.key === ' ') && e.target.closest?.('.stopsign') && run()) { e.preventDefault(); actions.stopFocus(); } });

function shopView() {
  const li = levelInfo();
  const cats = [['buildings', '🏠 Gebäude'], ['decor', '🌳 Deko'], ['cosmetics', '🎩 Kosmetik'], ['land', '🗺️ Grundstück'], ['extras', '🧊 Extras']];
  const priceBtn = (act, id, price, lvl, disabled) => {
    if (li.lvl < lvl) return `<span class="small muted">🔒 Level ${lvl}</span>`;
    if (disabled) return `<span class="small muted">${disabled}</span>`;
    return `<button class="btn small" data-act="${act}" data-id="${id}" ${S.donuts < price ? 'disabled' : ''}>${D(price, 14)}</button>`;
  };
  let body = '';
  if (shopCat === 'buildings' || shopCat === 'decor') {
    const list = ITEMS.filter((i) => (shopCat === 'buildings') === (i.kind === 'building'));
    body = `<div class="grid">${list.map((it) => {
      const n = ownedCount(it.id);
      return `<div class="item ${li.lvl < it.lvl ? 'locked' : ''}"><div class="pv">${isoPreview(it.id, 92)}</div><div class="nm">${esc(it.name)}</div>
        <div class="small muted">${it.s}×${it.s} Feld${it.s > 1 ? 'er' : ''}${n ? ` · besitzt ${n}` : ''}</div>
        ${priceBtn('buy', it.id, it.price, it.lvl, it.kind === 'building' && n ? '✓ Gekauft' : '')}</div>`;
    }).join('')}</div>`;
  } else if (shopCat === 'cosmetics') {
    body = `<p class="small muted">Einmal kaufen, dann unter <b>Mehr → Figuren</b> jeder Figur anziehen.</p><div class="grid">${COSMETICS.map((c) => `<div class="item ${li.lvl < c.lvl ? 'locked' : ''}">
      <div class="pv" style="font-size:52px">${c.e}</div><div class="nm">${esc(c.name)}</div>
      ${priceBtn('buyCos', c.id, c.price, c.lvl, S.cosmeticsOwned.includes(c.id) ? '✓ Gekauft' : '')}</div>`).join('')}</div>`;
  } else if (shopCat === 'land') {
    body = `<div class="card"><p>Aktuelles Grundstück: <b>${S.map.plot}×${S.map.plot}</b> Felder.</p>${LAND.filter((l) => l.size > S.map.plot).slice(0, 1).map((l) =>
      `<div class="row"><span class="grow">Erweitern auf <b>${l.size}×${l.size}</b></span><button class="btn small" data-act="buyLand" data-id="${l.size}" ${S.donuts < l.price ? 'disabled' : ''}>${D(l.price, 14)}</button></div>`).join('') || '<p class="muted">Maximale Größe erreicht. Springfield ist komplett!</p>'}</div>
      <p class="small muted">Gelände (Straße, Wasser, Sand …) malst du in der Stadt im 🔨 Bau-Modus an.</p>`;
  } else {
    body = `<div class="item" style="flex-direction:row;text-align:left;gap:12px"><div style="font-size:44px">🧊</div>
      <div class="grow"><div class="nm">Squishee-Freeze</div><div class="small muted">Rettet automatisch eine Streak, wenn du einen fälligen Tag verpasst. Du hast ${S.freezes}.</div></div>
      <button class="btn small" data-act="buyFreeze" ${S.donuts < FREEZE_PRICE || S.freezes >= 5 ? 'disabled' : ''}>${D(FREEZE_PRICE, 14)}</button></div>
      <p class="small muted">Maximal 5 Freezes gleichzeitig.</p>`;
  }
  return `${pageHead('Laden')}<div class="seg">${cats.map(([c, l]) => `<button class="${shopCat === c ? 'on' : ''}" data-act="shopCat" data-c="${c}">${l}</button>`).join('')}</div>${body}`;
}

function moreView() {
  if (sub) return ({ stats: statsView, journal: journalView, todos: todosView, challenges: challengesView, chars: charsView, settings: settingsView, remind: remindView, sounds: soundsView }[sub])();
  const n = openChallenges();
  const items = [['challenges', '🎯', 'Tägliche Herausforderungen', n ? `<span class="badge">${n}</span>` : ''], ['chars', '👨‍👩‍👧‍👦', 'Figuren & Kosmetik', `<span class="small muted" style="margin-left:auto">${unlocked().length}/${CHARACTERS.length}</span>`],
    ['stats', '📊', 'Statistiken', ''], ['journal', '📓', 'Tagebuch', ''], ['todos', '📝', 'To-do-Liste', ''], ['remind', '🔔', 'Erinnerungen', `<span class="small muted" style="margin-left:auto">${remindSettings().on ? 'An' : 'Aus'}</span>`], ['settings', '⚙️', 'Einstellungen & Backup', '']];
  return `${pageHead('Mehr')}<div class="card menu">${items.map(([id, ic, l, x]) => `<button data-act="sub" data-s="${id}"><span class="ic">${ic}</span>${l}${x}</button>`).join('')}</div>`;
}
const back = (title, parent) => pageHead(title, true, parent);

function challengesView() {
  ensureChallenges();
  return `${back('Herausforderungen')}<p class="small muted">Jeden Tag drei neue. Belohnung abholen, wenn erledigt.</p>
    ${S.challenges.list.map((c, i) => {
      const p = Math.min(challengeProgress(c), c.target), ok = p >= c.target;
      return `<div class="card"><div class="row"><div class="grow"><b>${c.text}</b><div class="xpbar" style="width:100%;height:8px;margin-top:6px"><i style="width:${(p / c.target) * 100}%"></i></div>
        <div class="small muted" style="margin-top:4px">${p}/${c.target}</div></div>
        ${c.claimed ? '<span class="small">✓ Abgeholt</span>' : `<button class="btn small ${ok ? 'green' : ''}" data-act="claim" data-i="${i}" ${ok ? '' : 'disabled'}>${D(c.reward, 14)}</button>`}</div></div>`;
    }).join('')}`;
}

function charsView() {
  return `${back('Figuren')}<p class="small muted">Neue Figuren gibt’s mit Glück nach Fokus-Sessions ab 10 Minuten. Längere Sessions = höhere Chance.</p>
    <div class="chargrid">${CHARACTERS.map((c) => {
      const u = !!S.chars[c.id];
      return `<button class="charcard ${u ? '' : 'locked'}" data-act="${u ? 'charSheet' : 'noop'}" data-id="${c.id}">
        <div class="pv">${avatarSvg(c, u ? cosmeticOf(c.id) : null, 64)}</div>
        <div class="nm">${u ? esc(c.name) : '???'}</div><div class="rar" style="color:${RARITY[c.rarity].color};font-size:11px;font-weight:800">${RARITY[c.rarity].label}</div></button>`;
    }).join('')}</div>`;
}
function charSheet(id) {
  const c = byId(CHARACTERS, id), st = S.chars[id];
  openModal(`<div class="row"><div>${avatarSvg(c, cosmeticOf(id), 90)}</div><div class="grow"><h2 style="margin:0">${esc(c.name)}</h2>
      <div style="color:${RARITY[c.rarity].color};font-weight:800">${RARITY[c.rarity].label}</div><p class="small">„${esc(Faces.line(c, userMood()))}“</p></div></div>
    <div class="toggle"><b>Wohnt in der Stadt</b><label class="switch"><input type="checkbox" data-act="charHome" data-id="${id}" ${st.home !== false ? 'checked' : ''}><span></span></label></div>
    <label class="f">Kosmetik</label>
    <div class="emopick"><button class="${!st.cosmetic ? 'on' : ''}" data-act="equip" data-id="${id}" data-c="">∅</button>
      ${S.cosmeticsOwned.map((cid) => { const k = byId(COSMETICS, cid); return `<button class="${st.cosmetic === cid ? 'on' : ''}" data-act="equip" data-id="${id}" data-c="${cid}">${k.e}</button>`; }).join('')}</div>
    ${S.cosmeticsOwned.length ? '' : '<p class="small muted">Noch keine Kosmetik – gibt’s im Laden.</p>'}
    <div class="row" style="margin-top:16px">${S.main === id ? '<span class="small muted grow">Das bist du.</span>' : `<button class="btn secondary grow" data-act="setMain" data-id="${id}">Als Hauptfigur wählen</button>`}
      <button class="btn" data-act="close">Fertig</button></div>`);
}

function statsView() {
  const t = today();
  const focusSess = S.sessions.filter((s) => s.minutes > 0);
  const totalMin = focusSess.reduce((a, s) => a + s.minutes, 0);
  const avg = focusSess.length ? Math.round(totalMin / focusSess.length) : 0;
  const active = S.habits.filter((h) => !h.archived);
  const bestNow = active.reduce((a, h) => Math.max(a, streak(h)), 0);
  const days = Array.from({ length: 14 }, (_, i) => addDays(t, i - 13));
  const vals = days.map((k) => minutesToday(k));
  const max = Math.max(30, ...vals);
  const heat = (h) => {
    const start = addDays(weekStart(t), -7 * 15);
    let cells = '';
    for (let k = start; k <= addDays(weekStart(t), 6); k = addDays(k, 1)) {
      const st = status(h, k);
      const cls = k > t || k < h.created ? 'nd' : okStatus(st) ? (st === 'min' ? 'min' : 'done') : frozen(h, k) ? 'frz' : '';
      cells += `<i class="${cls}" title="${parseKey(k).toLocaleDateString('de-DE')}: ${st === 'done' ? 'erledigt' : st === 'min' ? 'Minimum' : st === 'skip' ? 'nicht gemacht' : frozen(h, k) ? 'Freeze' : '–'}"></i>`;
    }
    return `<div class="heat">${cells}</div>`;
  };
  return `${back('Statistiken')}
    <div class="tiles">
      <div class="stat"><div class="v">${(totalMin / 60).toLocaleString('de-DE', { maximumFractionDigits: 1 })} h</div><div class="k">Fokus gesamt</div></div>
      <div class="stat"><div class="v">${avg} min</div><div class="k">Ø Session (${focusSess.length})</div></div>
      <div class="stat"><div class="v">🔥 ${bestNow}</div><div class="k">Längste aktuelle Streak</div></div>
      <div class="stat"><div class="v">${unlocked().length}</div><div class="k">Figuren freigeschaltet</div></div>
    </div>
    <div class="card"><h3>Fokus-Minuten, letzte 14 Tage</h3>
      <div class="bars">${vals.map((v, i) => `<div class="b ${i === 13 ? 'today' : ''}" data-act="barTap"><span class="tip">${parseKey(days[i]).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })}: ${v} min</span><i style="height:${(v / max) * 100}%"></i></div>`).join('')}</div>
      <div class="barlabels">${days.map((k, i) => `<span>${i % 2 === 1 ? parseKey(k).getDate() : ''}</span>`).join('')}</div>
    </div>
    <h2>Gewohnheiten</h2>
    ${active.length ? active.map((h) => { const c = consistency(h); return `<div class="card"><div class="row" style="margin-bottom:8px"><span style="font-size:24px">${h.emoji}</span><b class="grow">${esc(h.name)}</b></div>
      <div class="row small" style="margin-bottom:8px"><span>🔥 Aktuell <b>${streak(h)}</b></span><span>🏆 Beste <b>${bestStreak(h)}</b></span><span>📈 30 Tage <b>${c == null ? '–' : c + ' %'}</b></span></div>
      ${heat(h)}</div>`; }).join('') + `<div class="legend"><span><i style="background:#2f7fd6"></i>erledigt</span><span><i style="background:#9cc3ef"></i>Minimum</span><span><i style="background:#b9e6f5;outline:1.5px dashed #2f7fd6;outline-offset:-2px"></i>Freeze</span><span><i style="background:#edf0f5"></i>offen</span></div>`
      : '<p class="muted">Noch keine Gewohnheiten.</p>'}`;
}

function journalView() {
  const t = today(), dr = S.ui?.jdraft, txt = dr && dr.k === t ? dr.txt : S.journal[t] || '';
  const past = Object.keys(S.journal).filter((k) => k !== t && S.journal[k].trim()).sort().reverse();
  const fire = Object.keys(S.journal).filter((k) => diffDays(k, t) < 14 && S.journal[k].trim()).length;
  return `${back('Tagebuch')}
    <div class="card center"><div style="font-size:${28 + fire * 5}px;line-height:1">🔥</div><div class="small muted">Das ewige Reifenfeuer wächst mit jedem Eintrag (${fire} in 14 Tagen).</div></div>
    <div class="card"><b>${fmtDate(t)}</b><textarea class="in" id="jtext" style="margin-top:8px" placeholder="Wie war dein Tag? Wofür bist du dankbar?">${esc(txt)}</textarea>
      <button class="btn block" style="margin-top:10px" data-act="saveJournal">Speichern${S.journal[t] ? '' : ` (+${REWARDS.journal} 🍩)`}</button></div>
    ${past.map((k) => `<details class="card"><summary><b>${fmtDate(k)}</b></summary><p style="white-space:pre-wrap">${esc(S.journal[k])}</p></details>`).join('')}`;
}

function todosView() {
  const open = S.todos.filter((x) => !x.done), done = S.todos.filter((x) => x.done);
  const row = (x) => `<div class="todo ${x.done ? 'done' : ''}"><button class="box" data-act="todoToggle" data-id="${x.id}">${x.done ? '✓' : ''}</button><span class="t grow">${esc(x.text)}</span><button class="x" data-act="todoDel" data-id="${x.id}" aria-label="Löschen">×</button></div>`;
  return `${back('To-dos')}
    <div class="row" style="margin-bottom:12px"><input class="in grow" id="todoin" type="text" placeholder="Neue Aufgabe…" maxlength="80"><button class="btn" data-act="todoAdd">＋</button></div>
    <div class="card">${open.length ? open.map(row).join('') : '<p class="muted small" style="margin:0">Alles erledigt. Woohoo!</p>'}</div>
    ${done.length ? `<h2>Erledigt</h2><div class="card">${done.slice(-20).reverse().map(row).join('')}</div><button class="btn small secondary" data-act="todoClear">Erledigte löschen</button>` : ''}
    <p class="small muted center">+${REWARDS.todo} 🍩 pro erledigter Aufgabe.</p>`;
}

function settingsView() {
  const st = S.settings;
  return `${back('Einstellungen')}
    <div class="card"><label class="f" style="margin-top:0">Dein Name</label><input class="in" id="setname" type="text" value="${esc(S.name)}" maxlength="20">
      <div class="toggle"><span><b>Strikte Streak</b><br><span class="small muted">Minimum zählt nicht für die Streak</span></span><label class="switch"><input type="checkbox" data-act="set" data-k="strict" ${st.strict ? 'checked' : ''}><span></span></label></div>
      <div class="toggle"><span><b>Pausenlänge</b></span><input class="in" id="setbreak" type="number" min="1" max="30" value="${st.breakMin}" style="width:80px"></div>
      <button class="btn block" data-act="saveSettings">Speichern</button></div>
    <div class="card"><h3>Töne & Musik</h3>
      <div class="toggle"><span><b>Töne</b><br><span class="small muted">Jingles beim Abhaken, Level-Up, Kaufen …</span></span><label class="switch"><input type="checkbox" data-act="set" data-k="sound" ${st.sound ? 'checked' : ''}><span></span></label></div>
      <div class="toggle"><span><b>Lautstärke</b></span><input class="range" id="setvol" type="range" min="0" max="100" step="5" value="${Math.round(st.vol * 100)}" ${st.sound ? '' : 'disabled'}></div>
      <div class="toggle"><span><b>Stadtmusik</b><br><span class="small muted">Leiser Jazz, solange du auf der Karte bist</span></span><label class="switch"><input type="checkbox" data-act="set" data-k="music" ${st.music ? 'checked' : ''} ${st.sound ? '' : 'disabled'}><span></span></label></div>
      <button class="btn secondary block" data-act="sub" data-s="sounds">▶ Alle Sounds anhören</button>
      <p class="small muted" style="margin-bottom:0">iPhone: Stummschalter aus, sonst bleibt alles still.</p></div>
    <div class="card"><h3>☁ Backup</h3><p class="small muted">Alles liegt nur auf diesem Gerät. Leert das System den Speicher (z. B. bei Platzmangel), wäre alles weg. Ein Backup in iCloud Drive schützt dich.</p>
      <div class="small" style="margin-bottom:10px">${S.backupAt ? `Letztes Backup: <b>${parseKey(S.backupAt).toLocaleDateString('de-DE')}</b>` : '<b>Noch kein Backup.</b>'}${persisted === true ? ' · Speicher dauerhaft ✓' : ''}</div>
      <button class="btn block" data-act="backup">☁ Backup sichern</button>
      <p class="small muted">iPhone: im Teilen-Menü „In Dateien sichern“ und dann iCloud Drive wählen. Wiederherstellen: „Import“ und die Datei aus iCloud wählen.</p>
      <div class="toggle"><span><b>Erinnern</b><br><span class="small muted">Im Check-in, wenn ein Backup fällig ist</span></span><select class="in" id="setbackup" style="width:auto">${[[7, 'Wöchentlich'], [30, 'Monatlich'], [0, 'Nie']].map(([v, l]) => `<option value="${v}" ${S.settings.backupEvery === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <label class="btn secondary block center" style="margin-top:10px">⬆ Import<input type="file" id="importfile" accept="application/json,.json" hidden></label></div>
    <div class="card"><h3>Bildschirm-Test</h3><p class="small muted">Zeigt Messwerte und ein Streifenmuster bis zum unteren Rand. Hilft bei Darstellungsfehlern.</p><button class="btn secondary" data-act="screenTest">Test starten</button></div>
    <div class="card"><h3>Neustart</h3><p class="small muted">Löscht alles: Gewohnheiten, Stadt, Donuts.</p><button class="btn red" data-act="reset">Spiel zurücksetzen</button></div>
    <p class="small muted center">Private Fan-Version für den Eigengebrauch. Nicht verbunden mit den Rechteinhabern der Simpsons.</p>`;
}

const SOUND_NAMES = { done: 'Abgehakt', min: 'Minimum', skip: 'Übersprungen', undo: 'Rückgängig', allDone: 'Alles geschafft', level: 'Level-Up',
  sub: 'Unterquest', chapter: 'Kapitel', quest: 'Hauptquest', buy: 'Gekauft', place: 'Gebaut', pickup: 'Hochgehoben', start: 'Fokus-Start',
  focusDone: 'Fokus fertig', breakDone: 'Pause vorbei', unlock: 'Neue Figur', fail: 'Hardcore weg', remind: 'Erinnerung',
  freeze: 'Squishee-Freeze', intro: 'Titelmelodie', tap: 'Tippen' };
function soundsView() {
  const combo = [1, 3, 5, 8].map((n) => `<button class="btn small secondary" data-act="playSnd" data-k="done" data-n="${n}">${n}.</button>`).join('');
  return `${back('Sounds', 'settings')}
    <div class="card"><p class="small muted" style="margin-top:0">Alle Töne sind eigene Melodien, live im Gerät erzeugt. ${S.settings.sound ? '' : '<b>Töne sind gerade aus.</b>'}</p>
      <div class="sndgrid">${Object.keys(SOUND_NAMES).map((k) => `<button class="btn secondary" data-act="playSnd" data-k="${k}">▶ ${SOUND_NAMES[k]}</button>`).join('')}</div></div>
    <div class="card"><h3>Kombo beim Abhaken</h3><p class="small muted">Jede weitere erledigte Gewohnheit am Tag klingt etwas höher.</p><div class="row">${combo}</div></div>
    <div class="card"><h3>Stimmen</h3><p class="small muted">Tippe auf eine Figur in der Stadt, dann plappert sie.</p>
      <div class="row wrap">${unlocked().map((c) => `<button class="btn small secondary" data-act="playTalk" data-id="${c.id}">${esc(c.name)}</button>`).join('')}</div></div>`;
}

/* ---------- Modal & Toast ---------- */
function openModal(html) { $('#sheet').innerHTML = html; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; $('#sheet').innerHTML = ''; }
function toast(msg) {
  const box = $('#toasts');
  while (box.children.length >= 2) box.firstChild.remove();
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => t.remove(), 2800);
}

/* ---------- Aktionen ---------- */
const actions = {
  tab: (d) => { sound('tap'); tab = d.tab; sub = null; closeModal(); render(); $('#page').scrollTop = 0; },
  sub: (d) => { sub = d.s || null; render(); $('#page').scrollTop = 0; },
  close: () => closeModal(),
  noop: () => toast('Noch nicht freigeschaltet – fokussiere, um sie zu finden!'),
  sayMain: () => { const t = Faces.line(mainChar(), userMood()); sayAt($('#hud .me'), t); talkFace($('#hud .me svg.avatar')); sound('talk', S.main, t); },
  obPick: (d) => { S.main = d.id; const n = $('#ob-name').value; render(); $('#ob-name').value = n; },
  obStart: () => {
    S.name = $('#ob-name').value.trim() || 'Du';
    $('#ob-name').blur();
    S.started = true; unlockChar(S.main);
    S.map = freshMap(); placeStarter(); World.reset();
    quiz = { step: 0, a: {} }; tab = 'quiz';
    save(); render(); sound('intro');
  },
  // Gewohnheiten
  ckDay: (d) => { ckBack = Math.max(0, Math.min(7, ckBack + +d.d)); render(); },
  ckFold: (d) => { S.ui = S.ui || {}; S.ui.fold = S.ui.fold || {}; const f = S.ui.fold; f[d.g] = !(f[d.g] ?? d.def === '1'); save(); render(); },
  hs: (d) => { const h = byId(S.habits, d.id); setStatus(h, ckKey(), d.st); render(); },
  hSheet: (d) => habitSheet(byId(S.habits, d.id)),
  hc: (d) => { const h = byId(S.habits, d.id), k = ckKey(); setCount(h, k, countOf(h, k) + 1); render(); },
  hcSet: (d) => { const h = byId(S.habits, d.id); setCount(h, ckKey(), +d.n); habitSheet(h); render(); },
  hfKind: (d) => { readHabitForm(); draft.count = d.k === 'count' ? draft.count || { goal: 8, min: 0, unit: '' } : null; if (!draft.count) draft.minimum = ''; drawHabitForm(); },
  hsSheet: (d) => { const h = byId(S.habits, d.id); setStatus(h, ckKey(), d.st); closeModal(); render(); },
  newHabit: () => habitForm(null),
  editHabit: (d) => habitForm(byId(S.habits, d.id)),
  hfEmoji: (d) => { readHabitForm(); draft.emoji = d.e; drawHabitForm(); },
  hfType: (d) => { readHabitForm(); draft.schedule.type = d.t; if (d.t === 'weekly') draft.schedule.n = Math.min(draft.schedule.n, 7); drawHabitForm(); },
  hfDay: (d) => { readHabitForm(); const i = +d.i, ds = draft.schedule.days; draft.schedule.days = ds.includes(i) ? ds.filter((x) => x !== i) : [...ds, i].sort(); drawHabitForm(); },
  hfSave: () => {
    readHabitForm();
    if (!draft.name) return toast('Bitte einen Namen eingeben.');
    if (draft.schedule.type === 'days' && !draft.schedule.days.length) return toast('Mindestens einen Tag wählen.');
    if (draft.id) Object.assign(byId(S.habits, draft.id), draft);
    else S.habits.push({ ...draft, id: uid(), created: today() });
    save(); closeModal(); render();
  },
  hfDelete: () => {
    const q = questOfHabit(draft), r = q && q.subs[draft.sub];
    if (!confirm(`„${draft.name}“ wirklich löschen? Verlauf geht verloren.${q ? ' Die Unterquest wird übersprungen.' : ''}\n\nTipp: „Pausieren“ behält den Verlauf.`)) return;
    S.habits = S.habits.filter((h) => h.id !== draft.id); delete S.log[draft.id]; delete S.freezeUsed[draft.id];
    // Sonst bliebe das Kapitel für immer offen
    if (r && r.habitId === draft.id && r.state === 'active') { r.state = 'skip'; questCheck(); }
    save(); closeModal(); render();
  },
  hfPause: () => {
    const h = byId(S.habits, draft.id); h.archived = true; h.paused = true; pauseStart(h);
    save(); closeModal(); render(); toast(`„${h.name}“ pausiert. Fortsetzen unten im Check-in.`);
  },
  hResume: (d) => { const h = byId(S.habits, d.id); h.archived = false; h.paused = false; pauseEnd(h); save(); render(); toast(`„${h.name}“ läuft wieder.`); },
  // Fokus
  fmin: (d) => { S.settings.focusMin = +d.m; save(); render(); },
  bmin: (d) => { S.settings.breakMin = +d.m; save(); render(); },
  fminCustom: () => { const m = parseInt(prompt('Minuten (1–180):', S.settings.focusMin), 10); if (m >= 1 && m <= 180) { S.settings.focusMin = m; save(); render(); } },
  startFocus: () => startFocus('focus'),
  startBreak: () => { closeModal(); tab = 'focus'; startFocus('break'); },
  pause: () => {
    const r = run();
    if (r.pauseStart) { r.pausedMs += Date.now() - r.pauseStart; r.pauseStart = null; } else r.pauseStart = Date.now();
    save(); render();
  },
  stopFocus: () => {
    const r = run();
    if (r.hardcore && !confirm('Wirklich aufgeben? Das kostet 10 Donuts.')) return;
    if (r.phase === 'break') { S.focusRun = null; save(); return render(); }
    finishFocus(r.stopwatch);
  },
  // Laden
  shopCat: (d) => { shopCat = d.c; render(); },
  buy: (d) => {
    const it = byId(ITEMS, d.id);
    if (S.donuts < it.price) return;
    S.donuts -= it.price; S.inventory[it.id] = (S.inventory[it.id] || 0) + 1;
    sound('buy'); save(); toast(`${it.name} gekauft! Platziere es in der Stadt (🔨 Bauen).`); render();
  },
  buyCos: (d) => {
    const c = byId(COSMETICS, d.id);
    if (S.donuts < c.price) return;
    S.donuts -= c.price; S.cosmeticsOwned.push(c.id);
    sound('buy'); save(); toast(`${c.name} gekauft! Unter Mehr → Figuren anziehen.`); render();
  },
  buyLand: (d) => {
    const l = LAND.find((x) => x.size === +d.id);
    if (S.donuts < l.price) return;
    S.donuts -= l.price; S.map.plot = l.size; World.invalidate(); World.centerCam();
    sound('chapter'); save(); toast(`Springfield ist jetzt ${l.size}×${l.size} groß!`); render();
  },
  buyFreeze: () => { if (S.donuts < FREEZE_PRICE) return; S.donuts -= FREEZE_PRICE; S.freezes++; sound('buy'); save(); render(); },
  // Mehr
  claim: (d) => { const c = S.challenges.list[+d.i]; if (c.claimed || challengeProgress(c) < c.target) return; c.claimed = true; sound('chapter'); reward(c.reward, 0, `Herausforderung geschafft! +${c.reward} 🍩`); render(); },
  charSheet: (d) => charSheet(d.id),
  equip: (d) => { S.chars[d.id].cosmetic = d.c || null; save(); charSheet(d.id); render(); },
  setMain: (d) => { S.main = d.id; save(); charSheet(d.id); render(); },
  barTap: (d, el) => { el.parentElement.querySelectorAll('.b').forEach((b) => b !== el && b.classList.remove('hl')); el.classList.toggle('hl'); },
  saveJournal: () => {
    const t = today(), txt = $('#jtext').value;
    const first = !(S.journal[t] || '').trim() && txt.trim();
    if (txt.trim()) S.journal[t] = txt; else delete S.journal[t];
    if (S.ui) delete S.ui.jdraft;
    if (first && !S.journalRewarded?.includes(t)) {
      S.journalRewarded = [...(S.journalRewarded || []).slice(-30), t];
      reward(REWARDS.journal, REWARDS.journalXp, `+${REWARDS.journal} 🍩 Das Reifenfeuer lodert!`);
    } else { save(); toast('Gespeichert.'); }
    render();
  },
  todoAdd: () => { const v = $('#todoin').value.trim(); if (!v) return; S.todos.push({ id: uid(), text: v, done: false, rewarded: false }); save(); render(); $('#todoin').focus(); },
  todoToggle: (d) => {
    const x = byId(S.todos, d.id); x.done = !x.done; x.doneAt = x.done ? today() : null;
    if (x.done && !x.rewarded) { x.rewarded = true; sound('min'); reward(REWARDS.todo, 1, `+${REWARDS.todo} 🍩`); } else save();
    render();
  },
  todoDel: (d) => { S.todos = S.todos.filter((x) => x.id !== d.id); save(); render(); },
  todoClear: () => { S.todos = S.todos.filter((x) => !x.done); save(); render(); },
  saveSettings: () => {
    S.name = $('#setname').value.trim() || S.name;
    S.settings.breakMin = Math.max(1, Math.min(30, +$('#setbreak').value || 5));
    save(); toast('Gespeichert.'); render();
  },
  backup: () => backupNow().then((ok) => { if (ok) { toast('☁ Backup gesichert.'); render(); } }),
  backupLater: () => { S.backupSnooze = addDays(today(), 3); save(); render(); },
  playSnd: (d) => { if (!S.settings.sound) return toast('Töne sind aus (Einstellungen).'); Snd.unlock(); sound(d.k, +d.n || 1); },
  playTalk: (d) => { if (!S.settings.sound) return; Snd.unlock(); const c = byId(CHARACTERS, d.id); sayAt($('#hud .me'), Faces.line(c, userMood())); sound('talk', c.id, 'x'.repeat(30)); },
  screenTest: () => {
    const probe = (u) => { lvhProbe.style.height = '100' + u; const v = lvhProbe.offsetHeight; lvhProbe.style.height = '100lvh'; return v; };
    const safe = (s) => { const d = document.createElement('div'); d.style.cssText = `position:fixed;top:0;height:env(safe-area-inset-${s})`; document.body.appendChild(d); const v = d.offsetHeight; d.remove(); return v; };
    const info = { innerH: innerHeight, outerH: outerHeight, screenH: screenH(), clientH: document.documentElement.clientHeight, visualH: Math.round(window.visualViewport?.height || 0),
      vh: probe('vh'), svh: probe('svh'), dvh: probe('dvh'), lvh: probe('lvh'), appH: appHeight(), standalone, navStandalone: !!navigator.standalone, safeTop: safe('top'), safeBottom: safe('bottom'), htmlH: document.documentElement.offsetHeight, bodyH: document.body.offsetHeight, scrollY };
    const ov = document.createElement('div');
    ov.style.cssText = `position:fixed;left:0;top:0;width:100vw;height:${Math.max(appHeight(), screenH()) + 200}px;z-index:99;background:repeating-linear-gradient(45deg,#ff5a4e 0 20px,#ffd90f 20px 40px)`;
    ov.innerHTML = `<pre style="margin:90px 16px 0;padding:12px;background:#fff;border:3px solid #1d1d1d;border-radius:12px;font:700 14px/1.4 monospace;white-space:pre-wrap">${esc(JSON.stringify(info, null, 1))}\n\nTippen zum Schließen</pre>`;
    ov.onclick = () => ov.remove();
    document.body.appendChild(ov);
  },
  reset: () => {
    if (!confirm('Wirklich ALLES löschen? Das kann nicht rückgängig gemacht werden.')) return;
    S = freshState(); save(); tab = 'home'; sub = null; World.reset(); render();
  },
};

document.addEventListener('click', (e) => {
  if (e.target.id === 'modal') return closeModal();
  const el = e.target.closest('[data-act]');
  if (!el || el.tagName === 'INPUT') return;
  const fn = actions[el.dataset.act];
  if (fn) { e.preventDefault(); fn(el.dataset, el); }
});
document.addEventListener('change', (e) => {
  const el = e.target;
  if (el.dataset.act === 'set') { S.settings[el.dataset.k] = el.checked; if (el.dataset.k === 'stopwatch' && el.checked) S.settings.hardcore = false; save(); if (tab === 'focus' || el.dataset.k === 'sound') render(); if (el.dataset.k === 'sound' && el.checked) { Snd.unlock(); sound('done'); } }
  if (el.id === 'setvol') { save(); sound('done', 3); }
  if (el.id === 'setbackup') { S.settings.backupEvery = +el.value; save(); }
  if (el.dataset.act === 'charHome') { S.chars[el.dataset.id].home = el.checked; save(); }
  if (el.id === 'importfile' && el.files[0]) {
    el.files[0].text().then((txt) => {
      const data = JSON.parse(txt);
      if (!data || !Array.isArray(data.habits) || !data.map) throw new Error('Ungültige Datei');
      if (!confirm('Backup laden? Der aktuelle Spielstand wird ersetzt.')) return;
      S = Object.assign(freshState(), data); S.settings = Object.assign(freshState().settings, data.settings); migrateMap(); migrateCast(); Snd.setVol(); save(); World.reset(); render(); toast('Backup geladen.');
    }).catch(() => toast('Datei konnte nicht gelesen werden.'));
  }
});
document.addEventListener('input', (e) => { if (e.target.id === 'jtext') { S.ui = S.ui || {}; S.ui.jdraft = { k: today(), txt: e.target.value }; save(); } if (e.target.id === 'setvol') { S.settings.vol = +e.target.value / 100; Snd.setVol(); } if (e.target.id === 'fnote' && run()) { run().note = e.target.value; save(); } });
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.id === 'todoin') actions.todoAdd();
  if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.id.startsWith('hf-') && draft) { e.preventDefault(); actions.hfSave(); }
});
document.addEventListener('visibilitychange', () => { Snd.music(tab === 'home' && S.started); if (!document.hidden) { if (S.lastCheck < addDays(today(), -1)) processMissedDays(); tickClock(); if (!run()) document.title = 'Springfield Habits'; } });

// iOS: innerHeight endet über der (schwebenden) Suchleiste, in der Home-Bildschirm-App sogar über einer
// Suchleiste, die es dort gar nicht gibt. Wir zeichnen deshalb bis zum unteren Bildschirmrand:
// 100lvh (größter Viewport) per Messelement, als installierte App die Bildschirmhöhe.
const standalone = !!navigator.standalone || ['standalone', 'fullscreen', 'minimal-ui'].some((m) => matchMedia(`(display-mode: ${m})`).matches);
const lvhProbe = document.createElement('div');
lvhProbe.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:100vh;height:100lvh;visibility:hidden;pointer-events:none';
document.body.appendChild(lvhProbe);
const screenH = () => (window.screen ? (innerWidth > innerHeight ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height)) : 0);
function appHeight() {
  return Math.max(window.innerHeight, lvhProbe.offsetHeight, standalone ? screenH() : 0);
}
// Im Browser bleiben Buttons über der Suchleiste; in der App gibt es keine, dort gilt der echte Rand.
function fitViewport() {
  const h = appHeight(), st = document.documentElement.style;
  st.setProperty('--appH', h + 'px');
  st.setProperty('--barGap', (standalone ? 0 : Math.max(0, h - window.innerHeight)) + 'px');
}
fitViewport();
window.addEventListener('resize', fitViewport);
// Randfarbe (Statusleiste, Ränder) passend zum Bildschirm: Wasser auf der Karte, Himmel auf den Seiten.
const EDGE = { world: '#2f8fd6', page: '#a8dcff', focus: '#1b456f' };
function setEdge(c) {
  document.documentElement.style.background = c;
  const m = $('meta[name="theme-color"]');
  if (m && m.content !== c) m.content = c;
}

// iOS (Home-Bildschirm-App): Nach dem Schließen der Tastatur bleibt die Seite manchmal verschoben,
// unten blitzt dann ein Streifen durch. Fokus lösen und zurückscrollen behebt das.
function resetViewport() {
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA)$/.test(a.tagName) && !document.body.contains(a)) a.blur();
  if (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop) { window.scrollTo(0, 0); document.body.scrollTop = 0; }
}
document.addEventListener('focusout', (e) => { if (/^(INPUT|TEXTAREA)$/.test(e.target.tagName)) setTimeout(resetViewport, 80); });
window.visualViewport?.addEventListener('resize', () => setTimeout(resetViewport, 80));

/* ---------- Start (aufgerufen von world.js) ---------- */
function boot() {
  migrateMap();
  migrateCast();
  World.init();
  processMissedDays();
  ensureChallenges();
  if (location.hash === '#checkin' && S.started) { tab = 'habits'; history.replaceState(null, '', location.pathname); }
  render();
  remindInit();
  initStorage();
  if (loadErr) problem('load', loadErr);
}
// Neuer Tag, während die App offen ist: Freeze prüfen, Herausforderungen und Ansicht auffrischen
let dayNow = today();
function checkNewDay() {
  if (today() === dayNow || !S.started) return;
  dayNow = today(); ckBack = 0;
  processMissedDays(); ensureChallenges();
  if ($('#modal').hidden && !/^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName)) render();
}
clockTimer = setInterval(() => { if (run()) tickClock(); else if (document.title !== 'Springfield Habits') document.title = 'Springfield Habits'; checkNewDay(); }, 500);
/* ---------- Updates ---------- */
// Neue Version installiert sich im Hintergrund. Sobald sie bereit ist: Hinweis mit „Neu laden“, kein Zwangs-Neustart.
function updateReady() {
  if ($('#updbar')) return;
  const bar = document.createElement('div');
  bar.id = 'updbar'; bar.className = 'updbar';
  bar.innerHTML = '<span>✨ Neue Version ist da.</span><button class="btn small green" type="button">Neu laden</button>';
  bar.querySelector('button').onclick = () => location.reload();
  document.body.appendChild(bar);
}
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const hadSw = !!navigator.serviceWorker.controller; // Erstinstallation ist kein Update
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (hadSw) updateReady(); });
  navigator.serviceWorker.register('sw.js').then((reg) => {
    // Installierte Apps laufen oft tagelang weiter: beim Zurückkehren nach Updates schauen
    document.addEventListener('visibilitychange', () => { if (!document.hidden) reg.update().catch(() => {}); });
  }).catch(() => {});
}
