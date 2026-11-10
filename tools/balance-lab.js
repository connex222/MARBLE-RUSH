/* MARBLE RUSH — balance lab. Runs races with no screen and reports whether skill pays.
 * Usage: node tools/balance-lab.js [solo|pack|all] [seeds]
 */
'use strict';
const MR = require('../src/engine.js');
const DT = 1 / 60;
function lcg(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

/* ---- snapshot / restore so the "expert" can look ahead ---- */
function snap(w) {
  return {
    time: w.time, acc: w.acc, phase: w.phase, goTime: w.goTime, fc: w.finishCount, fft: w.firstFinishTime, stamp: w.stamp,
    tt: w._trailTick, pass: new Set(w.passing),
    ms: w.marbles.map(m => Object.assign({}, m, { fx: Object.assign({}, m.fx), off: new Set(m.off), trail: m.trail.slice(), stats: Object.assign({}, m.stats), cuts: m.cuts ? Object.assign({}, m.cuts) : undefined })),
    pud: w.puddles.map(p => Object.assign({}, p)),
    ss: w.t.seesaws.map(s => [s.a, s.w, s.load, s.tick]), gems: w.t.gems.map(g => g.cd), pads: w.t.pads.map(p => p.glow), bum: w.t.bumpers.map(b => b.flash),
  };
}
function restore(w, S) {
  w.time = S.time; w.acc = S.acc; w.phase = S.phase; w.goTime = S.goTime; w.finishCount = S.fc; w.firstFinishTime = S.fft; w.stamp = S.stamp; w._trailTick = S.tt; w.passing = new Set(S.pass);
  w.marbles.forEach((m, i) => { const o = S.ms[i]; for (const k in m) if (!(k in o)) delete m[k]; Object.assign(m, o, { fx: Object.assign({}, o.fx), off: new Set(o.off), trail: o.trail.slice(), stats: Object.assign({}, o.stats), cuts: o.cuts ? Object.assign({}, o.cuts) : undefined }); });
  w.puddles = S.pud.map(p => Object.assign({}, p));
  w.t.seesaws.forEach((s, i) => { [s.a, s.w, s.load, s.tick] = S.ss[i]; });
  w.t.gems.forEach((g, i) => { g.cd = S.gems[i]; }); w.t.pads.forEach((p, i) => { p.glow = S.pads[i]; }); w.t.bumpers.forEach((b, i) => { b.flash = S.bum[i]; });
  w.events.length = 0;
}

/* ---- policies: each returns nothing, acts on world ---- */
function mkPolicy(kind, R) {
  const b = { kind, rel: 0, itemAt: 0, next: 0, plan: null, skill: kind.startsWith('cpu') ? +kind.slice(3) : 0 };
  return function act(w, m) {
    if (m.down && w.time >= b.rel) w.release(m.id);
    if (kind === 'idle' || m.finished) return;
    if (m.item && kind !== 'idle') { if (!b.itemAt) b.itemAt = w.time + (kind === 'mash' ? 0 : 0.5 + R() * 2); if (w.time > b.itemAt) { w.useItem(m.id); b.itemAt = 0; } }
    const sp = Math.hypot(m.vx, m.vy);
    if (kind === 'mash') { if (!m.down && R() < 0.25) { w.press(m.id); b.rel = w.time + 0.05; } return; }
    if (kind === 'hold') { if (!m.down) { w.press(m.id); b.rel = Infinity; } return; }
    if (b.skill) {
      if (MR.botThink) { MR.botThink(w, m, b, R); return; }
      if (!m.down) {
        if (m.boost >= 50 && sp < 750 + b.skill * 200 && R() < 0.03 + b.skill * 0.04) { w.press(m.id); b.rel = w.time + 0.05; }
        else if (sp > 1350 - b.skill * 200 && R() < b.skill) { w.press(m.id); b.rel = w.time + 0.35; }
      }
      return;
    }
    if (kind === 'expert') {
      if (m.down || w.time < b.next || m.respawnT > 0) return;
      b.next = w.time + 0.12;
      const S = snap(w);
      const others = w.marbles; w.marbles = [m]; // look ahead alone (cheap, and a human can't predict the pack)
      const score = opt => {
        if (opt === 1) { w.press(m.id); for (let i = 0; i < 3; i++) w.step(DT); w.release(m.id); }
        if (opt >= 2) { w.press(m.id); const n = opt === 2 ? 18 : 42; for (let i = 0; i < n; i++) w.step(DT); w.release(m.id); }
        const H = 2.6 / DT; for (let i = 0; i < H && !m.finished; i++) w.step(DT);
        const v = (m.finished ? 1e6 - (w.time) * 1e3 : m.prog) - (m.respawnT > 0 ? 400 : 0);
        w.marbles = others; restore(w, S); w.marbles = [m];
        return v;
      };
      const s0 = score(0), s1 = m.boost >= 25 && m.cd <= 0 ? score(1) : -1e9, s2 = score(2), s3 = score(3);
      w.marbles = others; restore(w, S);
      const best = Math.max(s0, s1, s2, s3);
      if (best === s0 || best < s0 + 15) return;
      w.press(m.id);
      b.rel = w.time + (best === s1 ? 0.05 : best === s2 ? 0.3 : 0.7);
    }
  };
}

function run(tid, kinds, seed, opts = {}) {
  const T = MR.TRACKS[tid](); const w = new MR.World(T, Object.assign({ seed }, opts));
  const R = lcg(seed * 7 + 1);
  const acts = kinds.map((k, i) => { w.addMarble('m' + i, { cpu: true }); return mkPolicy(k, R); });
  w.goTime = w.time + 1.5; let went = false, endAt = null, lead = null, leadChg = 0;
  const log = kinds.map(() => ({ off: 0, stuck: 0 }));
  for (let t = 0; t < 400; t += DT) {
    if (!went && w.time >= w.goTime) { w.go(); went = true; }
    if (went) w.marbles.forEach((m, i) => acts[i](w, m));
    w.step(DT);
    for (const e of w.events) if (e.type === 'poof') { const i = +e.id.slice(1); if (e.reason === 'stuck') log[i].stuck++; else log[i].off++; }
    w.events.length = 0;
    if (went) { const L = w.marbles.find(m => m.rank === 1); if (L && L.id !== lead) { if (lead) leadChg++; lead = L.id; } }
    if (w.firstFinishTime !== null && endAt === null) endAt = w.time + (MR.C.END_AFTER || 20);
    if (w.allFinished() || (endAt && w.time > endAt)) break;
  }
  return { T, leadChg, res: w.marbles.map((m, i) => ({ kind: kinds[i], t: m.finished ? m.finishTime : null, rank: m.rank, off: log[i].off, stuck: log[i].stuck })) };
}

const TRACKS = Object.keys(MR.TRACKS).filter(k => k !== 'lobby');
function solo(seeds) {
  const kinds = ['idle', 'mash', 'hold', 'cpu0.2', 'cpu0.5', 'cpu0.9', 'expert'];
  console.log('SOLO time trials (seconds, lower is better; off/stuck counts in brackets)');
  console.log('track'.padEnd(11) + kinds.map(k => k.padStart(15)).join(''));
  const tot = kinds.map(() => 0);
  for (const tid of TRACKS) {
    let row = tid.padEnd(11);
    kinds.forEach((k, ki) => {
      let t = 0, o = 0, s = 0, n = k === 'expert' || k === 'idle' || k === 'hold' ? 1 : seeds;
      for (let i = 1; i <= n; i++) { const r = run(tid, [k], i * 31, { items: false, catchup: false }).res[0]; t += r.t == null ? 200 : r.t; o += r.off; s += r.stuck; }
      tot[ki] += t / n;
      row += `${(t / n).toFixed(1)} [${(o / n).toFixed(1)}/${(s / n).toFixed(1)}]`.padStart(15);
    });
    console.log(row);
  }
  console.log('MEAN'.padEnd(11) + tot.map(v => (v / TRACKS.length).toFixed(1).padStart(15)).join(''));
}
function pack(seeds) {
  const kinds = ['idle', 'mash', 'cpu0.2', 'cpu0.5', 'cpu0.9', 'expert'];
  console.log('\nPACK races: 6 racers, items + catch-up on');
  const wins = {}, place = {}, behind = {}; let n = 0, lc = 0, gap = 0, len = 0, last = 0;
  for (const tid of TRACKS) {
    const tw = {}; let tl = 0, tg = 0, tlast = 0, tlc = 0;
    for (let s = 1; s <= seeds; s++) {
      const order = kinds.map((_, i) => kinds[(i + s) % kinds.length]); // rotate start slots
      const r = run(tid, order, s * 101);
      const fin = r.res.filter(x => x.t != null).sort((a, b) => a.t - b.t);
      for (const x of r.res) behind[x.kind] = (behind[x.kind] || 0) + ((x.t == null ? fin[0].t + (MR.C.END_AFTER || 20) : x.t) - fin[0].t);
      for (const x of r.res) { (place[x.kind] = place[x.kind] || []).push(x.rank); if (x.rank === 1) { wins[x.kind] = (wins[x.kind] || 0) + 1; tw[x.kind] = (tw[x.kind] || 0) + 1; } }
      n++; lc += r.leadChg; tlc += r.leadChg; len += fin[0].t; tl += fin[0].t;
      const lg = (fin.length === kinds.length ? fin[fin.length - 1].t : fin[0].t + 20) - fin[0].t; last += lg; tlast += lg;
    }
    console.log(tid.padEnd(11), 'win time', (tl / seeds).toFixed(1).padStart(5), ' last-place gap', (tlast / seeds).toFixed(1).padStart(5), ' lead changes', (tlc / seeds).toFixed(1).padStart(5), ' wins', JSON.stringify(tw));
  }
  console.log(`\n${n} races · mean win time ${(len / n).toFixed(1)}s · last-place gap ${(last / n).toFixed(1)}s · lead changes ${(lc / n).toFixed(1)}`);
  for (const k of kinds) console.log(k.padEnd(9), 'wins', String(wins[k] || 0).padStart(3), `(${((wins[k] || 0) / n * 100).toFixed(0)}%)`.padStart(6), ' average place', (place[k].reduce((a, b) => a + b) / place[k].length).toFixed(2), ' seconds behind winner', (behind[k] / n).toFixed(1));
}
const mode = process.argv[2] || 'all', seeds = +process.argv[3] || 6;
if (mode !== 'pack') solo(seeds);
if (mode !== 'solo') pack(seeds);
