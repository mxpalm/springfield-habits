// Erinnerungen: Gewohnheit zur eingestellten Uhrzeit, Abend-Check und Fokus-Ende.
// Ohne eigenen Server feuern sie nur, solange die App läuft (auch im Hintergrund-Tab).
// Zuverlässig bei geschlossener App: Termine mit Alarm als Kalender-Datei (.ics) exportieren.
'use strict';

const REMIND_WINDOW = 180; // Minuten: ältere verpasste Erinnerungen werden still übersprungen
const ANCHOR_TIME = { work: '09:00', midday: '12:30', evening: '18:30' };

function remindSettings() {
  const R = (S.remind = S.remind || {});
  for (const [k, v] of Object.entries({ on: false, eveningOn: true, evening: '20:30', focus: true })) if (!(k in R)) R[k] = v;
  R.fired = R.fired || {};
  return R;
}
const hm = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const nowMin = () => { const d = new Date(); return d.getHours() * 60 + d.getMinutes(); };

// Vorschlag aus dem Fragebogen: morgens 30 Min. nach dem Aufstehen, „vor dem Schlafen“ 1 Std. vor dem Zubettgehen.
function anchorTime(anchor, a = S.profile?.answers || {}) {
  if (anchor === 'morning') return hm((a.wake && a.wake !== 'x' ? +a.wake : 7) * 60 + 30);
  if (anchor === 'bed') return hm((a.bed && a.bed !== 'x' ? +a.bed : 22.5) * 60 - 60);
  return ANCHOR_TIME[anchor] || '';
}

const canNotify = () => 'Notification' in window;
function notify(title, body, tag) {
  if (!canNotify() || Notification.permission !== 'granted') return false;
  const opt = { body, tag, icon: 'icon-192.png', badge: 'icon-192.png', data: { open: 'habits' } };
  if (navigator.serviceWorker?.controller) {
    navigator.serviceWorker.ready.then((reg) => reg.showNotification(title, opt)).catch(() => {});
    return true;
  }
  try {
    const n = new Notification(title, opt);
    n.onclick = () => { window.focus(); actions.tab({ tab: 'habits' }); n.close(); };
    return true;
  } catch { return false; } // Android erlaubt nur den Weg über den Service Worker
}

function remindTick() {
  const R = remindSettings();
  if (!R.on || !S.started) return;
  const t = today(), now = nowMin(), seen = document.visibilityState === 'visible';
  let changed = false;
  const fire = (key, at, fn) => {
    if (R.fired[key] || now < toMin(at)) return;
    R.fired[key] = 1; changed = true;
    if (now - toMin(at) <= REMIND_WINDOW) fn();
  };
  for (const h of S.habits) {
    if (h.archived || !h.remind || !isDue(h, t) || status(h, t)) continue;
    if (h.schedule.type === 'weekly' && weekCount(h, weekStart(t)) >= h.schedule.n) continue;
    fire(`${t}|${h.id}`, h.remind, () => {
      const c = hostOf(h);
      if (seen) toast(`⏰ ${c.name}: Zeit für „${h.name}“!`);
      else notify(h.name, `${c.name}: ${h.cue ? `${h.cue} → ${h.name}.` : pick(c.lines)}`, `h-${h.id}`);
    });
  }
  if (R.eveningOn) fire(`${t}|evening`, R.evening, () => {
    const open = S.habits.filter((h) => !h.archived && isDue(h, t) && h.schedule.type !== 'weekly' && !status(h, t));
    if (!open.length) return;
    const msg = `Noch ${open.length} offen: ${open.slice(0, 3).map((h) => h.name).join(', ')}${open.length > 3 ? ' …' : ''}`;
    if (seen) toast(`🌙 ${msg}`);
    else notify(`${mainChar().name}: Check-in nicht vergessen!`, msg, 'evening');
  });
  if (!changed) return;
  for (const k of Object.keys(R.fired)) if (k.slice(0, 10) < addDays(t, -1)) delete R.fired[k];
  save();
}

function remindFocusDone(r) {
  const R = remindSettings();
  if (!R.on || !R.focus || document.visibilityState === 'visible') return;
  const c = mainChar();
  if (r.phase === 'break') notify('Pause vorbei', `${c.name}: Weiter geht’s!`, 'focus');
  else notify(`${Math.round(r.planned / 60000)} Minuten geschafft!`, `${c.name}: Komm zurück und hol dir deine Donuts.`, 'focus');
}

// Quest-Gewohnheiten von vor dieser Version bekommen einmalig die Uhrzeit ihres Ankers.
function remindInit() {
  remindSettings();
  for (const h of S.habits) {
    if (!h.quest || 'remind' in h) continue;
    const q = S.quests?.find((x) => x.id === h.quest), s = q && goalOf(q).subs.find((x) => x.key === h.sub);
    h.remind = s ? anchorTime(s.anchor) : '';
  }
  save();
  remindTick();
}
setInterval(remindTick, 30000);
document.addEventListener('visibilitychange', remindTick);
navigator.serviceWorker?.addEventListener('message', (e) => { if (e.data?.open && S.started) actions.tab({ tab: e.data.open }); });

/* ---------- Kalender-Export ---------- */
const ICS_DAYS = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
const SPREAD = { 1: [0], 2: [1, 4], 3: [0, 2, 4], 4: [0, 2, 4, 6], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };
function icsText() {
  const R = remindSettings(), t = today();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const tx = (s) => String(s).replace(/[\\;,]/g, (c) => '\\' + c).replace(/\n/g, '\\n');
  // Zeilen über 75 Zeichen umbrechen (RFC 5545); 60 lässt Platz für Umlaute
  const fold = (l) => l.length <= 60 ? l : l.match(/.{1,60}/gu).join('\r\n ');
  const ev = (id, day, at, title, desc, rule) => ['BEGIN:VEVENT', `UID:${id}@springfield-habits`, `DTSTAMP:${stamp}`,
    `DTSTART:${day.replace(/-/g, '')}T${at.replace(':', '')}00`, 'DURATION:PT15M', `RRULE:${rule}`,
    `SUMMARY:${tx(title)}`, `DESCRIPTION:${tx(desc)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${tx(title)}`, 'TRIGGER:PT0M', 'END:VALARM', 'END:VEVENT'].map(fold).join('\r\n');
  const out = [];
  for (const h of S.habits.filter((x) => !x.archived && x.remind)) {
    const sc = h.schedule, ds = sc.type === 'days' ? sc.days : SPREAD[sc.n] || SPREAD[7];
    const ok = (d) => (sc.type === 'interval' ? isDue(h, d) : ds.includes(weekday(d)));
    let day = t;
    for (let i = 0; i < 60 && !ok(day); i++) day = addDays(day, 1);
    const rule = sc.type === 'interval' ? `FREQ=DAILY;INTERVAL=${sc.n}` : ds.length === 7 ? 'FREQ=DAILY' : `FREQ=WEEKLY;BYDAY=${ds.map((i) => ICS_DAYS[i]).join(',')}`;
    out.push(ev(h.id, day, h.remind, `${h.name}`, h.cue ? `Wenn-dann: ${h.cue} → ${h.name}` : 'Springfield Habits', rule));
  }
  if (R.eveningOn) out.push(ev('evening', t, R.evening, 'Check-in: Gewohnheiten abhaken', 'Springfield Habits', 'FREQ=DAILY'));
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Springfield Habits//DE', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Springfield Habits', ...out, 'END:VCALENDAR'].join('\r\n') + '\r\n';
}

/* ---------- Seite „Erinnerungen“ (Mehr) ---------- */
function remindView() {
  const R = remindSettings(), perm = canNotify() ? Notification.permission : 'unsupported';
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent), app = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  const c = mainChar(), habits = S.habits.filter((h) => !h.archived);
  const state = {
    granted: `<p class="small" style="margin:0">✅ Benachrichtigungen sind erlaubt.</p>`,
    default: `<button class="btn block" data-act="remindAsk">🔔 Benachrichtigungen erlauben</button>`,
    denied: `<p class="small" style="margin:0">Benachrichtigungen sind im Browser blockiert. Erlaube sie in den Website-Einstellungen.</p>`,
    unsupported: `<p class="small" style="margin:0">${ios && !app ? 'Auf dem iPhone: Teilen → „Zum Home-Bildschirm“, dann die App von dort öffnen. Erst dann sind Benachrichtigungen möglich.' : 'Dieser Browser kann keine Benachrichtigungen.'}</p>`,
  }[perm];
  const tgl = (k, title, sub) => `<div class="toggle"><span><b>${title}</b>${sub ? `<br><span class="small muted">${sub}</span>` : ''}</span><label class="switch"><input type="checkbox" data-act="remindSet" data-k="${k}" ${R[k] ? 'checked' : ''}><span></span></label></div>`;
  return `${back('Erinnerungen')}
    <div class="card remindhero"><div class="pv">${avatarSvg(c, cosmeticOf(c.id), 64)}</div>
      <p class="grow" style="margin:0"><b>${esc(c.name)}:</b> „Ich sag dir Bescheid, wenn eine Gewohnheit dran ist.“</p></div>
    <div class="card">${state}
      ${tgl('on', 'Erinnerungen an', 'Ist die App offen, kommt ein Hinweis in der App.')}
      ${tgl('eveningOn', 'Abend-Check', 'Nur wenn noch etwas offen ist')}
      <div class="toggle"><span><b>Uhrzeit Abend-Check</b></span><input class="in" id="remind-evening" type="time" value="${R.evening}" style="width:120px"></div>
      ${tgl('focus', 'Fokus-Ende melden', 'Wenn der Timer abläuft und du in einer anderen App bist')}
      <button class="btn secondary block" style="margin-top:10px" data-act="remindTest">Test-Erinnerung schicken</button></div>
    <h2>Uhrzeit pro Gewohnheit</h2>
    <div class="card remindlist">${habits.length ? habits.map((h) => `<div class="rrow"><span class="emo">${h.emoji}</span><span class="grow"><b>${esc(h.name)}</b>${h.cue ? `<br><span class="small muted">📍 ${esc(h.cue)}</span>` : ''}</span>
        <input class="in" type="time" data-remind="${h.id}" value="${esc(h.remind || '')}" aria-label="Uhrzeit für ${esc(h.name)}"></div>`).join('')
      : '<p class="muted small" style="margin:0">Noch keine Gewohnheiten.</p>'}
      <p class="small muted" style="margin:8px 0 0">Leer lassen = keine Erinnerung. Quest-Gewohnheiten bekommen einen Vorschlag aus dem Fragebogen.</p></div>
    <div class="card"><h3>🗓 Im Kalender sichern</h3>
      <p class="small">Am zuverlässigsten: Lade die Termine mit Alarm in deinen Kalender. Dann erinnert dich dein Handy auch, wenn die App zu ist.</p>
      <button class="btn block" data-act="remindIcs" ${habits.some((h) => h.remind) || R.eveningOn ? '' : 'disabled'}>Kalender-Datei laden (.ics)</button>
      <p class="small muted" style="margin:8px 0 0">Nach Änderungen neu laden und die alten Termine im Kalender löschen.</p></div>
    <p class="small muted center">Ohne eigenen Server kann die App nur erinnern, solange sie läuft (auch im Hintergrund). Ist sie ganz geschlossen, hilft der Kalender.</p>`;
}

Object.assign(actions, {
  remindAsk: () => {
    Notification.requestPermission().then((p) => {
      if (p === 'granted') { remindSettings().on = true; save(); notify('Woohoo!', `${mainChar().name}: So erinnere ich dich ab jetzt.`, 'test'); }
      render();
    });
  },
  remindTest: () => {
    const c = mainChar();
    if (!notify('Test-Erinnerung', `${c.name}: ${pick(c.lines)}`, 'test')) toast(`⏰ ${c.name}: So sieht eine Erinnerung in der App aus.`);
  },
  remindIcs: () => {
    const blob = new Blob([icsText()], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'springfield-erinnerungen.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  },
});
document.addEventListener('change', (e) => {
  const el = e.target, R = remindSettings();
  if (el.dataset.act === 'remindSet') { R[el.dataset.k] = el.checked; save(); remindTick(); }
  else if (el.id === 'remind-evening') { R.evening = el.value || '20:30'; save(); }
  else if (el.dataset.remind) { const h = byId(S.habits, el.dataset.remind); if (h) { h.remind = el.value; save(); } }
});
