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
      // Phase 3 approved cinematic background. Fallback to the original
      // mode card when the optional new asset is not yet present.
      im.onerror=()=>{
        if(!slot.fallback){
          slot.fallback=true;
          im.src='assets/img/party_card_'+id+'.webp';
        } else slot.ready=false;
      };
      im.src='assets/img/pp_'+id+'_bg.webp';
      art[id]=slot;
    }
    return art[id].ready ? art[id].image : null;
  }
  // Optional Phase 3 Batch B assets. A missing sprite is cached as missing,
  // so there is no per-frame 404/network retry and gameplay stays playable.
  const extraArt=Object.create(null);
  function optionalSprite(key) {
    if(typeof Image==='undefined'||!/^pp_(derby|dropzone|brawl|curling|golf)_(surface_main|prop_[a-z0-9_]+|obstacle_[a-z0-9_]+)$/.test(key))return null;
    let entry=extraArt[key];
    if(!entry){
      const image=new Image();
      entry=extraArt[key]={image,ready:false,failed:false};
      image.onload=()=>{entry.ready=true;};
      image.onerror=()=>{entry.failed=true;};
      image.src='assets/img/'+key+'.webp';
    }
    return entry.ready?entry.image:null;
  }
  function drawSprite(ctx,key,x,y,w,h,alpha=1) {
    const im=optionalSprite(key);if(!im)return false;
    if(![x,y,w,h,alpha].every(Number.isFinite)||w<=0||h<=0)return false;
    ctx.save();ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
    ctx.drawImage(im,x,y,w,h);ctx.restore();return true;
  }
  function backdrop(ctx,id,time=0){
    const tone=TONES[id];if(!tone)return;
    ctx.save();
    const [accent,deep,gold]=tone;
    // Moving photographic poster washes from approved ChatGPT art.
    const im=picture(id);
    if(im){
      ctx.save();
      ctx.globalAlpha=.82;
      const sw=1920,sh=1080,iw=im.naturalWidth||1,ih=im.naturalHeight||1;
      const scale=Math.max(sw/iw,sh/ih);
      const dw=iw*scale,dh=ih*scale;
      ctx.drawImage(im,(sw-dw)/2+Math.sin(time*.13)*18,(sh-dh)/2,dw,dh);
      ctx.restore();
    }
    const veil=ctx.createLinearGradient(0,0,1920,1080);
    veil.addColorStop(0,'rgba(7,13,34,.63)');
    veil.addColorStop(.46,'rgba(12,18,42,.43)');
    veil.addColorStop(1,'rgba(7,13,34,.67)');
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

  // Real-time stage materials, glass marbles and bevelled obstacles.
  // Each decoration uses the same 2D collision coordinates, preserving gameplay.
  function surface(ctx,id,x,y,w,h,time=0) {
    const [accent,deep,gold]=TONES[id]||TONES.golf;
    ctx.save();
    // Heavy extruded tabletop body: repeated solid edge reads as depth.
    ctx.shadowColor='#000d';ctx.shadowBlur=23;ctx.shadowOffsetY=18;
    const under=ctx.createLinearGradient(x,y,x,y+h+35);
    under.addColorStop(0,deep);under.addColorStop(.75,'#10122e');under.addColorStop(1,gold);
    ctx.fillStyle=under;round(ctx,x-8,y+13,w+16,h+24,19);ctx.fill();
    ctx.shadowColor='transparent';ctx.shadowOffsetY=0;
    const base=ctx.createLinearGradient(x,y,x+w*.74,y+h);
    if(id==='golf') {base.addColorStop(0,'#a9ef7f');base.addColorStop(.4,'#5cb55b');base.addColorStop(1,'#214e3f');}
    else if(id==='curling'){base.addColorStop(0,'#f5ffff');base.addColorStop(.45,'#c0e7f2');base.addColorStop(1,'#6aacc7');}
    else if(id==='derby'){base.addColorStop(0,'#dba16b');base.addColorStop(.45,'#965a4b');base.addColorStop(1,'#3c243b');}
    else if(id==='dropzone'){base.addColorStop(0,'#446baa');base.addColorStop(.38,'#1c345f');base.addColorStop(1,'#0b153b');}
    else {base.addColorStop(0,'#e8b5da');base.addColorStop(.42,'#a05c95');base.addColorStop(1,'#3c2b61');}
    ctx.fillStyle=base;round(ctx,x,y,w,h,10);ctx.fill();
    ctx.save();round(ctx,x,y,w,h,10);ctx.clip();
    // Brushed/felt texture, no low-res checkerboard and no strobing.
    ctx.lineWidth=id==='golf'?3:1;
    for(let n=0;n<29;n++){
      const yy=y+13+n*h/29;
      ctx.strokeStyle=n%3?'rgba(255,255,255,.047)':'rgba(0,12,38,.085)';
      ctx.beginPath();ctx.moveTo(x,yy);ctx.lineTo(x+w,yy-h*.1);ctx.stroke();
    }
    if(id==='derby'){
      ctx.lineWidth=8;
      for(let n=0;n<12;n++){ctx.strokeStyle='rgba(255,243,182,.11)';
        ctx.beginPath();ctx.moveTo(x+n*118,y);ctx.lineTo(x+n*118-90,y+h);ctx.stroke();}
    }
    if(id==='curling'){
      const shine=ctx.createLinearGradient(x,y,x,y+h);
      shine.addColorStop(0,'rgba(255,255,255,.24)');shine.addColorStop(.5,'rgba(255,255,255,.02)');shine.addColorStop(1,'rgba(255,255,255,.2)');
      ctx.fillStyle=shine;ctx.fillRect(x,y,w,h);
      for(let n=0;n<36;n++){const fx=x+(n*137.7)%w,fy=y+(n*73.9)%h;
        ctx.fillStyle='rgba(255,255,255,.22)';ctx.fillRect(fx,fy,2,2);}
    }
    if(id==='dropzone'){
      const pulse=ctx.createRadialGradient(x+w*.5,y+h*.24,1,x+w*.5,y+h*.24,w*.71);
      pulse.addColorStop(0,'rgba(83,210,255,.23)');pulse.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=pulse;ctx.fillRect(x,y,w,h);
    }
    const spec=ctx.createLinearGradient(x,y,x+w,y+h);
    spec.addColorStop(0,'rgba(255,255,255,.32)');
    spec.addColorStop(.2,'rgba(255,255,255,.04)');
    spec.addColorStop(.75,'rgba(0,0,0,.02)');
    spec.addColorStop(1,'rgba(0,0,0,.27)');
    ctx.fillStyle=spec;ctx.fillRect(x,y,w,h);
    // Texture replaces the flat surface only if the approved 1024px material
    // exists; the gradient/material fallback above remains usable otherwise.
    drawSprite(ctx,'pp_'+id+'_surface_main',x,y,w,h,.74);
    ctx.restore();
    // Gold/chrome bevel around physically active surface.
    ctx.lineWidth=10;ctx.strokeStyle=gold;round(ctx,x,y,w,h,10);ctx.stroke();
    ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.73)';round(ctx,x+5,y+5,w-10,h-10,6);ctx.stroke();
    ctx.restore();
  }
  function marble(ctx,x,y,r,color,gleam=0) {
    if(!Number.isFinite(x+y+r)||r<=0)return;
    ctx.save();
    ctx.fillStyle='rgba(3,9,29,.50)';ctx.beginPath();
    ctx.ellipse(x+r*.27,y+r*.62,r*1.13,r*.53,-.24,0,Math.PI*2);ctx.fill();
    const halo=ctx.createRadialGradient(x,y,r*.6,x,y,r*2.5);
    halo.addColorStop(0,color);halo.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=.15;ctx.fillStyle=halo;ctx.beginPath();ctx.arc(x,y,r*2.5,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;ctx.shadowColor='#001027';ctx.shadowBlur=r*.6;
    const g=ctx.createRadialGradient(x-r*.35,y-r*.5,r*.12,x,y,r*1.2);
    g.addColorStop(0,'#ffffff');g.addColorStop(.13,color);g.addColorStop(.51,color);
    g.addColorStop(.77,'#26304c');g.addColorStop(1,'#080b20');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.save();ctx.beginPath();ctx.arc(x,y,r*.96,0,Math.PI*2);ctx.clip();
    ctx.strokeStyle='rgba(255,236,181,.67)';ctx.lineWidth=r*.22;
    ctx.beginPath();ctx.ellipse(x-r*.13,y+r*.3,r*.78,r*.47,-.5,Math.PI*1.05,Math.PI*1.93);ctx.stroke();
    const flare=ctx.createRadialGradient(x-r*.35,y-r*.5,0,x-r*.35,y-r*.5,r*.43);
    flare.addColorStop(0,'rgba(255,255,255,.98)');flare.addColorStop(.52,'rgba(255,255,255,.44)');flare.addColorStop(1,'rgba(255,255,255,0)');
    ctx.fillStyle=flare;ctx.beginPath();ctx.arc(x-r*.35,y-r*.5,r*.43,0,Math.PI*2);ctx.fill();
    ctx.restore();
    ctx.lineWidth=Math.max(1.5,r*.075);ctx.strokeStyle='#fff9df';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.stroke();
    ctx.restore();
  }
  function peg(ctx,x,y,r,color='#fce8aa'){
    ctx.save();ctx.shadowColor='#020922a8';ctx.shadowBlur=r*.95;ctx.shadowOffsetY=r*.4;
    const g=ctx.createRadialGradient(x-r*.45,y-r*.55,1,x,y,r*1.32);
    g.addColorStop(0,'#fff');g.addColorStop(.27,color);g.addColorStop(.6,'#a77a37');g.addColorStop(1,'#372545');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    ctx.lineWidth=Math.max(2,r*.12);ctx.strokeStyle='#fffbd7';
    ctx.beginPath();ctx.arc(x,y,r*.87,Math.PI*1.05,Math.PI*1.75);ctx.stroke();ctx.restore();
  }
  function obstacle(ctx,x,y,w,h){
    ctx.save();ctx.shadowColor='#0009';ctx.shadowBlur=9;ctx.shadowOffsetY=9;
    ctx.fillStyle='#452d2e';round(ctx,x+6,y+9,w,h,6);ctx.fill();
    ctx.shadowBlur=0;ctx.shadowOffsetY=0;
    const side=ctx.createLinearGradient(x,y,x+w,y+h);
    side.addColorStop(0,'#fff0b2');side.addColorStop(.19,'#e2a24e');side.addColorStop(.64,'#a25b36');side.addColorStop(1,'#4c2f3f');
    ctx.fillStyle=side;round(ctx,x,y,w,h,7);ctx.fill();
    ctx.strokeStyle='#fff5c9';ctx.lineWidth=3;round(ctx,x+2,y+2,w-4,h-4,5);ctx.stroke();
    ctx.restore();
  }
  function halo(ctx,x,y,r,color='#ffd479'){
    ctx.save();const g=ctx.createRadialGradient(x,y,1,x,y,r);
    g.addColorStop(0,'rgba(255,255,255,.65)');g.addColorStop(.18,color);g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=.43;ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  return Object.freeze({backdrop,frame,surface,marble,peg,obstacle,halo,drawSprite});
})();
