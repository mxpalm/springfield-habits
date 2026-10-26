// Quests: Fragebogen beim Start, Hauptquests mit Kapiteln und Unterquests.
// Die Inhalte (Ziele, Fragen, Unterquests, Quellen) stehen in questdata.js.
'use strict';

/* ---------- Schwierigkeit & Belohnung ---------- */
// habit: [Donuts, XP] pro erledigtem Tag · task: einmalig · mastery: erledigte Tage, bis die Unterquest im Kapitel als geschafft zählt.
// Belohnung steigt schneller als der Aufwand (ca. 1× / 2,5× / 6×), damit sich schwere Quests trotz geringerer Erfolgsquote lohnen
// (Heuristik aus der Gamification-Recherche, nicht direkt getestet). Abschluss einer Hauptquest = „episch“.
const DIFF = {
  easy:   { label: 'Leicht', cls: 'd-easy',   habit: [3, 2],  task: [10, 8],  mastery: 10 },
  medium: { label: 'Mittel', cls: 'd-medium', habit: [7, 5],  task: [25, 18], mastery: 14 },
  hard:   { label: 'Schwer', cls: 'd-hard',   habit: [15, 10], task: [60, 40], mastery: 21 },
};
// Comeback-Bonus: In der Gym-Megastudie (Milkman et al. 2021) wirkte eine kleine Belohnung fürs Zurückkommen nach einer Lücke am besten.
const COMEBACK = 5;
const CARD_REWARD = [3, 5];
const STAGE_REWARD = [40, 30];
const QUEST_REWARD = [150, 100];
const TYPE_LABEL = { habit: 'Gewohnheit', task: 'Einmalig', card: 'Wissen' };
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

const goalOf = (q) => byId(QUEST_GOALS, q.goal);
const subOf = (q, key) => goalOf(q).subs.find((s) => s.key === key);
const questOfHabit = (h) => h.quest && (S.quests || []).find((q) => q.id === h.quest);
const activeQuests = () => (S.quests || []).filter((q) => q.status === 'active');
const okCount = (h) => Object.values(S.log[h.id] || {}).filter(okStatus).length;
// Wöchentliche Gewohnheiten: Ziel = n pro Woche über 3 / 4 / 6 Wochen
const WEEKS = { easy: 3, medium: 4, hard: 6 };
const masteryOf = (s) => s.sched?.type === 'weekly' ? s.sched.n * WEEKS[s.diff] : DIFF[s.diff].mastery;

/* ---------- Fragebogen ---------- */
// Allgemeine Fragen; die zielspezifischen Fragen kommen aus QUEST_GOALS[].questions.
const QUIZ = {
  energy: { title: 'Wann hast du am meisten Energie?', sub: 'Schwere Aufgaben legen wir in dein Hoch.', kind: 'single', opts: [
    ['morning', '🌅 Morgens'], ['midday', '☀️ Mittags'], ['evening', '🌙 Abends'], ['varies', '🎲 Ganz unterschiedlich']] },
  wake: { title: 'Wann stehst du meistens auf?', kind: 'single', opts: [
    ['5', 'vor 6 Uhr'], ['6', '6–7 Uhr'], ['7', '7–8 Uhr'], ['8', '8–9 Uhr'], ['9', 'nach 9 Uhr'], ['x', 'Sehr unregelmäßig']] },
  bed: { title: 'Und wann gehst du schlafen?', kind: 'single', opts: [
    ['21', 'vor 22 Uhr'], ['22', '22–23 Uhr'], ['23', '23–24 Uhr'], ['24', '0–1 Uhr'], ['25', 'nach 1 Uhr'], ['x', 'Sehr unregelmäßig']] },
  anchors: { title: 'Was machst du schon jeden Tag?', sub: 'Neue Gewohnheiten hängen wir an feste Routinen an („Nach dem Kaffee …“). Das wirkt laut Studien besser als eine Uhrzeit.', kind: 'multi', opts: [
    ['coffee', '☕ Kaffee/Tee am Morgen'], ['brushAM', '🪥 Zähneputzen morgens'], ['shower', '🚿 Duschen'], ['breakfast', '🥣 Frühstück'],
    ['commute', '🚌 Pendeln'], ['desk', '💻 An den Schreibtisch setzen'], ['lunch', '🥪 Mittagessen'], ['home', '🏠 Nach Hause kommen'],
    ['dinner', '🍝 Abendessen'], ['brushPM', '🪥 Zähneputzen abends'], ['bed', '🛏️ Ins Bett legen']] },
  budget: { title: 'Wie viel Zeit willst du täglich investieren?', sub: 'Lieber klein anfangen und dranbleiben.', kind: 'single', opts: [
    ['5', '⏱ 5 Minuten'], ['15', '⏱ 15 Minuten'], ['30', '⏱ 30 Minuten'], ['60', '⏱ 1 Stunde oder mehr']] },
  pace: { title: 'Wie willst du starten?', kind: 'single', opts: [
    ['easy', '🐢 Sanft – ganz kleine Schritte'], ['normal', '🚶 Normal'], ['hard', '🚀 Ambitioniert – fordere mich']] },
  fails: { title: 'Woran sind frühere Vorsätze gescheitert?', sub: 'Ehrlich sein hilft – wir planen dagegen.', kind: 'multi', opts: [
    ['toomuch', 'Zu viel auf einmal'], ['forgot', 'Einfach vergessen'], ['bored', 'Langweilig geworden'], ['streak', 'Ein verpasster Tag und ich habe aufgegeben'],
    ['time', 'Keine Zeit'], ['new', 'Hab’s noch nie richtig versucht']] },
};
// Verankerung: Unterquest-Anker → Routine-Antworten (erste passende gewinnt)
const ANCHOR_SRC = {
  morning: [['coffee', 'Nach dem ersten Kaffee'], ['brushAM', 'Nach dem Zähneputzen am Morgen'], ['breakfast', 'Nach dem Frühstück'], ['shower', 'Nach dem Duschen']],
  work: [['desk', 'Wenn ich mich an den Schreibtisch setze'], ['commute', 'Wenn ich angekommen bin']],
  midday: [['lunch', 'Nach dem Mittagessen']],
  evening: [['home', 'Wenn ich nach Hause komme'], ['dinner', 'Nach dem Abendessen']],
  bed: [['brushPM', 'Nach dem Zähneputzen am Abend'], ['bed', 'Wenn ich mich ins Bett lege']],
};
const ANCHOR_FALLBACK = { morning: 'Direkt nach dem Aufstehen', work: 'Zu Beginn meiner Arbeitszeit', midday: 'In der Mittagspause', evening: 'Am frühen Abend', bed: 'Eine Stunde vor dem Schlafen' };
function cueFor(s, a) {
  if (s.cue) return s.cue;
  const anchor = s.anchor;
  if (!anchor) return '';
  const hit = (ANCHOR_SRC[anchor] || []).find(([id]) => (a.anchors || []).includes(id));
  return hit ? hit[1] : ANCHOR_FALLBACK[anchor] || '';
}

let quiz = null; // { step, a }
function quizSteps(a) {
  const steps = [{ id: 'intro', kind: 'intro' }, { id: 'goals', kind: 'multi', title: 'Was willst du verbessern?', sub: 'Wähle alles, was dich reizt. Die wichtigsten werden deine ersten Hauptquests.',
    opts: QUEST_GOALS.map((g) => [g.id, `${g.emoji} ${g.name}`]), max: 6 }];
  const sel = a.goals || [];
  if (sel.length > 1) steps.push({ id: 'prio', kind: 'rank', title: 'Was ist dir am wichtigsten?', sub: 'Tippe in Reihenfolge – bis zu drei. Platz 1 wird deine erste Quest.', opts: sel.map((id) => { const g = byId(QUEST_GOALS, id); return [id, `${g.emoji} ${g.name}`]; }), max: 3 });
  for (const id of sel) for (const q of byId(QUEST_GOALS, id).questions || []) steps.push({ id: `${id}.${q.id}`, kind: q.multi ? 'multi' : 'single', title: q.q, sub: q.sub, opts: q.opts, goal: id });
  for (const k of ['energy', 'wake', 'bed', 'anchors', 'budget', 'pace', 'fails']) steps.push({ id: k, ...QUIZ[k] });
  const top = topGoals(a)[0];
  if (top) {
    const g = byId(QUEST_GOALS, top);
    steps.push({ id: 'woopO', kind: 'text', goal: top, title: `Stell dir vor: „${g.name}“ ist geschafft.`, sub: 'Was ist das Beste daran? Ein Satz reicht. (Das gedankliche Gegenüberstellen von Wunsch und Hindernis – „WOOP“ – erhöht laut Studien die Umsetzung.)', ph: g.woopPh || 'z. B. Ich fühle mich ruhiger und schaffe mehr.' });
    steps.push({ id: 'woopH', kind: 'single', goal: top, title: 'Was wird dir am ehesten im Weg stehen?', sub: 'Wir machen daraus einen Wenn-dann-Plan.', opts: g.obstacles.map((o) => [o.id, o.label]) });
  }
  steps.push({ id: 'summary', kind: 'summary' });
  return steps;
}
function topGoals(a) {
  const sel = a.goals || [], pr = (a.prio || []).filter((id) => sel.includes(id));
  return [...pr, ...sel.filter((id) => !pr.includes(id))];
}
const ansOf = (a, goal, qid) => a[`${goal}.${qid}`];

function quizView() {
  const steps = quizSteps(quiz.a), st = steps[quiz.step], a = quiz.a, n = steps.length;
  const val = a[st.id];
  const head = `<div class="quizhead"><button class="rbtn small" data-act="qzBack" aria-label="Zurück">${ICON.back}</button>
    <div class="qzbar"><i style="width:${Math.round((quiz.step / (n - 1)) * 100)}%"></i></div><span class="small">${quiz.step + 1}/${n}</span></div>`;
  const c = mainChar(), lisa = byId(CHARACTERS, 'lisa');
  if (st.kind === 'intro') return `${head}<div class="quizhost">${avatarSvg(lisa, null, 120)}<div class="speech">Hi${S.name ? ' ' + esc(S.name) : ''}! Ich bin Lisa. Ich stelle dir ein paar Fragen und baue daraus deine Quests – mit Methoden, die in Studien funktioniert haben.</div></div>
    <div class="card"><p style="margin-top:0"><b>So funktioniert’s:</b></p>
    <p>🏆 <b>Hauptquests</b> sind deine großen Ziele, z. B. „Konzentration stärken“.</p>
    <p>🧩 Jede Hauptquest hat <b>Kapitel</b> mit kleinen <b>Unterquests</b>: tägliche Gewohnheiten, einmalige Aufgaben und Wissenskarten mit Quellen.</p>
    <p>🍩 Je schwerer die Unterquest, desto mehr Donuts und XP.</p>
    <p class="small muted" style="margin-bottom:0">Dauert etwa 3 Minuten. Du kannst alles später ändern.</p></div>
    <button class="btn pink big block" data-act="qzNext">Los geht’s!</button>
    <button class="btn white block" style="margin-top:10px" data-act="qzSkip">Überspringen</button>`;
  if (st.kind === 'summary') {
    const plan = planQuests(a);
    return `${head}<div class="quizhost">${avatarSvg(c, cosmeticOf(c.id), 110)}<div class="speech">Fertig! Das sind deine Quests.</div></div>
      ${plan.main.map((g, i) => `<div class="card qsum"><div class="row"><span class="qemo">${g.emoji}</span><div class="grow"><div class="qkick">Hauptquest ${i + 1}</div><b style="font-size:18px">${esc(g.name)}</b>
        <div class="small muted">${g.stages.length} Kapitel · ${g.subs.length} Unterquests</div></div></div>
        <div class="small" style="margin-top:8px"><b>Kapitel 1:</b> ${esc(g.stages[0].name)}</div>
        <ul class="qlist">${stageSubs(g, 0, a).map((s) => `<li>${typeIcon(s.type)} ${esc(s.title)} <span class="dchip ${DIFF[s.diff].cls}">${DIFF[s.diff].label}</span></li>`).join('')}</ul></div>`).join('')}
      ${plan.later.length ? `<div class="card"><b>Für später</b><div class="small muted">${plan.later.map((g) => `${g.emoji} ${esc(g.name)}`).join(' · ')}</div><div class="small muted" style="margin-top:4px">Starten, sobald du eine Quest geschafft hast oder dich bereit fühlst.</div></div>` : ''}
      <button class="btn pink big block" data-act="qzFinish">Quests annehmen!</button>`;
  }
  const opts = st.opts || [];
  let body;
  if (st.kind === 'text') body = `<textarea class="in" id="qztext" style="min-height:90px" placeholder="${esc(st.ph || '')}" maxlength="140">${esc(val || '')}</textarea>`;
  else if (st.kind === 'rank') body = `<div class="qopts">${opts.map(([v, l]) => { const r = (val || []).indexOf(v); return `<button class="qopt ${r >= 0 ? 'on' : ''}" data-act="qzPick" data-v="${v}">${r >= 0 ? `<span class="rank">${r + 1}</span>` : ''}${l}</button>`; }).join('')}</div>`;
  else body = `<div class="qopts">${opts.map(([v, l]) => { const on = st.kind === 'multi' ? (val || []).includes(v) : val === v; return `<button class="qopt ${on ? 'on' : ''}" data-act="qzPick" data-v="${v}">${l}</button>`; }).join('')}</div>`;
  const ok = st.kind === 'text' || (st.kind === 'single' ? !!val : (val || []).length > 0) || st.id === 'fails' || st.id === 'anchors';
  const g = st.goal && byId(QUEST_GOALS, st.goal);
  return `${head}${g ? `<div class="qkick" style="margin:0 4px 6px">${g.emoji} ${esc(g.name)}</div>` : ''}
    <h1 class="qtitle">${esc(st.title)}</h1>${st.sub ? `<p class="small" style="margin:-6px 4px 12px">${esc(st.sub)}</p>` : ''}
    ${body}
    ${st.kind !== 'single' ? `<button class="btn pink big block" style="margin-top:16px" data-act="qzNext" ${ok ? '' : 'disabled'}>Weiter</button>` : ''}`;
}
const typeIcon = (t) => ({ habit: '🔁', task: '🎯', card: '📖' }[t]);

function stageSubs(g, i, a) { return g.subs.filter((s) => s.stage === i + 1 && !skipSub(s, a)); }
// skipIf: Antwort zeigt, dass es schon klappt · onlyIf: nur bei passender Antwort (qid = 'ziel.frage')
const answered = (a, [qid, vals]) => { const v = a[qid]; return Array.isArray(v) ? v.some((x) => vals.includes(x)) : vals.includes(v); };
function skipSub(s, a) {
  if (s.skipIf && answered(a, s.skipIf)) return true;
  if (s.onlyIf && a[s.onlyIf[0]] !== undefined && !answered(a, s.onlyIf)) return true;
  return false;
}
// Wie viele Hauptquests parallel: Zeitbudget, Tempo und frühere Probleme (Forschung: wenige Gewohnheiten gleichzeitig)
function planQuests(a) {
  const order = topGoals(a).map((id) => byId(QUEST_GOALS, id));
  let n = { 5: 1, 15: 1, 30: 2, 60: 3 }[a.budget] || 1;
  if (a.pace === 'hard') n++;
  if (a.pace === 'easy' || (a.fails || []).includes('toomuch')) n--;
  n = Math.max(1, Math.min(3, n, order.length));
  return { main: order.slice(0, n), later: order.slice(n) };
}

function generateQuests(a) {
  // Alte Quest-Gewohnheiten archivieren (Verlauf bleibt erhalten)
  for (const h of S.habits) if (h.quest) h.archived = true;
  const plan = planQuests(a);
  S.quests = [...plan.main.map((g) => newQuest(g, 'active', a)), ...plan.later.map((g) => newQuest(g, 'queued', a))];
  for (const q of activeQuests()) activateStage(q);
  if ((a.fails || []).includes('streak')) S.freezes = Math.max(S.freezes, 2); // Rückschläge abfedern
  S.profile = { answers: a, done: true, at: today() };
  save();
}
function newQuest(g, status, a) {
  const top = topGoals(a)[0] === g.id;
  const ob = top && g.obstacles.find((o) => o.id === a.woopH);
  return { id: uid(), goal: g.id, status, stage: 0, started: status === 'active' ? today() : null, subs: {},
    woop: top ? { outcome: a.woopO || '', obstacle: ob ? ob.label : '', plan: ob ? ob.plan : '' } : null };
}
function activateStage(q) {
  const g = goalOf(q), a = S.profile?.answers || quiz?.a || {};
  for (const s of g.subs.filter((x) => x.stage === q.stage + 1)) {
    if (q.subs[s.key]) continue;
    if (skipSub(s, a)) { q.subs[s.key] = { state: 'skip' }; continue; }
    const rec = { state: 'active' };
    if (s.type === 'habit') {
      let sched = s.sched || { type: 'days', days: ALL_DAYS, n: 2 };
      if (sched.type === 'weekly') sched = { type: 'weekly', days: ALL_DAYS, n: sched.n };
      const h = { id: uid(), name: s.title, emoji: s.emoji || g.emoji, group: g.name, minimum: s.min || '', schedule: sched, created: today(),
        quest: q.id, sub: s.key, diff: s.diff, cue: cueFor(s, a), remind: anchorTime(s.anchor, a) };
      S.habits.push(h); rec.habitId = h.id;
      // Steigerung: die neue Gewohnheit löst eine leichtere ab
      const old = s.replaces && q.subs[s.replaces];
      if (old && old.habitId) { const oh = byId(S.habits, old.habitId); if (oh) oh.archived = true; if (old.state === 'active') old.state = 'done'; }
    }
    q.subs[s.key] = rec;
  }
}
// Fortschritt einer Unterquest (0–1)
function subProgress(q, s) {
  const r = q.subs[s.key];
  if (!r) return 0;
  if (r.state === 'done' || r.state === 'skip') return 1;
  if (s.type === 'habit') { const h = byId(S.habits, r.habitId); return h ? Math.min(1, okCount(h) / masteryOf(s)) : 0; }
  return 0;
}
function stageProgress(q, i = q.stage) {
  const subs = goalOf(q).subs.filter((s) => s.stage === i + 1);
  return subs.length ? subs.reduce((t, s) => t + subProgress(q, s), 0) / subs.length : 1;
}
function questProgress(q) {
  const g = goalOf(q);
  return g.subs.reduce((t, s) => t + (s.stage - 1 < q.stage ? 1 : s.stage - 1 === q.stage ? subProgress(q, s) : 0), 0) / g.subs.length;
}
// Nach jeder Änderung prüfen: Kapitel geschafft? Quest geschafft?
function questCheck() {
  for (const q of activeQuests()) {
    const g = goalOf(q);
    for (const s of g.subs) {
      const r = q.subs[s.key];
      if (r && r.state === 'active' && s.type === 'habit' && subProgress(q, s) >= 1) { r.state = 'done'; r.doneAt = today(); sound('sub'); toast(`🏅 Unterquest gemeistert: ${s.title}`); }
    }
    // while: ein neues Kapitel kann sofort fertig sein (alle Unterquests übersprungen)
    while (q.status === 'active' && stageProgress(q) >= 1 && q.stage + 1 < g.stages.length) {
      const name = g.stages[q.stage].name;
      q.stage++; activateStage(q); sound('chapter');
      reward(STAGE_REWARD[0], STAGE_REWARD[1], `📗 Kapitel geschafft: ${name}! +${STAGE_REWARD[0]} 🍩`);
    }
    if (stageProgress(q) < 1) continue;
    q.status = 'done'; q.doneAt = today();
    const locked = CHARACTERS.filter((c) => !S.chars[c.id]), c = locked.length ? pick(locked) : null;
    if (c) unlockChar(c.id);
    reward(QUEST_REWARD[0], QUEST_REWARD[1]);
    sound('quest');
    openModal(`<div class="reveal"><div style="font-size:60px">🏆</div><h2>Hauptquest geschafft!</h2><p><b>${esc(g.name)}</b><br>+${QUEST_REWARD[0]} Donuts · +${QUEST_REWARD[1]} XP</p>
      ${c ? `<div class="card" style="background:#fffbe0"><div class="pv">${avatarSvg(c, null, 90)}</div><h3>${esc(c.name)} zieht nach Springfield!</h3></div>` : ''}
      <p class="small muted">Deine Gewohnheiten laufen weiter – jetzt sind sie Teil von dir.</p></div>
      <button class="btn block" data-act="close">Woohoo!</button>`);
  }
  save();
}

/* ---------- Ansichten ---------- */
let checkTab = 'today';
function checkinTabs() {
  return `<div class="seg"><button class="${checkTab === 'today' ? 'on' : ''}" data-act="ckTab" data-t="today">📋 Heute</button><button class="${checkTab === 'quests' ? 'on' : ''}" data-act="ckTab" data-t="quests">🏆 Quests</button></div>`;
}
function subRow(q, s) {
  const r = q.subs[s.key] || {}, d = DIFF[s.diff], done = r.state === 'done' || r.state === 'skip';
  const [dn] = s.type === 'card' ? CARD_REWARD : s.type === 'task' ? d.task : d.habit;
  let right;
  if (!r.state) right = '<span class="small muted">🔒</span>';
  else if (s.type === 'habit') { const h = byId(S.habits, r.habitId); right = `<span class="small"><b>${h ? Math.min(okCount(h), masteryOf(s)) : 0}/${masteryOf(s)}</b></span>`; }
  else right = done ? '<span class="tick on">✓</span>' : `<span class="price small">+${dn}${donutSvg(13)}</span>`;
  return `<button class="subq ${done ? 'done' : ''} ${r.state ? '' : 'locked'}" data-act="subOpen" data-q="${q.id}" data-k="${s.key}">
    <span class="ti">${typeIcon(s.type)}</span><span class="grow"><span class="nm">${esc(s.title)}</span>
    <span class="meta"><span class="dchip ${d.cls}">${d.label}</span> ${TYPE_LABEL[s.type]}${s.type === 'habit' && s.sched?.type === 'weekly' ? ` · ${s.sched.n}× pro Woche` : ''}</span>
    ${s.type === 'habit' && r.state === 'active' ? `<span class="pbar"><i style="width:${subProgress(q, s) * 100}%"></i></span>` : ''}</span>${right}</button>`;
}
function questsView() {
  if (!S.quests || !S.quests.length) return `<div class="card empty"><div style="font-size:48px">🗺️</div><p>Noch keine Quests.<br>Beantworte ein paar Fragen und Lisa baut dir passende Quests.</p>
    <button class="btn pink" data-act="qzStart">Fragebogen starten</button></div>`;
  const act = activeQuests(), queued = S.quests.filter((q) => q.status === 'queued'), done = S.quests.filter((q) => q.status === 'done');
  const host = (g) => byId(CHARACTERS, g.host) || mainChar();
  return act.map((q) => {
    const g = goalOf(q), pct = Math.round(questProgress(q) * 100);
    return `<div class="card quest">
      <div class="row"><span class="qface">${avatarSvg(host(g), null, 64, true)}</span><div class="grow"><div class="qkick">Hauptquest · ${pct} %</div>
        <div class="qname">${g.emoji} ${esc(g.name)}</div><div class="pbar big"><i style="width:${pct}%"></i></div></div></div>
      ${q.woop && q.woop.plan ? `<div class="woop"><b>Dein Plan:</b> ${esc(q.woop.plan)}${q.woop.outcome ? `<div class="small muted" style="margin-top:3px">Dafür: „${esc(q.woop.outcome)}“</div>` : ''}</div>` : ''}
      ${g.stages.map((stg, i) => {
        const state = i < q.stage ? 'done' : i === q.stage ? 'now' : 'next';
        return `<details class="stage ${state}" ${state === 'now' ? 'open' : ''}><summary><span class="sn">${state === 'done' ? '✓' : i + 1}</span><span class="grow">Kapitel ${i + 1}: ${esc(stg.name)}</span>
          ${state === 'now' ? `<span class="small">${Math.round(stageProgress(q) * 100)} %</span>` : state === 'next' ? '<span class="small muted">🔒</span>' : ''}</summary>
          ${stg.intro ? `<p class="small muted" style="margin:4px 2px 8px">${esc(stg.intro)}</p>` : ''}
          ${g.subs.filter((s) => s.stage === i + 1).map((s) => subRow(q, s)).join('')}</details>`;
      }).join('')}
      <div class="small muted" style="margin-top:6px">Kapitel geschafft: +${STAGE_REWARD[0]} 🍩 · Hauptquest geschafft: +${QUEST_REWARD[0]} 🍩 und eine neue Figur</div>
    </div>`;
  }).join('') + (queued.length ? `<h2>Für später</h2>${queued.map((q) => { const g = goalOf(q); return `<div class="card row"><span class="qemo">${g.emoji}</span><b class="grow">${esc(g.name)}</b><button class="btn small" data-act="qStart" data-q="${q.id}">Starten</button></div>`; }).join('')}` : '')
    + (done.length ? `<h2>Geschafft</h2>${done.map((q) => `<div class="card row"><span class="qemo">🏆</span><b class="grow">${esc(goalOf(q).name)}</b><span class="small muted">${parseKey(q.doneAt).toLocaleDateString('de-DE')}</span></div>`).join('')}` : '')
    + `<button class="btn white block" data-act="qzStart">🔄 Fragebogen neu machen</button>
    <p class="small muted center">Neue Antworten erzeugen neue Quests. Dein bisheriger Verlauf bleibt in den Statistiken.</p>`;
}
function subSheet(q, s) {
  const r = q.subs[s.key] || {}, d = DIFF[s.diff], g = goalOf(q);
  const [dn, dx] = s.type === 'card' ? CARD_REWARD : s.type === 'task' ? d.task : d.habit;
  const h = r.habitId && byId(S.habits, r.habitId);
  const link = (x) => x ? `<a href="${esc(x[1])}" target="_blank" rel="noopener">${esc(x[0])} ↗</a>` : '';
  openModal(`<div class="qkick">${g.emoji} ${esc(g.name)} · Kapitel ${s.stage}</div><h2 style="margin:4px 0 8px">${typeIcon(s.type)} ${esc(s.title)}</h2>
    <div class="row wrap" style="gap:6px;margin-bottom:10px"><span class="dchip ${d.cls}">${d.label}</span><span class="dchip">${TYPE_LABEL[s.type]}</span>
      <span class="dchip">+${dn} 🍩 · +${dx} XP${s.type === 'habit' ? ' pro Tag' : ''}</span></div>
    ${s.type === 'habit' && h?.cue ? `<div class="woop"><b>Wenn-dann:</b> ${esc(h.cue)} → ${esc(s.title)}.</div>` : ''}
    ${s.how ? `<p><b>So geht’s:</b> ${esc(s.how)}</p>` : ''}
    <p><b>Warum es wirkt:</b> ${esc(s.why)}</p>
    ${s.min ? `<p><b>Minimum an schlechten Tagen:</b> ${esc(s.min)}</p>` : ''}
    ${s.type === 'habit' ? `<p class="small muted">Gemeistert nach ${masteryOf(s)}× erledigt${h ? ` (bisher ${Math.min(okCount(h), masteryOf(s))})` : ''}. Abhaken unter „Heute“.</p>` : ''}
    <div class="sources">${s.src ? `<div>📚 Studie: ${link(s.src)}</div>` : ''}${s.learn ? `<div>💡 Mehr erfahren: ${link(s.learn)}</div>` : ''}</div>
    <div class="row" style="margin-top:14px"><button class="btn white grow" data-act="close">Schließen</button>
      ${r.state === 'active' && s.type !== 'habit' ? `<button class="btn green grow" data-act="subDone" data-q="${q.id}" data-k="${s.key}">${s.type === 'card' ? '✓ Gelesen' : '✓ Erledigt'}</button>` : ''}</div>`);
}

/* ---------- Aktionen ---------- */
Object.assign(actions, {
  qzStart: () => { quiz = { step: 0, a: {} }; tab = 'quiz'; closeModal(); render(); },
  qzSkip: () => { quiz = null; S.profile = { answers: {}, done: false, at: today() }; tab = 'home'; save(); render(); toast('Du kannst den Fragebogen jederzeit im Check-in unter „Quests“ machen.'); },
  qzBack: () => { if (quiz.step === 0) { quiz = null; tab = S.started ? 'home' : tab; render(); return; } quiz.step--; render(); },
  qzPick: (d) => {
    const st = quizSteps(quiz.a)[quiz.step], a = quiz.a;
    if (st.kind === 'single') { a[st.id] = d.v; quiz.step++; render(); $('#page').scrollTop = 0; return; }
    const cur = a[st.id] || [];
    a[st.id] = cur.includes(d.v) ? cur.filter((x) => x !== d.v) : st.max && cur.length >= st.max ? cur : [...cur, d.v];
    render();
  },
  qzNext: () => {
    const st = quizSteps(quiz.a)[quiz.step];
    if (st.kind === 'text') quiz.a[st.id] = $('#qztext').value.trim();
    quiz.step++; render(); $('#page').scrollTop = 0;
  },
  qzFinish: () => {
    generateQuests(quiz.a); quiz = null; tab = 'habits'; checkTab = 'quests'; render();
    toast('Deine Quests sind bereit! Fang mit Kapitel 1 an.');
  },
  ckTab: (d) => { checkTab = d.t; render(); },
  subOpen: (d) => { const q = S.quests.find((x) => x.id === d.q); const s = subOf(q, d.k); if (q.subs[s.key]) subSheet(q, s); else toast('Wird in einem späteren Kapitel freigeschaltet.'); },
  subDone: (d) => {
    const q = S.quests.find((x) => x.id === d.q), s = subOf(q, d.k), r = q.subs[s.key];
    if (r.state !== 'active') return;
    r.state = 'done'; r.doneAt = today();
    const [dn, dx] = s.type === 'card' ? CARD_REWARD : DIFF[s.diff].task;
    sound('done'); closeModal();
    reward(dn, dx, `+${dn} 🍩 ${s.type === 'card' ? 'Wieder was gelernt!' : 'Aufgabe erledigt!'}`);
    questCheck(); render();
  },
  qStart: (d) => {
    const q = S.quests.find((x) => x.id === d.q);
    if (activeQuests().length >= 3) return toast('Höchstens drei Hauptquests gleichzeitig – schließ erst eine ab.');
    q.status = 'active'; q.started = today(); activateStage(q); save(); render();
  },
});

// Wird von setStatus aufgerufen: Bonus, wenn nach einem verpassten fälligen Tag wieder erledigt wird
function comebackBonus(h, k) {
  if (h.schedule.type === 'weekly') return 0;
  let p = addDays(k, -1);
  for (let i = 0; i < 14 && p >= h.created && !isDue(h, p); i++) p = addDays(p, -1);
  if (p < h.created || !isDue(h, p) || okStatus(status(h, p)) || frozen(h, p)) return 0;
  const before = addDays(p, -1); // nur wenn es davor schon mal geklappt hat
  return Object.keys(S.log[h.id] || {}).some((d) => d <= before && okStatus(S.log[h.id][d])) ? COMEBACK : 0;
}
