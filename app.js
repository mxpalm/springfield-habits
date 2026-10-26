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
    v: 1, started: false, name: '', main: 'homer',
    donuts: 50, xp: 0, freezes: 1,
    habits: [], log: {}, freezeUsed: {},
    sessions: [], focusRun: null,
    journal: {}, todos: [], challenges: { date: '', list: [] },
    inventory: {}, cosmeticsOwned: [],
    map: { v: 2, G: WORLD_G, plot: LAND[0].size, tiles: {}, objects: [] },
    chars: {}, // id -> { cosmetic, home: true }
    lastCheck: today(),
    settings: { strict: false, sound: true, focusMin: 25, breakMin: 5, hardcore: false, stopwatch: false },
  };
}
let S;
try { S = Object.assign(freshState(), JSON.parse(localStorage.getItem(STORE) || 'null') || {}); }
catch { S = freshState(); }
S.settings = Object.assign(freshState().settings, S.settings);
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(S)); } catch (e) { console.warn(e); } };

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
  S.donuts += donuts; S.xp = Math.max(0, S.xp + xp);
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
function isDue(h, k) {
  if (k < h.created) return false;
  const sc = h.schedule;
  if (sc.type === 'days') return sc.days.includes(weekday(k));
  if (sc.type === 'interval') return diffDays(h.created, k) % sc.n === 0;
  return true; // daily & weekly
}
const status = (h, k) => (S.log[h.id] || {})[k];
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
      else if (!frozen(h, wk)) break;
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
  if (next === 'done') sound('done');
  // Comeback-Bonus einmal pro Tag und Gewohnheit
  const cb = okStatus(next) && !okStatus(old) && !(h.comeback || []).includes(k) ? comebackBonus(h, k) : 0;
  if (cb) h.comeback = [...(h.comeback || []).slice(-20), k];
  reward(nd - od + cb, nx - ox, cb ? `+${nd - od + cb} 🍩 Comeback-Bonus! Schön, dass du wieder dabei bist.` : nd - od > 0 ? `+${nd - od} 🍩 ${pick(mainChar().lines)}` : null);
  if (h.quest) questCheck();
}
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
  if (r.phase === 'break') { save(); sound('done'); toast('Pause vorbei – weiter geht’s!'); render(); return; }
  const ms = completed && !r.stopwatch ? r.planned : elapsedMs(r);
  const minutes = Math.floor(ms / 60000);
  const sess = { start: r.start, end: Date.now(), minutes, hardcore: r.hardcore, completed, note: r.note, donuts: 0 };
  let html;
  if (r.hardcore && !completed) {
    sess.minutes = 0; sess.donuts = -10;
    S.sessions.push(sess);
    reward(-10, 0);
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
    sound('done');
    html = `<div class="reveal"><div style="font-size:56px">🍩</div><h2>${minutes} Minuten fokussiert!</h2>
      <p>+${d} Donuts · +${minutes} XP${r.hardcore ? ' · Hardcore ×1,5' : ''}</p>
      ${c ? `<div class="card" style="background:#fffbe0"><div class="pv">${avatarSvg(c, null, 90)}</div>
        <h3>Neue Figur: ${esc(c.name)}!</h3><div class="rar" style="color:${RARITY[c.rarity].color};font-weight:800">${RARITY[c.rarity].label}</div>
        <p class="small">„${esc(c.lines[0])}“</p></div>` : ''}
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

/* ---------- Sound ---------- */
let ac;
function sound(kind) {
  if (!S.settings.sound) return;
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    const notes = { done: [660, 880], start: [520], level: [523, 659, 784, 1047], buy: [880, 1320], unlock: [523, 784, 1047] }[kind] || [600];
    notes.forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      const t = ac.currentTime + i * 0.11;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + 0.25);
    });
  } catch { /* kein Audio */ }
}

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
const pageHead = (title, toSub = false) => `<div class="pagehead"><button class="rbtn small" ${toSub ? 'data-act="sub" data-s=""' : 'data-act="tab" data-tab="home"'} aria-label="Zurück">${ICON.back}</button><h1>${title}</h1></div>`;

function homeHtml() {
  const t = today(), act = S.habits.filter((h) => !h.archived && isDue(h, t));
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
  page.classList.toggle('focusmode', tab === 'focus' && S.started);
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
  const act = S.habits.filter((h) => !h.archived && isDue(h, t));
  const done = act.filter((h) => okStatus(status(h, t))).length;
  return `${done}/${act.length} Gewohnheiten · ${minutesToday()} Fokus-Minuten`;
}

// Check-in: Datum blättern (bis 7 Tage zurück), Filter, einklappbare Gruppen, Wischen zum Abhaken.
let ckBack = 0, ckFilter = 'todo';
const ckKey = () => addDays(today(), -ckBack);
const filterOf = (st) => (okStatus(st) || st === 'min' ? 'done' : st === 'skip' ? 'skip' : 'todo');
const streakBonus = (n) => Math.min(5, Math.floor(n / 7));
function hostOf(h) {
  const q = h.quest && S.quests?.find((x) => x.id === h.quest);
  const g = q && goalOf(q);
  return (g && byId(CHARACTERS, g.host)) || mainChar();
}
function weekDots(h, k) {
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
    html += `<i class="${cls}${d === k ? ' cur' : ''}" title="${DAYS[weekday(d)]}"><b>${DAYS[weekday(d)][0]}</b></i>`;
  }
  return `<div class="dots">${html}</div>`;
}
function habitCard(h, k) {
  const st = status(h, k), due = isDue(h, k), s = streak(h), host = hostOf(h);
  const wk = h.schedule.type === 'weekly' ? ` · ${weekCount(h, weekStart(k))}/${h.schedule.n} diese Woche` : '';
  const bonus = h.schedule.type === 'weekly' ? 0 : streakBonus(s);
  return `<div class="hswipe" data-id="${h.id}">
    <div class="swipebg"><span class="l">${ic('check')} Erledigt</span><span class="r">Nicht gemacht ${ic('cross')}</span></div>
    <div class="card habit hc ${st || ''} ${due ? '' : 'notdue'}">
      <div class="badge" data-act="editHabit" data-id="${h.id}"><span class="emo">${h.emoji}</span><span class="host">${avatarSvg(host, cosmeticOf(host.id), 30, true)}</span></div>
      <div class="grow body" data-act="editHabit" data-id="${h.id}">
        <div class="name">${esc(h.name)}</div>
        ${h.cue ? `<div class="cue">📍 ${esc(h.cue)}</div>` : ''}
        <div class="meta">${h.remind ? `<span class="tchip">⏰ ${h.remind}</span> ` : ''}${h.diff ? `<span class="dchip ${DIFF[h.diff].cls}">${DIFF[h.diff].label}</span> ` : ''}${s ? `<span class="streak">🔥 ${s}</span> ` : ''}${bonus ? `<span class="sbonus">+${bonus} Bonus</span> ` : ''}${schedLabel(h)}${wk}${due ? '' : ' · heute frei'}</div>
        ${h.minimum ? `<div class="meta">½ ${esc(h.minimum)}</div>` : ''}
      </div>
      <div class="checks">
        <button class="${st === 'skip' ? 'on skip' : ''}" data-act="hs" data-id="${h.id}" data-st="skip" aria-label="Nicht gemacht">✗</button>
        ${h.minimum ? `<button class="${st === 'min' ? 'on min' : ''}" data-act="hs" data-id="${h.id}" data-st="min" aria-label="Minimum">½</button>` : ''}
        <button class="${st === 'done' ? 'on done' : ''}" data-act="hs" data-id="${h.id}" data-st="done" aria-label="Erledigt">✓</button>
      </div>
      ${weekDots(h, k)}</div></div>`;
}
function habitsView() {
  const k = ckKey();
  if (checkTab === 'quests') return `${pageHead('Check-in')}${checkinTabs()}${questsView()}`;
  const active = S.habits.filter((h) => !h.archived && k >= h.created);
  const count = { todo: 0, done: 0, skip: 0 };
  for (const h of active) if (isDue(h, k) || status(h, k)) count[filterOf(status(h, k))]++;
  // Gruppen: aktive Quests zuerst, dann eigene Routinen
  const order = (S.quests || []).filter((q) => q.status === 'active').map((q) => goalOf(q).name);
  const groups = {}, free = [];
  for (const h of active) {
    const st = status(h, k);
    if (!isDue(h, k) && !st) { if (ckFilter === 'todo') free.push(h); continue; }
    if (filterOf(st) !== ckFilter) continue;
    const g = h.group || 'Eigene Gewohnheiten';
    (groups[g] = groups[g] || []).push(h);
  }
  const rank = (g) => { const i = order.indexOf(g); return i < 0 ? 100 : i; };
  const fold = S.ui?.fold || {};
  const groupHtml = (g, hs, extra = '') => {
    const all = active.filter((h) => (h.group || 'Eigene Gewohnheiten') === g && isDue(h, k));
    const ok = all.filter((h) => okStatus(status(h, k))).length;
    const shut = fold[g] ?? extra === 'free';
    const q = (S.quests || []).find((x) => goalOf(x).name === g);
    return `<div class="hgroup ${shut ? 'shut' : ''}">
      <button class="ghead" data-act="ckFold" data-g="${esc(g)}"><span class="gic">${q ? goalOf(q).emoji : extra === 'free' ? '🛋' : '📋'}</span><span class="grow">${esc(extra === 'free' && ckBack ? 'An diesem Tag frei' : g)}</span>${extra === 'free' ? '' : `<span class="gcount">${ok}/${all.length}</span>`}<span class="chev">${ic('down', 18)}</span></button>
      ${shut ? '' : hs.map((h) => habitCard(h, k)).join('')}</div>`;
  };
  const list = Object.entries(groups).sort(([a], [b]) => rank(a) - rank(b) || a.localeCompare(b)).map(([g, hs]) => groupHtml(g, hs)).join('')
    + (free.length ? groupHtml('Heute frei', free, 'free') : '');
  const c = mainChar();
  const empty = { todo: count.done + count.skip ? `<div class="card empty allclear">${avatarSvg(c, cosmeticOf(c.id), 70)}<p><b>Alles abgehakt!</b><br>${esc(pick(c.lines))}</p></div>` : '',
    done: '<div class="card empty"><p>Noch nichts erledigt – wisch eine Karte nach rechts.</p></div>',
    skip: '<div class="card empty"><p>Nichts übersprungen. Stark!</p></div>' }[ckFilter];
  const label = ckBack === 0 ? 'Heute' : ckBack === 1 ? 'Gestern' : `Vor ${ckBack} Tagen`;
  return `${pageHead('Check-in')}${checkinTabs()}
    ${S.quests?.length ? '' : `<button class="card questcta" data-act="qzStart"><span style="font-size:34px">🗺️</span><span class="grow"><b>Quests einrichten</b><br><span class="small muted">Fragebogen beantworten – Lisa baut dir Hauptquests mit Methoden aus Studien.</span></span><span class="btn small pink">Los</span></button>`}
    <div class="datenav">
      <button class="rbtn small" data-act="ckDay" data-d="1" ${ckBack >= 7 ? 'disabled' : ''} aria-label="Vorheriger Tag">${ICON.back}</button>
      <div class="grow"><b>${label}</b><span>${fmtDate(k)}</span></div>
      <button class="rbtn small fwd" data-act="ckDay" data-d="-1" ${ckBack <= 0 ? 'disabled' : ''} aria-label="Nächster Tag">${ICON.back}</button>
    </div>
    <div class="seg filters">${[['todo', 'To-dos'], ['done', 'Erledigt'], ['skip', 'Übersprungen']].map(([f, l]) => `<button class="${ckFilter === f ? 'on' : ''}" data-act="ckFilter" data-f="${f}">${l} <span class="n">${count[f]}</span></button>`).join('')}</div>
    ${active.length ? list || empty : `<div class="card empty"><div style="font-size:48px">🛋️</div><p>Noch keine Gewohnheiten.<br>Leg deine erste an!</p></div>`}
    ${ckBack === 0 && ckFilter === 'todo' ? openTasksHtml() : ''}
    <button class="btn block" data-act="newHabit">＋ Eigene Gewohnheit</button>
    <p class="small muted center">Wisch nach rechts = erledigt, nach links = nicht gemacht · ½ = Minimum<br>Quest-Gewohnheiten: Leicht +${DIFF.easy.habit[0]} · Mittel +${DIFF.medium.habit[0]} · Schwer +${DIFF.hard.habit[0]} 🍩<br>Eigene +${REWARDS.habit} 🍩 · Streak-Bonus +1 🍩 je volle Woche (max. +5)</p>`;
}

// Wischen: rechts = erledigt, links = nicht gemacht
let swipe = null, swipeBlock = false;
document.addEventListener('pointerdown', (e) => {
  const card = e.target.closest('.hswipe .hc');
  if (!card || e.target.closest('.checks')) return;
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
    setTimeout(() => { if (status(h, ckKey()) !== st) setStatus(h, ckKey(), st); render(); }, 160);
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
    <label class="f">Wie oft?</label>
    <div class="seg">${[['days', 'Wochentage'], ['interval', 'Alle N Tage'], ['weekly', 'N× pro Woche']].map(([t, l]) => `<button class="${sc.type === t ? 'on' : ''}" data-act="hfType" data-t="${t}">${l}</button>`).join('')}</div>
    ${sc.type === 'days' ? `<div class="daypick">${DAYS.map((n, i) => `<button class="${sc.days.includes(i) ? 'on' : ''}" data-act="hfDay" data-i="${i}">${n}</button>`).join('')}</div>`
      : `<div class="row"><span>${sc.type === 'interval' ? 'Alle' : ''}</span><input class="in" id="hf-n" type="number" min="1" max="${sc.type === 'weekly' ? 7 : 30}" value="${sc.n}" style="width:90px"><span>${sc.type === 'interval' ? 'Tage' : 'mal pro Woche'}</span></div>`}
    <label class="f">Minimum für schlechte Tage (optional)</label><input class="in" id="hf-min" type="text" value="${esc(d.minimum)}" placeholder="z. B. 1 Glas Wasser" maxlength="40">
    <label class="f">Erinnerung (optional)</label><div class="row"><input class="in" id="hf-remind" type="time" value="${esc(d.remind || '')}" style="width:140px">
      <span class="small muted grow">${remindSettings().on ? 'Leer lassen = keine Erinnerung' : 'Erinnerungen sind aus – einschalten unter Mehr → Erinnerungen.'}</span></div>
    <label class="f">Gruppe / Routine (optional)</label><input class="in" id="hf-group" type="text" list="hf-groups" value="${esc(d.group)}" placeholder="z. B. Morgenroutine" maxlength="24">
    <datalist id="hf-groups">${groups.map((g) => `<option value="${esc(g)}">`).join('')}</datalist>
    <div class="row" style="margin-top:16px">
      ${d.id ? `<button class="btn red small" data-act="hfDelete">Löschen</button>` : ''}
      <span class="grow"></span><button class="btn secondary" data-act="close">Abbrechen</button><button class="btn" data-act="hfSave">Speichern</button></div>`);
}
function readHabitForm() {
  draft.name = $('#hf-name').value.trim();
  draft.minimum = $('#hf-min').value.trim();
  draft.group = $('#hf-group').value.trim();
  draft.remind = $('#hf-remind').value;
  const n = $('#hf-n');
  if (n) draft.schedule.n = Math.max(1, Math.min(+n.value || 1, draft.schedule.type === 'weekly' ? 7 : 30));
}

// Fokus-Szene: Figur sitzt auf der Couch, darüber eine Gedankenblase.
const COUCH = '#9a76a6';
function couchScene(c, think) {
  const fig = avatarSvg(c, cosmeticOf(c.id), 140).replace('<svg class="avatar"', '<svg x="80" y="-4"');
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
  if (sub) return ({ stats: statsView, journal: journalView, todos: todosView, challenges: challengesView, chars: charsView, settings: settingsView, remind: remindView }[sub])();
  const n = openChallenges();
  const items = [['challenges', '🎯', 'Tägliche Herausforderungen', n ? `<span class="badge">${n}</span>` : ''], ['chars', '👨‍👩‍👧‍👦', 'Figuren & Kosmetik', `<span class="small muted" style="margin-left:auto">${unlocked().length}/${CHARACTERS.length}</span>`],
    ['stats', '📊', 'Statistiken', ''], ['journal', '📓', 'Tagebuch', ''], ['todos', '📝', 'To-do-Liste', ''], ['remind', '🔔', 'Erinnerungen', `<span class="small muted" style="margin-left:auto">${remindSettings().on ? 'An' : 'Aus'}</span>`], ['settings', '⚙️', 'Einstellungen & Backup', '']];
  return `${pageHead('Mehr')}<div class="card menu">${items.map(([id, ic, l, x]) => `<button data-act="sub" data-s="${id}"><span class="ic">${ic}</span>${l}${x}</button>`).join('')}</div>`;
}
const back = (title) => pageHead(title, true);

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
      <div style="color:${RARITY[c.rarity].color};font-weight:800">${RARITY[c.rarity].label}</div><p class="small">„${esc(pick(c.lines))}“</p></div></div>
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
  const t = today(), txt = S.journal[t] || '';
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
      <div class="toggle"><span><b>Töne</b></span><label class="switch"><input type="checkbox" data-act="set" data-k="sound" ${st.sound ? 'checked' : ''}><span></span></label></div>
      <div class="toggle"><span><b>Pausenlänge</b></span><input class="in" id="setbreak" type="number" min="1" max="30" value="${st.breakMin}" style="width:80px"></div>
      <button class="btn block" data-act="saveSettings">Speichern</button></div>
    <div class="card"><h3>Backup</h3><p class="small muted">Alle Daten liegen nur auf diesem Gerät. Exportiere ab und zu ein Backup.</p>
      <div class="row"><button class="btn secondary grow" data-act="export">⬇ Export</button><label class="btn secondary grow center">⬆ Import<input type="file" id="importfile" accept="application/json" hidden></label></div></div>
    <div class="card"><h3>Neustart</h3><p class="small muted">Löscht alles: Gewohnheiten, Stadt, Donuts.</p><button class="btn red" data-act="reset">Spiel zurücksetzen</button></div>
    <p class="small muted center">Private Fan-Version für den Eigengebrauch. Nicht verbunden mit den Rechteinhabern der Simpsons.</p>`;
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
  tab: (d) => { tab = d.tab; sub = null; closeModal(); render(); $('#page').scrollTop = 0; },
  sub: (d) => { sub = d.s || null; render(); $('#page').scrollTop = 0; },
  close: () => closeModal(),
  noop: () => toast('Noch nicht freigeschaltet – fokussiere, um sie zu finden!'),
  sayMain: () => sayAt($('#hud .me'), pick(mainChar().lines)),
  obPick: (d) => { S.main = d.id; const n = $('#ob-name').value; render(); $('#ob-name').value = n; },
  obStart: () => {
    S.name = $('#ob-name').value.trim() || 'Du';
    $('#ob-name').blur();
    S.started = true; unlockChar(S.main);
    S.map = freshMap(); placeStarter(); World.reset();
    quiz = { step: 0, a: {} }; tab = 'quiz';
    save(); render();
  },
  // Gewohnheiten
  ckDay: (d) => { ckBack = Math.max(0, Math.min(7, ckBack + +d.d)); render(); },
  ckFilter: (d) => { ckFilter = d.f; render(); },
  ckFold: (d) => { S.ui = S.ui || {}; S.ui.fold = S.ui.fold || {}; const f = S.ui.fold; f[d.g] = !(f[d.g] ?? d.g === 'Heute frei'); save(); render(); },
  hs: (d) => { const h = byId(S.habits, d.id); setStatus(h, ckKey(), d.st); render(); },
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
    if (!confirm(`„${draft.name}“ wirklich löschen? Verlauf geht verloren.`)) return;
    S.habits = S.habits.filter((h) => h.id !== draft.id); delete S.log[draft.id]; delete S.freezeUsed[draft.id];
    save(); closeModal(); render();
  },
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
    sound('level'); save(); toast(`Springfield ist jetzt ${l.size}×${l.size} groß!`); render();
  },
  buyFreeze: () => { if (S.donuts < FREEZE_PRICE) return; S.donuts -= FREEZE_PRICE; S.freezes++; sound('buy'); save(); render(); },
  // Mehr
  claim: (d) => { const c = S.challenges.list[+d.i]; if (c.claimed || challengeProgress(c) < c.target) return; c.claimed = true; reward(c.reward, 0, `Herausforderung geschafft! +${c.reward} 🍩`); render(); },
  charSheet: (d) => charSheet(d.id),
  equip: (d) => { S.chars[d.id].cosmetic = d.c || null; save(); charSheet(d.id); render(); },
  setMain: (d) => { S.main = d.id; save(); charSheet(d.id); render(); },
  barTap: (d, el) => { el.parentElement.querySelectorAll('.b').forEach((b) => b !== el && b.classList.remove('hl')); el.classList.toggle('hl'); },
  saveJournal: () => {
    const t = today(), txt = $('#jtext').value;
    const first = !(S.journal[t] || '').trim() && txt.trim();
    if (txt.trim()) S.journal[t] = txt; else delete S.journal[t];
    if (first && !S.journalRewarded?.includes(t)) {
      S.journalRewarded = [...(S.journalRewarded || []).slice(-30), t];
      reward(REWARDS.journal, REWARDS.journalXp, `+${REWARDS.journal} 🍩 Das Reifenfeuer lodert!`);
    } else { save(); toast('Gespeichert.'); }
    render();
  },
  todoAdd: () => { const v = $('#todoin').value.trim(); if (!v) return; S.todos.push({ id: uid(), text: v, done: false, rewarded: false }); save(); render(); $('#todoin').focus(); },
  todoToggle: (d) => {
    const x = byId(S.todos, d.id); x.done = !x.done; x.doneAt = x.done ? today() : null;
    if (x.done && !x.rewarded) { x.rewarded = true; reward(REWARDS.todo, 1, `+${REWARDS.todo} 🍩`); } else save();
    render();
  },
  todoDel: (d) => { S.todos = S.todos.filter((x) => x.id !== d.id); save(); render(); },
  todoClear: () => { S.todos = S.todos.filter((x) => !x.done); save(); render(); },
  saveSettings: () => {
    S.name = $('#setname').value.trim() || S.name;
    S.settings.breakMin = Math.max(1, Math.min(30, +$('#setbreak').value || 5));
    save(); toast('Gespeichert.'); render();
  },
  export: () => {
    const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `springfield-backup-${today()}.json`;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
  if (el.dataset.act === 'set') { S.settings[el.dataset.k] = el.checked; if (el.dataset.k === 'stopwatch' && el.checked) S.settings.hardcore = false; save(); if (tab === 'focus') render(); }
  if (el.dataset.act === 'charHome') { S.chars[el.dataset.id].home = el.checked; save(); }
  if (el.id === 'importfile' && el.files[0]) {
    el.files[0].text().then((txt) => {
      const data = JSON.parse(txt);
      if (!data || !Array.isArray(data.habits) || !data.map) throw new Error('Ungültige Datei');
      if (!confirm('Backup laden? Der aktuelle Spielstand wird ersetzt.')) return;
      S = Object.assign(freshState(), data); migrateMap(); save(); World.reset(); render(); toast('Backup geladen.');
    }).catch(() => toast('Datei konnte nicht gelesen werden.'));
  }
});
document.addEventListener('input', (e) => { if (e.target.id === 'fnote' && run()) { run().note = e.target.value; save(); } });
document.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.id === 'todoin') actions.todoAdd(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { if (S.lastCheck < addDays(today(), -1)) processMissedDays(); tickClock(); if (!run()) document.title = 'Springfield Habits'; } });

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
  World.init();
  processMissedDays();
  ensureChallenges();
  if (location.hash === '#checkin' && S.started) { tab = 'habits'; history.replaceState(null, '', location.pathname); }
  render();
  remindInit();
}
clockTimer = setInterval(() => { if (run()) tickClock(); else if (document.title !== 'Springfield Habits') document.title = 'Springfield Habits'; }, 500);
if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
