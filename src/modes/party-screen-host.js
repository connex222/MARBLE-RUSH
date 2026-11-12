/*
 * MARBLE RUSH — exclusive Party Pack screen compositor (rebuild v3).
 *
 * ONE canvas, ONE active mode, ONE screen owner. No gameplay engine creates a
 * DOM element, canvas, or second render loop. Grand Prix keeps #cv untouched.
 * TV draw modules implement only visual composition for real engine states.
 */
const MarblePartyScreen=(()=>{
  'use strict';
  const definitions=Object.freeze({
    derby:   {renderer:'derby-track-v3', panels:['ppTitleArea','ppBoardLabel','ppTicker','ppBetPanel','ppLeaderPanel'],
      draw:(s,assets,options)=>MarblePartyUI.drawDerby(s,assets,options)},
    dropzone:{renderer:'dropzone-cabinet-v3', panels:['ppDropHeader','ppDropPanel','ppDropStandings','ppDropStats'],
      draw:(s,assets,options)=>MarblePartyUI.drawDropZone(s,assets,options)},
    brawl:   {renderer:'brawl-arena-v3', panels:['ppBrawlHeader','ppBrawlStats','ppBrawlPanel','ppBrawlStandings'],
      draw:(s,assets,options)=>MarbleBrawlUI.draw(s,assets,options)},
    curling: {renderer:'curling-rink-v3', panels:['ppCurlHud'],
      draw:(s,assets,options)=>MarbleCurlingUI.draw(s,assets,options)},
    golf:    {renderer:'golf-course-v3', panels:['ppGolfHud'],
      draw:(s,assets,options)=>MarbleGolfUI.draw(s,assets,options)}
  });
  const allPanels=Object.freeze(Object.values(definitions).flatMap(d=>d.panels));
  const labels=Object.freeze({
    derby:'Marble Derby · real five-heat racing',
    dropzone:'Drop Zone · live pegs and prize buckets',
    brawl:'Bowl Brawl · real elimination physics and danger',
    curling:'Marble Curling · five-end physical stone game',
    golf:'Marble Golf · five/nine-hole putting with real hazards'
  });
  let active=null,stage=null,canvas=null,raceCanvas=null,report=null;
  const history=[];
  function isMode(name){return Object.prototype.hasOwnProperty.call(definitions,name);}
  function ensure(){
    stage=document.getElementById('partyStage');
    canvas=document.getElementById('partyStageCanvas');
    raceCanvas=document.getElementById('cv');
    if(!stage||!canvas||!raceCanvas||stage.querySelectorAll('canvas').length!==1)
      throw Error('Party screen isolation failed: expected one exclusive stage canvas');
    return true;
  }
  function mount(name){
    if(!isMode(name))throw Error('Unknown Party Pack visual mode: '+name);
    ensure();
    if(active!==null)unmount();
    const def=definitions[name];
    for(const id of allPanels){
      const element=document.getElementById(id);
      if(!element)throw Error('Missing Party Pack panel: '+id);
      element.hidden=!def.panels.includes(id);
    }
    // The old race canvas cannot visually or interactively coexist with
    // the mini-game. It is restored when returning to Grand Prix or lobby.
    raceCanvas.hidden=true;canvas.hidden=false;stage.hidden=false;
    stage.dataset.mode=name;
    stage.dataset.owner='marble-party-screen-v3';
    stage.dataset.renderer=def.renderer;
    canvas.setAttribute('aria-label',labels[name]);
    // Re-entering a game must not re-use a previous match's leaderboard.
    const scoreboard={
      derby:'ppRankRows',dropzone:'ppDropRankRows',brawl:'ppBrawlRankRows',
      curling:'ppCurlRankRows',golf:'ppGolfRankRows'
    }[name];
    document.getElementById(scoreboard)?.replaceChildren();
    if(name==='derby'||name==='dropzone'){
      if(!MarblePartyUI.activate(name))throw Error(name+' illustrator cannot acquire stage');
    }
    report={mode:name,renderer:def.renderer,mountAt:performance.now(),frames:0,
      firstFrameAt:null,lastFrameAt:null,renderMsTotal:0,renderMsMax:0,
      intervals:0,slowIntervals:0,renderFailures:0,
      frameIntervals:[],drawSamples:[]};
    active=name;return true;
  }
  function unmount(){
    if(!active){
      if(stage){stage.removeAttribute('data-mode');
        stage.removeAttribute('data-owner');stage.removeAttribute('data-renderer');}
      if(raceCanvas)raceCanvas.hidden=false;
      return;
    }
    if(report)history.push({...report,unmountAt:performance.now()});
    active=null;report=null;
    if(stage){
      stage.removeAttribute('data-mode');
      stage.removeAttribute('data-owner');
      stage.removeAttribute('data-renderer');
    }
    for(const id of allPanels){
      const element=document.getElementById(id);if(element)element.hidden=true;
    }
    if(canvas)canvas.hidden=true;
    if(raceCanvas)raceCanvas.hidden=false;
  }
  function render(name,sessionState,assets,options={}){
    if(!isMode(name)||active!==name||!sessionState||!report||
       !stage||stage.hidden||!raceCanvas?.hidden)
      return false;
    const start=performance.now();
    const success=definitions[name].draw(sessionState,assets,options)===true;
    const end=performance.now();
    if(!success){report.renderFailures++;return false;}
    report.frames++;
    if(report.firstFrameAt===null)report.firstFrameAt=start;
    if(report.lastFrameAt!==null){
      const interval=start-report.lastFrameAt;
      if(interval>0&&interval<1000){
        report.intervals++;if(interval>33.4)report.slowIntervals++;
        if(report.frameIntervals.length<900)report.frameIntervals.push(interval);
      }
    }
    report.lastFrameAt=start;
    const ms=end-start;
    report.renderMsTotal+=ms;
    if(report.drawSamples.length<900)report.drawSamples.push(ms);
    report.renderMsMax=Math.max(ms,report.renderMsMax);
    return true;
  }
  function telemetry(){
    const r=report||history.at(-1)||null;
    if(!r)return null;
    const seconds=r.lastFrameAt!=null&&r.firstFrameAt!=null?
      (r.lastFrameAt-r.firstFrameAt)/1000:0;
    const percentile=(values,p)=>{
      if(!values?.length)return null;
      const sorted=values.slice().sort((a,b)=>a-b);
      return sorted[Math.min(sorted.length-1,Math.ceil(p*sorted.length)-1)];
    };
    return Object.freeze({
      mode:r.mode,renderer:r.renderer,frames:r.frames,
      observedFps:seconds>0?(r.frames-1)/seconds:0,
      averageDrawMs:r.frames?r.renderMsTotal/r.frames:0,
      worstDrawMs:r.renderMsMax,
      p95FrameIntervalMs:percentile(r.frameIntervals,.95),
      p95DrawMs:percentile(r.drawSamples,.95),
      measurements:r.frameIntervals.length,
      fpsEstimateReliable:r.frameIntervals.length>=40,
      slowFrameShare:r.intervals?
        r.slowIntervals/r.intervals:0,
      renderFailures:r.renderFailures,active:active===r.mode,
      raceCanvasHidden:!!raceCanvas?.hidden
    });
  }
  function assertExclusive(){
    if(!active)return !!raceCanvas&&!raceCanvas.hidden;
    const def=definitions[active];
    return !!stage&&!stage.hidden&&canvas&&!canvas.hidden&&raceCanvas.hidden&&
      stage.dataset.mode===active&&stage.dataset.renderer===def.renderer&&
      document.querySelectorAll('.screen:not([hidden])').length===1&&
      allPanels.every(id=>{
        const element=document.getElementById(id);
        return !!element&&element.hidden===!def.panels.includes(id);
      });
  }
  return Object.freeze({isMode,mount,unmount,render,telemetry,assertExclusive,
    get active(){return active;},
    get renderer(){return active?definitions[active].renderer:null;},
    get retiredHistory(){return history.map(r=>({mode:r.mode,frames:r.frames}));}
  });
})();
