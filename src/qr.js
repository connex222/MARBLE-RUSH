/* Minimal QR encoder — byte mode, error correction level M, versions 1–10.
   Returns a square array of booleans (true = dark). No dependencies. */
const QR = (() => {
  'use strict';
  // [total codewords, ecc per block, [blocks, dataPerBlock], [blocks, dataPerBlock]?]
  const VER = [null,
    [26, 10, [1, 16]], [44, 16, [1, 28]], [70, 26, [1, 44]], [100, 18, [2, 32]], [134, 24, [2, 43]],
    [172, 16, [4, 27]], [196, 18, [4, 31]], [242, 22, [2, 38], [2, 39]], [292, 22, [3, 36], [2, 37]], [346, 26, [4, 43], [1, 44]]];
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];
  // GF(256) for Reed–Solomon
  const EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11D; }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
  function rsGen(n) {
    let g = [1];
    for (let i = 0; i < n; i++) {
      const ng = new Array(g.length + 1).fill(0);
      for (let j = 0; j < g.length; j++) { ng[j] ^= g[j]; ng[j + 1] ^= mul(g[j], EXP[i]); }
      g = ng;
    }
    return g;
  }
  function rs(data, n) {
    const g = rsGen(n), res = new Array(n).fill(0);
    for (const d of data) {
      const f = d ^ res[0];
      res.shift(); res.push(0);
      for (let i = 0; i < n; i++) res[i] ^= mul(g[i + 1], f);
    }
    return res;
  }
  function encode(text) {
    const bytes = Array.from(new TextEncoder().encode(text));
    let v = 1;
    for (; v <= 10; v++) {
      const V = VER[v], cap = V[2][0] * V[2][1] + (V[3] ? V[3][0] * V[3][1] : 0);
      const bits = 4 + (v < 10 ? 8 : 16) + bytes.length * 8;
      if (bits <= cap * 8) break;
    }
    if (v > 10) throw new Error('QR text too long');
    const V = VER[v];
    const dataCap = V[2][0] * V[2][1] + (V[3] ? V[3][0] * V[3][1] : 0);
    // bit stream
    const bs = [];
    const put = (val, len) => { for (let i = len - 1; i >= 0; i--) bs.push((val >>> i) & 1); };
    put(4, 4); put(bytes.length, v < 10 ? 8 : 16);
    for (const b of bytes) put(b, 8);
    put(0, Math.min(4, dataCap * 8 - bs.length));
    while (bs.length % 8) bs.push(0);
    const data = [];
    for (let i = 0; i < bs.length; i += 8) data.push(parseInt(bs.slice(i, i + 8).join(''), 2));
    for (let p = 0; data.length < dataCap; p++) data.push(p % 2 ? 0x11 : 0xEC);
    // blocks + ecc, then interleave
    const blocks = [], eccs = [];
    let off = 0;
    for (const grp of [V[2], V[3]]) {
      if (!grp) continue;
      for (let b = 0; b < grp[0]; b++) { const blk = data.slice(off, off + grp[1]); off += grp[1]; blocks.push(blk); eccs.push(rs(blk, V[1])); }
    }
    const out = [];
    const maxD = Math.max(...blocks.map(b => b.length));
    for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.length) out.push(b[i]);
    for (let i = 0; i < V[1]; i++) for (const e of eccs) out.push(e[i]);
    // matrix
    const N = v * 4 + 17;
    const M = Array.from({ length: N }, () => new Array(N).fill(false));
    const F = Array.from({ length: N }, () => new Array(N).fill(false)); // function modules
    const set = (x, y, d) => { M[y][x] = d; F[y][x] = true; };
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy;
        if (x < 0 || y < 0 || x >= N || y >= N) continue;
        const d = Math.max(Math.abs(dx), Math.abs(dy));
        set(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(N - 4, 3); finder(3, N - 4);
    for (let i = 8; i < N - 8; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const al = ALIGN[v];
    for (const ay of al) for (const ax of al) {
      if ((ax === 6 && ay === 6) || (ax === 6 && ay === N - 7) || (ax === N - 7 && ay === 6)) continue;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    // reserve format + version areas
    for (let i = 0; i < 9; i++) { if (!F[8][i]) set(i, 8, false); if (!F[i][8]) set(8, i, false); }
    for (let i = 0; i < 8; i++) { set(N - 1 - i, 8, false); set(8, N - 1 - i, false); }
    set(8, N - 8, true); // dark module
    if (v >= 7) {
      let rem = v;
      for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1F25);
      const bits = (v << 12) | rem;
      for (let i = 0; i < 18; i++) {
        const d = ((bits >>> i) & 1) === 1, a = N - 11 + (i % 3), b = Math.floor(i / 3);
        set(a, b, d); set(b, a, d);
      }
    }
    // place data (zigzag)
    const allBits = [];
    for (const c of out) for (let i = 7; i >= 0; i--) allBits.push((c >>> i) & 1);
    let k = 0;
    for (let right = N - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let vert = 0; vert < N; vert++) {
        for (let j = 0; j < 2; j++) {
          const x = right - j;
          const up = ((right + 1) & 2) === 0;
          const y = up ? N - 1 - vert : vert;
          if (!F[y][x] && k < allBits.length) { M[y][x] = allBits[k] === 1; k++; }
        }
      }
    }
    // choose best mask
    const MASKS = [
      (x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, (x) => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
      (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0,
    ];
    function withMask(mi) {
      const R = M.map(r => r.slice());
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (!F[y][x] && MASKS[mi](x, y)) R[y][x] = !R[y][x];
      // format bits: EC level M = 00
      const fdata = (0 << 3) | mi;
      let rem = fdata;
      for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      const bits = ((fdata << 10) | rem) ^ 0x5412;
      const b = i => ((bits >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) R[i][8] = b(i);
      R[7][8] = b(6); R[8][8] = b(7); R[8][7] = b(8);
      for (let i = 9; i < 15; i++) R[8][14 - i] = b(i);
      for (let i = 0; i < 8; i++) R[8][N - 1 - i] = b(i);
      for (let i = 8; i < 15; i++) R[N - 15 + i][8] = b(i);
      R[N - 8][8] = true;
      return R;
    }
    function penalty(R) {
      let p = 0;
      for (let y = 0; y < N; y++) for (let run = 1, x = 1; x <= N; x++) {
        if (x < N && R[y][x] === R[y][x - 1]) run++; else { if (run >= 5) p += run - 2; run = 1; }
      }
      for (let x = 0; x < N; x++) for (let run = 1, y = 1; y <= N; y++) {
        if (y < N && R[y][x] === R[y - 1][x]) run++; else { if (run >= 5) p += run - 2; run = 1; }
      }
      for (let y = 0; y < N - 1; y++) for (let x = 0; x < N - 1; x++) {
        const c = R[y][x]; if (c === R[y][x + 1] && c === R[y + 1][x] && c === R[y + 1][x + 1]) p += 3;
      }
      let dark = 0; for (const r of R) for (const c of r) if (c) dark++;
      p += Math.floor(Math.abs(dark * 20 - N * N * 10) / (N * N)) * 10;
      return p;
    }
    let best = null, bp = Infinity;
    for (let mi = 0; mi < 8; mi++) { const R = withMask(mi); const pp = penalty(R); if (pp < bp) { bp = pp; best = R; } }
    return best;
  }
  return { encode };
})();
if (typeof module !== 'undefined') module.exports = QR;
