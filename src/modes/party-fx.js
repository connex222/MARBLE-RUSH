/* MARBLE RUSH — Phase 3 Batch C, presentation-only cinematic effects.
 * No physics mutation. Uses existing seeded simulation event streams.
 * Image assets are optional. Missing art falls back to canvas primitives.
 * This file is loaded after registry.js, before the five Party Pack modes.
 */
'use strict';
const PartyFX = (() => {
  const SOURCES = Object.freeze({
    derby:['dust','speed','photo','confetti','impact','sunset','laurel','surge'],
    dropzone:['peg','jackpot','fall','coins','multiplier','chime','superjackpot','confetti'],
    brawl:['impact','shockwave','ko','dust','warning','spin','victory','ricochet'],
    curling:['impact','sweep','scrape','mist','target','victory','ricochet','aurora'],
    golf:['putt','roll','holeinone','cup','ricochet','sunset','flag','confetti']
  });
  const KEYS = Object.freeze({
    derby:{heat_start:'speed',cheer:'confetti',photoFinish:'photo',lateSurge:'surge',payout:'laurel',gate_open:'dust'},
    dropzone:{release:'fall',goldPeg:'multiplier',pegImpact:'peg',jackpot:'superjackpot',bucket:'coins',jackpotMove:'jackpot'},
    brawl:{hit:'impact',ram:'shockwave',out:'ko',lastTwo:'warning',hazardReveal:'spin',hazardImpact:'ricochet',round_end:'victory'},
    curling:{throw:'sweep',sweep:'scrape',hit:'impact',measurement:'target',lastStone:'aurora',end_result:'victory'},
    golf:{shot:'putt',water:'ricochet',holeInOne:'holeinone',cup:'cup',tunnel:'roll',flyThrough:'flag',spectatorCheer:'confetti'}
  });
  const cache = Object.create(null);
  // Load each optional image only once; a 404 must never stall gameplay.
  function picture(mode,kind){
    if(typeof Image==='undefined')return null;
    const key='pp_'+mode+'_fx_'+kind;
    let entry=cache[key];
    if(!entry){
      const image=new Image();
      entry=cache[key]={image,ready:false};
      image.onload=()=>entry.ready=true;
      image.onerror=()=>entry.ready=false;
      image.src='assets/img/'+key+'.webp';
    }
    return entry.ready?entry.image:null;
  }
  // Art is always optional: drawSprite returns false until it is ready.
  function drawSprite(ctx,mode,kind,x,y,w,h){
    const im=picture(mode,kind);
    if(!im)return false;
    ctx.drawImage(im,x,y,w,h);return true;
  }
  function position(mode,e,state){
    let x=Number.isFinite(e.x)?e.x:null;
    let y=Number.isFinite(e.y)?e.y:null;
    if(mode==='dropzone')return [x===null?987:445+(x*1.08),y===null?525:130+(y*1.02)];
    if(mode==='brawl')return [x===null?1080:1080+x*1.03,y===null?540:540+y*1.03];
    if(mode==='curling')return [x===null?1195:495+x*1.04,y===null?505:235+y*1.04];
    if(mode==='golf')return [x===null?1160:555+x*1.04,y===null?530:240+y*1.04];
    // Derby gives distance in game metres, not pixel coordinates.
    if(mode==='derby'){
      const denom=(state&&Number.isFinite(state.length)&&state.length>0)?state.length:1300;
      return [x===null?1180:Math.min(1780,Math.max(570,550+x/denom*1190)),
        Number.isInteger(e.horse)?265+e.horse*104:560];
    }
    return [1060,530];
  }
  function fallback(ctx,size,kind,phase){
    const r=size*.34;
    ctx.save();
    const g=ctx.createRadialGradient(0,0,2,0,0,r);
    const icy=/ice|scrape|mist|aurora|sweep|target/.test(kind);
    g.addColorStop(0,'rgba(255,255,255,.92)');
    g.addColorStop(.27,icy?'rgba(95,213,255,.66)':'rgba(255,201,95,.66)');
    g.addColorStop(1,'rgba(255,191,55,0)');
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
    ctx.lineWidth=Math.max(2,size*.025);
    ctx.strokeStyle=icy?'#c9f8ff':'#ffdf8b';
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3+phase*.35;
      ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.44,Math.sin(a)*r*.44);
      ctx.lineTo(Math.cos(a)*r*.9,Math.sin(a)*r*.9);ctx.stroke();
    }
    ctx.restore();
  }
  function draw(ctx,mode,state,now,reduced=false,w=1920,h=1080){
    if(!ctx || !state || !Array.isArray(state.events) || !SOURCES[mode])return 0;
    if(!Number.isFinite(now))return 0;
    const duration=reduced?.30:1.05;
    let drawn=0;
    ctx.save();ctx.scale(w/1920,h/1080);
    // Bounded at 16 visual events per frame. Never remove or mutate an event.
    for(const e of state.events.slice(-16)){
      if(!e || !Number.isFinite(e.time))continue;
      const age=now-e.time;
      if(age<0 || age>duration)continue;
      const kind=KEYS[mode][e.kind];
      if(!kind)continue;
      const [px,py]=position(mode,e,state);
      if(!Number.isFinite(px+py))continue;
      // Confine effects to playfield so they do not mask the score console.
      const x=Math.min(1825,Math.max(545,px));
      const y=Math.min(927,Math.max(205,py));
      const strength=Number.isFinite(e.impact)?Math.min(2,Math.max(.6,e.impact/140)):1;
      const progress=Math.max(0,Math.min(1,age/duration));
      const size=(/jackpot|holeinone|victory|photo|payout|laurel|ko/.test(kind)?235:142)*strength;
      const scale=reduced?1:.77+.38*progress;
      const alpha=Math.min(.88,1-progress)*(.95);
      ctx.save();ctx.translate(x,y);
      ctx.globalAlpha=alpha;
      if(!drawSprite(ctx,mode,kind,-size*scale/2,-size*scale/2,size*scale,size*scale))
        fallback(ctx,size*scale,kind,progress);
      ctx.restore();drawn++;
    }
    ctx.restore();return drawn;
  }
  return Object.freeze({draw,keys:KEYS});
})();
if(typeof module!=='undefined')module.exports=PartyFX;
