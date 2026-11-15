/*
 * MARBLE RUSH — exclusive Party Pack screen compositor (rebuild v3).
 *
 * ONE canvas, ONE active mode, ONE screen owner. No gameplay engine creates a
 * DOM element, canvas, or second render loop. Grand Prix keeps #cv untouched.
 * TV draw modules implement only visual composition for real engine states.
 */
const MarblePartyScreen=(()=>{
  'use strict';
  // Opt-in native-mesh pilot; normal Derby and all other games stay untouched.
  const derby3dReview=typeof location!=='undefined'&&
    new URLSearchParams(location.search).get('derby3d')==='1';
  const drop3dReview=typeof location!=='undefined'&&
    new URLSearchParams(location.search).get('dropzone3d')==='1';
  let drop3dActive=false,drop3dFallback=null,drop3dLostAt=null,drop3dFailureFrames=0;
  // The Crucible is intentionally opt-in until real TV/phone acceptance.
  const brawl3dReview=typeof location!=='undefined'&&
    new URLSearchParams(location.search).get('brawl3d')==='1';
  let brawl3dActive=false,brawl3dFailureFrames=0,brawl3dLostAt=null;
  const definitions=Object.freeze({
    derby:   {renderer:derby3dReview?'derby-webgl-mesh-pilot-v1':'derby-track-v3', panels:['ppTitleArea','ppBoardLabel','ppTicker','ppBetPanel','ppLeaderPanel'],
      draw:(s,assets,options)=>derby3dReview?MarbleDerbyWebGL.draw(s,assets,options):MarblePartyUI.drawDerby(s,assets,options)},
    dropzone:{renderer:drop3dReview?'dropzone-webgl-native-3d-v1':'dropzone-cabinet-v3',
      panels:['ppDropHeader','ppDropPanel','ppDropStandings','ppDropStats'],
      draw:(s,assets,options)=>drop3dActive?
        MarbleDropZoneWebGL.draw(s,assets,options):MarblePartyUI.drawDropZone(s,assets,options)},
    brawl:   {renderer:brawl3dReview?'brawl-the-crucible-native-webgl-v1':'brawl-arena-v3',
      panels:['ppBrawlHeader','ppBrawlStats','ppBrawlPanel','ppBrawlStandings'],
      draw:(s,assets,options)=>brawl3dActive?
        MarbleBrawlWebGL.draw(s,assets,options):MarbleBrawlUI.draw(s,assets,options)},
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
  function currentRenderer(name){
    if(name==='dropzone'&&!drop3dActive)return 'dropzone-cabinet-v3';
    if(name==='brawl'&&!brawl3dActive)return 'brawl-arena-v3';
    return definitions[name]?.renderer||null;
  }
  function show3dFallback(reason){
    if(!stage)return;
    stage.dataset.dropzone3dFallback=reason;
    let notice=document.getElementById('ppDrop3dFallback');
    if(!notice){
      notice=document.createElement('div');
      notice.id='ppDrop3dFallback';
      notice.setAttribute('role','status');
      Object.assign(notice.style,{position:'absolute',zIndex:'5',
        bottom:'4%',left:'35%',maxWidth:'36%',padding:'9px 15px',
        font:'800 15px Nunito,sans-serif',color:'#ffe2a8',
        background:'rgba(7,16,32,.92)',border:'1px solid #cfa775',
        borderRadius:'8px',pointerEvents:'none',textAlign:'center'});
      stage.appendChild(notice);
    }
    notice.textContent='3D preview unavailable — original 2D Drop Zone restored.';
  }
  function fallbackToCanvas2D(reason){
    if(!drop3dActive||active!=='dropzone')return false;
    MarbleDropZoneWebGL.unmount();
    canvas=document.getElementById('partyStageCanvas');
    canvas.hidden=false;
    drop3dActive=false;drop3dFallback=reason;drop3dLostAt=null;
    drop3dFailureFrames=0;
    MarblePartyUI.activate('dropzone',{hudOnly:false});
    stage.dataset.renderer='dropzone-cabinet-v3';
    if(report)report.renderer='dropzone-cabinet-v3';
    show3dFallback(reason);
    return true;
  }
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
    canvas=document.getElementById('partyStageCanvas');
    if(name==='dropzone'){
      drop3dActive=false;drop3dFallback=null;drop3dLostAt=null;drop3dFailureFrames=0;
      stage.removeAttribute('data-dropzone3d-fallback');
      document.getElementById('ppDrop3dFallback')?.remove();
    }
    if(name==='derby'&&derby3dReview){
      MarbleDerbyWebGL.mount(canvas);
      canvas=document.getElementById('partyStageCanvas');
    }
    if(name==='brawl'&&brawl3dReview){
      brawl3dActive=false;brawl3dFailureFrames=0;brawl3dLostAt=null;
      try{MarbleBrawlWebGL.mount(canvas);brawl3dActive=true;}
      catch(error){console.warn('Bowl Brawl 3D fallback:',error.message);}
      canvas=document.getElementById('partyStageCanvas');
    }
    if(name==='dropzone'&&drop3dReview){
      // Preview-only: a device without WebGL must get the entire original
      // Canvas2D game, never a broken lobby or a blank 3D canvas.
      try{
        MarbleDropZoneWebGL.mount(canvas);
        drop3dActive=true;
      }catch(error){
        MarbleDropZoneWebGL.unmount();
        drop3dFallback='gpu-unavailable';
      }
      canvas=document.getElementById('partyStageCanvas');
    }
    const def=definitions[name];
    MarbleSceneCache.keepOnly(name);
    MarblePartyClock.reset();
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
    stage.dataset.renderer=currentRenderer(name);
    stage.removeAttribute('data-brawl3d-fallback');
    if(drop3dFallback)show3dFallback(drop3dFallback);
    canvas.setAttribute('aria-label',labels[name]);
    // Re-entering a game must not re-use a previous match's leaderboard.
    const scoreboard={
      derby:'ppRankRows',dropzone:'ppDropRankRows',brawl:'ppBrawlRankRows',
      curling:'ppCurlRankRows',golf:'ppGolfRankRows'
    }[name];
    document.getElementById(scoreboard)?.replaceChildren();
    if(name==='derby'||name==='dropzone'){
      if(!MarblePartyUI.activate(name,{hudOnly:
        (name==='derby'&&derby3dReview)||(name==='dropzone'&&drop3dActive)}))
        throw Error(name+' illustrator cannot acquire stage');
    }
    report={mode:name,renderer:currentRenderer(name),mountAt:performance.now(),frames:0,
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
    const wasDerby3d=active==='derby'&&derby3dReview;
    const wasDrop3d=active==='dropzone'&&drop3dActive;
    const wasBrawl3d=active==='brawl'&&brawl3dActive;
    active=null;report=null;drop3dActive=false;drop3dLostAt=null;drop3dFailureFrames=0;
    drop3dFallback=null;brawl3dActive=false;brawl3dLostAt=null;brawl3dFailureFrames=0;
    if(wasBrawl3d)MarbleBrawlWebGL.unmount();
    if(wasDerby3d)MarbleDerbyWebGL.unmount();
    if(wasDrop3d)MarbleDropZoneWebGL.unmount();
    if(wasDerby3d||wasDrop3d||wasBrawl3d)
      canvas=document.getElementById('partyStageCanvas');
    if(stage){
      stage.removeAttribute('data-mode');
      stage.removeAttribute('data-owner');
      stage.removeAttribute('data-renderer');
      stage.removeAttribute('data-brawl3d-fallback');
      stage.removeAttribute('data-dropzone3d-fallback');
      document.getElementById('ppDrop3dFallback')?.remove();
    }
    for(const id of allPanels){
      const element=document.getElementById(id);if(element)element.hidden=true;
    }
    if(canvas)canvas.hidden=true;
    MarbleSceneCache.clear();
    if(raceCanvas)raceCanvas.hidden=false;
  }
  function fallbackBrawl(reason){
    if(active!=='brawl'||!brawl3dActive)return false;
    MarbleBrawlWebGL.unmount();
    canvas=document.getElementById('partyStageCanvas');
    canvas.hidden=false;brawl3dActive=false;brawl3dFailureFrames=0;brawl3dLostAt=null;
    stage.dataset.renderer='brawl-arena-v3';
    stage.dataset.brawl3dFallback=reason;
    if(report)report.renderer='brawl-arena-v3';
    console.warn('Bowl Brawl native 3D restored to 2D:',reason);
    return true;
  }
  function render(name,sessionState,assets,options={}){
    if(!isMode(name)||active!==name||!sessionState||!report||
       !stage||stage.hidden||!raceCanvas?.hidden)
      return false;
    if(name==='dropzone'&&drop3dActive){
      const gpu=MarbleDropZoneWebGL.debug();
      if(gpu.contextLost){
        if(drop3dLostAt===null)drop3dLostAt=performance.now();
        if(performance.now()-drop3dLostAt>8000)
          fallbackToCanvas2D('gpu-recovery-timeout');
      }else drop3dLostAt=null;
    }
    if(name==='brawl'&&brawl3dActive){
      const gpu=MarbleBrawlWebGL.debug();
      if(gpu.contextLost){
        if(brawl3dLostAt===null)brawl3dLostAt=performance.now();
        if(performance.now()-brawl3dLostAt>8000)fallbackBrawl('context-timeout');
      }else brawl3dLostAt=null;
    }
    const start=performance.now();
    let success=definitions[name].draw(sessionState,assets,options)===true;
    if(name==='brawl'&&brawl3dActive){
      const lost=MarbleBrawlWebGL.debug().contextLost;
      if(success)brawl3dFailureFrames=0;
      else if(!lost&&++brawl3dFailureFrames>=3){
        fallbackBrawl('render-failure');
        success=definitions[name].draw(sessionState,assets,options)===true;
      }
    }
    if(name==='dropzone'&&drop3dActive){
      const gpuLost=MarbleDropZoneWebGL.debug().contextLost;
      if(success)drop3dFailureFrames=0;
      else if(!gpuLost&&++drop3dFailureFrames>=3){
        fallbackToCanvas2D('gpu-render-failure');
        success=definitions[name].draw(sessionState,assets,options)===true;
      }
    }
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
      renderFailures:r.renderFailures,atmosphereCache:MarbleSceneCache.stats(),active:active===r.mode,
      raceCanvasHidden:!!raceCanvas?.hidden,
      dropzone3dFallback:drop3dFallback,brawl3dFallback:stage?.dataset.brawl3dFallback||null,
      authoritativeClock:MarblePartyClock.stats(),
      graphics:active==='brawl'&&brawl3dActive?MarbleBrawlWebGL.debug():
        active==='derby'&&derby3dReview?MarbleDerbyWebGL.debug():
        active==='dropzone'&&drop3dActive?MarbleDropZoneWebGL.debug():null
    });
  }
  function assertExclusive(){
    if(!active)return !!raceCanvas&&!raceCanvas.hidden;
    const def=definitions[active];
    return !!stage&&!stage.hidden&&canvas&&!canvas.hidden&&raceCanvas.hidden&&
      stage.dataset.mode===active&&stage.dataset.renderer===currentRenderer(active)&&
      document.querySelectorAll('.screen:not([hidden])').length===1&&
      allPanels.every(id=>{
        const element=document.getElementById(id);
        return !!element&&element.hidden===!def.panels.includes(id);
      })&&
      (active!=='brawl'||!brawl3dActive||
       (MarbleBrawlWebGL.active&&MarbleBrawlWebGL.canvas===canvas&&
        MarbleBrawlWebGL.debug().realMeshes))&&
      (active!=='derby'||!derby3dReview||
       (MarbleDerbyWebGL.active&&MarbleDerbyWebGL.canvas===canvas&&
        MarbleDerbyWebGL.debug().realMeshes))&&
      (active!=='dropzone'||!drop3dActive||
       (MarbleDropZoneWebGL.active&&MarbleDropZoneWebGL.canvas===canvas&&
        MarbleDropZoneWebGL.debug().realMeshes));
  }
  return Object.freeze({isMode,mount,unmount,render,telemetry,assertExclusive,
    get active(){return active;},
    get renderer(){return active?currentRenderer(active):null;},
    get nativeDerbyPilot(){return derby3dReview;},
    get retiredHistory(){return history.map(r=>({mode:r.mode,frames:r.frames}));}
  });
})();
