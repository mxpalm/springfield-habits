// Töne, Jingles und Stadtmusik: alles live mit Web Audio synthetisiert (keine Audiodateien).
// Eigene Melodien im Cartoon-Jazz-Stil: Xylophon, Blech, Chor, Vibraphon, Posaune und Besen-Schlagzeug.
// sound(kind) spielt einen Effekt; was in derselben Aktion ausgelöst wird, wird zusammengefasst
// (z. B. Abhaken + Level-Up + Kapitel) und nur der wichtigste Effekt erklingt.

const Snd = (() => {
  let ac = null, out, verb, noiseBuf, MAIN;
  const mtof = (m) => 440 * 2 ** ((m - 69) / 12);

  function ctx() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.2;
    // Limiter hinter dem Kompressor, damit große Fanfaren nicht übersteuern
    const lim = ac.createDynamicsCompressor();
    lim.threshold.value = -2; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.1;
    out = ac.createGain(); out.connect(comp).connect(lim).connect(ac.destination);
    // Kleiner Raumhall aus abklingendem Rauschen
    const len = Math.floor(ac.sampleRate * 1.3), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
    const conv = ac.createConvolver(); conv.buffer = ir;
    verb = ac.createGain(); verb.gain.value = 0.2; verb.connect(conv).connect(out);
    MAIN = { dry: out, wet: verb };
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    setVol();
    return ac;
  }
  function setVol() { if (out) out.gain.value = 0.9 * (S.settings.vol ?? 0.7) ** 1.5; }

  // iOS/Safari geben Audio erst nach einer Berührung frei
  function unlock() {
    if (!S.settings.sound) return;
    if (!ctx()) return;
    if (ac.state !== 'running') ac.resume().catch(() => {});
    if (!unlock.done) {
      const b = ac.createBufferSource(); b.buffer = ac.createBuffer(1, 1, 22050); b.connect(ac.destination); b.start(0);
      unlock.done = true;
    }
  }
  ['pointerdown', 'touchend', 'keydown'].forEach((ev) => document.addEventListener(ev, unlock, true));

  /* ---------- Bausteine ---------- */
  // Kanal = trockener und halliger Weg mit gemeinsamer Lautstärke (pro Jingle und für die Musik)
  function channel(level) {
    const dry = ac.createGain(), wet = ac.createGain();
    dry.gain.value = wet.gain.value = level; dry.connect(out); wet.connect(verb);
    return { dry, wet };
  }
  // Lautstärke-Hüllkurve: Anstieg a, Halten hold, exponentielles Ausklingen rel
  function env(t, v, a, hold, rel, dest = MAIN, wet = true) {
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + a);
    if (hold > 0) g.gain.setValueAtTime(Math.max(v, 0.0002), t + a + hold);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + rel);
    g.connect(dest.dry);
    if (wet) g.connect(dest.wet);
    g.end = t + a + hold + rel + 0.05;
    return g;
  }
  function osc(type, f, t, end, to, detune = 0) {
    const o = ac.createOscillator();
    o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
    o.connect(to); o.start(t); o.stop(end);
    return o;
  }
  function noise(t, end, to) {
    const n = ac.createBufferSource(); n.buffer = noiseBuf; n.loop = true;
    n.connect(to); n.start(t, Math.random() * 0.5); n.stop(end);
    return n;
  }
  function filt(type, f, q, to) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; b.connect(to); return b; }

  /* ---------- Instrumente: (Startzeit, MIDI-Ton, Dauer s, Lautstärke, Ziel) ---------- */
  const INST = {
    xylo(t, m, d, v, dest) {
      const f = mtof(m), rel = 0.18 + 30 / f;
      const g = env(t, v, 0.003, 0, rel, dest);
      osc('sine', f, t, g.end, g);
      const h = env(t, v * 0.35, 0.002, 0, 0.06, dest, false);
      osc('sine', f * 3.93, t, h.end, h);
    },
    glock(t, m, d, v, dest) {
      const f = mtof(m);
      const g = env(t, v, 0.002, 0, 0.5 + d * 0.3, dest);
      osc('sine', f, t, g.end, g);
      const h = env(t, v * 0.3, 0.002, 0, 0.18, dest);
      osc('sine', f * 2.76, t, h.end, h);
    },
    vibes(t, m, d, v, dest) {
      const f = mtof(m);
      const g = env(t, v, 0.004, Math.min(d, 0.3), 0.9, dest);
      const trem = ac.createGain(); trem.connect(g);
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = 5.2; lg.gain.value = 0.25; lfo.connect(lg).connect(trem.gain);
      lfo.start(t); lfo.stop(g.end);
      osc('sine', f, t, g.end, trem);
      const h = env(t, v * 0.12, 0.002, 0, 0.1, dest, false);
      osc('sine', f * 4, t, h.end, h);
    },
    pluck(t, m, d, v, dest) {
      const g = env(t, v, 0.003, 0, 0.12 + d * 0.2, dest);
      osc('triangle', mtof(m), t, g.end, g);
    },
    bass(t, m, d, v, dest) {
      const f = mtof(m);
      const g = env(t, v, 0.008, d * 0.6, 0.14, dest, false);
      const lp = filt('lowpass', 700, 0.7, g);
      osc('triangle', f, t, g.end, lp); osc('sine', f, t, g.end, lp);
    },
    brass(t, m, d, v, dest) {
      const f = mtof(m);
      const g = env(t, v, 0.03, d, 0.1, dest);
      const lp = filt('lowpass', f * 1.2, 1.4, g);
      lp.frequency.setValueAtTime(f * 1.2, t);
      lp.frequency.exponentialRampToValueAtTime(Math.min(f * 6, 7000), t + 0.06);
      lp.frequency.exponentialRampToValueAtTime(Math.min(f * 3, 5000), t + 0.25);
      for (const dt of [-7, 7]) {
        const o = osc('sawtooth', f * 0.97, t, g.end, lp, dt);
        o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
      }
    },
    // Chor-„Aah“: drei Sägezähne mit Vibrato durch Vokal-Formanten
    choir(t, m, d, v, dest) {
      const f = mtof(m);
      const g = env(t, v * 1.6, 0.25, d, 0.5, dest);
      const mix = ac.createGain();
      [[800, 1], [1150, 0.6], [2900, 0.25]].forEach(([ff, gg]) => {
        const k = ac.createGain(); k.gain.value = gg; k.connect(g);
        mix.connect(filt('bandpass', ff, 6, k));
      });
      const lfo = ac.createOscillator(), lg = ac.createGain();
      lfo.frequency.value = 5; lg.gain.value = f * 0.006; lfo.connect(lg);
      lfo.start(t); lfo.stop(g.end);
      for (const dt of [-9, 0, 9]) { const o = osc('sawtooth', f, t, g.end, mix, dt); lg.connect(o.frequency); }
    },
    // Posaune mit Wackel-Vibrato; wobble = trauriges Ende mit Abwärts-Glissando
    bone(t, m, d, v, dest, wobble) {
      const f = mtof(m);
      const g = env(t, v, 0.04, d, 0.15, dest);
      const lp = filt('lowpass', 1100, 2, g);
      const o = osc('sawtooth', f, t, g.end, lp);
      if (wobble) {
        const lfo = ac.createOscillator(), lg = ac.createGain();
        lfo.frequency.value = 6; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(f * 0.03, t + d);
        lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(g.end);
        o.frequency.setValueAtTime(f, t + d * 0.5); o.frequency.exponentialRampToValueAtTime(f * 0.94, t + d);
      }
    },
    kick(t, m, d, v, dest) {
      const g = env(t, v, 0.002, 0, 0.28, dest, false);
      const o = osc('sine', 140, t, g.end, g);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    },
    snare(t, m, d, v, dest) {
      const g = env(t, v, 0.002, 0, 0.14, dest);
      noise(t, g.end, filt('highpass', 1800, 0.7, g));
      const b = env(t, v * 0.6, 0.002, 0, 0.07, dest, false);
      osc('triangle', 185, t, b.end, b);
    },
    hat(t, m, d, v, dest) {
      const g = env(t, v, 0.002, 0, 0.035 + d * 0.1, dest, false);
      noise(t, g.end, filt('highpass', 7500, 0.7, g));
    },
    brush(t, m, d, v, dest) {
      const g = env(t, v, 0.03, 0, 0.12, dest, false);
      noise(t, g.end, filt('bandpass', 2600, 0.7, g));
    },
    thunk(t, m, d, v, dest) {
      const g = env(t, v, 0.002, 0, 0.16, dest, false);
      const o = osc('sine', 95, t, g.end, g);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      const n = env(t, v * 0.5, 0.002, 0, 0.05, dest, false);
      noise(t, n.end, filt('lowpass', 500, 0.7, n));
    },
    rattle(t, m, d, v, dest) {
      for (let i = 0; i < 4; i++) {
        const g = env(t + i * 0.025, v * (1 - i * 0.2), 0.002, 0, 0.03, dest, false);
        noise(t + i * 0.025, g.end, filt('bandpass', 5200, 3, g));
      }
    },
  };

  // Noten: [Schlag, Instrument, Ton(e), Dauer in Schlägen, Lautstärke, Extra]
  function play(notes, bpm, dest, t0) {
    const spb = 60 / bpm, start = t0 ?? ac.currentTime + 0.03;
    let end = start;
    for (const [b, inst, p, dur = 0.5, v = 0.3, x] of notes) {
      const t = start + b * spb, d = dur * spb;
      for (const m of [].concat(p ?? 0)) INST[inst](t, m, d, v, dest, x);
      end = Math.max(end, t + d);
    }
    return end;
  }

  /* ---------- Jingles ---------- */
  // Lydisch-dominante Skala (C D E F# G A Bb) – der typische Cartoon-Jazz-Klang
  const LYD = [0, 2, 4, 6, 7, 9, 10];
  const sc = (i, base = 72) => base + 12 * Math.floor(i / 7) + LYD[((i % 7) + 7) % 7];
  const roll = (from, to, n, v0, v1) => Array.from({ length: n }, (_, i) => [from + ((to - from) * i) / n, 'snare', 0, 0, v0 + ((v1 - v0) * i) / n]);

  const J = {
    // Abhaken: zwei Xylophon-Töne, je mehr heute erledigt, desto höher (Kombo)
    done: (n = 1) => { const k = Math.min(Math.max(n, 1), 10) - 1; return [420, [[0, 'xylo', sc(k), 0.5, 0.42], [0.5, 'xylo', sc(k + 2), 1, 0.48], [0.5, 'glock', sc(k + 2) + 12, 1, 0.08]]]; },
    min: () => [380, [[0, 'xylo', 67, 0.5, 0.38], [0.5, 'xylo', 72, 1, 0.38]]],
    skip: () => [300, [[0, 'pluck', 67, 0.5, 0.28], [0.5, 'pluck', 62, 1, 0.26]]],
    undo: () => [500, [[0, 'pluck', 72, 0.5, 0.18], [0.5, 'pluck', 67, 0.5, 0.14]]],
    tap: () => [600, [[0, 'pluck', 84, 0.25, 0.07]]],
    // Alles für heute erledigt: kurze Blech-Fanfare
    allDone: () => [180, [
      [0, 'brass', 67, 0.3, 0.3], [0.33, 'brass', 72, 0.3, 0.3], [0.66, 'brass', 76, 0.3, 0.32],
      [0, 'snare', 0, 0, 0.18], [0.33, 'snare', 0, 0, 0.2], [0.66, 'snare', 0, 0, 0.24],
      [1, 'kick', 0, 0, 0.6], [1, 'brass', [70, 76, 79], 1.6, 0.2], [1, 'brass', 84, 1.6, 0.26], [1, 'bass', 48, 1.6, 0.45],
      [1, 'xylo', [84, 88], 0.5, 0.25], [1.5, 'xylo', 90, 0.5, 0.28], [2, 'xylo', 91, 1, 0.32], [2, 'glock', 96, 2, 0.12],
    ]],
    level: () => [150, [
      [0, 'xylo', 60, 0.33, 0.35], [0.33, 'xylo', 64, 0.33, 0.37], [0.66, 'xylo', 66, 0.33, 0.4],
      [1, 'xylo', 67, 0.33, 0.42], [1.33, 'xylo', 69, 0.33, 0.45], [1.66, 'xylo', 70, 0.33, 0.48],
      ...roll(1, 2, 6, 0.08, 0.3),
      [2, 'kick', 0, 0, 0.7], [2, 'brass', [64, 70, 74, 78], 1, 0.16], [2, 'brass', 79, 0.9, 0.28], [2, 'bass', 48, 1, 0.5],
      [3, 'brass', 81, 0.3, 0.26], [3.33, 'brass', 79, 0.3, 0.26], [3.66, 'brass', 76, 0.3, 0.26], [3, 'hat', 0, 0, 0.15], [3.66, 'hat', 0, 0, 0.15],
      [4, 'kick', 0, 0, 0.7], [4, 'snare', 0, 0, 0.3], [4, 'brass', [72, 76, 79, 82], 2, 0.16], [4, 'brass', 84, 2, 0.3],
      [4, 'bass', 48, 2, 0.55], [4, 'glock', [96, 100], 2, 0.1], [4, 'choir', [60, 67, 76], 2.2, 0.16],
    ]],
    // Hauptquest geschafft: Level-Fanfare plus Xylophon-Kaskade und großer Schluss-Akkord
    quest: () => { const [bpm, n] = J.level(); return [bpm, [...n,
      [6, 'xylo', 94, 0.25, 0.3], [6.25, 'xylo', 91, 0.25, 0.3], [6.5, 'xylo', 88, 0.25, 0.3], [6.75, 'xylo', 84, 0.25, 0.3],
      ...roll(6, 7, 6, 0.08, 0.28),
      [7, 'kick', 0, 0, 0.8], [7, 'snare', 0, 0, 0.3], [7, 'brass', [70, 76, 78, 81], 3, 0.15], [7, 'brass', 84, 3, 0.3],
      [7, 'bass', 48, 3, 0.55], [7, 'choir', [60, 64, 70, 74], 3.2, 0.2], [7, 'glock', 96, 3, 0.12]]]; },
    chapter: () => [170, [
      [0, 'brass', 72, 0.3, 0.28], [0.33, 'brass', 76, 0.3, 0.28], [0.66, 'brass', 79, 0.3, 0.3],
      [1, 'kick', 0, 0, 0.6], [1, 'snare', 0, 0, 0.25], [1, 'brass', [76, 82], 1.5, 0.2], [1, 'brass', 84, 1.5, 0.28],
      [1, 'bass', 48, 1.5, 0.5], [1, 'glock', 96, 2, 0.12]]],
    sub: () => [300, [[0, 'xylo', 76, 0.33, 0.38], [0.33, 'xylo', 79, 0.33, 0.4], [0.66, 'xylo', 84, 1, 0.45], [0.66, 'glock', 96, 1.5, 0.1]]],
    // Kasse: Ka-tsching
    buy: () => [600, [[0, 'rattle', 0, 0, 0.3], [0, 'glock', 93, 0.5, 0.22], [1, 'glock', 100, 3, 0.28], [1, 'glock', 105, 3, 0.12]]],
    place: () => [420, [[0, 'thunk', 0, 0, 0.6], [0.5, 'pluck', 79, 0.5, 0.22], [1, 'pluck', 84, 0.5, 0.22], [1, 'glock', 96, 2, 0.07]]],
    pickup: () => [500, [[0, 'pluck', 72, 0.5, 0.22], [0.5, 'pluck', 79, 0.5, 0.22]]],
    start: () => [520, [[0, 'xylo', 60, 0.5, 0.3], [0.5, 'xylo', 64, 0.5, 0.32], [1, 'xylo', 67, 0.5, 0.34], [1.5, 'xylo', 72, 0.5, 0.36], [2, 'xylo', 76, 1, 0.38], [2, 'glock', 88, 2, 0.1]]],
    breakDone: () => [160, [[0, 'glock', 79, 1, 0.3], [1, 'glock', 84, 2, 0.3]]],
    // Fokus geschafft: kleine Vibraphon-Melodie mit Walking Bass, Chor-Akkord am Ende
    focusDone: () => [132, [
      [0, 'vibes', 72, 0.5, 0.32], [0.5, 'vibes', 76, 0.5, 0.32], [1, 'vibes', 79, 0.5, 0.32], [1.5, 'vibes', 81, 0.5, 0.32],
      [2, 'vibes', 82, 0.75, 0.36], [2.75, 'vibes', 81, 0.25, 0.28], [3, 'vibes', 78, 1, 0.34],
      [0, 'bass', 48, 0.9, 0.4], [1, 'bass', 52, 0.9, 0.4], [2, 'bass', 55, 0.9, 0.4], [3, 'bass', 49, 0.9, 0.4],
      [0, 'brush', 0, 0, 0.12], [1, 'hat', 0, 0, 0.1], [2, 'brush', 0, 0, 0.12], [3, 'hat', 0, 0, 0.1],
      [4, 'vibes', [79, 84], 2, 0.34], [4, 'choir', [60, 64, 70, 74, 78], 2.4, 0.13], [4, 'bass', 48, 2, 0.5], [4, 'kick', 0, 0, 0.4]]],
    // Neue Figur: Chor-Schwelle und Glockenspiel-Arpeggio
    unlock: () => [140, [
      [0, 'choir', [60, 64, 67, 71, 78], 2.5, 0.15],
      [0, 'glock', 84, 0.5, 0.2], [0.5, 'glock', 88, 0.5, 0.2], [1, 'glock', 91, 0.5, 0.22], [1.5, 'glock', 95, 0.5, 0.22], [2, 'glock', 96, 2, 0.26],
      [2, 'xylo', [72, 79], 1, 0.25]]],
    // Hardcore verloren: traurige Posaune
    fail: () => [100, [[0, 'bone', 67, 0.85, 0.32], [1, 'bone', 66, 0.85, 0.32], [2, 'bone', 65, 0.85, 0.32], [3, 'bone', 64, 2.4, 0.34, true]]],
    remind: () => [140, [[0, 'glock', 76, 1, 0.32], [1, 'glock', 72, 2, 0.32]]],
    freeze: () => [700, [[0, 'glock', 100, 0.5, 0.15], [1, 'glock', 96, 0.5, 0.15], [2, 'glock', 93, 0.5, 0.15], [3, 'glock', 91, 0.5, 0.15], [4, 'glock', 88, 3, 0.18], [4, 'vibes', [72, 76, 79], 3, 0.15]]],
    // Titel: Chor-„Aah“, Xylophon-Lauf, Blechschlag
    intro: () => [150, [
      [0, 'choir', [60, 64, 67, 71, 78], 2.6, 0.16],
      [2.2, 'xylo', 72, 0.25, 0.32], [2.45, 'xylo', 74, 0.25, 0.33], [2.7, 'xylo', 76, 0.25, 0.35], [2.95, 'xylo', 79, 0.25, 0.37], [3.2, 'xylo', 84, 0.5, 0.4],
      ...roll(3, 4, 6, 0.06, 0.26),
      [4, 'kick', 0, 0, 0.7], [4, 'snare', 0, 0, 0.3], [4, 'brass', [70, 76, 79], 1.8, 0.18], [4, 'brass', 84, 1.8, 0.3],
      [4, 'bass', 48, 1.8, 0.55], [4, 'glock', [96, 103], 2, 0.1]]],
  };

  /* ---------- Plappern: kurze Cartoon-Silben in der Stimmlage der Figur ---------- */
  const VOICE = { homer: 45, barney: 43, moe: 46, wiggum: 47, burns: 52, abe: 50, marge: 55, bart: 62, lisa: 66, maggie: 74, ralph: 64, milhouse: 63, nelson: 60, kang: 40, moleman: 58, duffman: 50 };
  function talk(id, text = '') {
    const base = VOICE[id] ?? 50 + ([...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 12);
    const n = Math.max(3, Math.min(8, Math.round(text.length / 7)));
    let t = ac.currentTime + 0.03;
    for (let i = 0; i < n; i++) {
      const d = 0.06 + Math.random() * 0.05, f = mtof(base + Math.round(Math.random() * 6 - 2));
      const g = env(t, 0.7, 0.01, d * 0.5, 0.05, MAIN, false);
      const vowel = [[730, 1090], [530, 1840], [570, 840], [300, 2300]][Math.floor(Math.random() * 4)];
      const mix = ac.createGain();
      vowel.forEach((ff, j) => { const k = ac.createGain(); k.gain.value = j ? 0.5 : 1; k.connect(g); mix.connect(filt('bandpass', ff, 5, k)); });
      const o = osc('square', f, t, g.end, mix);
      o.frequency.exponentialRampToValueAtTime(f * (i === n - 1 ? 0.85 : 1.05), t + d);
      t += d + 0.02;
    }
  }

  /* ---------- Abspielen, Zusammenfassen, Ducking ---------- */
  const PRIO = { quest: 9, level: 8, intro: 8, chapter: 7, unlock: 6, fail: 6, allDone: 5, focusDone: 5, sub: 4, buy: 3, place: 3, freeze: 3, remind: 3,
    done: 2, min: 2, start: 2, breakDone: 2, talk: 1, skip: 1, undo: 1, pickup: 1, tap: 0 };
  // Angleichen: große Fanfaren leiser, kurze Klicks lauter
  const LEVEL = { quest: 0.5, level: 0.55, focusDone: 0.5, intro: 0.6, allDone: 0.7, chapter: 0.7, unlock: 0.75,
    done: 1.6, min: 1.7, skip: 1.6, undo: 2, tap: 3, pickup: 2, place: 2, buy: 1.5, sub: 1.4, start: 1.3, remind: 1.6, breakDone: 1.6, freeze: 1.2 };
  let queued = null;
  function flush() {
    const q = queued; queued = null;
    if (!q || !S.settings.sound || !ctx()) return;
    try {
      if (q.kind === 'talk') return talk(q.arg, q.text);
      const [bpm, notes] = J[q.kind](q.arg);
      const ch = channel(LEVEL[q.kind] ?? 1);
      const end = play(notes, bpm, ch);
      setTimeout(() => { ch.dry.disconnect(); ch.wet.disconnect(); }, (end - ac.currentTime + 3) * 1000);
      if (PRIO[q.kind] >= 2) duck(end);
    } catch { /* kein Audio */ }
  }
  function sound(kind, arg, text) {
    if (!S.settings.sound || !(kind in PRIO)) return;
    if (!queued) { queued = { kind, arg, text }; setTimeout(flush, 0); }
    else if (PRIO[kind] > PRIO[queued.kind]) queued = { kind, arg, text };
  }

  /* ---------- Stadtmusik: ruhiger Jazz-Loop auf der Karte ---------- */
  // 8 Takte: C7#11 | C7#11 | F7 | F7 | C7#11 | A7 | Dm7 | G7 – Walking Bass, Vibraphon-Begleitung, Besen
  const PROG = [[48, '7#11'], [48, '7#11'], [53, '7'], [53, '7'], [48, '7#11'], [45, '7'], [50, 'm7'], [43, '7']];
  const COMP = { '7': [4, 10, 14], '7#11': [4, 10, 18], m7: [3, 10, 14] };
  const SCALE = { '7': [0, 2, 4, 7, 9, 10], '7#11': [0, 2, 4, 6, 7, 9, 10], m7: [0, 2, 3, 5, 7, 10] };
  const BPM = 108, SPB = 60 / BPM, MUSIC_VOL = 0.25;
  let mus = null;

  function seeded(seed) { let x = seed >>> 0; return () => ((x = (x * 1664525 + 1013904223) >>> 0) / 2 ** 32); }
  function bar(i, t) {
    const [root, q] = PROG[i % 8], next = PROG[(i + 1) % 8][0], rnd = seeded(i * 7919 + Math.floor(i / 8) * 31);
    const third = root + (q === 'm7' ? 3 : 4), approach = next + (rnd() < 0.5 ? -1 : 1);
    const N = [
      [0, 'bass', root, 0.9, 0.42], [1, 'bass', rnd() < 0.5 ? third : root + 7, 0.9, 0.38],
      [2, 'bass', root + (rnd() < 0.6 ? 7 : 9), 0.9, 0.38], [3, 'bass', approach, 0.9, 0.36],
      [0, 'hat', 0, 0.3, 0.05], [1, 'hat', 0, 0.2, 0.07], [1.66, 'hat', 0, 0, 0.04], [2, 'hat', 0, 0.3, 0.05], [3, 'hat', 0, 0.2, 0.07], [3.66, 'hat', 0, 0, 0.04],
      [0, 'brush', 0, 0, 0.05], [2, 'brush', 0, 0, 0.05],
      [rnd() < 0.5 ? 1.66 : 0, 'vibes', COMP[q].map((x) => root + 12 + x), 1, 0.07],
    ];
    if (rnd() < 0.5) N.push([3, 'vibes', COMP[q].map((x) => root + 12 + x), 0.8, 0.06]);
    // Sparsame Melodie aus der Akkordskala, jede Runde etwas anders
    const phrase = i % 8 === 7 ? 0 : Math.floor(rnd() * 4);
    let pos = rnd() < 0.5 ? 0 : 0.66;
    for (let k = 0; k < phrase && pos < 4; k++) {
      const deg = SCALE[q][Math.floor(rnd() * SCALE[q].length)];
      let m = root + deg; while (m < 72) m += 12; while (m > 86) m -= 12;
      N.push([pos, 'vibes', m, 0.6, 0.11]);
      pos += [0.66, 1, 1.33, 2][Math.floor(rnd() * 4)];
    }
    play(N, BPM, mus.bus, t);
  }
  function musicTick() {
    if (!mus) return;
    while (mus.next < ac.currentTime + 0.5) { bar(mus.bar, mus.next); mus.next += 4 * SPB; mus.bar++; }
  }
  function music(want) {
    const on = !!(want && S.settings.sound && S.settings.music && !document.hidden);
    if (on && !mus) {
      if (!ctx()) return;
      const bus = channel(0.0001);
      busGains(bus).forEach((g) => g.exponentialRampToValueAtTime(MUSIC_VOL, ac.currentTime + 1.5));
      mus = { bus, bar: 0, next: ac.currentTime + 0.15, timer: setInterval(musicTick, 150) };
      musicTick();
    } else if (!on && mus) {
      const { bus, timer } = mus; mus = null; clearInterval(timer);
      busGains(bus).forEach((g) => { g.cancelScheduledValues(ac.currentTime); g.setValueAtTime(Math.max(g.value, 0.0001), ac.currentTime); g.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.5); });
      setTimeout(() => { bus.dry.disconnect(); bus.wet.disconnect(); }, 4000);
    }
  }
  const busGains = (bus) => [bus.dry.gain, bus.wet.gain];
  // Musik leiser, solange ein Jingle spielt
  function duck(until) {
    if (!mus) return;
    const now = ac.currentTime;
    busGains(mus.bus).forEach((g) => {
      g.cancelScheduledValues(now); g.setValueAtTime(Math.max(g.value, 0.0001), now);
      g.linearRampToValueAtTime(0.06, now + 0.08); g.setValueAtTime(0.06, until); g.linearRampToValueAtTime(MUSIC_VOL, until + 1);
    });
  }

  return { sound, music, setVol, unlock, kinds: Object.keys(J), get playing() { return !!mus; } };
})();
const sound = Snd.sound;
