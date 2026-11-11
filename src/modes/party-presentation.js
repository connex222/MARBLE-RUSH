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

  const CSS=String.raw`
/* Party Pack finale only. Grand Prix retains its original presentation. */
section[data-screen="finale"][data-party-visual]{background:radial-gradient(ellipse at 34% 50%,#233763,#0b1029 67%)}
section[data-screen="finale"][data-party-visual]>.panel{
 left:73%;top:49%;width:39%;max-width:none;padding:2.2%;
 transform:translate(-50%,-50%);border-color:var(--party-accent);
 background:rgba(8,13,36,.95);box-shadow:0 30px 90px #000b
}
section[data-screen="finale"][data-party-visual]>.panel h2{font-size:calc(56*var(--u))}
section[data-screen="finale"][data-party-visual] .champLine{font-size:calc(64*var(--u));overflow-wrap:anywhere}
#partyFinaleStage{
 position:absolute;left:2.6%;top:10%;width:51%;height:78%;
 border:calc(7*var(--u)) solid var(--party-accent);border-radius:calc(45*var(--u));
 background-size:cover;background-position:center;box-shadow:0 24px 70px #000b;
 overflow:hidden;pointer-events:none;
}
#partyFinaleStage:before{content:"";position:absolute;inset:0;
 background:linear-gradient(180deg,#080f34ba 0%,transparent 36%,#070b24e8 100%)}
.mrpHeader{position:absolute;top:6%;width:100%;text-align:center;text-shadow:0 4px 10px #000}
.mrpHeader strong{display:block;font:700 calc(58*var(--u)) Fredoka,sans-serif;color:white}
.mrpHeader span{display:block;font:900 calc(29*var(--u)) Nunito,sans-serif;color:#fff2ae}
.mrpPodium{position:absolute;bottom:5%;left:5%;width:90%;height:62%;
 display:flex;align-items:end;justify-content:center;gap:1.5%}
.partyPodiumSlot{width:32%;display:flex;align-items:center;flex-direction:column;justify-content:end;height:71%;
 filter:drop-shadow(0 13px 20px #000a)}
.partyPodiumSlot[data-place="1"]{height:100%}
.partyPodiumSlot[data-place="3"]{height:62%}
.mrpBall{width:calc(120*var(--u));height:calc(120*var(--u));border-radius:50%;
 background:radial-gradient(circle at 32% 22%,white 2%,var(--slot-colour) 32%,#1c284d 84%,#080e22);
 border:calc(4*var(--u)) solid #fff8d9;
 box-shadow:inset calc(-14*var(--u)) calc(-14*var(--u)) calc(16*var(--u)) #0008,0 10px 25px #000b,0 0 28px var(--slot-colour)}
.mrpName{font:700 calc(30*var(--u)) Fredoka,sans-serif;color:white;max-width:100%;
 overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:calc(12*var(--u)) 0}
.mrpBase{width:100%;height:calc(115*var(--u));flex-shrink:0;
 display:flex;align-items:center;justify-content:center;flex-direction:column;
 border:calc(5*var(--u)) solid #fff4bf;border-radius:calc(17*var(--u));
 background:linear-gradient(125deg,#483347,#a47648 40%,#26243c);
 box-shadow:inset 0 7px 10px #fffa,0 14px 0 #13152a}
[data-place="1"] .mrpBase{height:calc(160*var(--u));background:linear-gradient(110deg,#8d5c28,#ffe49b 40%,#a96922)}
.mrpPlace{font:800 calc(42*var(--u)) Fredoka,sans-serif;color:#fff5d0}
.mrpScore{font:800 calc(28*var(--u)) Nunito,sans-serif;color:white}
.mrpConfetti{position:absolute;left:24%;top:17%;width:52%;height:43%;
 background:url("assets/img/pp_shared_fx_confetti.webp") center / contain no-repeat;
 animation:mrpGlitter 2.2s ease-in-out infinite alternate;opacity:.64}
@keyframes mrpGlitter{from{opacity:.23;transform:translateY(15px)}to{opacity:.7;transform:translateY(-10px)}}
#partyFinaleStage[data-reduce="true"] .mrpConfetti{animation:none;opacity:.26}
#partySceneReveal{position:fixed;inset:0;z-index:9;pointer-events:none;
 background:radial-gradient(ellipse,#ffe5a088,transparent 61%);opacity:0;visibility:hidden}
#partySceneReveal.mrpActive{visibility:visible;animation:mrpReveal .65s ease-out forwards}
@keyframes mrpReveal{from{opacity:.7;transform:scale(1.04)}to{opacity:0;transform:scale(1)}}
@media(prefers-reduced-motion:reduce){#partySceneReveal.mrpActive{animation:none;opacity:0}}
`;
  function install(root){
    if(typeof document==='undefined'||!root)return null;
    if(!document.getElementById('partyPresentationCSS')){
      const st=document.createElement('style');st.id='partyPresentationCSS';st.textContent=CSS;
      document.head.appendChild(st);
    }
    let stage=root.querySelector('#partyFinaleStage');
    if(!stage){
      stage=document.createElement('div');stage.id='partyFinaleStage';stage.hidden=true;
      stage.setAttribute('aria-label','Party Pack winners podium');
      stage.innerHTML='<div class="mrpConfetti" aria-hidden="true"></div>'+
        '<div class="mrpHeader"><strong></strong><span></span></div>'+
        '<div class="mrpPodium">'+
        [2,1,3].map(n=>'<div class="partyPodiumSlot" data-place="'+n+'">'+
          '<div class="mrpBall"></div><div class="mrpName"></div>'+
          '<div class="mrpBase"><span class="mrpPlace">'+n+(n===1?'st':n===2?'nd':'rd')+
          '</span><span class="mrpScore"></span></div></div>').join('')+'</div>';
      root.insertBefore(stage,root.firstChild);
    }
    return stage;
  }
  function enter(mode,reduced=false){
    if(typeof document==='undefined'||!theme(mode))return;
    let node=document.getElementById('partySceneReveal');
    if(!node){node=document.createElement('div');node.id='partySceneReveal';node.setAttribute('aria-hidden','true');document.body.appendChild(node);}
    node.classList.remove('mrpActive');
    const noMotion=reduced||(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if(!noMotion){void node.offsetWidth;node.classList.add('mrpActive');}
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
    const stage=install(root);
    if(!stage)return false;
    stage.hidden=false;stage.dataset.reduce=reduced?'true':'false';
    stage.style.backgroundImage="linear-gradient(180deg,rgba(9,11,38,.28),rgba(10,12,40,.88)),url('assets/img/pp_"+mode+"_bg.webp')";
    stage.querySelector('.mrpHeader strong').textContent=t.name;
    stage.querySelector('.mrpHeader span').textContent=t.subtitle;
    const slots=stage.querySelectorAll('.partyPodiumSlot');
    podium(players).forEach((p,i)=>{
      const slot=slots[i];if(!slot)return;
      slot.hidden=!p;if(!p)return;
      slot.style.setProperty('--slot-colour',/^#[a-f0-9]{3,8}$/i.test(p.color||'')?p.color:'#ffd269');
      slot.querySelector('.mrpName').textContent=String(p.name||'Racer').slice(0,24);
      slot.querySelector('.mrpScore').textContent=(Number(p.points)||0)+' PTS';
    });
    return true;
  }
  return Object.freeze({theme,podium,clear,applyFinale,enter,install});
})();
if(typeof module!=='undefined')module.exports=PartyPresentation;
