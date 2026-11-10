/* Marble Rush Party Pack: 15-second CPU attract previews. Code-drawn until Phase 8 art.
 * Preview only; never advances the real World, scores or mode availability.
 */
const PartyAttract = (() => {
  'use strict';
  const names = {
    grandprix:'Grand Prix', derby:'Marble Derby',dropzone:'Drop Zone',
    brawl:'Bowl Brawl',curling:'Marble Curling',golf:'Marble Golf'
  };
  const colours=['#ff3b5c','#ffd23f','#4cc9f0','#3ddc97','#ff8a3d','#d9a2ff'];
  const maxSeconds=15;
  function orb(ctx,x,y,r,col){
    ctx.save();ctx.translate(x,y);
    const gradient=ctx.createRadialGradient(-r*.4,-r*.5,r*.1,0,0,r);
    gradient.addColorStop(0,'#fff9de');gradient.addColorStop(.22,col);
    gradient.addColorStop(1,'#16163e');
    ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=2;ctx.stroke();ctx.restore();
  }
  function preview(ctx,mode,seconds,width=620,height=360){
    const w=width,h=height,t=seconds;
    ctx.clearRect(0,0,w,h);
    const bg=ctx.createLinearGradient(0,0,w,h);
    bg.addColorStop(0,'#22275a');bg.addColorStop(1,'#0e132e');
    ctx.fillStyle=bg;ctx.fillRect(0,0,w,h);
    ctx.lineWidth=8;ctx.strokeStyle='#be9d50';ctx.lineCap='round';
    const line=(x1,y1,x2,y2)=>{
      ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();
    };
    if(mode==='grandprix'||mode==='derby'){
      ctx.strokeStyle='#c79450';
      for(let i=0;i<3;i++){
        ctx.beginPath();
        ctx.moveTo(12,128+i*57);
        ctx.bezierCurveTo(180,25+i*55,410,300+i*32,610,110+i*55);
        ctx.stroke();
      }
      for(let i=0;i<5;i++){
        const phase=(t*(mode==='derby'?55:75)+i*90)%700;
        const x=phase-50;
        const y=130+i%3*56+35*Math.sin(x/100);
        orb(ctx,x,y,18,colours[i]);
      }
    } else if(mode==='dropzone'){
      ctx.strokeStyle='#dfb35f';ctx.strokeRect(85,30,450,300);
      for(let y=70;y<265;y+=35)for(let x=135+(Math.floor(y/35)%2)*16;x<505;x+=35)
        orb(ctx,x,y,5,'#ffe49a');
      for(let i=0;i<6;i++){
        const x=120+i*70+18*Math.sin(t*3+i*2);
        const y=45+((t*85+i*41)%250);
        orb(ctx,x,y,14,colours[i]);
      }
      for(let i=0;i<7;i++)line(90+i*64,307,90+i*64,325);
    } else if(mode==='brawl'){
      ctx.beginPath();ctx.ellipse(w/2,190,260,125,0,0,Math.PI*2);
      ctx.fillStyle='#8b6282';ctx.fill();ctx.stroke();
      for(let i=0;i<6;i++){
        const angle=t*(.35+i*.06)+i*Math.PI/3;
        orb(ctx,w/2+170*Math.sin(angle),190+73*Math.cos(angle),21,colours[i]);
      }
    } else if(mode==='curling'){
      line(30,245,585,245);line(30,298,585,298);
      for(let i=3;i>=1;i--){
        ctx.strokeStyle=['#f66','#fff','#59d'][i-1];
        ctx.lineWidth=10;ctx.beginPath();ctx.ellipse(507,269,i*32,i*14,0,0,Math.PI*2);ctx.stroke();
      }
      for(let i=0;i<4;i++){
        const x=55+Math.min(440,Math.pow(Math.min(1,(t+i*.5)/6),.7)*440);
        orb(ctx,x,269+i%2*8,17,colours[i]);
      }
    } else if(mode==='golf'){
      ctx.strokeStyle='#57b38e';ctx.lineWidth=16;
      line(25,275,190,275);line(245,280,540,280);
      ctx.beginPath();ctx.arc(220,245,32,0,Math.PI*2);ctx.stroke();
      ctx.fillStyle='#101326';ctx.beginPath();ctx.ellipse(530,280,25,7,0,0,Math.PI*2);ctx.fill();
      for(let i=0;i<3;i++){
        const p=(t*.19+i*.28)%1;
        orb(ctx,30+p*500,268-Math.max(0,70*Math.sin(p*Math.PI*2)),17,colours[i]);
      }
    }
    ctx.fillStyle='#fff4e0';ctx.textAlign='left';
    ctx.font='bold 29px Fredoka, sans-serif';ctx.fillText(names[mode]||'Party Pack',25,40);
    ctx.font='bold 17px Nunito, sans-serif';
    ctx.fillStyle='#ffd23f';ctx.fillText('CPU preview · '+Math.max(0,Math.ceil(maxSeconds-t))+'s',25,h-20);
  }
  return Object.freeze({preview,maxSeconds,names});
})();
if(typeof module!=='undefined')module.exports=PartyAttract;
