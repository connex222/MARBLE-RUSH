/* MARBLE RUSH Phase 3 — Party Pack finale. Presentation only. */
'use strict';
const PartyPresentation=(()=>{
  const THEMES=Object.freeze({
    derby:{name:'MARBLE DERBY',subtitle:'THE FINISH LINE',accent:'#ffbd63'},
    dropzone:{name:'DROP ZONE',subtitle:'THE JACKPOT PODIUM',accent:'#ffc94a'},
    brawl:{name:'BOWL BRAWL',subtitle:'THE LAST MARBLE STANDING',accent:'#ff729d'},
    curling:{name:'MARBLE CURLING',subtitle:'THE ICE CHAMPIONS',accent:'#92e7ff'},
    golf:{name:'MARBLE GOLF',subtitle:'THE CLUB CHAMPIONS',accent:'#b2f18b'}
  });
  function theme(m){return THEMES[m]||null;}
  function podium(players){
    const ordered=[...players].filter(p=>p&&p.id!==undefined)
      .sort((a,b)=>(Number(b.points)||0)-(Number(a.points)||0)
        ||(Number(b.wins)||0)-(Number(a.wins)||0)
        ||String(a.id).localeCompare(String(b.id)));
    return [ordered[1]||null,ordered[0]||null,ordered[2]||null];
  }
  function clear(root){
    if(!root)return;
    delete root.dataset.partyVisual;
    const stage=root.querySelector('#partyFinaleStage');
    if(stage)stage.hidden=true;
  }
  function applyFinale(root,mode,players,reduced=false){
    const t=theme(mode);
    if(!root||!t)return false;
    root.dataset.partyVisual=mode;
    root.style.setProperty('--party-accent',t.accent);
    const stage=root.querySelector('#partyFinaleStage');
    if(!stage)return false;
    stage.hidden=false;stage.dataset.reduce=reduced?'true':'false';
    stage.style.backgroundImage="linear-gradient(180deg,rgba(9,11,38,.28),rgba(10,12,40,.88)),url('assets/img/pp_"+mode+"_bg.webp')";
    stage.querySelector('.partyStageMode').textContent=t.name;
    stage.querySelector('.partyStageSubtitle').textContent=t.subtitle;
    const slots=stage.querySelectorAll('.partyPodiumSlot');
    podium(players).forEach((p,i)=>{
      const slot=slots[i];if(!slot)return;
      slot.hidden=!p;if(!p)return;
      slot.style.setProperty('--slot-colour',/^#[a-f0-9]{3,8}$/i.test(p.color||'')?p.color:'#ffd269');
      slot.querySelector('.partyPodiumName').textContent=String(p.name||'Racer').slice(0,24);
      slot.querySelector('.partyPodiumScore').textContent=(Number(p.points)||0)+' PTS';
    });
    return true;
  }
  return Object.freeze({theme,podium,clear,applyFinale});
})();
if(typeof module!=='undefined')module.exports=PartyPresentation;
