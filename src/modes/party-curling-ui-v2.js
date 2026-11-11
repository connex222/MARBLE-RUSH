/* MARBLE RUSH · CURLING UI V2
 * A self-contained, TV-first ice-rink presentation replacing the retired UI.
 * Reads MarbleCurling state only. Never changes collisions, player turns,
 * scoring, phone messages or Grand Prix.
 */
const MarbleCurlingUI=(()=>{
 'use strict';
 const W=1920,H=1080,TAU=2*Math.PI;
 const RINK={x:414,y:315,w:1080,h:492};
 const X=x=>RINK.x+Math.max(0,Math.min(1300,Number(x)||0))/1300*RINK.w;
 const Y=y=>RINK.y+Math.max(0,Math.min(530,Number(y)||0))/530*RINK.h;
 const S=RINK.w/1300;
 const clamp=(n,a,b)=>Math.min(b,Math.max(a,Number(n)||0));
 const color=v=>/^#[\da-f]{6}$/i.test(String(v||''))?v:'#ffd889';
 const $=id=>document.getElementById(id);
 let seen='',lastHud=0;
 function art(c,asset,x,y,w,h,a=1){
   if(!asset?.complete||!asset.naturalWidth)return;
   c.save();c.globalAlpha=a;c.drawImage(asset,x,y,w,h);c.restore();
 }
 function rr(c,x,y,w,h,r,fill,border,line=1){
   c.beginPath();c.roundRect(x,y,w,h,r);
   if(fill){c.fillStyle=fill;c.fill();}
   if(border){c.strokeStyle=border;c.lineWidth=line;c.stroke();}
 }
 function grad(c,x,y,w,h,a,b){const g=c.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,a);g.addColorStop(1,b);return g;}
 function bg(c,im,t){
   c.fillStyle='#0a2538';c.fillRect(0,0,W,H);
   const sky=im.pp_curling_bg;
   if(sky?.complete&&sky.naturalWidth){
     const sc=Math.max(W/sky.naturalWidth,H/sky.naturalHeight)*1.06;
     art(c,sky,(W-sky.naturalWidth*sc)/2+Math.sin(t*.07)*8,
       (H-sky.naturalHeight*sc)/2,sky.naturalWidth*sc,sky.naturalHeight*sc,.96);
   }else{
     c.fillStyle=grad(c,0,0,0,H,'#0a3c53','#182842');c.fillRect(0,0,W,H);
   }
   const ve=c.createRadialGradient(940,535,160,950,500,1190);
   ve.addColorStop(0,'rgba(4,25,46,.07)');ve.addColorStop(1,'rgba(2,8,29,.86)');
   c.fillStyle=ve;c.fillRect(0,0,W,H);
   // Alpine lodge, carved ice props and cool stadium glow all come from approved art.
   art(c,im.pp_curling_prop_alpine_lodge,540,72,650,246,.75);
   art(c,im.pp_curling_prop_ice_blocks,1463,693,309,260,.80);
   for(let k=0;k<7;k++){
     const x=200+k*260;const y=113;
     const g=c.createRadialGradient(x,y,0,x,y,205);
     g.addColorStop(0,'rgba(189,251,255,.17)');
     g.addColorStop(1,'rgba(189,251,255,0)');
     c.fillStyle=g;c.fillRect(x-205,y-205,410,410);
   }
   art(c,im.pp_curling_fx_aurora,420,47,1160,270,.30);
 }
 function board(c,im,t){
   const {x,y,w,h}=RINK;
   c.save();c.shadowColor='#000c';c.shadowBlur=68;c.shadowOffsetY=34;
   rr(c,x-52,y-59,w+104,h+121,38,'#29566b','#ffe5c6',12);c.restore();
   rr(c,x-44,y-50,w+88,h+98,33,
      grad(c,x-44,y-50,0,h+98,'#e5f9f4','#6c95ac'),'#edfff8',5);
   rr(c,x-24,y-30,w+48,h+58,21,'#0f3c55','#b8e8f8',6);
   c.save();c.beginPath();c.roundRect(x,y,w,h,10);c.clip();
   const ice=c.createLinearGradient(x,y,x+w,y+h);
   ice.addColorStop(0,'#c0f4f7');ice.addColorStop(.32,'#f4ffff');
   ice.addColorStop(.60,'#cfecf5');ice.addColorStop(1,'#9cd8e2');
   c.fillStyle=ice;c.fillRect(x,y,w,h);
   const material=im.pp_curling_surface_main;
   art(c,material,x,y,w,h,.38);
   for(let i=0;i<14;i++){
     const yy=y+i*h/14+Math.sin(i*.9+t*.04)*2;
     c.strokeStyle=i%2?'rgba(17,97,123,.05)':'rgba(255,255,255,.3)';
     c.lineWidth=i%2?5:9;c.beginPath();c.moveTo(x,yy);
     c.bezierCurveTo(x+w*.35,yy-23,x+w*.65,yy+16,x+w,yy-5);c.stroke();
   }
   const hash=(frac,ink)=>{c.strokeStyle=ink;c.lineWidth=4;
     c.beginPath();c.moveTo(X(frac),y+9);c.lineTo(X(frac),y+h-9);c.stroke();};
   hash(300,'rgba(38,116,146,.35)');hash(1030,'rgba(55,112,142,.27)');
   c.strokeStyle='rgba(48,98,135,.60)';c.lineWidth=4;
   c.beginPath();c.moveTo(x+9,Y(265));c.lineTo(x+w-9,Y(265));c.stroke();
   const tx=X(1140),ty=Y(265);
   // Real button coordinates and fixed scoring-house rings.
   const radii=[136,103,69,28];const fills=['#d5f5f4','#1b76ad','#fff4eb','#e54f69'];
   for(let i=0;i<radii.length;i++){
     const r=radii[i]*S;
     c.fillStyle=fills[i];c.beginPath();c.arc(tx,ty,r,0,TAU);c.fill();
     c.strokeStyle=i%2?'#faffff':'#c8eef5';c.lineWidth=3;c.stroke();
   }
   c.fillStyle='#fff9dc';c.beginPath();c.arc(tx,ty,10,0,TAU);c.fill();
   c.strokeStyle='rgba(4,58,78,.20)';c.lineWidth=3;
   c.beginPath();c.arc(tx,ty,161*S,0,TAU);c.stroke();
   // Frost-white rink reflections and the soft glass-front finish.
   const sheen=grad(c,x,y,w,h,'rgba(255,255,255,.25)','rgba(255,255,255,0)');
   c.fillStyle=sheen;c.fillRect(x,y,w,h);
   c.restore();
   rr(c,x-4,y-4,w+8,h+8,13,null,'#f5fffb',5);
   c.fillStyle='#fff5e0';c.font='900 22px Nunito,sans-serif';c.textAlign='left';
   c.fillText('HACK / RELEASE',x+15,y+h+67);
   c.textAlign='right';c.fillText('THE HOUSE · BUTTON',x+w-14,y+h+67);
   return {tx,ty};
 }
 function marble(c,m,p,im,t,reduce){
   const x=X(m.x),y=Y(m.y),r=18*S+7;
   c.save();
   c.fillStyle='rgba(22,50,66,.31)';c.beginPath();c.ellipse(x+6,y+11,r*1.18,r*.37,-.2,0,TAU);c.fill();
   if(!reduce&&Math.hypot(m.vx||0,m.vy||0)>15){
     c.save();c.globalAlpha=.50;c.strokeStyle='#fff';
     c.lineCap='round';c.lineWidth=7;c.beginPath();c.moveTo(x-(m.vx||0)*.14*S,y-(m.vy||0)*.14*S);
     c.lineTo(x,y);c.stroke();c.restore();
   }
   const col=color(p.color);
   const grad=c.createRadialGradient(x-r*.42,y-r*.45,2,x+r*.24,y+r*.23,r*1.22);
   grad.addColorStop(0,'#fff');grad.addColorStop(.21,col);grad.addColorStop(.71,col);grad.addColorStop(1,'#203448');
   c.fillStyle=grad;c.beginPath();c.arc(x,y,r,0,TAU);c.fill();
   const sw=im['marble_swirl_'+String((p.swirl||0)%12+1).padStart(2,'0')];
   if(sw?.complete&&sw.naturalWidth){
     c.save();c.beginPath();c.arc(x,y,r*.91,0,TAU);c.clip();
     c.translate(x,y);c.rotate((Number(m.spin)||0)*.13+t*.08);
     c.globalAlpha=.60;c.drawImage(sw,-r,-r,r*2,r*2);c.restore();
   }
   c.strokeStyle='#f9ffff';c.lineWidth=2;c.beginPath();c.arc(x,y,r-1,0,TAU);c.stroke();
   c.fillStyle='#fff';c.beginPath();c.ellipse(x-r*.40,y-r*.40,r*.26,r*.13,-.7,0,TAU);c.fill();
   c.restore();
 }
 function actors(c,assets,s,t,reduce){
   const roster=new Map((s.roster||[]).map(p=>[p.id,p]));
   const launch=X(75),centreY=Y(265);
   if(s.phase==='aim'){
     const angle=(Number(s.aim)||0)*Math.PI/180;
     const length=385+clamp(s.power,30,100)*2.8;
     const dx=Math.cos(angle)*length,dy=Math.sin(angle)*length;
     c.save();
     c.setLineDash([17,13]);c.lineWidth=6;c.lineCap='round';
     c.strokeStyle='rgba(19,126,157,.66)';
     c.beginPath();c.moveTo(launch,centreY);c.lineTo(launch+dx,centreY+dy);c.stroke();
     c.setLineDash([]);
     c.fillStyle='#0d719b';c.beginPath();
     c.moveTo(launch+dx+Math.cos(angle)*16,centreY+dy+Math.sin(angle)*16);
     c.lineTo(launch+dx-Math.cos(angle)*18-Math.sin(angle)*13,centreY+dy-Math.sin(angle)*18+Math.cos(angle)*13);
     c.lineTo(launch+dx-Math.cos(angle)*18+Math.sin(angle)*13,centreY+dy-Math.sin(angle)*18-Math.cos(angle)*13);
     c.fill();c.restore();
     const p=s.roster[Math.floor(s.turn/2)%s.roster.length];
     if(p)marble(c,{x:75,y:265,vx:0,vy:0},p,assets,t,reduce);
   }
   // Stones are always drawn from actual simulation positions.
   for(const m of s.stones){
     const p=roster.get(m.id);if(p)marble(c,m,p,assets,t,reduce);
     if(s.moving===m && !reduce){
       art(c,assets.pp_curling_fx_scrape,X(m.x)-56,Y(m.y)-60,115,111,.60);
       if(s.sweep>0)art(c,assets.pp_curling_fx_sweep,X(m.x)-100,Y(m.y)-106,200,187,.40);
     }
   }
   const last=(s.events||[]).slice(-15);
   for(const e of last){
     if(!Number.isFinite(e.time))continue;
     const age=s.elapsed-e.time;if(age<0||age>1.2)continue;
     const name=e.kind==='hit'?'pp_curling_fx_impact':
       e.kind==='sweep'?'pp_curling_fx_sweep':
       e.kind==='measurement'?'pp_curling_fx_target':null;
     if(!name)continue;
     const stone=s.stones.find(m=>m.id===e.id)||s.moving;
     art(c,assets[name],X(stone?.x??1140)-90,Y(stone?.y??265)-92,180,184,(1-age/1.2)*.52);
   }
 }
 function result(c,assets,s){
   if(s.phase!=='results')return;
   const winner=s.roster.find(p=>p.id===s.last);
   c.save();c.fillStyle='rgba(7,32,52,.57)';c.fillRect(0,320,W,484);
   rr(c,615,422,682,222,30,'rgba(8,52,75,.96)','#f5e1aa',6);
   c.textAlign='center';c.fillStyle='#e9ffff';
   c.font='900 44px Fredoka,sans-serif';c.fillText('END '+s.end+' RESULTS',956,491);
   c.fillStyle='#ffe0a5';c.font='900 79px Fredoka,sans-serif';
   c.fillText(winner?.name||'WINNER',956,580,615);
   art(c,assets.pp_curling_fx_victory,1141,376,214,212,.73);
   c.restore();
 }
 function update(s){
   if(!document.querySelector('#partyStage:not([hidden])')||!$('ppCurlHud'))return;
   const t=performance.now();if(t-lastHud<95)return;lastHud=t;
   const p=s.roster[Math.floor(s.turn/2)%s.roster.length];
   const isHuman=p&&!p.cpu&&s.phase==='aim';
   const active=s.phase==='slide'&&s.moving&&!s.roster.find(r=>r.id===s.moving.id)?.cpu;
   $('ppCurlEnd').textContent='END '+s.end+' / '+s.ends;
   $('ppCurlPhase').textContent=s.phase==='aim'?'LINE UP YOUR STONE':
     s.phase==='slide'?'STONE IN MOTION':s.phase==='results'?'MEASURE THE HOUSE':'MATCH COMPLETE';
   $('ppCurlClock').textContent=s.phase==='aim'?Math.max(0,Math.ceil(12-s.clock))+'s':
     s.phase==='slide'?Math.max(0,Math.ceil(22-s.clock))+'s':'—';
   $('ppCurlPlayer').textContent=p?.name||'Watch the ice';
   $('ppCurlAim').textContent=(s.aim>0?'+':'')+Math.round(s.aim)+'°';
   $('ppCurlPower').textContent=Math.round(s.power)+'%';
   $('ppCurlCurl').textContent=s.curl<0?'LEFT '+Math.abs(s.curl):s.curl>0?'RIGHT '+s.curl:'STRAIGHT';
   $('ppCurlSweep').textContent=Math.round(s.sweep)+'%';
   $('ppCurlSweepBar').style.width=Math.min(100,Math.max(0,s.sweep))+'%';
   $('ppCurlPlayed').textContent=Math.min(s.turn,s.roster.length*2)+' / '+(s.roster.length*2);
   $('ppCurlOwner').textContent=p?.name||'—';
   for(const id of ['ppCurlLeft','ppCurlRight','ppCurlPowerDown','ppCurlPowerUp','ppCurlLeftSpin','ppCurlRightSpin','ppCurlThrow'])
     $(id).disabled=!isHuman;
   $('ppCurlSweepBtn').disabled=!active||s.sweep>=100||s.elapsed<s.sweepReadyAt;
   $('ppCurlHelp').textContent=isHuman?'Aim, set power and curl, then THROW.':
      active?'SWEEP now to help your stone travel.':'Watch the house and measure the closest stones.';
   const ranks=s.roster.slice().sort((a,b)=>b.points-a.points||b.wins-a.wins||
      s.roster.indexOf(a)-s.roster.indexOf(b));
   const sig=ranks.map(p=>p.id+':'+p.points+':'+p.wins).join('|')+'|'+s.end;
   if(seen!==sig){
     seen=sig;const box=$('ppCurlRankRows');box.replaceChildren();
     ranks.forEach((p,i)=>{
       const row=document.createElement('div');row.className='ppCurlRank';
       row.style.setProperty('--curl-marble',color(p.color));
       const n=document.createElement('b');n.textContent=String(i+1).padStart(2,'0');
       const marbleIcon=document.createElement('i');
       const name=document.createElement('strong');name.textContent=p.name;
       const points=document.createElement('span');points.textContent=p.points+' PTS';
       row.append(n,marbleIcon,name,points);box.appendChild(row);
     });
   }
 }
 function draw(s,assets,opts={}){
   const c=$('partyStageCanvas')?.getContext('2d',{alpha:false});
   if(!c||!s||!Array.isArray(s.stones))return false;
   c.save();c.setTransform(1,0,0,1,0,0);
   bg(c,assets,s.elapsed||0);
   board(c,assets,s.elapsed||0);
   actors(c,assets,s,s.elapsed||0,!!opts.reduce);
   result(c,assets,s);
   c.restore();update(s);return true;
 }
 return Object.freeze({draw});
})();
