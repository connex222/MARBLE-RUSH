/* MARBLE RUSH Party Pack mode registry — no DOM or network dependencies. */
const MODES = Object.create(null);
const PARTY_POINTS = Object.freeze([10,8,6,5,4,3,2,1]);
const MODE_METHODS = ['setup','startRound','tick','draw','onInput','onAction','botTick','hud','standings','roundResults','finalResults'];
function registerMode(spec) {
  if (!spec || !/^[a-z]+$/.test(spec.id) || MODES[spec.id]) throw Error('Invalid or repeated mode id');
  if (!Number.isInteger(spec.minPlayers) || !Number.isInteger(spec.maxPlayers) || spec.minPlayers < 1 || spec.maxPlayers > 8 || spec.minPlayers > spec.maxPlayers) throw Error('Invalid player range');
  for (const method of MODE_METHODS) if (typeof spec[method] !== 'function') throw Error(spec.id + ' missing ' + method);
  MODES[spec.id] = Object.freeze(spec);
}
function partyPoints(ids) {
  if (!Array.isArray(ids) || ids.length > 8 || new Set(ids).size !== ids.length) throw Error('Ranking must have unique racers (up to eight)');
  return new Map(ids.map((id, i) => [id, PARTY_POINTS[i]]));
}
const PartyNight = {
  // Build an eligible round-robin playlist. Repeat only when the chosen
  // session is longer than the eligible set (e.g. seven picks / six modes).
  plan(length, playerCount, seed = 1, requested = null) {
    if (![3,5,7].includes(length) || !Number.isInteger(playerCount) || playerCount < 1 || playerCount > 8)
      throw Error('Invalid Party Night configuration');
    const available = (requested === null ? Object.keys(MODES) : requested).filter(id => {
      const m = MODES[id]; return m && m.available && playerCount >= m.minPlayers && playerCount <= m.maxPlayers;
    });
    if (!available.length || new Set(available).size !== available.length) throw Error('No unique eligible modes');
    if (!Number.isInteger(seed) || seed < 0) throw Error('Invalid playlist seed');
    let rnd = seed >>> 0;
    const rand = () => {
      // Deterministic LCG, no Math.random or external state.
      rnd = (Math.imul(1664525,rnd) + 1013904223) >>> 0;
      return rnd / 4294967296;
    };
    const playlist = [];
    while (playlist.length < length) {
      const pool = available.slice();
      for (let i=pool.length-1;i>0;i--) {
        const j=Math.floor(rand()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];
      }
      // Avoid immediately repeating a mode between cycles if possible.
      if (playlist.length && pool.length > 1 && pool[0] === playlist[playlist.length-1])
        [pool[0],pool[1]] = [pool[1],pool[0]];
      playlist.push(...pool.slice(0,length-playlist.length));
    }
    return playlist;
  },
  create(ids, playerCount) {
    if (!Array.isArray(ids) || ![3,5,7].includes(ids.length)) throw Error('Select 3, 5 or 7 games');
    if (!Number.isInteger(playerCount) || playerCount < 1 || playerCount > 8) throw Error('Invalid player count');
    for (const id of ids) {
      const mode = MODES[id];
      if (!mode || !mode.available || playerCount < mode.minPlayers || playerCount > mode.maxPlayers)
        throw Error('Game unavailable or unsuitable for player count: ' + id);
    }
    return { queue: ids.slice(), index: 0, totals: new Map(), finished: false };
  },
  record(session, ranking) {
    if (session.finished || session.index >= session.queue.length) throw Error('Party Night already finished');
    const points = partyPoints(ranking);
    for (const [pid, pts] of points) session.totals.set(pid, (session.totals.get(pid) || 0) + pts);
    session.index++;
    session.finished = session.index >= session.queue.length;
    return new Map(session.totals);
  },
  next(session) { return session.finished ? null : session.queue[session.index]; }
};
if (typeof module !== 'undefined') module.exports = { MODES, registerMode, PARTY_POINTS, partyPoints, PartyNight };

/* Visual stage dressing shared by Party Pack game modes. Decorative only:
   never changes physics, marbles, controls or the approved Grand Prix. */
const MarblePartyStage = (() => {
  const art = Object.create(null);
  const TONES = Object.freeze({
    dropzone:['#4cc9f0','#0e2450','#fdd15b'],
    brawl:['#f27cbb','#251335','#ffd06e'],
    derby:['#ffc66d','#29152f','#f9a978'],
    curling:['#8ceaff','#0a2744','#e8faff'],
    golf:['#a5f47b','#152b2d','#ffdf88']
  });
  const playable = new Set(Object.keys(TONES));
  function picture(id) {
    if (!playable.has(id) || typeof Image === 'undefined') return null;
    if (!art[id]) {
      const im = new Image();
      const slot = { image: im, ready: false };
      im.onload=()=>{slot.ready=true;};
      im.onerror=()=>{slot.ready=false;};
      im.src='assets/img/party_card_'+id+'.webp';
      art[id]=slot;
    }
    return art[id].ready ? art[id].image : null;
  }
  function backdrop(ctx,id,time=0){
    const tone=TONES[id];if(!tone)return;
    ctx.save();
    const [accent,deep,gold]=tone;
    // Moving photographic poster washes from approved ChatGPT art.
    const im=picture(id);
    if(im){
      ctx.save();
      ctx.globalAlpha=.52;
      const sw=1920,sh=1080,iw=im.naturalWidth||1,ih=im.naturalHeight||1;
      const scale=Math.max(sw/iw,sh/ih);
      const dw=iw*scale,dh=ih*scale;
      ctx.drawImage(im,(sw-dw)/2+Math.sin(time*.13)*18,(sh-dh)/2,dw,dh);
      ctx.restore();
    }
    const veil=ctx.createLinearGradient(0,0,1920,1080);
    veil.addColorStop(0,'rgba(7,13,34,.83)');
    veil.addColorStop(.46,'rgba(12,18,42,.58)');
    veil.addColorStop(1,'rgba(7,13,34,.81)');
    ctx.fillStyle=veil;ctx.fillRect(0,0,1920,1080);
    // Suspended floodlights and diagonal metallic stage floor highlights.
    ctx.globalAlpha=.23;
    for(let i=0;i<7;i++){
      const x=160+i*290+Math.sin(time*.23+i)*25;
      const glow=ctx.createRadialGradient(x,75,2,x,170,390);
      glow.addColorStop(0,accent);
      glow.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(x,220,250,440,-.23,0,Math.PI*2);ctx.fill();
    }
    ctx.globalAlpha=1;
    // The HUD stays readable against this inset glass-and-chrome score console.
    const slab=ctx.createLinearGradient(42,165,466,950);
    slab.addColorStop(0,'rgba(18,31,61,.94)');
    slab.addColorStop(1,'rgba(6,13,29,.88)');
    ctx.fillStyle=slab;round(ctx,38,177,425,790,32);ctx.fill();
    ctx.lineWidth=4;ctx.strokeStyle=gold;ctx.stroke();
    ctx.save();ctx.globalAlpha=.32;ctx.lineWidth=2;ctx.strokeStyle=accent;
    round(ctx,48,187,405,770,25);ctx.stroke();ctx.restore();
    ctx.fillStyle=gold;ctx.fillRect(76,194,348,5);
    ctx.fillStyle='rgba(255,255,255,.10)';round(ctx,65,213,374,12,6);ctx.fill();
    // Spectator light trim across lower stage. No high-frequency flashing.
    for(let i=0;i<13;i++){
      const x=520+i*105;
      const q=ctx.createRadialGradient(x,1028,2,x,1028,26);
      q.addColorStop(0,i%2?gold:accent);q.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=q;ctx.beginPath();ctx.arc(x,1028,26,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  function round(ctx,x,y,w,h,r) {
    const rr=Math.min(r,w/2,h/2);
    ctx.beginPath();ctx.moveTo(x+rr,y);
    ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);
    ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath();
  }
  function frame(ctx,x,y,w,h,id){
    const tone=TONES[id];if(!tone)return;
    ctx.save();
    const [accent,deep,gold]=tone;
    // Bevelled display base underneath active physics, not covering it.
    ctx.shadowColor='rgba(0,0,0,.8)';ctx.shadowBlur=40;ctx.shadowOffsetY=18;
    const bezel=ctx.createLinearGradient(x,y,x+w,y+h);
    bezel.addColorStop(0,'#fffbdb');bezel.addColorStop(.11,gold);
    bezel.addColorStop(.43,deep);bezel.addColorStop(.9,accent);
    bezel.addColorStop(1,'#100d28');
    ctx.fillStyle=bezel;round(ctx,x-18,y-18,w+36,h+36,28);ctx.fill();
    ctx.shadowColor='transparent';
    const inside=ctx.createLinearGradient(x,y,x,y+h);
    inside.addColorStop(0,'rgba(12,26,57,.90)');
    inside.addColorStop(1,'rgba(22,12,36,.94)');
    ctx.fillStyle=inside;round(ctx,x-10,y-10,w+20,h+20,20);ctx.fill();
    ctx.lineWidth=4;ctx.strokeStyle='rgba(255,255,255,.65)';ctx.stroke();
    ctx.restore();
  }
  return Object.freeze({backdrop,frame});
})();
