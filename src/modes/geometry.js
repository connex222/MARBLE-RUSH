/* MARBLE RUSH — Party Pack obstacle geometry, deterministic and DOM-free.
 * These geometry constructors are inert until a mode adds its own update/collision.
 * Coordinates are 1920x1080 design space and measured in engine pixels.
 */
const PartyGeometry = (() => {
  'use strict';
  const finite = n => typeof n === 'number' && Number.isFinite(n);
  const at = (x,y) => { if (!finite(x)||!finite(y)) throw Error('Invalid geometry coordinates'); return {x,y}; };
  const radius = r => { if (!finite(r)||r<=0) throw Error('Invalid radius'); return r; };
  const clamp = (n,a,b) => Math.max(a,Math.min(b,n));
  function pegs(x,y,cols,rows,dx,dy,r=9) {
    at(x,y); radius(r); radius(dx); radius(dy);
    if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<1||rows<1||cols*rows>2000) throw Error('Invalid peg grid');
    const out=[];
    for(let row=0;row<rows;row++) for(let col=0;col<cols;col++)
      out.push({type:'peg',x:x+(col+(row%2)*0.5)*dx,y:y+row*dy,r,restitution:0.55});
    return out;
  }
  function spinner(x,y,r=36,arms=3,radiansPerSecond=1.3) {
    at(x,y); radius(r); if(!Number.isInteger(arms)||arms<2||arms>12||!finite(radiansPerSecond))throw Error('Invalid spinner');
    return {type:'spinner',x,y,r,arms,radiansPerSecond,phase:0};
  }
  function bucket(x,y,width,height,points) {
    at(x,y); radius(width); radius(height);
    if(!Number.isFinite(points)||points<0)throw Error('Invalid bucket points');
    return {type:'bucket',x,y,width,height,points,dwell:0.4};
  }
  function inBucket(b,x,y) {return x>=b.x-b.width/2&&x<=b.x+b.width/2&&y>=b.y&&y<=b.y+b.height;}
  function movingGate(x,y,width,range,period=3) {
    at(x,y);radius(width);if(!finite(range)||range<0)throw Error('Invalid gate range');radius(period);
    return {type:'movingGate',x,y,width,range,period};
  }
  function gatePosition(g,time) {
    if(!finite(time))throw Error('Invalid time');
    return g.x+g.range*Math.sin(2*Math.PI*time/g.period);
  }
  function targetRing(x,y,r) {at(x,y);radius(r);return {type:'targetRing',x,y,r};}
  function inRing(t,x,y) {return Math.hypot(x-t.x,y-t.y)<=t.r;}
  function cup(x,y,width=43,maxSpeed=900) {
    at(x,y);radius(width);radius(maxSpeed);return {type:'cup',x,y,width,maxSpeed};
  }
  function inCup(c,x,speed) {return Math.abs(x-c.x)<=c.width/2 && Math.abs(speed)<c.maxSpeed;}
  function water(x,y,width,height) {at(x,y);radius(width);radius(height);return {type:'water',x,y,width,height};}
  function inWater(w,x,y) {return x>=w.x-w.width/2&&x<=w.x+w.width/2&&y>=w.y-w.height/2&&y<=w.y+w.height/2;}
  function retractRim(x,y,initialRadius,start=15,end=75,minRadius=110) {
    at(x,y);radius(initialRadius);radius(minRadius);
    if(minRadius>initialRadius||!finite(start)||!finite(end)||end<=start)throw Error('Invalid shrinking arena');
    return {type:'retractRim',x,y,initialRadius,start,end,minRadius};
  }
  function rimAt(r,time) {if(!finite(time))throw Error('Invalid time');return r.initialRadius-(r.initialRadius-r.minRadius)*clamp((time-r.start)/(r.end-r.start),0,1);}
  return Object.freeze({pegs,spinner,bucket,inBucket,movingGate,gatePosition,targetRing,inRing,cup,inCup,water,inWater,retractRim,rimAt});
})();
if(typeof module!=='undefined')module.exports=PartyGeometry;
