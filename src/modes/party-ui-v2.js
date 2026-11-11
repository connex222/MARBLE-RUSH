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
   // Derby v2 art direction: an elevated six-lane stadium diorama in
   // one-point perspective. The geometry is composed into the ONE game stage;
   // no legacy canvas, billboards or overlayed old scoreboard.
   const yEdges=[309,378,450,529,612,704,811];
   const leftAt=y=>508-(y-309)*.285;
   const rightAt=y=>1737+(y-309)*.072;
   const face=(points,fill,stroke,line=1)=>{
     c.beginPath();c.moveTo(points[0][0],points[0][1]);
     points.slice(1).forEach(p=>c.lineTo(p[0],p[1]));c.closePath();
     if(fill){c.fillStyle=fill;c.fill();}
     if(stroke){c.strokeStyle=stroke;c.lineWidth=line;c.stroke();}
   };
   const outer=[
     [leftAt(yEdges[0])-29,yEdges[0]-30],
     [rightAt(yEdges[0])+30,yEdges[0]-30],
     [rightAt(yEdges[6])+32,yEdges[6]+30],
     [leftAt(yEdges[6])-40,yEdges[6]+30]
   ];
   c.save();c.shadowColor='rgba(2,4,20,.92)';c.shadowBlur=62;c.shadowOffsetY=40;
   face(outer,'#4d3241','#ffe5a8',11);c.restore();
   const front=[
     [leftAt(yEdges[6])-39,yEdges[6]+14],
     [rightAt(yEdges[6])+30,yEdges[6]+14],
     [rightAt(yEdges[6])+19,yEdges[6]+52],
     [leftAt(yEdges[6])-28,yEdges[6]+52]
   ];
   face(front,gradient(c,0,815,0,70,[[0,'#ad6d42'],[.5,'#412a38'],[1,'#14192c']]),'#ffcd81',5);
   face(outer,'#61424a','#ffe4ad',7);
   const lanes=[];
   for(let i=0;i<6;i++){
     const y0=yEdges[i],y1=yEdges[i+1]-3;
     const l0=leftAt(y0),l1=leftAt(y1),r0=rightAt(y0),r1=rightAt(y1);
     lanes.push({y0,y1,l0,l1,r0,r1});
     const poly=[[l0,y0],[r0,y0],[r1,y1],[l1,y1]];
     c.save();c.beginPath();c.moveTo(l0,y0);c.lineTo(r0,y0);c.lineTo(r1,y1);
     c.lineTo(l1,y1);c.closePath();c.clip();
     c.fillStyle=i%2?'#76504e':'#6a4242';c.fillRect(l1-10,y0,r1-l1+20,y1-y0);
     const surface=assets?.pp_derby_surface_main;
     if(surface?.complete&&surface.naturalWidth){
       picture(c,surface,l1-5,y0-35,r1-l1+10,y1-y0+75,.39);
     }
     const shade=gradient(c,l0,y0,0,y1-y0,
       [[0,'rgba(255,244,203,.31)'],[.14,'rgba(255,233,186,.12)'],
        [.57,'rgba(28,16,40,.02)'],[1,'rgba(9,9,25,.60)']]);
     c.fillStyle=shade;c.fillRect(l1-10,y0,r1-l1+20,y1-y0);
     // Gold lane studs diminish towards the upper (more distant) track.
     for(let step=0;step<14;step++){
       const ratio=step/13, yy=(y0+y1)*.5;
       const xx=l0+(r0-l0)*ratio;
       c.fillStyle='rgba(255,221,149,.11)';
       c.fillRect(xx,y0+7,2.5,y1-y0-13);
     }
     c.restore();
     face(poly,null,'rgba(255,225,166,.20)',2);
     // Solid brass divider: lit top face and a dark bevel underneath.
     face([[l1,y1-3],[r1,y1-3],[r1,y1+4],[l1,y1+4]],'#fff0c2',null);
     face([[l1,y1+4],[r1,y1+4],[r1,y1+11],[l1,y1+11]],'#6a413a',null);
     c.strokeStyle='rgba(0,0,0,.48)';c.lineWidth=3;
     c.beginPath();c.moveTo(l1,y1+10);c.lineTo(r1,y1+10);c.stroke();
     // Each lane is raised and physically number-tagged.
     const tagY=(y0+y1)*.5;
     c.fillStyle='#ffd27b';c.font='900 '+Math.round(17+i*1.2)+'px Nunito,sans-serif';
     c.textAlign='center';c.fillText(String(i+1),l0+18,tagY+7);
   }
   // Front safety rim sits outside the playable course, never on the balls.
   const y=yEdges[6],xL=leftAt(y)-11,xR=rightAt(y)+10;
   face([[xL,y+6],[xR,y+6],[xR,y+20],[xL,y+20]],'#ffe5a0','#fff4c9',3);
   face([[xL,y+20],[xR,y+20],[xR-6,y+44],[xL+7,y+44]],
        gradient(c,0,y+20,0,25,[[0,'#d9a264'],[1,'#443444']]),'#ae694b',2);
   // Real vertical finish gantry uses perspective endpoints.
   const fTop=rightAt(yEdges[0])-65,fBot=rightAt(yEdges[6])-78;
   c.save();c.shadowColor='rgba(255,214,127,.7)';c.shadowBlur=26;
   for(let j=0;j<26;j++){
     const yy=yEdges[0]+j*(yEdges[6]-yEdges[0])/26;
     const next=yEdges[0]+(j+1)*(yEdges[6]-yEdges[0])/26;
     const fx=fTop+(fBot-fTop)*j/26;
     c.fillStyle=j%2?'#0e1931':'#fff8dc';
     c.fillRect(fx-13,yy,11,next-yy+1);
     c.fillStyle=j%2?'#fff8dc':'#0e1931';
     c.fillRect(fx-2,yy,11,next-yy+1);
   }
   c.restore();
   roundBox(c,fTop-88,yEdges[0]-60,182,38,9,'#172547','#ffde95',4);
   c.textAlign='center';c.font='900 24px Nunito,sans-serif';
   c.fillStyle='#ffdf9a';c.fillText('FINISH',fTop+3,yEdges[0]-35);
   // Physical scene props sit in the setting, not over gameplay controls.
   picture(c,assets?.pp_derby_prop_grandstand,475,88,576,255,.88);
   picture(c,assets?.pp_derby_prop_hay_bales,1564,733,281,159,.88);
   c.save();c.textAlign='left';c.fillStyle='#ffe4ad';
   c.font='900 23px Nunito,sans-serif';
   c.fillText('START GATES',leftAt(811)+18,886);
   c.textAlign='right';c.fillText('THE GRANDSTAND CIRCUIT · 1500 M',rightAt(811)-12,886);
   c.restore();
   return {lanes,finishTop:fTop,finishBot:fBot};
 }
 function runners(c,state,assets,geometry,reduce){
   for(let i=0;i<6;i++){
     const h=state.horses[i],lane=geometry.lanes[i];
     if(!h||!lane)continue;
     const y=(lane.y0+lane.y1)*.52;
     const depth=i/5,r=21+depth*13;
     const left=lane.l0+(lane.l1-lane.l0)*.50;
     const right=lane.r0+(lane.r1-lane.r0)*.50;
     const x0=left+48,raceLength=right-left-150;
     const x=x0+clamp(Number(h.x)||0,0,LENGTH)/LENGTH*raceLength;
     const speed=clamp((Number(h.v)||0)/185,0,1);
     if(state.phase==='racing'&&!reduce&&speed>.1){
       const streak=c.createLinearGradient(x-160,y,x-5,y);
       streak.addColorStop(0,'rgba(255,226,153,0)');
       streak.addColorStop(1,(isColour(h.color)?h.color:'#ffd56c')+'aa');
       c.fillStyle=streak;c.beginPath();
       c.moveTo(x-180*speed,y-12);c.lineTo(x-r,y-8);
       c.lineTo(x-r,y+8);c.lineTo(x-180*speed,y+16);c.closePath();c.fill();
     }
     ball(c,x,y,r,h.color,(Number(h.x)||0)/26,
       assets?.['marble_swirl_'+String(i+1).padStart(2,'0')]);
     const labelX=clamp(x,left+53,right-70),labelY=y-r-29;
     roundBox(c,labelX-58,labelY-12,116,27,8,'rgba(8,15,34,.89)','#ffde8b',1.6);
     c.fillStyle='#fff9ec';c.font='800 '+Math.round(17+depth*3)+'px Nunito,sans-serif';
     c.textAlign='center';c.fillText(h.name,labelX,labelY+8);
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
     const lane=g.lanes[Number(h?.id)||0]||g.lanes[0];
     const ly=(lane.y0+lane.y1)*.52;
     const lx=(lane.l0+lane.l1)*.50,rx=(lane.r0+lane.r1)*.50;
     const x=lx+48+(Number(h?.x)||0)/LENGTH*(rx-lx-150);
     const y=ly;
     const alpha=(1-age/.8)*.8;
     picture(c,im,x-103,y-126,206,192,alpha);
   }
 }
 function foreground(c,s,assets){
   // The live TV betting countdown lives in the dedicated HUD. Never draw a
   // second overlapping callout over the leaderboard.
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
