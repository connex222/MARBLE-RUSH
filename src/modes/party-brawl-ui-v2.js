/* Bowl Brawl — Party Pack UI v2.
 * A bespoke TV-stage renderer. All positions, energy, hazards, rounds and
 * eliminations are read from the unchanged authoritative BowlBrawl engine.
 * Does NOT mount an old screen or change gameplay.
 */
const MarbleBrawlUI=(()=>{
  'use strict';
  const W=1920,H=1080,TAU=Math.PI*2,CX=950,CY=570,SCALE=.91;
  const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
  const validColour=c=>typeof c==='string'&&/^#[\da-f]{6}$/i.test(c);
  const ctx=()=>document.getElementById('partyStageCanvas')?.getContext('2d',{alpha:false});
  const $=id=>document.getElementById(id);
  let lastHud=0,rankSignature='',lastRound=0;
  const hazardNames={bumpers:'BUMPER BLITZ',ice:'BLACK ICE',rotor:'ROTOR RUMBLE',
    crumbling:'CRUMBLING EDGE',clean:'FINAL SHOWDOWN'};
  function rounded(c,x,y,w,h,r,fill,stroke,sw=1){
    c.beginPath();c.roundRect(x,y,w,h,r);
    if(fill){c.fillStyle=fill;c.fill();}
    if(stroke){c.lineWidth=sw;c.strokeStyle=stroke;c.stroke();}
  }
  function art(c,image,x,y,w,h,alpha=1){
    if(!image?.complete||!image.naturalWidth)return;
    c.save();c.globalAlpha=alpha;c.drawImage(image,x,y,w,h);c.restore();
  }
  function ring(c,x,y,r,color,sw,shadow=false){
    c.save();if(shadow){c.shadowColor=color;c.shadowBlur=22;}
    c.beginPath();c.arc(x,y,r,0,TAU);c.strokeStyle=color;c.lineWidth=sw;c.stroke();c.restore();
  }
  function shade(c,x,y,r,bright,dark){
    const g=c.createRadialGradient(x-r*.38,y-r*.45,1,x+r*.22,y+r*.16,r*1.3);
    g.addColorStop(0,'#fff9e4');g.addColorStop(.17,bright);g.addColorStop(.64,bright);
    g.addColorStop(1,dark);return g;
  }
  function drawMarble(c,x,y,r,color,texture,heading,ghost){
    const primary=validColour(color)?color:'#ffd16a';
    c.save();
    c.fillStyle='rgba(0,4,16,.64)';
    c.beginPath();c.ellipse(x+r*.26,y+r*.75,r*1.28,r*.47,.13,0,TAU);c.fill();
    c.fillStyle=shade(c,x,y,r,primary,'#0d1730');
    c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
    if(texture?.naturalWidth){
      c.save();c.translate(x,y);c.rotate(heading);
      c.beginPath();c.arc(0,0,r*.96,0,TAU);c.clip();
      c.globalAlpha=.59;c.drawImage(texture,-r,-r,2*r,2*r);c.restore();
    }
    c.beginPath();c.ellipse(x-r*.4,y-r*.44,r*.28,r*.16,-.65,0,TAU);
    c.fillStyle='rgba(255,255,255,.86)';c.fill();
    ring(c,x,y,r-1,ghost?'#f44f79':'#fff7ce',ghost?5:2);
    c.restore();
  }
  function arenaBack(c,assets,t){
    c.fillStyle='#110d24';c.fillRect(0,0,W,H);
    const bg=assets?.pp_brawl_bg;
    if(bg?.naturalWidth){
      const scale=Math.max(W/bg.naturalWidth,H/bg.naturalHeight)*1.06;
      const bw=bg.naturalWidth*scale,bh=bg.naturalHeight*scale;
      art(c,bg,(W-bw)/2+Math.sin(t*.07)*9,(H-bh)/2,bw,bh,.95);
    }else{
      const g=c.createLinearGradient(0,0,0,H);
      g.addColorStop(0,'#49243e');g.addColorStop(.5,'#292d56');g.addColorStop(1,'#111425');
      c.fillStyle=g;c.fillRect(0,0,W,H);
    }
    const veil=c.createRadialGradient(CX,CY,210,CX,CY,1070);
    veil.addColorStop(0,'rgba(17,11,35,.10)');
    veil.addColorStop(.64,'rgba(15,8,27,.43)');
    veil.addColorStop(1,'rgba(5,6,19,.96)');
    c.fillStyle=veil;c.fillRect(0,0,W,H);
    const colors=['#ffca7b','#89eeff','#ffa5cb','#ffca7b','#89eeff','#f2a0dd'];
    for(let i=0;i<colors.length;i++){
      const xx=160+i*306,y=110;
      const g=c.createRadialGradient(xx,y,0,xx,y,240);
      g.addColorStop(0,colors[i]+'35');g.addColorStop(1,colors[i]+'00');
      c.fillStyle=g;c.fillRect(xx-240,y-180,480,480);
    }
    // Approved props are physically dressed around, not superimposed on the bowl.
    art(c,assets?.pp_brawl_prop_striped_bumper,80,767,260,238,.75);
    art(c,assets?.pp_brawl_prop_spin_hazard,1480,729,250,230,.70);
  }
  function bowl(c,assets,s,t,reduce){
    const R=380*SCALE,activeR=clamp(Number(s.radius)||380,110,380)*SCALE;
    c.save();
    c.translate(CX,CY);
    c.scale(1,.84); // tall elliptical camera perspective, still grounded in simulation x/y
    // First a solid mechanical pedestal with visible thick rim and inlaid copper.
    c.shadowColor='#000e';c.shadowBlur=65;c.shadowOffsetY=64;
    c.beginPath();c.ellipse(0,67,R+77,R+70,0,0,TAU);c.fillStyle='#25132d';c.fill();
    c.shadowBlur=0;c.shadowOffsetY=0;
    for(const [radius,color] of [[R+75,'#e7b273'],[R+65,'#67414d'],[R+55,'#ffd5a0'],
      [R+46,'#b07250'],[R+37,'#243951'],[R+20,'#101a32']]){
      c.beginPath();c.arc(0,0,radius,0,TAU);c.fillStyle=color;c.fill();
    }
    c.save();c.beginPath();c.arc(0,0,R+21,0,TAU);c.clip();
    const floor=c.createRadialGradient(-92,-145,32,10,24,R+55);
    floor.addColorStop(0,'#3b6880');floor.addColorStop(.50,'#214761');
    floor.addColorStop(.85,'#192d4d');floor.addColorStop(1,'#081427');
    c.fillStyle=floor;c.fillRect(-R-40,-R-40,(R+40)*2,(R+40)*2);
    const material=assets?.pp_brawl_surface_main;
    if(material?.naturalWidth)art(c,material,-R-35,-R-35,(R+35)*2,(R+35)*2,.34);
    c.rotate(t*.02);
    for(let j=0;j<16;j++){
      const a=j*TAU/16;
      c.strokeStyle=j%2?'rgba(252,187,124,.11)':'rgba(110,251,242,.12)';
      c.lineWidth=3;c.beginPath();c.moveTo(0,0);
      c.lineTo(Math.cos(a)*(R+30),Math.sin(a)*(R+30));c.stroke();
    }
    c.restore();
    // A concentric programmable LED ring shows the ACTUAL shrinking gameplay radius.
    const progress=clamp((380-s.radius)/270,0,1);
    ring(c,0,0,R+10,'#eac98a',14);
    ring(c,0,0,R-1,'#101e38',8);
    ring(c,0,0,activeR,progress>.55?'#ff6872':'#6dece4',6,true);
    ring(c,0,0,activeR+10,progress>.55?'rgba(255,88,99,.18)':'rgba(123,250,228,.12)',15);
    // Telegraph the centre-origin shockwave, then show the actual blast ring
    // racing outwards. Nothing here alters the physical collision model.
    const pulseIn=s.pulseAt==null?Infinity:s.pulseAt-s.elapsed;
    const warn=clamp((3-pulseIn)/3,0,1);
    if(warn>0&&pulseIn>=0){
      c.save();c.rotate(t*.48);
      ring(c,0,0,(68+warn*185)*SCALE,
        pulseIn<1?'#ff647f':'#ffe3a2',5+warn*8,true);
      for(let i=0;i<12;i++){
        const a=TAU*i/12,r1=(R-18)*warn+48,r2=r1+26;
        c.strokeStyle=pulseIn<1?'#fa5c71':'rgba(255,209,130,.60)';
        c.lineWidth=5;c.beginPath();c.moveTo(Math.cos(a)*r1,Math.sin(a)*r1);
        c.lineTo(Math.cos(a)*r2,Math.sin(a)*r2);c.stroke();
      }
      c.restore();
    }
    const sincePulse=s.time-s.lastPulseAt;
    if(sincePulse>=0&&sincePulse<.90){
      const wave=(30+sincePulse*480)*SCALE;
      c.save();c.globalAlpha=1-sincePulse/.90;
      ring(c,0,0,wave,'#fff7c8',20,true);
      ring(c,0,0,wave+14,'#ff657e',9,true);
      c.restore();
    }
    const point=(x,y)=>[Number(x||0)*SCALE,Number(y||0)*SCALE];
    if(s.hazard==='bumpers'){
      const obstacles=[[125,60],[-110,-50]];
      for(const [x,y] of obstacles){
        const [px,py]=point(x,y);
        c.save();c.translate(px,py);
        c.shadowColor='#ffb46d';c.shadowBlur=17;
        const g=c.createRadialGradient(-9,-9,2,0,0,54);
        g.addColorStop(0,'#fff6db');g.addColorStop(.35,'#f8b55f');g.addColorStop(.72,'#b84b56');g.addColorStop(1,'#213047');
        c.fillStyle=g;c.beginPath();c.arc(0,0,47,0,TAU);c.fill();
        ring(c,0,0,43,'#ffe6ac',6);c.restore();
      }
    }else if(s.hazard==='ice'){
      const [ix,iy]=point(75,-35);
      c.save();c.translate(ix,iy);
      c.fillStyle='rgba(155,250,255,.30)';c.beginPath();c.arc(0,0,140*SCALE,0,TAU);c.fill();
      c.strokeStyle='rgba(226,255,255,.63)';c.lineWidth=5;
      for(let j=0;j<8;j++){
        const a=j*TAU/8;
        c.beginPath();c.moveTo(0,0);
        c.lineTo(Math.cos(a)*140*SCALE,Math.sin(a)*140*SCALE);c.stroke();
      }
      art(c,assets?.pp_brawl_fx_warning,-153,-153,306,306,.46);
      c.restore();
    }else if(s.hazard==='rotor'){
      const [x,y]=point(Math.cos(s.hazardAngle)*95,Math.sin(s.hazardAngle)*95);
      c.save();c.translate(x,y);c.rotate(s.hazardAngle*1.7);
      c.shadowColor='#ff9d62';c.shadowBlur=21;
      rounded(c,-85,-14,170,28,13,'#e8a65d','#fff0b0',5);
      rounded(c,-16,-81,32,162,12,'#bc6170','#fff3cb',3);
      c.beginPath();c.arc(0,0,22,0,TAU);c.fillStyle='#fff7d0';c.fill();c.restore();
      art(c,assets?.pp_brawl_fx_spin,x-98,y-98,196,196,.55);
    }else if(s.hazard==='crumbling'){
      c.save();c.rotate(t*.18);
      for(let i=0;i<24;i++){
        const a=i*TAU/24;
        c.beginPath();c.arc(0,0,activeR+6,a+.03,a+.17);
        c.strokeStyle=i%3===0?'#ffa36c':'#f36c80';c.lineWidth=14;c.stroke();
      }
      c.restore();
    }
    // Live player marbles in same plane as actual physical collisions.
    const roster=new Map(s.roster?.map(p=>[p.id,p])||[]);
    for(const m of (s.marbles||[])){
      const p=roster.get(m.id),[x,y]=point(m.x,m.y);
      if(!p)continue;
      if(!m.alive){
        // Transparent knockout ghost lasts briefly at the moment of elimination.
        const age=(Number(s.elapsed)||0)-(Number(m.eliminatedAt)||0);
        if(age<.8){
          c.save();c.globalAlpha=clamp(.65-age*.72,0,.65);
          drawMarble(c,x,y,21,p.color,null,0,true);c.restore();
        }continue;
      }
      const spin=Math.atan2(m.vy||0,m.vx||0)+t*1.2;
      const swirl=(s.roster?.findIndex(q=>q.id===p.id)||0)%12+1;
      const image=assets?.['marble_swirl_'+String(swirl).padStart(2,'0')];
      if(!reduce&&Math.hypot(m.vx||0,m.vy||0)>180){
        c.save();c.strokeStyle=p.color||'#ffcf7d';c.globalAlpha=.52;c.lineWidth=12;
        c.lineCap='round';c.beginPath();c.moveTo(x-(m.vx||0)*.13*SCALE,y-(m.vy||0)*.13*SCALE);
        c.lineTo(x,y);c.stroke();c.restore();
      }
      if(m.anchored>0){ring(c,x,y,34,'#b2f5df',5,true);}
      const rimGap=s.radius-22-Math.hypot(m.x,m.y);
      if(!m.recoverUsed&&rimGap<85&&rimGap>=0){
        c.save();c.globalAlpha=clamp((85-rimGap)/70,.2,1);
        ring(c,x,y,36,'#ff647c',5,true);c.restore();
      }
      if(m.ramWindow>0){ring(c,x,y,39,'#ffe6a3',7,true);}
      drawMarble(c,x,y,24,p.color,image,spin,false);
      // Direction arrow is an indication of real thrust heading, not a false HUD control.
      const hx=Math.cos(m.heading),hy=Math.sin(m.heading);
      c.save();c.strokeStyle='rgba(255,248,216,.77)';c.lineWidth=3;
      c.beginPath();c.moveTo(x+hx*28,y+hy*28);c.lineTo(x+hx*44,y+hy*44);c.stroke();c.restore();
      rounded(c,x-58,y-62,116,29,10,'rgba(8,14,34,.90)',p.color,2);
      c.textAlign='center';c.font='900 18px Nunito,sans-serif';
      c.fillStyle='#fff9e4';c.fillText(p.name,x,y-42,110);
    }
    c.restore();
    // Electric hazard sparks and collision impact sprites from approved source art.
    if(!reduce){
      for(const e of (s.events||[]).slice(-22)){
        const age=(Number(s.time)||0)-(Number(e.time)||0);
        if(age<0||age>1.1)continue;
        if(!['hit','out','hazardImpact','ram','spectatorCheer','recover','knockout'].includes(e.kind))continue;
        const member=(s.marbles||[]).find(x=>x.id===e.id);
        const px=CX+(Number(e.x??member?.x)||0)*SCALE;
        const py=CY+(Number(e.y??member?.y)||0)*SCALE*.84;
        const fx=e.kind==='out'||e.kind==='knockout'?'pp_brawl_fx_ko':
          e.kind==='ram'?'pp_brawl_fx_impact':
          e.kind==='recover'?'pp_brawl_fx_shockwave':
          e.kind==='spectatorCheer'?'pp_brawl_fx_victory':'pp_brawl_fx_shockwave';
        const image=assets?.[fx];
        art(c,image,px-115,py-115,230,230,(1-age/1.1)*.75);
      }
    }
    // Raised front edge and a bright enamel racing-stadium signature.
    c.save();c.beginPath();c.ellipse(CX,CY,445,375,0,0,Math.PI);
    c.strokeStyle='#ffd99c';c.lineWidth=17;c.shadowColor='#ffd780';c.shadowBlur=18;c.stroke();
    c.strokeStyle='#6a424b';c.lineWidth=9;c.shadowBlur=0;c.beginPath();
    c.ellipse(CX,CY+7,450,370,0,0,Math.PI);c.stroke();c.restore();
  }
  function endOverlay(c,s,assets){
    // A short, state-derived winner reveal only; no misleading previous round screen.
    const end=(s.events||[]).slice().reverse().find(e=>e.kind==='round_end');
    if(!end||s.done)return;
    const age=(Number(s.time)||0)-(Number(end.time)||0);
    if(age<0||age>.82)return;
    const p=s.roster.find(q=>q.id===end.winner);
    c.save();c.globalAlpha=clamp(1-age/.82,0,1);
    rounded(c,637,449,628,194,31,'rgba(9,15,36,.96)','#ffda87',6);
    c.font='900 35px Fredoka,sans-serif';c.textAlign='center';c.fillStyle='#ffe6ab';
    c.fillText('BRAWL ROUND COMPLETE',950,515);
    c.font='900 64px Fredoka,sans-serif';c.fillStyle=p?.color||'#ffd16b';
    c.fillText((p?.name||'WINNER')+' WINS!',950,592);
    art(c,assets?.pp_brawl_fx_victory,1124,419,196,196,.75);c.restore();
  }
  function updateHud(s){
    if(!document.querySelector('#partyStage:not([hidden])')||s.done)return;
    const now=performance.now();if(now-lastHud<85)return;lastHud=now;
    const alive=s.marbles.filter(m=>m.alive),players=s.roster||[];
    const get=id=>s.marbles.find(m=>m.id===id);
    $('ppBrawlRound').textContent='ROUND '+s.round+' / 5';
    $('ppBrawlPhase').textContent=hazardNames[s.hazard]||'THE BRAWL';
    $('ppBrawlTime').textContent=Math.max(0,42-(Number(s.elapsed)||0)).toFixed(1)+'s';
    $('ppBrawlAlive').textContent=alive.length+' / '+players.length;
    $('ppBrawlRadius').textContent=Math.round(s.radius)+'';
    const pulseIn=s.pulseAt==null?null:Math.max(0,s.pulseAt-s.elapsed);
    const justPulsed=s.time-s.lastPulseAt<.8;
    const shockBox=$('ppBrawlShockBox');
    shockBox.classList.toggle('danger',pulseIn!=null&&pulseIn<=3);
    shockBox.classList.toggle('blast',justPulsed);
    $('ppBrawlShockLabel').textContent=justPulsed?'SHOCKWAVE! BRACE FOR IMPACT':
      pulseIn==null?'NO MORE WARNINGS · LAST MARBLE WINS':
      pulseIn<=3?'DANGER! SHOCKWAVE IN '+pulseIn.toFixed(1)+'s':
      'SHOCKWAVE IN '+pulseIn.toFixed(1)+'s · ANCHOR TO BRACE';
    $('ppBrawlShockBar').style.width=(pulseIn==null?'100':
      (100*clamp((8-pulseIn)/8,0,1)).toFixed(1))+'%';
    const human=players.find(p=>!p.cpu&&get(p.id)?.alive);
    const m=human?get(human.id):null;
    $('ppBrawlPlayer').textContent=human?.name||'WATCH THE ACTION';
    $('ppBrawlEnergy').textContent=Math.round(m?.energy||0)+'%';
    $('ppBrawlEnergyFill').style.width=clamp(m?.energy||0,0,100)+'%';
    $('ppBrawlRam').disabled=!m||m.cooldown>0||m.energy<28;
    $('ppBrawlAnchor').disabled=!m||m.cooldown>0||m.energy<15;
    const gap=m?s.radius-22-Math.hypot(m.x,m.y):Infinity;
    const canRecover=!!m&&!m.recoverUsed&&m.cooldown<=0&&
      m.energy>=35&&gap>=0&&gap<=85;
    $('ppBrawlRecover').disabled=!canRecover;
    $('ppBrawlRecover').textContent=m?.recoverUsed?'LIFELINE USED':
      canRecover?'↩ SAVE YOUR MARBLE!':'↩ EDGE RECOVERY · 35';
    $('ppBrawlLeft').disabled=!m;$('ppBrawlRight').disabled=!m;
    $('ppBrawlHelp').textContent=m?
      canRecover?'CRITICAL EDGE! Hit RECOVER before you fall!':
      pulseIn!=null&&pulseIn<=3?'SHOCKWAVE! Use ANCHOR to brace, or risk being thrown out.':
      m.recoverUsed?'No recovery remaining · RAM opponents for KO points.':
      'RAM for +3 knockout points (+5 final) · RECOVER once near the rim.':
      'You are out. Watch the final duel and prepare for your next round.';
    const recent=(s.events||[]).slice().reverse().find(e=>
      (e.kind==='knockout'||e.kind==='recover')&&
      s.time-(Number(e.time)||0)<5&&e.round===s.round);
    if(recent){
      const shooter=players.find(p=>p.id===recent.id);
      const victim=players.find(p=>p.id===recent.victim);
      $('ppBrawlKillFeed').textContent=recent.kind==='knockout'?
        (shooter?.name||'A marble')+' KNOCKED OUT '+(victim?.name||'A RIVAL')+
        ' · +'+recent.bonus+' BONUS!':
        (shooter?.name||'A marble')+' SURVIVED THE EDGE!';
    }else{
      $('ppBrawlKillFeed').textContent=alive.length===2?
        'FINAL DUEL · ONE SURVIVOR TAKES THE ROUND':
        'CHARGE YOUR RAM · KNOCK OUT RIVALS FOR BONUS POINTS';
    }
    const ranking=players.slice().sort((a,b)=>b.points-a.points||b.wins-a.wins||a.name.localeCompare(b.name));
    const sig=ranking.map(p=>p.id+':'+p.points+':'+!!get(p.id)?.alive).join('|')+'|'+s.round;
    if(sig!==rankSignature){
      rankSignature=sig;const box=$('ppBrawlRankRows');box.replaceChildren();
      for(const [i,p] of ranking.entries()){
        const row=document.createElement('div');row.className='ppBrawlRank';
        row.style.setProperty('--brawl',validColour(p.color)?p.color:'#ffd184');
        if(!get(p.id)?.alive)row.classList.add('out');
        const ix=document.createElement('b');ix.textContent=String(i+1).padStart(2,'0');
        const sphere=document.createElement('i');
        const name=document.createElement('strong');name.textContent=p.name;
        const points=document.createElement('span');points.textContent=p.points+' PTS';
        row.append(ix,sphere,name,points);box.appendChild(row);
      }
    }
    lastRound=s.round;
  }
  function draw(s,assets,opts={}){
    const c=ctx();if(!c||!s||!Array.isArray(s.marbles))return false;
    c.save();c.setTransform(1,0,0,1,0,0);
    arenaBack(c,assets,Number(s.time)||0);
    // Cinematic camera punches (render-only, reduced-motion compliant).
    const sincePulse=s.time-s.lastPulseAt;
    const lateDuel=s.marbles.filter(m=>m.alive).length===2;
    const punch=!opts.reduce&&sincePulse>=0&&sincePulse<.65?
      .052*(1-sincePulse/.65):0;
    const zoom=1+(lateDuel?.045:0)+punch;
    const jitter=!opts.reduce&&punch>0?Math.sin(s.time*97)*punch*73:0;
    c.translate(CX+jitter,CY-jitter*.4);
    c.scale(zoom,zoom);c.translate(-CX,-CY);
    bowl(c,assets,s,Number(s.time)||0,!!opts.reduce);
    endOverlay(c,s,assets);
    c.restore();
    updateHud(s);
    return true;
  }
  return Object.freeze({draw});
})();
