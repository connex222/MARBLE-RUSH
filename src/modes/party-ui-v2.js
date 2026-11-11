/* MARBLE RUSH Party Pack UI v2 — full replacement presentation.
 * Scope: TV artwork and HUD. Never mutates game engine, bets, scoring or phones.
 * The five legacy Canvas2D draw functions and per-mode markup are retired.
 * Derby is the first production-ready implementation; remaining modes are gated.
 */
const MarblePartyUI=(()=>{
 'use strict';
 const MODES=['derby','dropzone','brawl','curling','golf'];
 const NAMES={derby:'MARBLE DERBY',dropzone:'DROP ZONE',brawl:'BOWL BRAWL',curling:'MARBLE CURLING',golf:'MARBLE GOLF'};
 const LENGTH=1500;
 const W=1920,H=1080;
 let stage=null,canvas=null,ctx=null,mode=null,lastHud=-99,lastSignature='';
 let lastHeat=0,lastPhase='',entryAt=0;
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const isColour=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
 function bind(){
   stage=document.querySelector('[data-screen="party-stage"]');
   canvas=document.getElementById('partyStageCanvas');
   ctx=canvas?.getContext('2d',{alpha:false})||null;
   return !!(stage&&ctx);
 }
 function enter(next){
   if(!MODES.includes(next)||!bind())return false;
   mode=next;lastHeat=0;lastPhase='';lastSignature='';lastHud=-99;entryAt=performance.now();
   stage.dataset.mode=next;
   const title=document.getElementById('ppModeTitle');
   if(title)title.textContent=NAMES[next];
   const derby=next==='derby';
   for(const id of ['ppBetPanel','ppLeaderPanel','ppBoardLabel','ppTicker']){
     const node=document.getElementById(id);if(node)node.hidden=!derby;
   }
   const wip=document.getElementById('ppWorkInProgress');
   if(wip)wip.hidden=derby;
   return true;
 }
 function picture(ctx,art,x,y,w,h,opacity=1){
   if(!art?.complete||!art.naturalWidth)return false;
   ctx.save();ctx.globalAlpha=opacity;ctx.drawImage(art,x,y,w,h);ctx.restore();return true;
 }
 function roundBox(c,x,y,w,h,r,fill,stroke,width=1){
   c.beginPath();c.roundRect(x,y,w,h,r);
   if(fill){c.fillStyle=fill;c.fill();}
   if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.stroke();}
 }
 function gradient(c,x,y,w,h,stops,vertical=true){
   const g=vertical?c.createLinearGradient(x,y,x,y+h):c.createLinearGradient(x,y,x+w,y);
   stops.forEach(([k,v])=>g.addColorStop(k,v));return g;
 }
 function ball(c,x,y,r,color,spin,asset){
   const base=isColour(color)?color:'#ffd56c';
   c.save();
   // Impact shadow grounds the ball on its miniature racing lane.
   c.fillStyle='rgba(7,9,22,.56)';c.beginPath();c.ellipse(x+7,y+r*.92,r*1.13,r*.32,-.12,0,Math.PI*2);c.fill();
   const g=c.createRadialGradient(x-r*.43,y-r*.54,2,x+r*.22,y+r*.28,r*1.27);
   g.addColorStop(0,'#ffffff');g.addColorStop(.15,base);g.addColorStop(.72,base);g.addColorStop(1,'#15203b');
   c.fillStyle=g;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill();
   if(asset?.complete&&asset.naturalWidth){
     c.save();c.beginPath();c.arc(x,y,r*.93,0,Math.PI*2);c.clip();
     c.translate(x,y);c.rotate(spin);c.globalAlpha=.60;
     c.drawImage(asset,-r,-r,2*r,2*r);
     c.restore();
   }else{
     c.save();c.translate(x,y);c.rotate(spin);
     c.strokeStyle='rgba(255,255,255,.52)';c.lineWidth=r*.20;c.lineCap='round';
     c.beginPath();c.arc(0,0,r*.56,-1.65,1.8);c.stroke();
     c.strokeStyle='rgba(255,216,96,.52)';c.lineWidth=r*.15;
     c.beginPath();c.arc(0,0,r*.35,-2.3,1.8);c.stroke();c.restore();
   }
   c.strokeStyle='rgba(255,255,255,.88)';c.lineWidth=2.5;c.beginPath();c.arc(x,y,r-1,0,Math.PI*2);c.stroke();
   c.fillStyle='rgba(255,255,255,.83)';c.beginPath();c.ellipse(x-r*.37,y-r*.52,r*.30,r*.16,-.7,0,Math.PI*2);c.fill();
   c.restore();
 }
 function backdrop(c,assets,time){
   c.fillStyle='#0e152c';c.fillRect(0,0,W,H);
   // Approved art is full-frame scenery, never a second interactive board.
   const bg=assets?.pp_derby_bg;
   if(bg?.complete&&bg.naturalWidth){
     const iw=bg.naturalWidth,ih=bg.naturalHeight;
     const sc=Math.max(W/iw,H/ih)*1.10;
     const dw=iw*sc,dh=ih*sc;
     const pan=Math.sin(time*.11)*16;
     picture(c,bg,(W-dw)/2+pan,(H-dh)/2,dw,dh);
   }else{
     c.fillStyle=gradient(c,0,0,W,H,[[0,'#203a50'],[.5,'#4d364b'],[1,'#12172c']]);
     c.fillRect(0,0,W,H);
   }
   c.fillStyle=gradient(c,0,0,W,H,[[0,'rgba(5,8,25,.72)'],[.28,'rgba(5,8,25,.33)'],[.70,'rgba(6,10,31,.22)'],[1,'rgba(4,8,23,.95)']]);
   c.fillRect(0,0,W,H);
   for(let i=0;i<7;i++){
     const x=180+i*270;const y=150+Math.cos(time*.12+i)*11;
     const glow=c.createRadialGradient(x,y,0,x,y,200);
     glow.addColorStop(0,'rgba(255,217,134,.14)');glow.addColorStop(1,'rgba(255,217,134,0)');
     c.fillStyle=glow;c.fillRect(x-200,y-200,400,400);
   }
 }
 function track(c,assets,time,state){
   const lx=412,rx=1814,top=322,lane=83;
   // Bespoke elevated stadium deck. Each lane is physically layered,
   // with inset racing-surface art and raised guard rails.
   c.save();
   c.shadowColor='#000d';c.shadowBlur=50;c.shadowOffsetY=33;
   roundBox(c,lx-23,top-38,rx-lx+46,584,34,'#241d36','#ffd887',12);
   c.restore();
   roundBox(c,lx-11,top-25,rx-lx+22,555,27,
     gradient(c,lx,top,0,555,[[0,'#f0b768'],[.14,'#97664d'],[1,'#513b48']]),'#fff2b8',5);
   for(let i=0;i<6;i++){
     const y=top+i*lane;
     const shade=i%2?'#503542':'#6b4547';
     roundBox(c,lx+2,y,rx-lx-4,lane-5,5,shade,null);
     c.save();c.beginPath();c.rect(lx+4,y+2,rx-lx-8,lane-9);c.clip();
     const surface=assets?.pp_derby_surface_main;
     if(surface?.complete&&surface.naturalWidth){
       picture(c,surface,lx+4,y-40,rx-lx-8,176,.34);
     }
     c.fillStyle=gradient(c,lx,y,0,lane,[[0,'rgba(255,246,207,.20)'],[.35,'rgba(255,238,175,.04)'],[1,'rgba(5,4,19,.4)']]);
     c.fillRect(lx+4,y,rx-lx-8,lane-5);
     for(let q=0;q<12;q++){
       const xx=lx+q*116+((time*23)%116);
       c.fillStyle='rgba(255,237,187,.07)';c.fillRect(xx,y+9,3,lane-22);
     }
     c.restore();
     c.fillStyle='#f8ddb0';c.fillRect(lx,y+lane-6,rx-lx,5);
     c.fillStyle='#c38e57';c.fillRect(lx,y+lane-1,rx-lx,4);
     c.fillStyle='rgba(2,6,21,.33)';c.fillRect(lx+15,y+lane+3,rx-lx-30,5);
   }
   // Finish tower, arch and chequered lightboxes.
   const finish=rx-67;
   c.save();c.shadowColor='#ffde8b';c.shadowBlur=24;
   c.fillStyle='#fff1ca';c.fillRect(finish-8,top-13,16,lane*6+17);c.restore();
   for(let row=0;row<24;row++){
     c.fillStyle=row%2?'#fff8df':'#171e37';
     c.fillRect(finish-8,top+row*21,8,21);
     c.fillStyle=row%2?'#171e37':'#fff8df';
     c.fillRect(finish,top+row*21,8,21);
   }
   roundBox(c,finish-71,top-58,142,39,10,'#10203e','#ffd987',3);
   c.font='900 22px Nunito,sans-serif';c.textAlign='center';
   c.fillStyle='#ffdd9b';c.fillText('FINISH',finish,top-31);
   const props=assets||{};
   picture(c,props.pp_derby_prop_grandstand,320,98,620,285,.72);
   picture(c,props.pp_derby_prop_hay_bales,1560,733,285,182,.91);
   c.save();c.fillStyle='rgba(0,0,0,.28)';roundBox(c,lx,top+lane*6+20,rx-lx,42,12,'#1d162b','#e3b479',3);
   c.font='900 19px Nunito,sans-serif';c.textAlign='left';c.fillStyle='#ffe7a9';
   c.fillText('START',lx+21,top+lane*6+48);
   c.textAlign='right';c.fillText('1500 M · GRANDSTAND CIRCUIT',rx-18,top+lane*6+48);c.restore();
   return {lx,rx,top,lane,finish};
 }
 function runners(c,state,assets,geometry,reduce){
   const {lx,top,lane,finish}=geometry;
   const x0=lx+62,scale=(finish-x0-33)/LENGTH;
   for(let i=0;i<6;i++){
     const h=state.horses[i];if(!h)continue;
     const x=x0+clamp(Number(h.x)||0,0,LENGTH)*scale;
     const y=top+i*lane+lane*.52;
     const r=27;
     const speed=clamp((Number(h.v)||0)/180,0,1);
     if(state.phase==='racing'&&!reduce){
       const streak=c.createLinearGradient(x-160,y,x,y);
       streak.addColorStop(0,'rgba(255,255,255,0)');
       streak.addColorStop(1,h.color+'b0');
       c.fillStyle=streak;c.beginPath();
       c.moveTo(x-150*speed,y-11);c.lineTo(x-r,y-6);c.lineTo(x-r,y+6);c.lineTo(x-150*speed,y+13);
       c.closePath();c.fill();
       for(let k=0;k<3;k++){
         c.fillStyle='rgba(255,235,166,.30)';
         c.fillRect(x-(55+k*24)*speed,y+20+k*3,16*speed,2);
       }
     }
     ball(c,x,y,r,h.color,(Number(h.x)||0)/25,
       assets?.['marble_swirl_'+String(i+1).padStart(2,'0')]);
     // Nameplate moves with each physical ball, never mistaken for a second sphere.
     const name=h.name;
     roundBox(c,Math.min(x-56,finish-125),y-58,112,25,9,'rgba(8,15,34,.91)','#ffde85',1.5);
     c.font='800 18px Nunito,sans-serif';c.fillStyle='#fff9e9';c.textAlign='center';
     c.fillText(name,Math.min(x,finish-69),y-39);
     c.fillStyle=h.color;c.fillRect(lx+11,y-14,8,29);
     c.font='800 18px Nunito,sans-serif';c.textAlign='left';c.fillStyle='#ffe2a9';
     c.fillText(String(i+1),lx+27,y+6);
   }
 }
 function effects(c,assets,s,g,reduce){
   if(reduce)return;
   const elapsed=Number(s.time)||0;
   for(const e of (s.events||[]).slice(-10)){
     const age=elapsed-e.time;
     if(age<0||age>.8)continue;
     if(e.kind!=='lateSurge'&&e.kind!=='photoFinish'&&e.kind!=='cheer')continue;
     let key=e.kind==='lateSurge'?'pp_derby_fx_surge':e.kind==='photoFinish'?'pp_derby_fx_photo':'pp_derby_fx_confetti';
     const im=assets?.[key];if(!im?.complete||!im.naturalWidth)continue;
     const h=(s.horses||[]).find(x=>x.id===e.horse||x.id===e.winner);
     const x=g.lx+62+(Number(h?.x)||0)/LENGTH*(g.finish-g.lx-100);
     const y=g.top+((h?.id)||0)*g.lane+45;
     const alpha=(1-age/.8)*.8;
     picture(c,im,x-103,y-126,206,192,alpha);
   }
 }
 function foreground(c,s,assets){
   const betting=s.phase==='betting';
   if(betting){
     const secs=Math.max(0,Math.ceil(12-s.phaseTime));
     c.save();
     roundBox(c,674,892,570,88,26,'rgba(15,23,45,.93)','#f6d38d',3);
     c.font='900 28px Nunito,sans-serif';c.fillStyle='#ffe6b1';c.textAlign='center';
     c.fillText('MAKE YOUR PICK · '+secs+' SECONDS',959,946);
     c.restore();
   }
   if(s.phase==='results'){
     const winner=s.horses.find(h=>h.id===s.lastWinner);
     c.save();
     c.fillStyle='rgba(7,11,30,.75)';c.fillRect(0,246,W,680);
     const wreath=assets?.pp_derby_fx_laurel;
     picture(c,wreath,704,270,510,475,.87);
     c.textAlign='center';c.fillStyle='#fff2ca';c.shadowColor='#000';c.shadowBlur=25;
     c.font='900 50px Fredoka,sans-serif';c.fillText('HEAT '+s.round+' WINNER',960,510);
     c.fillStyle='#ffd163';c.font='900 110px Fredoka,sans-serif';
     c.fillText(winner?.name||'WINNER',960,631);
     c.font='800 25px Nunito,sans-serif';c.fillStyle='#fff8e9';
     c.fillText('VIRTUAL GEMS PAID · NEXT HEAT STARTS SHORTLY',960,698);
     c.restore();
   }
 }
 function drawDerby(state,assets,opts={}){
   if(mode!=='derby'||!ctx||!state||!Array.isArray(state.horses))return false;
   const t=Number(state.time)||0;
   ctx.save();ctx.setTransform(1,0,0,1,0,0);
   backdrop(ctx,assets,t);
   const geo=track(ctx,assets,t,state);
   runners(ctx,state,assets,geo,!!opts.reduce);
   effects(ctx,assets,state,geo,!!opts.reduce);
   foreground(ctx,state,assets);
   ctx.restore();
   updateDerby(state,opts.selectedHorse||0);
   lastHeat=state.round;lastPhase=state.phase;
   return true;
 }
 function updateDerby(s,selected=0){
   if(!stage||mode!=='derby')return;
   const now=performance.now();if(now-lastHud<110)return;lastHud=now;
   const $=id=>document.getElementById(id);
   const h=s.horses?.[selected]||s.horses?.[0];
   $('ppHeat').textContent='HEAT '+s.round+' / 5';
   $('ppCourse').textContent=s.course||'The Grandstand Circuit';
   $('ppPhase').textContent=s.phase==='betting'?'YOUR BETTING WINDOW':s.phase==='racing'?'THEY ARE OFF!':s.phase==='results'?'OFFICIAL RESULT':'DERBY COMPLETE';
   $('ppClock').textContent=s.phase==='betting'?Math.max(0,Math.ceil(12-s.phaseTime))+'s':s.phase==='racing'?Math.max(0,s.phaseTime).toFixed(1)+'s':'—';
   $('ppHypeFill').style.width=clamp(s.hype||0,0,100)+'%';
   $('ppHypeText').textContent=String(s.hype||0)+'%';
   $('ppRunnerName').textContent=h?.name||'Choose a marble';
   $('ppOdds').textContent=h?Number(h.odds).toFixed(1)+'× RETURN':'—';
   const current=(s.roster||[]).find(p=>!p.cpu);
   const canBet=s.phase==='betting'&&!!current&&!s.wagers.has(current.id);
   const mayCheer=s.phase==='racing'&&!!current&&s.wagers.has(current.id)&&!s.cheers.has(current.id);
   $('derbyRunner').disabled=!canBet;
   $('derbyStake').disabled=!canBet;
   $('derbyPick').disabled=!canBet;
   $('derbyCheer').disabled=!mayCheer;
   $('derbyStake').textContent='STAKE · '+(current?.stake||50)+' ◆';
   $('derbyPick').textContent=canBet?'BACK '+String(h?.name||'MARBLE').toUpperCase():'PICKS CLOSED';
   $('ppBetHint').textContent=!current?'Connect a phone, or add a keyboard racer in the lobby':
      s.phase==='betting'?(canBet?'Pick a runner and place your virtual gems. Phones vote privately.':'Your pick is locked in.'):
      s.phase==='racing'?'Cheer for your marble on your phone to help it surge.':'Watch the result.';
   const entries=(s.roster||[]).slice().sort((a,b)=>b.gems-a.gems||a.name.localeCompare(b.name));
   const sig=entries.map(p=>p.id+':'+p.gems).join('|')+'|'+s.round+'|'+s.phase;
   if(sig!==lastSignature){
     lastSignature=sig;const list=$('ppRankRows');list.replaceChildren();
     entries.forEach((p,i)=>{
       const row=document.createElement('div');row.className='ppRankRow';
       row.style.setProperty('--runner',isColour(p.color)?p.color:'#ffd16b');
       const pos=document.createElement('span');pos.className='ppRankPos';pos.textContent=String(i+1).padStart(2,'0');
       const mark=document.createElement('i');mark.className='ppRankBall';
       const name=document.createElement('b');name.textContent=p.name;
       const gems=document.createElement('strong');gems.textContent=p.gems+' ◆';
       row.append(pos,mark,name,gems);list.appendChild(row);
     });
   }
 }
 return Object.freeze({enter,drawDerby,modes:MODES.slice()});
})();
