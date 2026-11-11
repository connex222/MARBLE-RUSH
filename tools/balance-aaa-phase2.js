/* MARBLE RUSH Phase 2 balance exploratory CPU tournament.
   Reports results; no randomised outcomes outside seeded engines. */
'use strict';
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx=vm.createContext({});for(const f of ['registry','session','geometry','attract','bots','grandprix','derby','dropzone','brawl','curling','golf'])
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/modes',f+'.js'),'utf8'),ctx,{filename:f+'.js'});
const engines={derby:vm.runInContext('MarbleDerby',ctx),dropzone:vm.runInContext('DropZone',ctx),
 brawl:vm.runInContext('BowlBrawl',ctx),curling:vm.runInContext('MarbleCurling',ctx),golf:vm.runInContext('MarbleGolf',ctx)};
const levels=['easy','normal','hard'];
const report={};
for(const [mode,engine] of Object.entries(engines)) {
 const wins={easy:0,normal:0,hard:0},scoreSamples={easy:[],normal:[],hard:[]};
 let maxSeconds=0;
 for(let seed=1;seed<=30;seed++){
  const roster=levels.map((difficulty,i)=>({id:difficulty,name:difficulty,cpu:true,difficulty}));
  const g=engine.create(roster,seed,()=>{},mode==='golf'?{championship:true}:undefined);
  let steps=0;
  while(!g.state.done&&steps++<140000)(g.step||g.tick)(.1);
  if(!g.state.done)throw Error(mode+' timeout at seed '+seed);
  maxSeconds=Math.max(maxSeconds,steps*.1);
  const sort=g.standings(),winner=sort[0].id;wins[winner]++;
  for(const p of g.state.roster)scoreSamples[p.id].push(p.gems??p.score??p.points??p.strokes);
 }
 const mean=a=>+(a.reduce((x,y)=>x+y,0)/a.length).toFixed(1);
 report[mode]={wins,meanScore:Object.fromEntries(levels.map(level=>[level,mean(scoreSamples[level])])),maxSimulatedSeconds:+maxSeconds.toFixed(1)};
 console.log(mode.toUpperCase()+' '+JSON.stringify(report[mode]));
}
fs.writeFileSync(path.join(__dirname,'..','phase2-balance-results.json'),JSON.stringify(report,null,2)+'\n');
console.log('Exploratory only; player skill balance requires real-device acceptance.');
