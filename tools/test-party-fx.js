'use strict';
const assert=require('node:assert/strict');
const PartyFX=require('../src/modes/party-fx.js');
function ctx(){
 const o={canvas:{width:1920,height:1080},globalAlpha:1};
 for(const k of ['save','restore','scale','translate','beginPath','arc','fill','stroke','moveTo','lineTo','drawImage'])o[k]=()=>{};
 o.createRadialGradient=()=>({addColorStop:()=>{}});
 return o;
}
const cases={
 derby:{kind:'photoFinish',time:4.8,winner:2},
 dropzone:{kind:'jackpot',time:4.8,x:420,y:640},
 brawl:{kind:'hit',time:4.8,x:20,y:-40,impact:180},
 curling:{kind:'measurement',time:4.8,x:360,y:270},
 golf:{kind:'holeInOne',time:4.8,x:500,y:210}
};
for(const [mode,e] of Object.entries(cases)){
 const state={events:[e],elapsed:5,time:5};
 const before=JSON.stringify(state);
 assert.equal(PartyFX.draw(ctx(),mode,state,5),1,mode+' event should render');
 assert.equal(PartyFX.draw(ctx(),mode,state,5,true),1,mode+' reduced-motion event should render');
 assert.equal(PartyFX.draw(ctx(),mode,state,7),0,mode+' must not replay stale events');
 assert.equal(PartyFX.draw(ctx(),mode,state,-1),0,mode+' must not draw future events');
 assert.equal(JSON.stringify(state),before,mode+' renderer must not mutate physics state');
 assert.equal(PartyFX.draw(ctx(),mode,{events:[]},5),0);
}
assert.equal(PartyFX.draw(ctx(),'grandprix',{events:[]},5),0);
console.log('PASS: five game effects, no physics mutation, motion reduction, expiry, no-asset fallback');
