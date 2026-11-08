/* ==========================================================================
   MARBLE RUSH — "Roll" engine  (v0.1)
   Physics, track builder and race world. No DOM — runs in browser or Node.
   Spec: MARBLE_RUSH_MASTER.md sections 4 and 5.
   ========================================================================== */
const MR = (() => {
  'use strict';

  /* ---------- Constants (Section 5.2 / 5.3) ---------- */
  const C = {
    G: 1500, R: 18, DT: 1 / 240, VMAX: 2400,
    BOOST_DV: 380, BOOST_AIR_DV: 150, BOOST_COST: 25, BOOST_REFILL: 14, BOOST_CD: 0.25,
    GRIP_DOWN: 0.6, GRIP_BRAKE: 600, AIR_BRAKE: 200, AIR_GRAV: 0.2,
    TAP_MS: 180, GRIP_DELAY_MS: 110,
    RESPAWN_T: 1.2, STUCK_T: 3.0, OFF_DIST: 520,
    SLIP_RANGE: 150, PERFECT_WIN: 0.15,
    BUMPER_E: 1.25, BUMPER_MIN_OUT: 650, PAD_DV: 500,
    TURBO_DV: 650, JELLY_T: 5, BIG_T: 6, BUBBLE_T: 6, SLIP_T: 1.5, OIL_T: 8,
    GUST_DIST: 1600, GUST_DELAY: 2, GUST_ACC: 300,
  };

  const MAT = {
    wood:  { e: 0.30, crr: 0.012 },
    wall:  { e: 0.25, crr: 0.012 },
    plate: { e: 0.42, crr: 0.012 },
    bowl:  { e: 0.20, crr: 0.22 },
    pad:   { e: 0.25, crr: 0.006 },
    gate:  { e: 0.10, crr: 0.012 },
  };

  const ITEMS = ['turbo', 'jelly', 'oil', 'big', 'bubble'];

  /* ---------- Seeded RNG ---------- */
  function rng(seed) {
    let s = (seed >>> 0) || 0x9E3779B9;
    return () => {
      s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s / 4294967296;
    };
  }

  const rad = d => d * Math.PI / 180;
  const rad2deg = r => r * 180 / Math.PI;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;

  /* ======================================================================
     TRACK BUILDER — a cursor (x, y, phi) lays rails like a pen.
     phi: travel direction in degrees, 0 = right, 90 = down (screen coords).
     ====================================================================== */
  function Builder(meta) {
    const T = {
      meta, segs: [], way: [], bumpers: [], pads: [], gems: [], loops: [],
      hazards: [], stairs: [], jumps: [], bowls: [], arches: [], walls: [],
      startSlots: [], gateX: 0, gateY: 0, finishWay: -1,
    };
    let x = 0, y = 0, phi = 0;

    const H = () => (Math.cos(rad(phi)) >= 0 ? 1 : -1);

    function seg(x1, y1, x2, y2, mat = 'wood', o = {}) {
      const s = Object.assign({ x1, y1, x2, y2, mat }, o);
      T.segs.push(s);
      return s;
    }
    function way(px, py) {
      const w = T.way, l = w[w.length - 1];
      if (l && Math.hypot(px - l.x, py - l.y) < 18) return;
      w.push({ x: px, y: py });
    }
    function wayFloor(px, py, ph) {
      const a = rad(ph);
      let nx = Math.sin(a), ny = -Math.cos(a);
      if (ny > 0) { nx = -nx; ny = -ny; }
      way(px + nx * C.R, py + ny * C.R);
    }
    /** Point the nose: slope in degrees, positive = downhill, keeps heading. */
    function aim(slope) { phi = H() > 0 ? slope : 180 - slope; }
    function face(h, slope = 0) { phi = h > 0 ? slope : 180 - slope; }

    function line(len, mat = 'wood', o = {}) {
      const a = rad(phi);
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      const s = seg(x, y, x2, y2, mat, o);
      const n = Math.max(1, Math.ceil(len / 40));
      for (let i = 0; i <= n; i++) wayFloor(x + (x2 - x) * i / n, y + (y2 - y) * i / n, phi);
      x = x2; y = y2;
      return s;
    }
    /** Bend: dSlope > 0 noses down, < 0 noses up, whichever way we head. */
    function bend(radius, dSlope, mat = 'wood') {
      const dphi = H() > 0 ? dSlope : -dSlope;
      const steps = Math.max(3, Math.ceil(Math.abs(dphi) / 6));
      const d = dphi / steps;
      const chord = 2 * radius * Math.sin(rad(Math.abs(d)) / 2);
      for (let i = 0; i < steps; i++) { phi += d / 2; line(chord, mat); phi += d / 2; }
    }
    /** Drop-wall U-turn: wall at the end, next rail starts below heading back. */
    function uturn(drop = 160, wallH = 150, slope = 7) {
      const h = H();
      const xw = x + h * (2 * C.R + 14);
      T.walls.push(seg(xw, y - wallH, xw, y + drop + 8, 'wall', { kind: 'wall' }));
      for (let k = 1; k <= 4; k++) way(xw - h * (C.R + 6), y - C.R + drop * k / 4);
      x = xw; y = y + drop;
      face(-h, slope);
    }
    /** Kicker + low wall: too fast and you sail over it (Section 5.5). */
    function dangerTurn(drop = 170, slope = 7, wall = 80) {
      const base = slope;
      bend(110, -22);
      line(20);
      T.hazards.push({ x, y: y - 6, h: H() });
      bend(110, 22);
      aim(base);
      line(300);
      uturn(drop, wall, slope);
    }
    function loop(Rl = 120) {
      const h = H(), id = T.loops.length;
      const cx = x, cy = y - Rl;
      const steps = 56;
      let px = x, py = y;
      for (let i = 1; i <= steps; i++) {
        const th = i / steps * Math.PI * 2;
        const nx = cx + h * Rl * Math.sin(th), ny = cy + Rl * Math.cos(th);
        const mid = (i - 0.5) / steps * Math.PI * 2;
        const layer = mid < Math.PI / 2 ? `L${id}a` : mid > 1.5 * Math.PI ? `L${id}b` : null;
        seg(px, py, nx, ny, 'wood', { layer, kind: 'loop' });
        way(nx + (cx - nx) / Rl * C.R, ny + (cy - ny) / Rl * C.R);
        px = nx; py = ny;
      }
      T.loops.push({ id, cx, cy, r: Rl, h });
      face(h, 0);
    }
    function jump(gap = 200, landDrop = 80, lip = 16, slope = 20) {
      bend(170, -lip);
      line(26);
      const h = H(), sx = x, sy = y;
      T.jumps.push({ x: sx, y: sy, h, gap });
      for (let k = 1; k <= 8; k++) {
        way(sx + h * gap * k / 8, sy - C.R - Math.sin(Math.PI * k / 8) * 50 + landDrop * k / 8);
      }
      x = sx + h * gap; y = sy + landDrop;
      aim(slope);
    }
    function bumpers(len, count = 3) {
      const a = rad(phi), h = H();
      const sx = x, sy = y;
      const part = len / (count + 1);
      for (let i = 0; i <= count; i++) {
        line(part * 0.7);
        if (i < count) { bend(70, -14); bend(70, 14); }
      }
      phi = h > 0 ? rad2deg(a) : rad2deg(a);
      for (let i = 0; i < count; i++) {
        const f = (i + 1) / (count + 1);
        const fx = sx + Math.cos(a) * len * f, fy = sy + Math.sin(a) * len * f;
        const off = i % 2 === 0 ? 86 : 134;
        T.bumpers.push({ x: fx, y: fy - off, r: 24, flash: 0, h });
      }
    }
    function pad(len) {
      const a = rad(phi);
      const s = line(len, 'pad', { kind: 'pad' });
      T.pads.push({ s, dx: Math.cos(a), dy: Math.sin(a), glow: 0 });
    }
    function gems(count = 4, spacing = 80, ahead = 60) {
      const a = rad(phi);
      let nx = Math.sin(a), ny = -Math.cos(a);
      if (ny > 0) { nx = -nx; ny = -ny; }
      for (let i = 0; i < count; i++) {
        const d = ahead + i * spacing;
        T.gems.push({
          x: x + Math.cos(a) * d + nx * (C.R + 6),
          y: y + Math.sin(a) * d + ny * (C.R + 6),
          cd: 0, phase: i * 0.7,
        });
      }
    }
    /** Xylophone stairs: each plate plays a note when hit. */
    function stairs(n = 8, w = 104, drop = 44) {
      const h = H();
      face(h, 0);
      for (let i = 0; i < n; i++) {
        const s = seg(x, y, x + h * w, y, 'plate', { note: i % 8, kind: 'plate' });
        T.stairs.push(s);
        for (let k = 0; k <= 3; k++) way(x + h * w * k / 3, y - C.R);
        x += h * w; y += drop;
      }
      y -= drop;
    }
    /** Whirlpool bowl — rock until slow enough to drop through the hole. */
    function bowl(Rb = 230, hole = 76) {
      const h = H(), cx = x + h * Rb, cy = y, hw = hole / 2;
      const steps = 44;
      let px = x, py = y;
      for (let i = 1; i <= steps; i++) {
        const th = Math.PI - i / steps * Math.PI;
        const qx = h > 0 ? cx + Rb * Math.cos(th) : cx - Rb * Math.cos(th);
        const qy = cy + Rb * Math.sin(th);
        const mx = (px + qx) / 2;
        if (Math.abs(mx - cx) > hw) seg(px, py, qx, qy, 'bowl', { kind: 'bowl' });
        if (i % 4 === 0 && Math.abs(qx - cx) > hw) {
          way(qx + (cx - qx) / Rb * C.R, qy + (cy - qy) / Rb * C.R);
        }
        px = qx; py = qy;
      }
      T.walls.push(seg(cx + h * Rb, cy + 4, cx + h * Rb, cy - 190, 'wall', { kind: 'wall' }));
      way(cx, cy + Rb - C.R);
      way(cx, cy + Rb + 60);
      T.bowls.push({ cx, cy, r: Rb, hole, h });
      x = cx - h * 46; y = cy + Rb + 120;
      face(h, 10);
      way(x + h * 20, y - C.R);
    }
    function start(slots = 8) {
      x = 0; y = 0; phi = 0;
      T.walls.push(seg(-26, -220, -26, 4, 'wall', { kind: 'wall' }));
      aim(5);
      const a = rad(phi), L = slots * 42 + 26;
      for (let i = 0; i < slots; i++) {
        const d = 24 + i * 42;
        T.startSlots.push({ x: Math.cos(a) * d, y: Math.sin(a) * d - C.R - 1 });
      }
      line(L);
      T.gateX = x + 2; T.gateY = y;
      seg(T.gateX, y - 120, T.gateX, y + 4, 'gate', { layer: 'gate', kind: 'gate' });
    }
    function finish() {
      T.finishWay = T.way.length - 1;
      T.arches.push({ x, y, h: H() });
    }
    function runoff(len = 520) {
      const h = H();
      face(h, 3);
      line(len);
      T.walls.push(seg(x + h * 4, y - 160, x + h * 4, y + 6, 'wall', { kind: 'wall' }));
    }

    function done() {
      // cumulative distance along route
      const w = T.way;
      T.cum = new Float64Array(w.length);
      for (let i = 1; i < w.length; i++) {
        T.cum[i] = T.cum[i - 1] + Math.hypot(w[i].x - w[i - 1].x, w[i].y - w[i - 1].y);
      }
      T.length = T.cum[w.length - 1];
      T.finishDist = T.finishWay >= 0 ? T.cum[T.finishWay] : Infinity;
      // checkpoints every ~600px of route
      T.checkpoints = [0];
      let next = 600;
      for (let i = 1; i < w.length; i++) {
        if (T.cum[i] >= next) { T.checkpoints.push(i); next = T.cum[i] + 600; }
      }
      // segment prep + bounds
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const s of T.segs) {
        s.dx = s.x2 - s.x1; s.dy = s.y2 - s.y1; s.len2 = s.dx * s.dx + s.dy * s.dy || 1;
        minX = Math.min(minX, s.x1, s.x2); maxX = Math.max(maxX, s.x1, s.x2);
        minY = Math.min(minY, s.y1, s.y2); maxY = Math.max(maxY, s.y1, s.y2);
      }
      T.bounds = { minX, minY, maxX, maxY };
      // spatial hash
      const CELL = 128, grid = new Map();
      const key = (cx, cy) => cx * 73856093 ^ cy * 19349663;
      T.segs.forEach((s, idx) => {
        const x0 = Math.floor((Math.min(s.x1, s.x2) - 40) / CELL), x1 = Math.floor((Math.max(s.x1, s.x2) + 40) / CELL);
        const y0 = Math.floor((Math.min(s.y1, s.y2) - 40) / CELL), y1 = Math.floor((Math.max(s.y1, s.y2) + 40) / CELL);
        for (let gx = x0; gx <= x1; gx++) for (let gy = y0; gy <= y1; gy++) {
          const k = key(gx, gy);
          let a = grid.get(k); if (!a) { a = []; grid.set(k, a); }
          a.push(idx);
        }
      });
      T.query = (px, py) => grid.get(key(Math.floor(px / CELL), Math.floor(py / CELL))) || EMPTY;
      return T;
    }

    return {
      T, line, bend, aim, face, uturn, dangerTurn, loop, jump, bumpers, pad, gems, stairs, bowl,
      start, finish, runoff, done, get x() { return x; }, get y() { return y; }, get h() { return H(); },
    };
  }
  const EMPTY = [];

  /* ======================================================================
     TRACKS
     ====================================================================== */
  const TRACKS = {};

  /** Toy Box Tumble — wooden toys in a child's bedroom (Section 6.2). */
  TRACKS.toybox = () => {
    const B = Builder({ id: 'toybox', name: 'Toy Box Tumble', theme: 'toybox' });
    B.start(8);
    // 1 → gems + crest
    B.aim(9); B.line(260); B.gems(4); B.line(560); B.bend(300, -14); B.bend(300, 22); B.line(380);
    B.uturn(170, 150, 7);
    // 2 ← xylophone stairs
    B.line(300); B.stairs(8); B.aim(8); B.line(260);
    B.uturn(160, 150, 8);
    // 3 → booster + danger kicker
    B.line(320); B.pad(200); B.line(260);
    B.dangerTurn(180, 8);
    // 4 ← bumper field
    B.line(200); B.aim(24); B.bumpers(560, 4); B.aim(8); B.line(260); B.gems(4); B.line(300);
    B.uturn(170, 150, 30);
    // 5 → steep drop into the loop
    B.line(760); B.bend(260, -30); B.line(60); B.loop(118); B.aim(3); B.line(380);
    B.uturn(160, 150, 7);
    // 6 ← jump
    B.line(420); B.aim(14); B.line(300); B.jump(210, 70, 16, 18); B.line(380); B.aim(7); B.line(200);
    B.uturn(170, 150, 9);
    // 7 → whirlpool bowl
    B.line(320); B.gems(4); B.line(420); B.bowl(220, 76);
    B.line(440);
    B.uturn(160, 150, 8);
    // 8 ← double crest + danger
    B.line(200); B.bend(260, -16); B.bend(260, 26); B.line(200);
    B.dangerTurn(170, 9);
    // 9 → fast run, two airtime hills
    B.line(260); B.bend(240, -18); B.bend(240, 26); B.line(240); B.gems(4); B.line(260);
    B.bend(240, -18); B.bend(240, 26); B.line(300);
    B.uturn(170, 150, 8);
    // 10 ← second xylophone + bumpers
    B.line(260); B.stairs(8, 96, 40); B.aim(22); B.bumpers(420, 3); B.aim(8); B.line(160);
    B.uturn(160, 150, 26);
    // 11 → big jump
    B.line(700); B.pad(160); B.jump(260, 90, 18, 20); B.line(300); B.aim(7); B.line(180);
    B.uturn(170, 150, 30);
    // 12 ← steep drop into a left-hand loop
    B.line(780); B.bend(240, -30); B.line(60); B.loop(112); B.aim(4); B.line(360);
    B.uturn(160, 150, 8);
    // 13 → gems + danger
    B.line(380); B.gems(4); B.line(360); B.pad(160);
    B.dangerTurn(180, 9);
    // 14 ← whirlpool bowl #2
    B.line(300); B.bowl(200, 76); B.line(380);
    B.uturn(170, 150, 9);
    // 15 → final stretch
    B.line(300); B.pad(200); B.line(420); B.aim(4); B.line(180);
    B.finish();
    B.runoff(520);
    return B.done();
  };

  /** Lobby playground bowl — practise boost & grip while players join. */
  TRACKS.lobby = () => {
    const B = Builder({ id: 'lobby', name: 'Lobby', theme: 'toybox' });
    const T = B.T;
    const R = 520, cx = 0, cy = 0;
    const steps = 60;
    let px = cx - R * 1.0, py = cy - 120;
    // half-pipe: lower arc from 200° to 340° (screen coords), with tall walls
    T.segs.push({ x1: px, y1: py - 340, x2: px, y2: py, mat: 'wall', kind: 'wall' });
    for (let i = 0; i <= steps; i++) {
      const th = rad(193 + i / steps * 154); // left rim → bottom → right rim
      const qx = cx + R * Math.cos(th), qy = cy - R * Math.sin(th) * 1;
      if (i > 0) T.segs.push({ x1: px, y1: py, x2: qx, y2: qy, mat: 'wood', kind: 'bowl' });
      px = qx; py = qy;
    }
    T.segs.push({ x1: px, y1: py, x2: px, y2: py - 340, mat: 'wall', kind: 'wall' });
    for (let i = 0; i < 8; i++) T.startSlots.push({ x: -200 + i * 55, y: -380 });
    T.way.push({ x: -300, y: 400 }, { x: 300, y: 400 });
    return B.done();
  };

  /* ======================================================================
     WORLD — marbles, rules, items, progress
     ====================================================================== */
  class World {
    constructor(track, opts = {}) {
      this.t = track;
      this.opts = Object.assign({ items: true, catchup: true, free: false }, opts);
      this.rand = rng(opts.seed || 1234);
      this.time = 0; this.acc = 0;
      this.phase = this.opts.free ? 'free' : 'pen';
      this.goTime = Infinity;
      this.marbles = [];
      this.events = [];
      this.puddles = [];
      this.finishCount = 0;
      this.firstFinishTime = null;
      this.loopLayersB = track.loops.map(l => `L${l.id}b`);
      this.stamp = 0;
    }

    emit(type, d = {}) { d.type = type; d.time = this.time; this.events.push(d); }

    addMarble(id, info = {}) {
      const slot = this.marbles.length;
      const sp = this.t.startSlots[slot % this.t.startSlots.length];
      const m = {
        id, slot, name: info.name || 'Racer', color: info.color || '#FF3B5C', swirl: info.swirl || 0,
        shape: info.shape || 'circle', cpu: !!info.cpu,
        x: sp.x + (slot >= this.t.startSlots.length ? 6 : 0), y: sp.y - (slot >= this.t.startSlots.length ? 40 : 0),
        vx: 0, vy: 0, r: C.R, mass: 1, ang: this.rand() * 6.28, av: 0,
        gTime: 1, nx: 0, ny: -1, crr: 0.012,
        boost: 100, cd: 0, item: null,
        fx: { jelly: 0, big: 0, bubble: 0, slip: 0, hold: 0 },
        down: false, downAt: 0, startUsed: false, pendingPerfect: false,
        wayIdx: 0, prog: 0, routeD: 0,
        finished: false, finishTime: 0, place: 0, rank: slot + 1,
        respawnT: 0, respawnCP: 0, stuckT: 0, stuckProg: 0, behindT: 0, gust: false,
        padCD: 0, puddleCD: 0, slipstream: false,
        off: new Set(this.loopLayersB),
        trail: [],
        stats: { offs: 0, air: 0, maxAir: 0, bumps: 0, topSpeed: 0, perfect: 0, worstRank: slot + 1, climb: 0 },
      };
      if (this.phase !== 'pen') m.off.add('gate');
      this.marbles.push(m);
      this.updateProgress(m, true);
      return m;
    }
    removeMarble(id) { this.marbles = this.marbles.filter(m => m.id !== id); }
    get(id) { return this.marbles.find(m => m.id === id); }

    go() {
      this.phase = 'race';
      this.goTime = this.time;
      for (const m of this.marbles) {
        m.off.add('gate');
        if (m.pendingPerfect) this.perfectStart(m);
      }
      this.emit('go');
    }

    /* ---------- input ---------- */
    press(id) {
      const m = this.get(id); if (!m || m.down) return;
      m.down = true; m.downAt = this.time;
    }
    release(id) {
      const m = this.get(id); if (!m || !m.down) return;
      m.down = false;
      if ((this.time - m.downAt) * 1000 <= C.TAP_MS) this.tap(m);
    }
    tap(m) {
      if (m.respawnT > 0) return;
      if (this.phase === 'pen') {
        if (m.startUsed) return;
        const dt = this.goTime - this.time;
        if (dt <= C.PERFECT_WIN && dt >= 0) { m.pendingPerfect = true; m.startUsed = true; }
        else if (dt > C.PERFECT_WIN && dt < 4) { m.startUsed = true; m.fx.hold = 0.5; this.emit('early', { id: m.id }); }
        return;
      }
      if (this.phase === 'race' && !m.startUsed && this.time - this.goTime <= C.PERFECT_WIN) {
        m.startUsed = true; this.perfectStart(m); return;
      }
      if (this.phase === 'race' && !m.startUsed) m.startUsed = true;
      this.boost(m);
    }
    perfectStart(m) {
      m.pendingPerfect = false;
      m.fx.hold = 0;
      m.vx += 460;
      m.stats.perfect++;
      this.emit('perfect', { id: m.id, x: m.x, y: m.y });
    }
    useItem(id) {
      const m = this.get(id);
      if (!m || !m.item || m.respawnT > 0 || this.phase === 'pen') return;
      const it = m.item; m.item = null;
      const d = this.routeDir(m);
      if (it === 'turbo') { m.vx += d.x * C.TURBO_DV; m.vy += d.y * C.TURBO_DV; }
      else if (it === 'jelly') m.fx.jelly = C.JELLY_T;
      else if (it === 'big') m.fx.big = C.BIG_T;
      else if (it === 'bubble') m.fx.bubble = C.BUBBLE_T;
      else if (it === 'oil') {
        this.puddles.push({ x: m.x - d.x * 34, y: m.y + 2, r: 42, t: C.OIL_T, owner: m.id, born: this.time,
          nx: m.nx, ny: m.ny });
      }
      this.emit('item', { id: m.id, item: it, x: m.x, y: m.y });
    }

    routeDir(m) {
      const w = this.t.way, i = Math.min(m.wayIdx, w.length - 2);
      if (i < 0) return { x: 1, y: 0 };
      const dx = w[i + 1].x - w[i].x, dy = w[i + 1].y - w[i].y, l = Math.hypot(dx, dy) || 1;
      return { x: dx / l, y: dy / l };
    }

    boost(m) {
      if (m.cd > 0 || m.fx.slip > 0 || m.fx.hold > 0) return;
      if (m.boost < C.BOOST_COST) { this.emit('empty', { id: m.id }); return; }
      m.boost -= C.BOOST_COST; m.cd = C.BOOST_CD;
      const grounded = m.gTime < 0.06;
      let dx, dy;
      const sp = Math.hypot(m.vx, m.vy);
      if (grounded) {
        dx = -m.ny; dy = m.nx;
        const rd = this.routeDir(m);
        const ref = sp > 40 ? { x: m.vx, y: m.vy } : rd;
        if (dx * ref.x + dy * ref.y < 0) { dx = -dx; dy = -dy; }
      } else if (sp > 40) { dx = m.vx / sp; dy = m.vy / sp; }
      else { const rd = this.routeDir(m); dx = rd.x; dy = rd.y; }
      const dv = grounded ? C.BOOST_DV : C.BOOST_AIR_DV;
      m.vx += dx * dv; m.vy += dy * dv;
      this.emit('boost', { id: m.id, x: m.x, y: m.y, dx, dy });
    }

    rollItem(m) {
      const n = this.marbles.length;
      const f = n > 1 ? (m.rank - 1) / (n - 1) : 0.5; // 0 = leader, 1 = last
      const w = {
        turbo: 1 + 4 * f,
        jelly: 1 + 2 * (1 - Math.abs(f - 0.5) * 2),
        oil: 1 + 3 * (1 - f),
        big: 0.5 + 3 * f,
        bubble: 1.5,
      };
      let tot = 0; for (const k of ITEMS) tot += w[k];
      let r = this.rand() * tot;
      for (const k of ITEMS) { r -= w[k]; if (r <= 0) return k; }
      return 'bubble';
    }

    /* ---------- simulation ---------- */
    step(realDt) {
      this.acc += Math.min(realDt, 0.1);
      let n = 0;
      while (this.acc >= C.DT && n < 40) { this.tick(C.DT); this.acc -= C.DT; n++; }
    }

    tick(dt) {
      this.time += dt;
      const ms = this.marbles;
      for (const m of ms) this.moveMarble(m, dt);
      this.marbleCollisions();
      this.features(dt);
      for (const m of ms) this.updateProgress(m);
      this.rankAndRules(dt);
      for (const p of this.puddles) p.t -= dt;
      if (this.puddles.length && this.puddles[0].t <= 0) this.puddles = this.puddles.filter(p => p.t > 0);
    }

    moveMarble(m, dt) {
      if (m.respawnT > 0) {
        m.respawnT -= dt;
        if (m.respawnT <= 0) this.placeAtCheckpoint(m);
        return;
      }
      const fx = m.fx;
      for (const k in fx) if (fx[k] > 0) fx[k] -= dt;
      if (m.cd > 0) m.cd -= dt;
      if (m.padCD > 0) m.padCD -= dt;
      if (m.puddleCD > 0) m.puddleCD -= dt;

      const big = fx.big > 0;
      const tr = big ? C.R * 1.5 : C.R;
      m.r += (tr - m.r) * Math.min(1, dt * 12);
      m.mass = big ? 3 : fx.bubble > 0 ? 2 : 1;

      const g = C.G;
      let ax = 0, ay = g;
      const grounded = m.gTime < 0.05;
      const canInput = this.phase !== 'pen' && fx.slip <= 0 && fx.hold <= 0;
      const grip = canInput && m.down && (this.time - m.downAt) * 1000 > C.GRIP_DELAY_MS;
      const sp0 = Math.hypot(m.vx, m.vy);
      if (grip) {
        if (grounded) {
          ax -= m.nx * C.GRIP_DOWN * g; ay -= m.ny * C.GRIP_DOWN * g;
          if (sp0 > 1) { ax -= m.vx / sp0 * C.GRIP_BRAKE; ay -= m.vy / sp0 * C.GRIP_BRAKE; }
        } else {
          if (sp0 > 1) { ax -= m.vx / sp0 * C.AIR_BRAKE; ay -= m.vy / sp0 * C.AIR_BRAKE; }
          ay += C.AIR_GRAV * g;
        }
      }
      if (fx.jelly > 0 && grounded) { ax -= m.nx * 1.0 * g; ay -= m.ny * 1.0 * g; }
      if (m.gust && this.phase === 'race') {
        const d = this.routeDir(m); ax += d.x * C.GUST_ACC; ay += d.y * C.GUST_ACC;
      }
      m.vx += ax * dt; m.vy += ay * dt;
      m.vx *= 0.9995; m.vy *= 0.9995;
      if (fx.hold > 0) { m.vx = 0; m.vy = Math.max(m.vy, 0); }
      let sp = Math.hypot(m.vx, m.vy);
      const vmax = C.VMAX * (big ? 0.92 : 1);
      if (sp > vmax) { m.vx *= vmax / sp; m.vy *= vmax / sp; sp = vmax; }

      const sub = Math.max(1, Math.ceil(sp * dt / (0.4 * m.r)));
      const h = dt / sub;
      const wasAir = m.gTime > 0.1;
      const airBefore = m.gTime;
      for (let k = 0; k < sub; k++) {
        m.x += m.vx * h; m.y += m.vy * h;
        this.collideTrack(m);
      }
      // rolling resistance
      if (m.gTime === 0) {
        const vn = m.vx * m.nx + m.vy * m.ny;
        const tx = m.vx - vn * m.nx, ty = m.vy - vn * m.ny;
        const tl = Math.hypot(tx, ty);
        let crr = m.crr;
        if (fx.slip > 0) crr *= 0.15;
        const dec = crr * g * dt;
        if (tl > dec) { m.vx -= tx / tl * dec; m.vy -= ty / tl * dec; }
        else if (tl > 0) { m.vx -= tx; m.vy -= ty; }
        // roll: angular velocity from tangential speed
        const s = (m.vx * -m.ny + m.vy * m.nx);
        m.av = s / m.r;
        if (wasAir) {
          m.stats.maxAir = Math.max(m.stats.maxAir, airBefore);
          if (airBefore > 0.75) this.emit('bigair', { id: m.id, t: airBefore, x: m.x, y: m.y });
        }
      }
      m.ang += m.av * dt;
      m.gTime += dt;
      m.stats.topSpeed = Math.max(m.stats.topSpeed, sp);
      // trail for speed streaks
      if ((this._trailTick = (this._trailTick || 0) + 1) % 3 === 0) {
        m.trail.push(m.x, m.y); if (m.trail.length > 16) m.trail.splice(0, 2);
      }
    }

    collideTrack(m) {
      const segs = this.t.segs, st = ++this.stamp;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const list = this.t.query(m.x + ox * 64, m.y + oy * 64);
        for (let i = 0; i < list.length; i++) {
          const s = segs[list[i]];
          if (s._st === st) continue; s._st = st;
          if (s.layer && m.off.has(s.layer)) continue;
          let t = ((m.x - s.x1) * s.dx + (m.y - s.y1) * s.dy) / s.len2;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = s.x1 + s.dx * t, py = s.y1 + s.dy * t;
          const ddx = m.x - px, ddy = m.y - py, d2 = ddx * ddx + ddy * ddy;
          if (d2 >= m.r * m.r || d2 < 1e-9) continue;
          const d = Math.sqrt(d2), nx = ddx / d, ny = ddy / d;
          const pen = m.r - d;
          m.x += nx * pen; m.y += ny * pen;
          const vn = m.vx * nx + m.vy * ny;
          const mat = MAT[s.mat] || MAT.wood;
          if (vn < 0) {
            const e = -vn < 90 ? 0 : mat.e;
            m.vx -= (1 + e) * vn * nx; m.vy -= (1 + e) * vn * ny;
            if (-vn > 140) this.emit('impact', { id: m.id, mat: s.mat, note: s.note, v: -vn, x: px, y: py });
          }
          m.gTime = 0; m.nx = nx; m.ny = ny; m.crr = mat.crr;
        }
      }
    }

    marbleCollisions() {
      const ms = this.marbles;
      for (let i = 0; i < ms.length; i++) {
        const a = ms[i]; if (a.respawnT > 0) continue;
        for (let j = i + 1; j < ms.length; j++) {
          const b = ms[j]; if (b.respawnT > 0) continue;
          const dx = b.x - a.x, dy = b.y - a.y, rs = a.r + b.r;
          const d2 = dx * dx + dy * dy;
          if (d2 >= rs * rs || d2 < 1e-9) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, pen = rs - d;
          const ma = a.fx.bubble > 0 ? 4 : a.mass, mb = b.fx.bubble > 0 ? 4 : b.mass;
          const ia = 1 / ma, ib = 1 / mb, it = ia + ib;
          a.x -= nx * pen * ia / it; a.y -= ny * pen * ia / it;
          b.x += nx * pen * ib / it; b.y += ny * pen * ib / it;
          const vr = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (vr < 0) {
            const e = -vr < 60 ? 0 : 0.8;
            const jn = -(1 + e) * vr / it;
            a.vx -= jn * ia * nx; a.vy -= jn * ia * ny;
            b.vx += jn * ib * nx; b.vy += jn * ib * ny;
            if (-vr > 120) {
              a.stats.bumps++; b.stats.bumps++;
              const bertha = a.fx.big > 0 || b.fx.big > 0;
              this.emit('clack', { v: -vr, x: a.x + nx * a.r, y: a.y + ny * a.r, bertha, a: a.id, b: b.id });
            }
          }
        }
      }
    }

    features(dt) {
      const t = this.t;
      for (const b of t.bumpers) if (b.flash > 0) b.flash -= dt;
      for (const p of t.pads) if (p.glow > 0) p.glow -= dt;
      for (const g of t.gems) if (g.cd > 0) g.cd -= dt;
      for (const m of this.marbles) {
        if (m.respawnT > 0) continue;
        // loops: switch collision layers as the marble passes the top
        for (const L of t.loops) {
          const dx = m.x - L.cx, dy = m.y - L.cy;
          if (Math.abs(dx) > L.r * 2.6 || Math.abs(dy) > L.r * 2.6) continue;
          if (dy < -0.5 * L.r) {
            if (!m.off.has(`L${L.id}a`)) this.emit('looptop', { id: m.id, x: m.x, y: m.y });
            m.off.add(`L${L.id}a`); m.off.delete(`L${L.id}b`);
          }
          else if (dx * L.h > L.r * 1.25) { m.off.delete(`L${L.id}a`); m.off.add(`L${L.id}b`); }
        }
        // bumpers
        for (const b of t.bumpers) {
          const dx = m.x - b.x, dy = m.y - b.y, rs = b.r + m.r, d2 = dx * dx + dy * dy;
          if (d2 >= rs * rs || d2 < 1e-9) continue;
          const d = Math.sqrt(d2), nx = dx / d, ny = dy / d;
          m.x = b.x + nx * rs; m.y = b.y + ny * rs;
          const vn = m.vx * nx + m.vy * ny;
          if (vn < 0) { m.vx -= (1 + C.BUMPER_E) * vn * nx; m.vy -= (1 + C.BUMPER_E) * vn * ny; }
          const out = m.vx * nx + m.vy * ny;
          if (out < C.BUMPER_MIN_OUT) { m.vx += (C.BUMPER_MIN_OUT - out) * nx; m.vy += (C.BUMPER_MIN_OUT - out) * ny; }
          const rd = this.routeDir(m);
          m.vx += rd.x * 300; m.vy += rd.y * 300;
          if (b.flash <= 0.05) this.emit('bumper', { id: m.id, x: b.x, y: b.y });
          b.flash = 0.25;
        }
        // boost pads
        if (m.padCD <= 0 && m.gTime < 0.05) {
          for (const p of t.pads) {
            const s = p.s;
            let u = ((m.x - s.x1) * s.dx + (m.y - s.y1) * s.dy) / s.len2;
            if (u < 0 || u > 1) continue;
            const px = s.x1 + s.dx * u, py = s.y1 + s.dy * u;
            if (Math.hypot(m.x - px, m.y - py) > m.r + 6) continue;
            m.vx += p.dx * C.PAD_DV; m.vy += p.dy * C.PAD_DV;
            m.padCD = 0.7; p.glow = 0.4;
            this.emit('pad', { id: m.id, x: m.x, y: m.y });
            break;
          }
        }
        // gems
        if (this.opts.items && !m.item) {
          for (const g of t.gems) {
            if (g.cd > 0) continue;
            if (Math.hypot(m.x - g.x, m.y - g.y) < m.r + 22) {
              m.item = this.rollItem(m); g.cd = 1.6;
              this.emit('pickup', { id: m.id, item: m.item, x: g.x, y: g.y });
              break;
            }
          }
        }
        // oil puddles
        if (m.puddleCD <= 0 && m.fx.bubble <= 0 && m.fx.jelly <= 0) {
          for (const p of this.puddles) {
            if (p.owner === m.id && this.time - p.born < 1.2) continue;
            if (Math.hypot(m.x - p.x, m.y - p.y) < p.r + m.r * 0.5) {
              m.fx.slip = C.SLIP_T; m.vx *= 0.78; m.vy *= 0.78; m.puddleCD = 2;
              this.emit('slip', { id: m.id, x: m.x, y: m.y });
              break;
            }
          }
        }
      }
    }

    updateProgress(m, init) {
      const w = this.t.way, cum = this.t.cum;
      if (!w.length) return;
      let best = m.wayIdx, bd = Infinity;
      const lo = init ? 0 : Math.max(0, m.wayIdx - 8);
      const hi = init ? Math.min(w.length - 1, 60) : Math.min(w.length - 1, m.wayIdx + 40);
      for (let i = lo; i <= hi; i++) {
        const dx = m.x - w[i].x, dy = m.y - w[i].y, d = dx * dx + dy * dy;
        if (d < bd) { bd = d; best = i; }
      }
      m.wayIdx = best;
      // continuous progress: project onto adjacent segment
      let p = cum[best];
      const j = best < w.length - 1 ? best : best - 1;
      if (j >= 0 && j < w.length - 1) {
        const ax = w[j].x, ay = w[j].y, bx = w[j + 1].x, by = w[j + 1].y;
        const sx = bx - ax, sy = by - ay, l2 = sx * sx + sy * sy || 1;
        const u = clamp(((m.x - ax) * sx + (m.y - ay) * sy) / l2, 0, 1);
        p = cum[j] + Math.sqrt(l2) * u;
      }
      if (this.phase === 'free') { m.prog = 0; m.routeD = 0; return; }
      m.prog = p;
      m.routeD = Math.sqrt(bd);
    }

    respawn(m, cpIndex, reason) {
      if (m.respawnT > 0) return;
      m.respawnT = C.RESPAWN_T;
      m.respawnCP = cpIndex;
      m.prevSpeed = Math.hypot(m.vx, m.vy);
      m.stats.offs += reason === 'off' ? 1 : 0;
      this.emit('poof', { id: m.id, x: m.x, y: m.y, reason });
    }

    placeAtCheckpoint(m) {
      const t = this.t, wi = t.checkpoints[m.respawnCP] ?? 0;
      const w = t.way[wi];
      m.x = w.x; m.y = w.y - 4;
      m.wayIdx = wi;
      const d = this.routeDir(m);
      const spd = Math.max(m.prevSpeed * 0.4, 260);
      m.vx = d.x * spd; m.vy = d.y * spd;
      m.off = new Set(this.loopLayersB); m.off.add('gate');
      m.fx.slip = 0; m.stuckT = 0; m.stuckProg = t.cum[wi]; m.trail.length = 0;
      m.gTime = 1;
      this.updateProgress(m);
      this.emit('appear', { id: m.id, x: m.x, y: m.y });
    }

    cpBefore(prog) {
      const t = this.t; let k = 0;
      for (let i = 0; i < t.checkpoints.length; i++) if (t.cum[t.checkpoints[i]] <= prog) k = i;
      return k;
    }

    rankAndRules(dt) {
      const ms = this.marbles, t = this.t;
      if (this.phase === 'free') {
        for (const m of ms) {
          if (m.respawnT > 0) continue;
          if (m.y > t.bounds.maxY + 400 || m.x < t.bounds.minX - 400 || m.x > t.bounds.maxX + 400 || m.y < t.bounds.minY - 900) {
            m.x = 0; m.y = -300; m.vx = 0; m.vy = 0;
          }
          m.boost = Math.min(100, m.boost + C.BOOST_REFILL * 1.5 * dt);
        }
        return;
      }
      // finishing
      for (const m of ms) {
        if (m.respawnT > 0 || this.phase !== 'race') continue;
        if (!m.finished && m.prog >= t.finishDist) {
          m.finished = true; m.place = ++this.finishCount; m.finishTime = this.time - this.goTime;
          if (this.firstFinishTime === null) this.firstFinishTime = this.time;
          this.emit('finish', { id: m.id, place: m.place, t: m.finishTime, x: m.x, y: m.y });
        }
      }
      // rank: finished by place, then progress
      const order = ms.slice().sort((a, b) => {
        if (a.finished && b.finished) return a.place - b.place;
        if (a.finished) return -1; if (b.finished) return 1;
        return b.prog - a.prog;
      });
      order.forEach((m, i) => {
        if (m.rank !== i + 1 && this.phase === 'race' && i + 1 < m.rank) this.emit('overtake', { id: m.id, rank: i + 1 });
        m.rank = i + 1;
        if (this.phase === 'race') {
          m.stats.worstRank = Math.max(m.stats.worstRank, m.rank);
          m.stats.climb = Math.max(m.stats.climb, m.stats.worstRank - m.rank);
        }
      });
      if (this.phase !== 'race') return;
      const leader = order[0];
      const n = ms.length;
      for (const m of ms) {
        if (m.respawnT > 0 || m.finished) { m.slipstream = false; m.gust = false; continue; }
        // off track
        if (m.routeD > C.OFF_DIST || m.y > t.bounds.maxY + 300 || m.x < t.bounds.minX - 300 || m.x > t.bounds.maxX + 300) {
          this.respawn(m, this.cpBefore(m.prog), 'off');
          continue;
        }
        // stuck → next checkpoint ahead
        if (m.prog > m.stuckProg + 40) { m.stuckProg = m.prog; m.stuckT = 0; }
        else if ((m.stuckT += dt) > C.STUCK_T) {
          const k = Math.min(this.cpBefore(m.prog) + 1, t.checkpoints.length - 1);
          this.respawn(m, k, 'stuck');
          continue;
        }
        // catch-up
        let mult = 1;
        m.slipstream = false;
        if (this.opts.catchup) {
          for (const o of ms) {
            if (o === m || o.respawnT > 0) continue;
            const ahead = o.prog - m.prog;
            if (ahead > 0 && ahead < C.SLIP_RANGE && Math.hypot(o.x - m.x, o.y - m.y) < 180) { m.slipstream = true; break; }
          }
          if (m.slipstream) mult *= 2;
          if (n > 1 && m.rank > n / 2) mult *= 1.3;
          if (leader && leader !== m && leader.prog - m.prog > C.GUST_DIST) m.behindT += dt; else m.behindT = 0;
          m.gust = m.behindT > C.GUST_DELAY;
        }
        m.boost = Math.min(100, m.boost + C.BOOST_REFILL * mult * dt);
      }
    }

    standings() {
      return this.marbles.slice().sort((a, b) => a.rank - b.rank);
    }
    allFinished() { return this.marbles.length > 0 && this.marbles.every(m => m.finished); }
  }

  /* ---------- awards (Section 4.6) ---------- */
  const AWARDS = [
    { k: 'champ', name: 'Cup Champion', pick: ms => ms.slice().sort((a, b) => b.points - a.points)[0] },
    { k: 'start', name: 'Lightning Start', pick: ms => best(ms, m => m.tot.perfect) },
    { k: 'flyer', name: 'Frequent Flyer', pick: ms => best(ms, m => m.tot.offs) },
    { k: 'air', name: 'Air Time', pick: ms => best(ms, m => m.tot.maxAir) },
    { k: 'bump', name: 'Bumper Car', pick: ms => best(ms, m => m.tot.bumps) },
    { k: 'climb', name: 'Comeback Kid', pick: ms => best(ms, m => m.tot.climb) },
    { k: 'steady', name: 'Steady Roller', pick: ms => best(ms, m => -m.tot.offs) },
    { k: 'speed', name: 'Speed Demon', pick: ms => best(ms, m => m.tot.topSpeed) },
  ];
  function best(ms, f) { return ms.slice().sort((a, b) => f(b) - f(a))[0]; }
  function giveAwards(players) {
    const out = new Map();
    const pool = players.slice();
    for (const a of AWARDS) {
      const left = pool.filter(p => !out.has(p.id));
      if (!left.length) break;
      const p = a.k === 'champ' ? a.pick(pool) : a.pick(left);
      if (p && !out.has(p.id)) out.set(p.id, a.name);
    }
    for (const p of pool) if (!out.has(p.id)) out.set(p.id, 'Good Sport');
    return out;
  }

  const POINTS = [10, 8, 6, 5, 4, 3, 2, 1];

  return { C, MAT, ITEMS, POINTS, rng, Builder, TRACKS, World, giveAwards };
})();
if (typeof module !== 'undefined') module.exports = MR;
