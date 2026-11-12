/* MARBLE RUSH Party Pack UI v2 — full replacement presentation.
 * Scope: TV artwork and HUD. Never mutates game engine, bets, scoring or phones.
 * The five legacy Canvas2D draw functions and per-mode markup were retired.
 * Stage visibility and renderer ownership live only in party-screen-host.js.
 */
const MarblePartyUI=(()=>{
 'use strict';
 const LENGTH=1500;
 const W=1920,H=1080;
 let stage=null,canvas=null,ctx=null,mode=null,lastHud=-99,lastSignature='';
 let lastHeat=0,lastPhase='',entryAt=0;
 // TV-only composition framing. The race positions come directly from Derby
 // physics; this never changes horse speed, betting or game outcomes.
 let derbyZoom=1,derbyZoomTarget=1,derbySpread=0,lastCameraAt=0;
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
 const isColour=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
 function bind(){
   stage=document.querySelector('[data-screen="party-stage"]');
   canvas=document.getElementById('partyStageCanvas');
   ctx=canvas?.getContext('2d',{alpha:false})||null;
   return !!(stage&&ctx);
 }
 // The shared host alone mounts/hides game UI. The Derby/Drop Zone
 // illustrators retain only their per-match HUD cache and canvas binding.
 function activate(next,options={}){
   if(next!=='derby'&&next!=='dropzone')return false;
   // Native WebGL owns the canvas, but its HUD must remain identical.
   if(next==='derby'&&options.hudOnly){
     stage=document.querySelector('[data-screen="party-stage"]');
     canvas=null;ctx=null;
     if(!stage)return false;
   }else if(!bind())return false;
   mode=next;lastHeat=0;lastPhase='';lastSignature='';
   lastHud=-99;entryAt=performance.now();
   derbyZoom=1;derbyZoomTarget=1;derbySpread=0;lastCameraAt=performance.now();
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
   // Position callouts come from true race distances, including ties; no
   // cosmetic ranking or fake pass events.
   const order=(state.horses||[]).slice().sort((a,b)=>b.x-a.x||a.id-b.id);
   const placing=new Map(order.map((horse,i)=>[horse.id,i+1]));
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
     c.textAlign='center';
     c.fillText(state.phase==='racing'?placing.get(h.id)+' · '+h.name:h.name,
       labelX,labelY+8,110);
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
     const viewer=(s.roster||[]).find(p=>!p.cpu);
     const ticket=viewer?.bets?.find(b=>b.round===s.round);
     let verdict='OFFICIAL RESULT · NEXT HEAT STARTS SHORTLY';
     if(ticket){
       verdict=ticket.payout>0?
         'YOUR PICK WON · '+ticket.payout+' ◆ PAID · +'+(ticket.payout-ticket.stake)+' ◆ NET':
         'YOUR PICK LOST · '+ticket.stake+' ◆ STAKE · NEXT HEAT AWAITS';
     }
     c.font='900 26px Nunito,sans-serif';c.fillStyle=ticket?.payout?'#c1ffe6':'#fff8e9';
     c.fillText(verdict,960,698,1150);
     c.restore();
   }
 }
 // Smooth broadcast zoom: tight pack = legible close-up; one slow marble
 // drops behind = widen until all six remain in view; catch-up = glide back.
 // The scene is a single composited track, not a fake 3D overlay.
 function frameDerbyCamera(state,reduce){
   const xs=(state.horses||[]).map(h=>Number(h.x)).filter(Number.isFinite);
   derbySpread=xs.length?Math.max(...xs)-Math.min(...xs):0;
   const wide=clamp((derbySpread-200)/700,0,1);
   derbyZoomTarget=state.phase==='racing'?(1.028-.138*wide):1;
   const now=performance.now(),dt=Math.min(.05,Math.max(0,(now-lastCameraAt)/1000));
   lastCameraAt=now;
   if(reduce)derbyZoom=1;
   else derbyZoom+=(derbyZoomTarget-derbyZoom)*(1-Math.exp(-2.3*dt));
   derbyZoom=clamp(derbyZoom,.89,1.03);
   return derbyZoom;
 }
 function drawDerby(state,assets,opts={}){
   if(mode!=='derby'||!ctx||!state||!Array.isArray(state.horses))return false;
   const t=Number(state.time)||0;
   ctx.save();ctx.setTransform(1,0,0,1,0,0);
   MarbleSceneCache.paint('derby',ctx,assets,
     ['pp_derby_bg','pp_derby_prop_grandstand','pp_derby_prop_hay_bales'],
     c=>backdrop(c,assets,t));
   const zoom=frameDerbyCamera(state,!!opts.reduce);
   ctx.save();
   // Scale ALL physical track features and real marbles together around
   // the course centre. HUD and results remain TV-safe and stationary.
   ctx.translate(1090,565);ctx.scale(zoom,zoom);ctx.translate(-1090,-565);
   const geo=track(ctx,assets,t,state);
   runners(ctx,state,assets,geo,!!opts.reduce);
   effects(ctx,assets,state,geo,!!opts.reduce);
   ctx.restore();
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

 // DROP ZONE UI v2 — original 1920×1080 scene, never the old pegboard canvas.
 // Coordinates reflect DropZone.state (1000x800), not a second physics engine.
 const DZ_PRIZES=Object.freeze([50,100,200,500,1000,500,200,100]);
 const DZ_VIEW=Object.freeze({left:453,right:1445,top:195,bottom:926});
 const dzX=x=>DZ_VIEW.left+(clamp(Number(x)||0,80,920)-80)/840*(DZ_VIEW.right-DZ_VIEW.left);
 const dzY=y=>DZ_VIEW.top+(Number(y)-35)*.98;
 let dzHudSignature='';
 function dropBackdrop(c,assets,time){
   c.fillStyle='#071927';c.fillRect(0,0,W,H);
   const im=assets?.pp_dropzone_bg;
   if(im?.complete&&im.naturalWidth){
     const sc=Math.max(W/im.naturalWidth,H/im.naturalHeight)*1.07;
     const w=im.naturalWidth*sc,h=im.naturalHeight*sc;
     picture(c,im,(W-w)/2+Math.sin(time*.09)*11,(H-h)/2,w,h,.94);
   }else{
     c.fillStyle=gradient(c,0,0,W,H,[[0,'#064e53'],[.5,'#143954'],[1,'#091224']]);
     c.fillRect(0,0,W,H);
   }
   const vignette=c.createRadialGradient(980,500,180,960,580,1300);
   vignette.addColorStop(0,'rgba(3,18,32,.10)');
   vignette.addColorStop(1,'rgba(2,9,26,.92)');
   c.fillStyle=vignette;c.fillRect(0,0,W,H);
   // Miniature prize-show lighting and gold trusses.
   for(let j=0;j<6;j++){
     const x=130+j*310;
     const beam=c.createRadialGradient(x,110,0,x,180,245);
     beam.addColorStop(0,'rgba(255,218,130,.16)');beam.addColorStop(1,'rgba(255,218,130,0)');
     c.fillStyle=beam;c.fillRect(x-240,-60,480,500);
   }
   picture(c,assets?.pp_dropzone_prop_glass_chute,1275,102,280,260,.70);
   picture(c,assets?.pp_dropzone_prop_gold_bucket,1460,766,305,217,.78);
 }
 function dzCabinet(c,assets,s,time){
   const {left,right,top,bottom}=DZ_VIEW;
   const w=right-left;
   c.save();c.shadowColor='#000b';c.shadowBlur=58;c.shadowOffsetY=34;
   roundBox(c,left-53,top-47,w+106,bottom-top+128,42,'#092b38','#ffdd88',14);
   c.restore();
   roundBox(c,left-42,top-39,w+84,bottom-top+110,35,
     gradient(c,left-40,top-39,0,bottom-top+110,
       [[0,'#fce09d'],[.10,'#926d47'],[.55,'#52495a'],[1,'#9c6939']]),'#ffefbe',6);
   roundBox(c,left-24,top-17,w+48,bottom-top+73,20,'#081e31','#61c1bc',5);
   c.save();c.beginPath();c.roundRect(left,top,w,bottom-top+22,9);c.clip();
   c.fillStyle=gradient(c,left,top,0,bottom-top+22,
     [[0,'#0c4259'],[.40,'#124c58'],[.76,'#0c3047'],[1,'#041e32']]);
   c.fillRect(left,top,w,bottom-top+22);
   const tile=assets?.pp_dropzone_surface_main;
   if(tile?.complete&&tile.naturalWidth)picture(c,tile,left,top,w,bottom-top+22,.44);
   // Shimmer of real glass: strong rim light, subtle internal reflection.
   c.fillStyle=gradient(c,left,top,w,0,
     [[0,'rgba(151,243,250,.32)'],[.12,'rgba(255,255,255,.04)'],
      [.74,'rgba(255,255,255,0)'],[1,'rgba(172,244,255,.28)']],false);
   c.fillRect(left,top,w,bottom-top+22);
   c.restore();
   // Structural columns and scene depth: the board, not a UI sprite layered over rules.
   for(const [x,side] of [[left-41,-1],[right+28,1]]){
     c.fillStyle=gradient(c,x,top,18,0,
       [[0,'#ffedb5'],[.34,'#7e6c69'],[.72,'#182f41'],[1,'#b08c51']],false);
     roundBox(c,x,top,19,bottom-top+44,6,c.fillStyle,'#f7da9d',1.5);
     for(let k=0;k<6;k++){
       const y=top+49+k*123;
       c.fillStyle='#ffe7a8';c.beginPath();c.arc(x+9,y,4,0,2*Math.PI);c.fill();
     }
   }
   // LED marquee / mechanical launch rail.
   roundBox(c,left-18,top-37,w+36,48,16,'#102739','#ffe9a6',4);
   c.textAlign='center';c.font='900 24px Nunito,sans-serif';
   c.fillStyle='#ffeaaf';c.fillText('THE GOLDEN DROP · LIVE JACKPOT',left+w/2,top-5);
   c.save();c.strokeStyle='rgba(162,242,235,.22)';c.lineWidth=3;
   c.beginPath();c.moveTo(dzX(s.x),top+13);c.lineTo(dzX(s.x),dzY(105));c.stroke();c.restore();
   const launch=dzX(s.x);
   c.save();c.shadowColor='#ffe9b1';c.shadowBlur=25;
   roundBox(c,launch-30,top+23,60,26,11,'#ffda84','#fff4ce',3);c.restore();
   const active=s.ball;
   if(!active){
     ball(c,launch,dzY(52),22,s.roster?.[s.turn%s.roster.length]?.color||'#ffcf70',
       time,assets?.marble_swirl_01);
     c.strokeStyle='#ffe0a3';c.lineWidth=3;c.beginPath();
     c.moveTo(launch-19,dzY(91));c.lineTo(launch,dzY(102));c.lineTo(launch+19,dzY(91));c.stroke();
   }
   // Fixed pegs from the authoritative model, with the chosen gold pegs distinguished.
   const gold=new Set(s.gold||[]);
   for(let i=0;i<(s.pegs||[]).length;i++){
     const peg=s.pegs[i],x=dzX(peg.x),y=dzY(peg.y);
     const lit=gold.has(i);
     if(lit){
       const shine=c.createRadialGradient(x,y,0,x,y,31);
       shine.addColorStop(0,'rgba(255,233,151,.55)');
       shine.addColorStop(1,'rgba(255,201,69,0)');
       c.fillStyle=shine;c.fillRect(x-31,y-31,62,62);
     }
     c.fillStyle='rgba(0,0,0,.64)';c.beginPath();c.ellipse(x+4,y+7,13,7,0,0,Math.PI*2);c.fill();
     const material=c.createRadialGradient(x-4,y-5,1,x+2,y+3,15);
     material.addColorStop(0,'#fff9e2');
     material.addColorStop(.21,lit?'#ffe876':'#b1efeb');
     material.addColorStop(.65,lit?'#d48f2b':'#458494');
     material.addColorStop(1,'#172b40');
     c.fillStyle=material;c.beginPath();c.arc(x,y,11.5,0,2*Math.PI);c.fill();
     c.strokeStyle=lit?'rgba(255,221,105,.95)':'rgba(213,255,248,.55)';
     c.lineWidth=1.2;c.stroke();
   }
   // Physical spinner and oscillating gate match collision coordinates.
   const spinX=dzX(500+110*Math.sin(time*1.2)),spinY=dzY(480);
   c.save();c.translate(spinX,spinY);c.rotate(time*1.8);
   c.shadowColor='#3ce8d6';c.shadowBlur=15;
   roundBox(c,-51,-9,102,18,8,'#f8aa52','#fff4be',3);
   roundBox(c,-10,-47,20,94,8,'#157e88','#e1fff1',3);
   c.restore();
   const gateX=dzX(500+115*Math.sin(time*.9)),gateY=dzY(598);
   c.save();c.translate(gateX,gateY);c.rotate(Math.sin(time*2)*.17);
   roundBox(c,-61,-11,122,22,9,'#e59754','#ffe5a3',3);
   c.restore();
   // Jackpot bins sit on a raised mechanical prize rail. Values are the REAL scores.
   const unit=w/8,binY=dzY(710)+14;
   roundBox(c,left-4,binY-5,w+8,107,11,'#102b3c','#fff0ba',4);
   for(let i=0;i<8;i++){
     const x=left+i*unit,prize=DZ_PRIZES[i];
     // The moving 1,000-point jackpot only unlocks in the final round.
     const jack=s.round===5?i===s.jackpotBin:i===4;
     const displayedPrize=(s.round===5&&jack)?1000:prize;
     c.save();c.shadowColor=jack?'#ffcf73':'transparent';c.shadowBlur=jack?20:0;
     roundBox(c,x+4,binY+3,unit-8,91,9,
       jack?gradient(c,x,binY,0,91,[[0,'#ffedaa'],[1,'#ad4a50']]):
       gradient(c,x,binY,0,91,[[0,'#225c6b'],[1,'#0d2d43']]),
       jack?'#fff5ba':'#6daeb4',jack?3:1.5);
     c.restore();
     c.textAlign='center';c.fillStyle=jack?'#3b1732':'#fff5de';
     c.font='900 '+(prize===1000?28:25)+'px Fredoka,sans-serif';
     c.fillText(String(displayedPrize),x+unit/2,binY+49);
     c.font='900 13px Nunito,sans-serif';
     c.fillText(jack?'★ JACKPOT ★':'POINTS',x+unit/2,binY+71);
   }
   // Keeper cup rim appears above the scoring plane.
   c.strokeStyle='#ffe5a3';c.lineWidth=4;c.beginPath();
   c.moveTo(left,binY-8);c.lineTo(right,binY-8);c.stroke();
   // Real, simulated falling marble: nothing here changes its position or payout.
   if(active){
     const x=dzX(active.x),y=dzY(active.y);
     if(!Number.isFinite(x)||!Number.isFinite(y))return;
     if(!s.reduceMotion){
       const tail=c.createLinearGradient(x,y-110,x,y+12);
       tail.addColorStop(0,'rgba(199,255,240,0)');
       tail.addColorStop(1,'rgba(255,232,153,.46)');
       c.fillStyle=tail;roundBox(c,x-10,y-110,20,116,10,tail,null);
     }
     ball(c,x,y,22,active.color,(Number(active.t)||0)*5,assets?.marble_swirl_01);
     if(active.multiplier===2){
       c.save();c.strokeStyle='#ffe783';c.shadowColor='#ffd254';c.shadowBlur=25;c.lineWidth=4;
       c.beginPath();c.arc(x,y,31,0,2*Math.PI);c.stroke();c.restore();
     }
   }
   // Time-bounded event FX; only already-approved particle sprite materials.
   for(const e of (s.events||[]).slice(-14)){
     const age=(Number(s.elapsed)||0)-(Number(e.time)||0);
     if(age<0||age>1.05)continue;
     const kind=e.kind;
     const im=assets?.[kind==='goldPeg'?'pp_dropzone_fx_multiplier':
       kind==='pegImpact'?'pp_dropzone_fx_peg':
       kind==='jackpot'?'pp_dropzone_fx_jackpot':
       kind==='bucket'?'pp_dropzone_fx_coins':null];
     if(!im?.complete||!im.naturalWidth)continue;
     const xx=dzX(Number(e.x)||500),yy=dzY(Number(e.y)||440);
     const size=kind==='jackpot'?250:150;
     picture(c,im,xx-size/2,yy-size/2,size,size,(1-age/1.05)*.82);
   }
   // Metal rim, clear glass specular edge.
   roundBox(c,left-4,top-2,w+8,bottom-top+99,14,null,'rgba(198,255,247,.56)',3);
 }
 function dropDramatics(c,assets,s){
   const event=(s.events||[]).slice().reverse().find(e=>e.kind==='bucket'||e.kind==='jackpot');
   if(!event)return;
   const age=(Number(s.elapsed)||0)-event.time;
   if(age<0||age>1.6)return;
   const alpha=clamp(1-age/1.6,0,1);
   c.save();c.globalAlpha=alpha;
   c.shadowColor='#ffe5a2';c.shadowBlur=28;
   roundBox(c,668,406,582,182,28,'rgba(5,28,48,.95)','#ffdb84',6);
   c.textAlign='center';c.fillStyle='#fff3c7';
   c.font='900 39px Fredoka,sans-serif';
   c.fillText(event.kind==='jackpot'?'MEGA JACKPOT!':'BUCKET BANKED!',959,466);
   c.font='900 83px Fredoka,sans-serif';c.fillStyle='#ffce67';
   c.fillText('+'+String(event.score||s.last)+' POINTS',959,548);
   picture(c,assets?.pp_dropzone_fx_confetti,1110,370,250,235,.40);
   c.restore();
 }
 function drawDropZone(state,assets,opts={}){
   if(mode!=='dropzone'||!ctx||!state||!Array.isArray(state.pegs))return false;
   const t=Number(state.elapsed)||0;
   ctx.save();ctx.setTransform(1,0,0,1,0,0);
   MarbleSceneCache.paint('dropzone',ctx,assets,
     ['pp_dropzone_bg','pp_dropzone_prop_glass_chute'],
     c=>dropBackdrop(c,assets,t));
   dzCabinet(ctx,assets,Object.assign({reduceMotion:!!opts.reduce},state),t);
   if(!opts.reduce)dropDramatics(ctx,assets,state);
   ctx.restore();
   updateDropZone(state);
   return true;
 }
 function updateDropZone(s){
   if(!stage||mode!=='dropzone')return;
   const now=performance.now();if(now-lastHud<100)return;lastHud=now;
   const $=id=>document.getElementById(id);
   const current=s.roster?.[s.turn%s.roster.length];
   const isHuman=!!current&&!current.cpu&&!s.ball&&!s.done;
   const drop=s.ball;
   $('ppDropRound').textContent='ROUND '+Math.min(5,s.round)+' / 5';
   $('ppDropTurn').textContent=s.done?'SHOW COMPLETE':drop?'MARBLE IN FLIGHT':'UP NEXT: '+String(current?.name||'Player').toUpperCase();
   $('ppDropTimer').textContent=drop?Math.min(10,Number(drop.t)||0).toFixed(1)+'s':
     s.done?'—':Math.max(0,Math.ceil(10-s.turnElapsed))+'s';
   $('ppDropAim').textContent=String(Math.round(s.x||500));
   $('ppDropJackpot').textContent='1000';
   $('ppDropJackpotLabel').textContent=s.round===5?'LIVE JACKPOT':'FINAL JACKPOT';
   $('ppDropLast').textContent=(Number(s.last)||0)+' PTS';
   $('ppDropOnDeck').textContent=String(current?.name||'—');
   $('ppDropCount').textContent=Math.min(s.turn,s.roster.length*5)+' / '+(s.roster.length*5);
   $('dropLeft').disabled=!isHuman;
   $('dropRight').disabled=!isHuman;
   $('dropNow').disabled=!isHuman;
   $('ppDropHint').textContent=s.done?'All rounds complete. See the winner screen.':
     drop?'MARBLE IN MOTION · predict a prize bin from your phone!':
     isHuman?'Move your release chute, then drop into the jackpot bins.':
     'CPU is lining up its next marble…';
   const ranking=(s.roster||[]).slice().sort((a,b)=>b.score-a.score||a.name.localeCompare(b.name));
   const signature=ranking.map(p=>p.id+':'+p.score+':'+p.drops).join('|');
   if(signature!==dzHudSignature){
     dzHudSignature=signature;
     const list=$('ppDropRankRows');list.replaceChildren();
     for(const [i,p] of ranking.entries()){
       const row=document.createElement('div');row.className='ppDropRankRow';
       row.style.setProperty('--drop-color',isColour(p.color)?p.color:'#ffd783');
       const n=document.createElement('span');n.textContent=String(i+1).padStart(2,'0');
       const m=document.createElement('i');m.className='ppDropMarble';
       const name=document.createElement('strong');name.textContent=p.name;
       const score=document.createElement('b');score.textContent=Number(p.score).toLocaleString('en-GB');
       row.append(n,m,name,score);list.appendChild(row);
     }
   }
 }

 return Object.freeze({activate,updateDerby,drawDerby,drawDropZone,
   get derbyFraming(){return {zoom:derbyZoom,target:derbyZoomTarget,spread:derbySpread};}
 });
})();
