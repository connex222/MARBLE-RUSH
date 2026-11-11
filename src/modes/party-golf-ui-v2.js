/* MARBLE RUSH — MARBLE GOLF UI V2
 * A new full-screen premium tabletop mini-golf presentation.
 * Reads real MarbleGolf layouts, ball, strokes, players and events only.
 * No legacy Golf canvas, no second physics layer, no gameplay mutation.
 */
const MarbleGolfUI=(()=>{
 'use strict';
 const W=1920,H=1080,TAU=Math.PI*2;
 // The real rules engine uses 1240x580. Scene composition occupies the TV
 // centre, leaving 340px TV-safe side columns for control and score HUDs.
 const BOARD={x:410,y:305,w:1100,h:515};
 const px=n=>BOARD.x+Number(n||0)*BOARD.w/1240;
 const py=n=>BOARD.y+Number(n||0)*BOARD.h/580;
 const unit=BOARD.w/1240;
 const clamp=(v,a,b)=>Math.min(b,Math.max(a,Number(v)||0));
 const $=id=>document.getElementById(id);
 let lastHud=0,rankKey='',holeSeen=0;
 function rr(c,x,y,w,h,r,fill,stroke,thick=1){
  c.beginPath();c.roundRect(x,y,w,h,r);
  if(fill){c.fillStyle=fill;c.fill();}
  if(stroke){c.lineWidth=thick;c.strokeStyle=stroke;c.stroke();}
 }
 function sprite(c,asset,x,y,w,h,alpha=1){
  if(!asset?.complete||!asset.naturalWidth)return;
  c.save();c.globalAlpha=alpha;c.drawImage(asset,x,y,w,h);c.restore();
 }
 function grad(c,x,y,w,h,top,bottom){
  const g=c.createLinearGradient(x,y,x+w,y+h);
  g.addColorStop(0,top);g.addColorStop(1,bottom);return g;
 }
 function circle(c,x,y,r,color,thick=1,fill=false){
  c.beginPath();c.arc(x,y,r,0,TAU);
  if(fill){c.fillStyle=color;c.fill();}else{c.strokeStyle=color;c.lineWidth=thick;c.stroke();}
 }
 function color(c){return typeof c==='string'&&/^#[\da-f]{6}$/i.test(c)?c:'#fdd27b';}
 function world(c,assets,time,s,reduce){
  c.fillStyle='#153047';c.fillRect(0,0,W,H);
  const bg=assets?.pp_golf_bg;
  if(bg?.complete&&bg.naturalWidth){
   const scale=Math.max(W/bg.naturalWidth,H/bg.naturalHeight)*1.06;
   const w=bg.naturalWidth*scale,h=bg.naturalHeight*scale;
   sprite(c,bg,(W-w)/2+Math.sin(time*.04)*8,(H-h)/2,w,h,.97);
  }else{
   c.fillStyle=grad(c,0,0,0,H,'#315f72','#1a3045');c.fillRect(0,0,W,H);
  }
  // Approved 3D-look props ground the tiny world in its toy-table setting.
  sprite(c,assets?.pp_golf_prop_stone_bridge,1061,106,580,253,.79);
  sprite(c,assets?.pp_golf_prop_windmill,1494,588,310,317,.91);
  const v=c.createRadialGradient(940,510,230,940,540,1200);
  v.addColorStop(0,'rgba(10,23,32,.08)');v.addColorStop(1,'rgba(6,11,30,.92)');
  c.fillStyle=v;c.fillRect(0,0,W,H);
  if(!reduce){
   for(let i=0;i<7;i++){
    const bx=160+i*283;
    const beam=c.createRadialGradient(bx,120,0,bx,120,190);
    beam.addColorStop(0,'rgba(255,222,156,.14)');beam.addColorStop(1,'rgba(255,222,156,0)');
    c.fillStyle=beam;c.fillRect(bx-190,-70,380,380);
   }
  }
 }
 function track(c,assets,s){
  const {x,y,w,h}=BOARD;
  c.save();c.shadowColor='#050c20e8';c.shadowBlur=66;c.shadowOffsetY=42;
  rr(c,x-44,y-59,w+88,h+111,42,'#5d4939','#fff1c6',13);c.restore();
  rr(c,x-37,y-48,w+74,h+92,35,
    grad(c,x-37,y-48,w*.1,h+92,'#ecca85','#795b4c'),'#fff3bf',5);
  rr(c,x-19,y-29,w+38,h+57,22,'#2b614d','#e5d39c',5);
  c.save();c.beginPath();c.roundRect(x,y,w,h,12);c.clip();
  const field=c.createLinearGradient(x,y,x+w,y+h);
  field.addColorStop(0,'#5ec081');field.addColorStop(.47,'#39975e');field.addColorStop(1,'#23684c');
  c.fillStyle=field;c.fillRect(x,y,w,h);
  sprite(c,assets?.pp_golf_surface_main,x,y,w,h,.38);
  // Striping hints that the deck is constructed from real turf.
  c.fillStyle='rgba(236,255,221,.048)';
  for(let i=0;i<13;i++){c.save();c.translate(x+i*102,y);
   c.rotate(.13);c.fillRect(0,-100,54,h+200);c.restore();}
  // A border inset offers safe ball clearance without obscuring walls.
  c.strokeStyle='rgba(242,248,186,.35)';c.lineWidth=3;
  c.strokeRect(x+10,y+10,w-20,h-20);
  c.restore();
  // Heavy carved wooden perimeter rails have visible depth.
  const rails=[
   [x-26,y-27,w+52,23],[x-26,y+h+8,w+52,24],
   [x-27,y-27,26,h+59],[x+w+2,y-27,26,h+59]
  ];
  for(const [rx,ry,rw,rh] of rails){
   rr(c,rx,ry,rw,rh,7,grad(c,rx,ry,rw*.8,rh*.6,'#fad88b','#81513b'),'#fff0b0',3);
   rr(c,rx+3,ry+3,rw-6,Math.max(3,rh*.25),4,'rgba(255,250,213,.43)',null);
  }
  // Holes are real layout definitions, never invented visual hazards.
  const layout=s.layout;
  for(const [ox,oy,ow,oh] of layout.water||[]){
   const wx=px(ox),wy=py(oy),ww=ow*unit,wh=oh*unit;
   c.save();c.shadowColor='#062f66';c.shadowBlur=18;
   rr(c,wx,wy,ww,wh,12,'#0c6b9e','#d7f9ed',5);c.restore();
   c.save();c.beginPath();c.roundRect(wx+5,wy+5,ww-10,wh-10,7);c.clip();
   const water=grad(c,wx,wy,ww,wh,'#3bd7e4','#0b4c92');
   c.fillStyle=water;c.fillRect(wx,wy,ww,wh);
   c.strokeStyle='rgba(218,255,255,.37)';c.lineWidth=3;
   for(let i=0;i<5;i++){
    const yy=wy+(i+1)*wh/6;c.beginPath();c.moveTo(wx+5,yy);
    c.bezierCurveTo(wx+ww*.3,yy-13,wx+ww*.72,yy+15,wx+ww-5,yy);
    c.stroke();
   }
   c.restore();
  }
  function wall(x,y,w,h){
   const xx=px(x),yy=py(y),ww=w*unit,hh=h*unit;
   c.save();c.shadowColor='rgba(3,10,25,.68)';c.shadowBlur=16;c.shadowOffsetY=12;
   rr(c,xx,yy,ww,hh,5,'#51494b','#ffe2a1',3);c.restore();
   rr(c,xx,yy,ww,Math.max(5,hh*.21),3,'#eec68b','#fff4d5',1);
   c.fillStyle='rgba(8,20,31,.31)';c.fillRect(xx+2,yy+hh-7,ww-4,6);
  }
  for(const o of layout.walls||[])wall(...o);
  for(const [bx,by,br] of layout.bumpers||[]){
   const x=px(bx),y=py(by),r=br*unit;
   c.save();c.shadowColor='#000c';c.shadowBlur=11;c.shadowOffsetY=10;
   circle(c,x,y,r+5,'#4a2b40',1,true);c.restore();
   const g=c.createRadialGradient(x-r*.4,y-r*.5,2,x+r*.25,y+r*.22,r*1.5);
   g.addColorStop(0,'#fffae6');g.addColorStop(.33,'#ffcf85');
   g.addColorStop(.63,'#cc6661');g.addColorStop(1,'#594450');
   circle(c,x,y,r,g,1,true);circle(c,x,y,r*.8,'#fff3c0',3);
   circle(c,x,y,r*.36,'#fff9d7',3);
  }
  // Moving windmill, flipper, tunnel and gate coincide with physics positions.
  if(layout.moving==='windmill'){
   const x=px(620+60*Math.sin(s.elapsed*.85)),y=py(290),r=43*unit;
   c.save();c.translate(x,y);c.rotate(s.elapsed*1.8);
   c.shadowColor='#a8f3eb';c.shadowBlur=17;
   rr(c,-r*1.7,-8*unit,r*3.4,16*unit,9,'#fff0b1','#a85b43',4);
   rr(c,-8*unit,-r*1.7,16*unit,r*3.4,9,'#d99d67','#fff2c3',3);
   circle(c,0,0,r*.30,'#fff9d3',2,true);c.restore();
  }else if(layout.moving==='flipper'){
   const y=220+80*Math.sin(s.elapsed*1.3);
   wall(585,y,35,125);
  }else if(layout.moving==='tunnel'){
   const x=px(582),y=py(205);
   rr(c,x,y,53*unit,195*unit,12,'rgba(12,31,55,.82)','#ffc779',5);
   c.font='900 19px Nunito,sans-serif';c.textAlign='center';
   c.fillStyle='#fff4cb';c.fillText('TUNNEL',x+26*unit,y+42);
  }else if(layout.moving==='gate'){
   wall(825,210+75*Math.sin(s.elapsed*1.1),24,140);
  }
  // A little miniature flag, with a *visible black cup* exactly at rule coords.
  const cupX=px(layout.cup[0]),cupY=py(layout.cup[1]);
  c.save();c.shadowColor='#10192e';c.shadowBlur=9;
  circle(c,cupX,cupY,29*unit,'#eddd9f',7);
  circle(c,cupX,cupY,23*unit,'#132a31',1,true);
  circle(c,cupX+3*unit,cupY+5*unit,14*unit,'rgba(1,8,21,.95)',1,true);
  c.restore();
  c.strokeStyle='#fcf9e5';c.lineWidth=4;c.beginPath();
  c.moveTo(cupX,cupY+2);c.lineTo(cupX,cupY-86*unit);c.stroke();
  c.fillStyle='#ffb45d';c.beginPath();
  c.moveTo(cupX,cupY-85*unit);c.lineTo(cupX+62*unit,cupY-70*unit);
  c.lineTo(cupX,cupY-55*unit);c.closePath();c.fill();
  c.textAlign='left';c.font='900 19px Nunito,sans-serif';
  c.fillStyle='#fff4c4';c.fillText('TEE OFF',x+21,y+h+73);
  c.textAlign='right';c.fillText(layout.name.toUpperCase()+' · PAR '+layout.par,x+w-14,y+h+73);
 }
 function marble(c,s,assets,reduce){
  const b=s.ball;if(!b)return;
  const p=s.roster[s.turn]||s.roster.at(-1)||{};
  const x=px(b.x),y=py(b.y),r=21;
  c.save();
  c.fillStyle='rgba(4,20,26,.44)';c.beginPath();c.ellipse(x+6,y+14,r*1.18,r*.36,0,0,TAU);c.fill();
  if(s.phase==='rolling'&&!reduce){
   const x0=x-b.vx*.16*unit,y0=y-b.vy*.16*unit;
   const g=c.createLinearGradient(x0,y0,x,y);
   g.addColorStop(0,'rgba(255,244,196,0)');g.addColorStop(1,'rgba(255,241,181,.59)');
   c.strokeStyle=g;c.lineWidth=14;c.lineCap='round';
   c.beginPath();c.moveTo(x0,y0);c.lineTo(x,y);c.stroke();
  }
  const col=color(p.color);
  const g=c.createRadialGradient(x-9,y-10,0,x+6,y+6,r*1.34);
  g.addColorStop(0,'#fff');g.addColorStop(.17,col);g.addColorStop(.69,col);g.addColorStop(1,'#172c3c');
  circle(c,x,y,r,g,1,true);
  const swirl=assets?.['marble_swirl_'+String((s.turn%12)+1).padStart(2,'0')];
  if(swirl?.complete&&swirl.naturalWidth){
   c.save();c.translate(x,y);c.rotate(s.elapsed*.44);
   c.beginPath();c.arc(0,0,r-1,0,TAU);c.clip();c.globalAlpha=.63;
   c.drawImage(swirl,-r,-r,2*r,2*r);c.restore();
  }
  circle(c,x,y,r-1,'#fff9ec',2);
  c.fillStyle='#fff';c.beginPath();c.ellipse(x-9,y-10,5,3,-.8,0,TAU);c.fill();
  c.restore();
  if(s.phase==='aim'){
   const theta=s.angle*Math.PI/180;
   const length=(150+clamp(s.power,15,100)*3.2)*unit;
   const xx=x+Math.cos(theta)*length,yy=y+Math.sin(theta)*length;
   c.save();c.setLineDash([16,10]);c.lineWidth=5;
   c.strokeStyle='rgba(255,251,213,.87)';c.beginPath();c.moveTo(x+25,y);
   c.lineTo(xx,yy);c.stroke();c.setLineDash([]);
   c.fillStyle='#ffe7a2';c.beginPath();
   c.moveTo(xx+Math.cos(theta)*13,yy+Math.sin(theta)*13);
   c.lineTo(xx-Math.cos(theta)*18-Math.sin(theta)*10,yy-Math.sin(theta)*18+Math.cos(theta)*10);
   c.lineTo(xx-Math.cos(theta)*18+Math.sin(theta)*10,yy-Math.sin(theta)*18-Math.cos(theta)*10);
   c.closePath();c.fill();
   if(s.ghost){
    circle(c,px(s.ghost.x),py(s.ghost.y),23,'rgba(255,249,220,.7)',4);
    sprite(c,assets?.pp_golf_fx_putt,px(s.ghost.x)-75,py(s.ghost.y)-72,150,145,.48);
   }
   c.restore();
  }
 }
 function particles(c,assets,s,reduce){
  if(reduce)return;
  for(const e of (s.events||[]).slice(-18)){
   if(!Number.isFinite(e.time))continue;
   const age=s.elapsed-e.time;if(age<0||age>1.6)continue;
   const type=e.kind,which=type==='holeInOne'?'pp_golf_fx_holeinone':
     type==='cup'?'pp_golf_fx_cup':
     type==='shot'?'pp_golf_fx_putt':
     type==='water'?'pp_golf_fx_ricochet':
     type==='tunnel'?'pp_golf_fx_roll':
     type==='spectatorCheer'?'pp_golf_fx_confetti':null;
   if(!which)continue;
   const x=px(Number(e.x??s.ball.x)),y=py(Number(e.y??s.ball.y));
   const w=type==='holeInOne'?300:173;
   sprite(c,assets?.[which],x-w/2,y-w/2,w,w,(1-age/1.6)*.78);
  }
 }
 function results(c,assets,s){
  if(s.phase!=='results')return;
  const ranking=s.roster.slice().sort((a,b)=>
   (a.holeScores.at(-1)||7)-(b.holeScores.at(-1)||7));
  const win=ranking[0];
  c.save();c.fillStyle='rgba(8,22,32,.64)';c.fillRect(0,333,W,490);
  rr(c,602,433,716,204,29,'rgba(14,48,59,.95)','#ffe6a9',6);
  c.textAlign='center';c.fillStyle='#fff8ce';
  c.font='900 42px Fredoka,sans-serif';c.fillText('HOLE '+s.hole+' · SCORECARD',960,504);
  c.fillStyle='#ffe3a0';c.font='900 70px Fredoka,sans-serif';
  c.fillText(win?.name||'RESULTS',960,586,645);
  sprite(c,assets?.pp_golf_fx_confetti,1140,413,235,218,.61);
  c.restore();
 }
 function hud(s){
  const stage=$('partyStage');
  if(!stage||stage.hidden||stage.dataset.mode!=='golf')return;
  const now=performance.now();if(now-lastHud<105)return;lastHud=now;
  const p=s.roster[s.turn]||s.roster.at(-1);
  const human=!!p&&!p.cpu&&s.phase==='aim';
  $('ppGolfHole').textContent='HOLE '+s.hole+' / '+s.holes;
  $('ppGolfName').textContent=s.layout?.name||'The Warm-Up';
  $('ppGolfPar').textContent='PAR '+(s.layout?.par||2);
  $('ppGolfPhase').textContent=s.phase==='aim'?'LINE UP YOUR SHOT':
    s.phase==='rolling'?'MARBLE ON THE MOVE':
    s.phase==='results'?'HOLE COMPLETE':'CHAMPIONSHIP COMPLETE';
  $('ppGolfClock').textContent=s.phase==='aim'?Math.max(0,Math.ceil(14-s.clock))+'s':'—';
  $('ppGolfPlayer').textContent=p?.name||'Watch the green';
  $('ppGolfStroke').textContent=s.strokes+' / 7';
  $('ppGolfAngle').textContent=(s.angle>0?'+':'')+Math.round(s.angle)+'°';
  $('ppGolfPower').textContent=Math.round(s.power)+'%';
  $('ppGolfPreviewState').textContent=s.ghost?'HINT ON':'HINT OFF';
  $('ppGolfTurn').textContent=(s.turn+1)+' / '+s.roster.length;
  $('ppGolfHazard').textContent=s.layout?.moving?
    s.layout.moving.toUpperCase().replace(/([a-z])([A-Z])/g,'$1 $2'):
    s.layout?.water?.length?'WATER TRAP':s.layout?.walls?.length?'TIGHT WALLS':'OPEN FAIRWAY';
  for(const id of ['ppGolfLeft','ppGolfRight','ppGolfPowerDown','ppGolfPowerUp',
                   'ppGolfPreview','ppGolfShoot'])$(id).disabled=!human;
  $('ppGolfHelp').textContent=human?
    'Adjust aim and power. A hint predicts only the FIRST bounce, never the final shot.':
    s.phase==='rolling'?'Your marble is rolling. Watch for the cup!':'The next player takes their turn.';
  const rank=s.roster.slice().sort((a,b)=>a.strokes-b.strokes||b.wins-a.wins||
    s.roster.indexOf(a)-s.roster.indexOf(b));
  const key=rank.map(q=>q.id+':'+q.strokes+':'+q.holeScores.length).join('|')+'|'+s.hole;
  if(key!==rankKey){
   rankKey=key;const board=$('ppGolfRankRows');board.replaceChildren();
   for(const [i,q] of rank.entries()){
    const row=document.createElement('div');row.className='ppGolfRank';
    row.style.setProperty('--golf-ball',color(q.color));
    const pos=document.createElement('b');pos.textContent=String(i+1).padStart(2,'0');
    const ball=document.createElement('i');
    const name=document.createElement('strong');name.textContent=q.name;
    const score=document.createElement('span');
    score.textContent=q.strokes+' STROKES';
    row.append(pos,ball,name,score);board.appendChild(row);
   }
  }
  holeSeen=s.hole;
 }
 function draw(s,assets,options={}){
  const c=$('partyStageCanvas')?.getContext('2d',{alpha:false});
  if(!c||!s||!s.layout)return false;
  c.save();c.setTransform(1,0,0,1,0,0);
  world(c,assets,s.elapsed||0,s,!!options.reduce);
  track(c,assets,s);
  marble(c,s,assets,!!options.reduce);
  particles(c,assets,s,!!options.reduce);
  results(c,assets,s);
  c.restore();hud(s);return true;
 }
 return Object.freeze({draw});
})();
