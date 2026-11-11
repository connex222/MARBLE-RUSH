'use strict';
const assert=require('node:assert/strict');
const Present=require('../src/modes/party-presentation.js');
const modes=['derby','dropzone','brawl','curling','golf'];
for(const m of modes){
  const t=Present.theme(m);assert.ok(t?.name&&t?.accent&&t?.subtitle);
}
assert.equal(Present.theme('grandprix'),null);
const players=[
  {id:'a',name:'Alice',points:10,wins:1,color:'#ff3344'},
  {id:'b',name:'Bob',points:8,wins:2,color:'#44ccff'},
  {id:'c',name:'Carol',points:6,wins:0,color:'#ffe166'}
];
const old=JSON.stringify(players);
assert.deepEqual(Present.podium(players).map(p=>p?.id),['b','a','c']);
assert.deepEqual(Present.podium([players[0]]).map(p=>p?.id||null),[null,'a',null]);
assert.equal(JSON.stringify(players),old,'Rendering must never mutate player simulation');
assert.equal(Present.applyFinale(null,'derby',players),false);
assert.equal(Present.theme('grandprix'),null);
console.log('PASS: five themes, independent podium, no physics mutation, Grand Prix isolation');
