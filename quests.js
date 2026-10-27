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
  rhythm: { title: 'Was bestimmt deine Schlafenszeiten?', sub: 'Damit wir dir keine Tipps geben, die bei dir gerade nicht gehen.', kind: 'single', opts: [
    ['free', '🙂 Hauptsächlich ich selbst'], ['shift', '🔁 Schichtdienst'], ['kids', '🎈 Kleine Kinder']] },
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
  if (quiz?.top) return quiz.top;
  const steps = [{ id: 'intro', kind: 'intro' }, { id: 'goals', kind: 'multi', title: 'Was willst du verbessern?', sub: 'Wähle alles, was dich reizt. Die wichtigsten werden deine ersten Hauptquests.',
    opts: QUEST_GOALS.map((g) => [g.id, `${g.emoji} ${g.name}`]), max: 6 }];
  const sel = a.goals || [];
  if (sel.length > 1) steps.push({ id: 'prio', kind: 'rank', title: 'Was ist dir am wichtigsten?', sub: 'Tippe in Reihenfolge – bis zu drei. Platz 1 wird deine erste Quest.', opts: sel.map((id) => { const g = byId(QUEST_GOALS, id); return [id, `${g.emoji} ${g.name}`]; }), max: 3 });
  for (const id of sel) for (const q of byId(QUEST_GOALS, id).questions || []) steps.push({ id: `${id}.${q.id}`, kind: q.multi ? 'multi' : 'single', title: q.q, sub: q.sub, opts: q.opts, goal: id });
  const rhythm = sel.some((id) => id === 'sleep' || id === 'morning') ? ['rhythm'] : [];
  for (const k of [...rhythm, 'energy', 'wake', 'bed', 'anchors', 'budget', 'pace', 'fails']) steps.push({ id: k, ...QUIZ[k] });
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
  if (st.kind === 'tintro') return `${head}<div class="quizhost">${avatarSvg(lisa, null, 120)}<div class="speech">${quiz.edit
      ? 'Hier kannst du deine Antworten ändern. Ich passe deine laufenden Quests daran an – ohne Neustart.'
      : `Seit deinem Fragebogen sind ${quiz.top.length - 2 === 1 ? 'eine neue Frage' : `${quiz.top.length - 2} neue Fragen`} dazugekommen. Damit passe ich deine Quests genauer an dich an.`}</div></div>
    <div class="card"><p style="margin-top:0">✓ <b>Geschafftes bleibt geschafft</b> – Kapitel, Streaks und Donuts behältst du.</p>
    <p>🔄 Aufgaben, die nicht mehr passen, nehme ich raus. Passende kommen dazu.</p>
    <p style="margin-bottom:0">👀 Vor dem Übernehmen siehst du genau, was sich ändert.</p></div>
    <button class="btn pink big block" data-act="qzNext">Los geht’s</button>
    <button class="btn white block" style="margin-top:10px" data-act="qzBack">Später</button>`;
  if (st.kind === 'tsum') {
    const ch = adaptQuests(a, true);
    const li = (s, txt) => `<li>${typeIcon(s.type)} ${esc(s.title)}${txt ? ` <span class="small muted">· ${txt}</span>` : ''}</li>`;
    return `${head}<div class="quizhost">${avatarSvg(lisa, null, 110)}<div class="speech">${ch.length ? 'Danke! Das ändert sich:' : 'Danke! Deine Quests passen schon – nichts zu ändern.'}</div></div>
      ${ch.map((c) => { const g = goalOf(c.q); return `<div class="card qsum"><div class="qkick">${g.emoji} ${esc(g.name)} · Kapitel ${c.q.stage + 1}${c.q.status === 'paused' ? ' · pausiert' : ''}</div>
        <ul class="qlist">${c.drop.map((s) => li(s, c.q.subs[s.key]?.habitId ? 'fällt weg, Verlauf bleibt in der Statistik' : 'fällt weg')).join('')}
          ${c.skip.map((s) => li(s, 'machst du schon – zählt als geschafft')).join('')}
          ${c.add.map((s) => li(s, 'neu dazu')).join('')}
          ${c.pick ? `<li>🧩 <b>Du wählst ${c.pick === 1 ? 'eine neue Aufgabe' : `${c.pick} neue Aufgaben`}</b></li>` : ''}</ul></div>`; }).join('')}
      <button class="btn pink big block" data-act="qzApply">${ch.length ? 'Übernehmen' : 'Fertig'}</button>`;
  }
  if (st.kind === 'summary') {
    const plan = planQuests(a);
    return `${head}<div class="quizhost">${avatarSvg(c, cosmeticOf(c.id), 110)}<div class="speech">Fertig! Das sind deine Quests.</div></div>
      ${plan.main.map((g, i) => `<div class="card qsum"><div class="row"><span class="qemo">${g.emoji}</span><div class="grow"><div class="qkick">Hauptquest ${i + 1}</div><b style="font-size:18px">${esc(g.name)}</b>
        <div class="small muted">${g.stages.length} Kapitel</div></div></div>
        <div class="small" style="margin-top:8px"><b>Kapitel 1:</b> ${esc(stageOf(g, 0, a).name)}</div>
        <ul class="qlist">${stageSubs(g, 0, a).map((s) => `<li>${typeIcon(s.type)} ${esc(s.title)} <span class="dchip ${DIFF[s.diff].cls}">${DIFF[s.diff].label}</span></li>`).join('')}
          ${pickCount(g, 0, a) ? `<li>🧩 <b>Du wählst ${pickCount(g, 0, a)} von ${poolOf(g, 0, a).length} Aufgaben</b>, die zu dir passen</li>` : ''}</ul></div>`).join('')}
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

// Feste Unterquests eines Kapitels (ohne Wahl-Aufgaben)
function stageSubs(g, i, a) { return g.subs.filter((s) => s.stage === i + 1 && !s.opt && !skipSub(s, a)); }
// skipIf: Antwort zeigt, dass es schon klappt · onlyIf: nur bei passender Antwort (qid = 'ziel.frage')
const answered = (a, [qid, vals]) => { const v = a[qid]; return Array.isArray(v) ? v.some((x) => vals.includes(x)) : vals.includes(v); };
const conds = (c) => (Array.isArray(c[0]) ? c : [c]);
// Unbeantwortete Fragen (alte Spielstände) schließen nichts aus
const fits = (s, a) => !s.onlyIf || conds(s.onlyIf).every((c) => a[c[0]] === undefined || answered(a, c));
function skipSub(s, a) {
  if (s.skipIf && answered(a, s.skipIf)) return true;
  return !fits(s, a);
}
const profileAns = () => S.profile?.answers || quiz?.a || {};

/* ---------- Kapitel-Varianten & Wahl-Aufgaben ---------- */
// alt: anderer Name/Intro je nach Startpunkt (z. B. ohne Freundeskreis)
function stageOf(g, i, a = profileAns()) { const st = g.stages[i]; return st.alt && answered(a, st.alt.if) ? { ...st, ...st.alt } : st; }
// Wahl-Aufgaben, die zur Person passen
const poolOf = (g, i, a) => g.subs.filter((s) => s.stage === i + 1 && s.opt && !skipSub(s, a));
// Sanfter Start (wenig Zeit, kleine Schritte, „zu viel auf einmal“): eine Aufgabe weniger
function pickCount(g, i, a) {
  const st = g.stages[i];
  if (!st.pick) return 0;
  const gentle = a.pace === 'easy' || a.budget === '5' || (a.fails || []).includes('toomuch');
  return Math.min(poolOf(g, i, a).length, Math.max(1, st.pick - (gentle ? 1 : 0)));
}
// Was im Kapitel zählt: feste Unterquests (die zur Person passen) + gewählte
// Geschaffte Unterquests bleiben sichtbar, auch wenn sie nach geänderten Antworten nicht mehr passen würden
function stageSubsOf(q, i) {
  const a = profileAns();
  return goalOf(q).subs.filter((s) => { const r = q.subs[s.key]; return s.stage === i + 1 && (r?.state === 'done' || (s.opt ? r && fits(s, a) : fits(s, a))); });
}
const canChoose = (g, i, a) => poolOf(g, i, a).length > pickCount(g, i, a);
// Geschaffte Wahl-Aufgaben, die nicht mehr im Angebot sind, belegen trotzdem einen Platz
const doneOutside = (q, g, i, a) => g.subs.filter((s) => s.stage === i + 1 && s.opt && q.subs[s.key]?.state === 'done' && skipSub(s, a)).length;
const pickSlots = (q, i = q.stage, a = profileAns()) => Math.max(0, pickCount(goalOf(q), i, a) - doneOutside(q, goalOf(q), i, a));
function needPick(q, i = q.stage) {
  const g = goalOf(q), a = profileAns();
  return Math.max(0, pickSlots(q, i, a) - poolOf(g, i, a).filter((s) => q.subs[s.key]).length);
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
// Feste Unterquests starten; Wahl-Aufgaben startet erst die Auswahl (pickSave)
function activateStage(q) {
  const g = goalOf(q), a = profileAns();
  for (const s of g.subs.filter((x) => x.stage === q.stage + 1 && !x.opt)) {
    if (q.subs[s.key]) continue;
    if (skipSub(s, a)) { q.subs[s.key] = { state: 'skip' }; continue; }
    activateSub(q, s, a);
  }
  // Nur so viele passende Wahl-Aufgaben wie Plätze: gleich alle starten, keine Scheinauswahl
  const i = q.stage;
  if (pickCount(g, i, a) && !canChoose(g, i, a)) for (const s of poolOf(g, i, a)) if (!q.subs[s.key]) activateSub(q, s, a);
}
function activateSub(q, s, a) {
  const g = goalOf(q), rec = { state: 'active' };
  if (s.type === 'habit') {
    let sched = s.sched || { type: 'days', days: ALL_DAYS, n: 2 };
    if (sched.type === 'weekly') sched = { type: 'weekly', days: ALL_DAYS, n: sched.n };
    const h = { id: uid(), name: s.title, emoji: s.emoji || g.emoji, group: g.name, minimum: s.min || '', schedule: sched, created: today(),
      quest: q.id, sub: s.key, diff: s.diff, cue: cueFor(s, a), remind: anchorTime(s.anchor, a) };
    if (s.count) h.count = { ...s.count };
    S.habits.push(h); rec.habitId = h.id;
    // Steigerung: die neue Gewohnheit löst eine leichtere ab
    const old = s.replaces && q.subs[s.replaces];
    if (old && old.habitId) { const oh = byId(S.habits, old.habitId); if (oh) oh.archived = true; if (old.state === 'active') old.state = 'done'; }
  }
  q.subs[s.key] = rec;
}
// Fortschritt einer Unterquest (0–1)
function subProgress(q, s) {
  const r = q.subs[s.key];
  if (!r) return 0;
  if (r.state === 'done' || r.state === 'skip') return 1;
  if (s.type === 'habit') { const h = byId(S.habits, r.habitId); return h ? Math.min(1, okCount(h) / masteryOf(s)) : 0; }
  return 0;
}
// Offene Wahl-Plätze zählen als 0 – ein Kapitel ist erst fertig, wenn gewählt und geschafft
function stageProgress(q, i = q.stage) {
  const subs = stageSubsOf(q, i), slots = subs.length + needPick(q, i);
  return slots ? subs.reduce((t, s) => t + subProgress(q, s), 0) / slots : 1;
}
function questProgress(q) {
  const n = goalOf(q).stages.length;
  return Math.min(1, (q.stage + (q.status === 'done' ? 1 : stageProgress(q))) / n);
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
      q.stage++; activateStage(q); sound('chapter'); World.react('chapter');
      reward(STAGE_REWARD[0], STAGE_REWARD[1], `📗 Kapitel geschafft: ${name}! +${STAGE_REWARD[0]} 🍩`);
      // Erst nach dem aktuellen Klick öffnen, sonst schließt z. B. hsSheet das Fenster gleich wieder
      if (needPick(q)) setTimeout(() => openPicker(q), 700);
    }
    if (stageProgress(q) < 1) continue;
    q.status = 'done'; q.doneAt = today();
    const locked = CHARACTERS.filter((c) => !S.chars[c.id]), c = locked.length ? pick(locked) : null;
    if (c) unlockChar(c.id);
    reward(QUEST_REWARD[0], QUEST_REWARD[1]);
    sound('quest'); World.react('quest');
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
  const act = activeQuests(), paused = S.quests.filter((q) => q.status === 'paused'), queued = S.quests.filter((q) => q.status === 'queued'), done = S.quests.filter((q) => q.status === 'done');
  const host = (g) => byId(CHARACTERS, g.host) || mainChar();
  return topupCta() + act.map((q) => {
    const g = goalOf(q), pct = Math.round(questProgress(q) * 100);
    return `<div class="card quest">
      <div class="row"><span class="qface">${avatarSvg(host(g), null, 64, true)}</span><div class="grow"><div class="qkick">Hauptquest · ${pct} %</div>
        <div class="qname">${g.emoji} ${esc(g.name)}</div><div class="pbar big"><i style="width:${pct}%"></i></div></div></div>
      ${q.woop && q.woop.plan ? `<div class="woop"><b>Dein Plan:</b> ${esc(q.woop.plan)}${q.woop.outcome ? `<div class="small muted" style="margin-top:3px">Dafür: „${esc(q.woop.outcome)}“</div>` : ''}</div>` : ''}
      ${g.stages.map((_, i) => {
        const stg = stageOf(g, i), state = i < q.stage ? 'done' : i === q.stage ? 'now' : 'next';
        return `<details class="stage ${state}" ${state === 'now' ? 'open' : ''}><summary><span class="sn">${state === 'done' ? '✓' : i + 1}</span><span class="grow">Kapitel ${i + 1}: ${esc(stg.name)}</span>
          ${state === 'now' ? `<span class="small">${Math.round(stageProgress(q) * 100)} %</span>` : state === 'next' ? '<span class="small muted">🔒</span>' : ''}</summary>
          ${stg.intro ? `<p class="small muted" style="margin:4px 2px 8px">${esc(stg.intro)}</p>` : ''}
          ${stageSubsOf(q, i).map((s) => subRow(q, s)).join('')}
          ${state === 'now' && needPick(q) ? `<button class="card questcta pickcta" data-act="pickOpen" data-q="${q.id}"><span style="font-size:28px">🧩</span><span class="grow"><b>Noch ${needPick(q)} Aufgabe${needPick(q) > 1 ? 'n' : ''} wählen</b><br><span class="small muted">Such dir aus, was zu dir passt.</span></span></button>`
            : state === 'now' && canChoose(g, i, profileAns()) ? `<button class="linkbtn" data-act="pickOpen" data-q="${q.id}">🔄 Auswahl ändern</button>`
            : state === 'next' && canChoose(g, i, profileAns()) ? `<p class="small muted" style="margin:6px 2px">🧩 Du wählst ${pickCount(g, i, profileAns())} von ${poolOf(g, i, profileAns()).length} Aufgaben</p>` : ''}</details>`;
      }).join('')}
      <div class="small muted" style="margin-top:6px">Kapitel geschafft: +${STAGE_REWARD[0]} 🍩 · Hauptquest geschafft: +${QUEST_REWARD[0]} 🍩 und eine neue Figur</div>
      <button class="linkbtn" style="margin-top:4px" data-act="qPauseSheet" data-q="${q.id}">⏸ Quest pausieren</button>
    </div>`;
  }).join('')
    + (act.length > 1 ? `<button class="linkbtn" data-act="qPauseSheet" data-q="${act.map((q) => q.id).join(',')}">⏸ Alle Quests pausieren – nur eigene Gewohnheiten</button>` : '')
    + (paused.length ? `<h2>Pausiert</h2>${paused.map((q) => { const g = goalOf(q); return `<div class="card row"><span class="qemo">${g.emoji}</span><span class="grow"><b>${esc(g.name)}</b><br><span class="small muted">${Math.round(questProgress(q) * 100)} % · ${q.until ? 'bis ' + shortDate(q.until) : 'ohne Enddatum'}</span></span><button class="btn small" data-act="qResume" data-q="${q.id}">Fortsetzen</button></div>`; }).join('')}` : '') + (queued.length ? `<h2>Für später</h2>${queued.map((q) => { const g = goalOf(q); return `<div class="card row"><span class="qemo">${g.emoji}</span><b class="grow">${esc(g.name)}</b><button class="btn small" data-act="qStart" data-q="${q.id}">Starten</button></div>`; }).join('')}` : '')
    + (done.length ? `<h2>Geschafft</h2>${done.map((q) => `<div class="card row"><span class="qemo">🏆</span><b class="grow">${esc(goalOf(q).name)}</b><span class="small muted">${parseKey(q.doneAt).toLocaleDateString('de-DE')}</span></div>`).join('')}` : '')
    + (S.profile?.done && answerSteps(true).length ? `<button class="btn white block" data-act="qzTop" data-all="1">✍ Antworten ändern</button>
    <p class="small muted center">Passt deine laufenden Quests an. Geschafftes bleibt.</p>` : '')
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
      ${r.state === 'active' && s.type !== 'habit' ? `<button class="btn green grow" data-act="subDone" data-q="${q.id}" data-k="${s.key}">${s.type === 'card' ? '✓ Gelesen' : '✓ Erledigt'}</button>` : ''}</div>
    ${s.opt && r.state === 'active' && s.stage === q.stage + 1 && canChoose(g, q.stage, profileAns()) ? `<button class="linkbtn" style="margin-top:8px" data-act="pickOpen" data-q="${q.id}">🔄 Passt nicht? Andere Aufgabe wählen</button>` : ''}`);
}

/* ---------- Quest pausieren ---------- */
// Weniger gleichzeitige Ziele halten die Bindung an die übrigen hoch (Dalton & Spiller 2012).
// Pause mit festem Ende an einem Neustart-Tag (Montag, Monatsanfang: Dai et al. 2014); Fortschritt bleibt sichtbar eingefroren.
function pauseQuest(q, until) {
  q.status = 'paused'; q.pausedAt = today(); q.until = until || null;
  for (const h of S.habits) if (h.quest === q.id && !h.archived) { h.archived = true; h.qpause = true; pauseStart(h); }
}
function resumeQuest(q) {
  q.status = 'active'; delete q.until; delete q.pausedAt;
  for (const h of S.habits) if (h.quest === q.id && h.qpause) { h.archived = false; delete h.qpause; pauseEnd(h); }
}
const shortDate = (k) => parseKey(k).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
function pauseSheet(ids) {
  const qs = ids.map((id) => S.quests.find((x) => x.id === id)), n = S.habits.filter((h) => qs.some((q) => h.quest === q.id) && !h.archived).length;
  const t = today(), mon = addDays(weekStart(t), 7), mon2 = addDays(mon, 7), d = parseKey(t), month = keyOf(new Date(d.getFullYear(), d.getMonth() + 1, 1));
  const own = S.habits.filter((h) => !h.quest && !h.archived).length;
  const opt = (u, label, hint) => `<button class="bigopt" data-act="qPause" data-q="${ids.join(',')}" data-u="${u}"><span class="l">${label}</span><span class="h">${hint}</span></button>`;
  openModal(`<div class="qkick">${qs.map((q) => `${goalOf(q).emoji} ${esc(goalOf(q).name)}`).join(' · ')}</div><h2 style="margin:4px 0 8px">${qs.length > 1 ? 'Alle Quests pausieren?' : 'Quest pausieren?'}</h2>
    <ul class="pauselist"><li>${n === 1 ? 'Die Quest-Gewohnheit verschwindet aus „Heute“ und erinnert' : `${n} Quest-Gewohnheiten verschwinden aus „Heute“ und erinnern`} dich nicht.</li>
      <li>Fortschritt, Kapitel und Streaks bleiben eingefroren – nichts geht verloren.</li>
      ${own ? `<li>${own === 1 ? 'Deine eigene Gewohnheit läuft' : `Deine ${own} eigenen Gewohnheiten laufen`} normal weiter.</li>` : ''}</ul>
    <p class="small muted" style="margin:0 2px 10px">Am leichtesten fällt der Wiedereinstieg an einem festen Neustart-Tag wie Montag oder Monatsanfang.</p>
    <div class="bigopts">${opt(mon, 'Bis Montag', shortDate(mon))}${opt(mon2, '2 Wochen', 'bis ' + shortDate(mon2))}${month > mon2 ? opt(month, 'Bis Monatsanfang', shortDate(month)) : ''}${opt('', 'Ohne Enddatum', 'Du startest selbst wieder')}</div>
    <button class="btn white block" style="margin-top:10px" data-act="close">Abbrechen</button>`);
}

/* ---------- Aufgaben wählen ---------- */
// Wahl zwischen mehreren Aufgaben pro Kapitel: Autonomie stärkt die Motivation (Patall et al. 2008),
// wenige Optionen halten die Entscheidung leicht (Chernev et al. 2015).
let pickSel = null; // { q: questId, keys: [...] }
function openPicker(q) {
  const g = goalOf(q), a = profileAns();
  if (!canChoose(g, q.stage, a)) return;
  pickSel = { q: q.id, keys: poolOf(g, q.stage, a).filter((s) => q.subs[s.key]).map((s) => s.key) };
  pickerView(); $('#sheet').scrollTop = 0;
}
function pickerView() {
  const q = S.quests.find((x) => x.id === pickSel.q), g = goalOf(q), a = profileAns(), i = q.stage;
  const st = stageOf(g, i, a), n = pickSlots(q, i, a), sel = pickSel.keys, left = n - sel.length;
  const host = byId(CHARACTERS, g.host) || mainChar();
  const opt = (s) => {
    const on = sel.includes(s.key), d = DIFF[s.diff], r = q.subs[s.key];
    const meta = `<span class="dchip ${d.cls}">${d.label}</span> ${TYPE_LABEL[s.type]}${s.sched?.type === 'weekly' ? ` · ${s.sched.n}× pro Woche` : ''}${r && r.state !== 'active' ? ' · erledigt' : ''}`;
    return `<button class="subq pickopt ${on ? 'on' : ''}" data-act="pickToggle" data-k="${s.key}"><span class="ti">${typeIcon(s.type)}</span>
      <span class="grow"><span class="nm">${esc(s.title)}</span><span class="meta">${meta}</span><span class="pdesc">${esc(s.how || s.why)}</span></span>
      <span class="pbox">${on ? '✓' : ''}</span></button>`;
  };
  openModal(`<div class="qkick">${g.emoji} ${esc(g.name)} · Kapitel ${i + 1}</div><h2 style="margin:4px 0 10px">${esc(st.name)}</h2>
    <div class="pickhost">${avatarSvg(host, null, 60, true)}<div class="speech">${esc(st.intro)} Such dir <b>${n}</b> Aufgaben aus, die zu dir passen.</div></div>
    ${poolOf(g, i, a).map(opt).join('')}
    <p class="small muted center" style="margin:6px 0 0">Du kannst später jederzeit tauschen. Gründe und Studien stehen in jeder Aufgabe.</p>
    <div class="sheetbar"><button class="btn pink big block" data-act="pickSave" ${left ? 'disabled' : ''}>${left > 0 ? `Noch ${left} wählen` : left < 0 ? `${-left} zu viel – bitte abwählen` : 'Los geht’s!'}</button></div>`);
}

/* ---------- Antworten nachtragen / ändern ---------- */
function topupCta() {
  const n = missingCount();
  return n ? `<button class="card questcta pickcta" data-act="qzTop"><span style="font-size:28px">❓</span><span class="grow"><b>${n === 1 ? 'Eine neue Frage' : `${n} neue Fragen`} zu deinen Quests</b><br><span class="small muted">Kurz beantworten – Lisa passt deine Quests an. Ohne Neustart.</span></span></button>` : '';
}
// Neue Fragen (z. B. nach einem Update) beantworten, ohne die Quests neu zu erzeugen:
// passende Aufgaben bleiben, Geschafftes bleibt, nur Unpassendes wird ersetzt.
const questGoals = () => [...new Set((S.quests || []).filter((q) => q.status !== 'done').map((q) => q.goal))];
function answerSteps(all) {
  const a = S.profile?.answers || {}, goals = questGoals(), steps = [];
  for (const id of goals) for (const q of byId(QUEST_GOALS, id)?.questions || []) {
    const key = `${id}.${q.id}`;
    if (all || a[key] === undefined) steps.push({ id: key, kind: q.multi ? 'multi' : 'single', title: q.q, sub: q.sub, opts: q.opts, goal: id });
  }
  if (goals.some((id) => id === 'sleep' || id === 'morning') && (all || a.rhythm === undefined)) steps.push({ id: 'rhythm', ...QUIZ.rhythm });
  return steps;
}
const missingCount = () => (S.profile?.done ? answerSteps(false).length : 0);
// Änderungen pro Quest im aktuellen Kapitel; dry = nur Vorschau
function adaptQuests(a, dry) {
  const out = [];
  for (const q of (S.quests || []).filter((x) => x.status === 'active' || x.status === 'paused')) {
    const g = goalOf(q), i = q.stage, live = q.status === 'active', c = { q, drop: [], skip: [], add: [], pick: 0 };
    for (const s of g.subs.filter((x) => x.stage === i + 1)) {
      const r = q.subs[s.key];
      if (r?.state === 'active') {
        // Wahl-Aufgabe, die man schon macht: Platz frei für eine andere
        if (!s.opt && s.skipIf && answered(a, s.skipIf)) c.skip.push(s);
        else if (skipSub(s, a)) c.drop.push(s);
      } else if (live && !s.opt && (!r || r.state === 'skip') && !skipSub(s, a)) c.add.push(s);
    }
    if (live && pickCount(g, i, a)) {
      const kept = poolOf(g, i, a).filter((s) => q.subs[s.key]).length, slots = Math.max(0, pickCount(g, i, a) - doneOutside(q, g, i, a));
      if (!canChoose(g, i, a)) c.add.push(...poolOf(g, i, a).filter((s) => !q.subs[s.key]));
      else c.pick = Math.max(0, slots - kept);
    }
    // Offene Wahl-Plätze gab es vorher schon: keine Änderung
    if (c.pick && c.pick === needPick(q) && !c.drop.length) c.pick = 0;
    if (c.drop.length || c.skip.length || c.add.length || c.pick) out.push(c);
  }
  if (dry) return out;
  const retire = (q, s) => {
    const h = q.subs[s.key]?.habitId && byId(S.habits, q.subs[s.key].habitId);
    if (h) { h.archived = true; if (h.qpause) { delete h.qpause; pauseEnd(h); } }
  };
  for (const c of out) {
    for (const s of c.drop) { retire(c.q, s); delete c.q.subs[s.key]; }
    for (const s of c.skip) { retire(c.q, s); c.q.subs[s.key] = { state: 'skip' }; }
    for (const s of c.add) { delete c.q.subs[s.key]; activateSub(c.q, s, a); }
  }
  return out;
}

/* ---------- Aktionen ---------- */
Object.assign(actions, {
  qzStart: () => { quiz = { step: 0, a: {} }; tab = 'quiz'; closeModal(); render(); },
  qzSkip: () => { quiz = null; S.profile = { answers: {}, done: false, at: today() }; tab = 'home'; save(); render(); toast('Du kannst den Fragebogen jederzeit im Check-in unter „Quests“ machen.'); },
  qzTop: (d) => {
    const steps = answerSteps(d.all === '1');
    if (!steps.length) return toast('Keine offenen Fragen – deine Quests sind auf dem neuesten Stand.');
    quiz = { step: 0, a: { ...S.profile.answers }, top: [{ id: 'tintro', kind: 'tintro' }, ...steps, { id: 'tsum', kind: 'tsum' }], edit: d.all === '1' };
    tab = 'quiz'; closeModal(); render();
  },
  qzApply: () => {
    const a = quiz.a, ch = adaptQuests(a, false);
    S.profile.answers = a; quiz = null;
    for (const q of activeQuests()) activateStage(q);
    questCheck(); tab = 'habits'; checkTab = 'quests'; sound('tap'); render();
    const q = activeQuests().find((x) => needPick(x));
    if (q) openPicker(q); else toast(ch.length ? 'Quests angepasst!' : 'Antworten gespeichert.');
  },
  qzBack: () => {
    if (quiz.step > 0) { quiz.step--; render(); return; }
    const top = quiz.top; quiz = null;
    if (top) { tab = 'habits'; checkTab = 'quests'; } else tab = S.started ? 'home' : tab;
    render();
  },
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
    const q = activeQuests().find((x) => needPick(x));
    if (q) openPicker(q); else toast('Deine Quests sind bereit! Fang mit Kapitel 1 an.');
  },
  ckTab: (d) => { checkTab = d.t; render(); },
  pickOpen: (d) => { const q = S.quests.find((x) => x.id === d.q); if (q) openPicker(q); },
  pickToggle: (d) => {
    const q = S.quests.find((x) => x.id === pickSel.q), r = q.subs[d.k], n = pickSlots(q), sel = pickSel.keys;
    if (sel.includes(d.k)) {
      if (r && r.state !== 'active') return toast('Schon geschafft – die bleibt.');
      pickSel.keys = sel.filter((k) => k !== d.k);
    } else if (sel.length >= n) return toast(`Höchstens ${n}. Tipp erst eine andere Aufgabe ab.`);
    else pickSel.keys = [...sel, d.k];
    const top = $('#sheet').scrollTop;
    pickerView(); $('#sheet').scrollTop = top;
  },
  pickSave: () => {
    const q = S.quests.find((x) => x.id === pickSel.q), g = goalOf(q), a = profileAns();
    for (const s of poolOf(g, q.stage, a)) {
      const on = pickSel.keys.includes(s.key), r = q.subs[s.key];
      if (on && !r) activateSub(q, s, a);
      // Abgewählt: Gewohnheit archivieren (Verlauf bleibt), Platz wird frei
      if (!on && r && r.state === 'active') { const h = r.habitId && byId(S.habits, r.habitId); if (h) h.archived = true; delete q.subs[s.key]; }
    }
    pickSel = null; closeModal(); sound('tap');
    questCheck(); render();
    toast('Deine Aufgaben stehen! Gewohnheiten findest du unter „Heute“.');
  },
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
  qPauseSheet: (d) => pauseSheet(d.q.split(',')),
  qPause: (d) => {
    const qs = d.q.split(',').map((id) => S.quests.find((x) => x.id === id));
    for (const q of qs) pauseQuest(q, d.u);
    save(); closeModal(); sound('tap'); render();
    toast(`⏸ ${qs.length > 1 ? 'Quests' : 'Quest'} pausiert${d.u ? ` (bis ${shortDate(d.u)})` : ''}. Fortsetzen unter „Quests“ oder unten im Check-in.`);
  },
  qResume: (d) => {
    const q = S.quests.find((x) => x.id === d.q);
    if (activeQuests().length >= 3) return toast('Höchstens drei Hauptquests gleichzeitig – pausier oder schließ erst eine andere.');
    resumeQuest(q); activateStage(q); sound('start'); questCheck(); render();
    toast(`▶ Weiter geht’s mit „${goalOf(q).name}“!`);
    if (needPick(q)) openPicker(q);
  },
  qSnooze: (d) => { const q = S.quests.find((x) => x.id === d.q); q.until = addDays(today(), 7); save(); render(); toast(`Okay, Pause bis ${shortDate(q.until)}.`); },
  qStart: (d) => {
    const q = S.quests.find((x) => x.id === d.q);
    if (activeQuests().length >= 3) return toast('Höchstens drei Hauptquests gleichzeitig – schließ erst eine ab.');
    q.status = 'active'; q.started = today(); activateStage(q); save(); render();
    if (needPick(q)) openPicker(q);
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
