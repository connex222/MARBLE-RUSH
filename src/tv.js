/* ==========================================================================
   MARBLE RUSH — TV client (v0.1)
   Rendering, camera, audio, networking, game flow and HUD.
   ========================================================================== */
(() => {
  'use strict';
  const { C, TRACKS, TRACK_INFO, World, POINTS, rng, giveAwards } = MR;

  /* ---------- Tokens & swirls (Section 8.5 / 9.3) ---------- */
  const TOKENS = [
    { c: '#FF3B5C', s: 'circle' }, { c: '#4CC9F0', s: 'square' }, { c: '#FFD23F', s: 'triangle' },
    { c: '#3DDC97', s: 'star' }, { c: '#FF5FA2', s: 'heart' }, { c: '#8B5CF6', s: 'diamond' },
    { c: '#FF8A3D', s: 'hexagon' }, { c: '#F5F5F5', s: 'cross' },
  ];
  const SWIRLS = [
    ['#f4eefc', '#FF3B5C', '#ffffff'], ['#0b3d91', '#ffffff', '#4CC9F0'], ['#e9a100', '#ffe08a', '#fff4c2'],
    ['#d9fbe9', '#3DDC97', '#FFF4E0'], ['#2a145e', '#8B5CF6', '#ffffff'], ['#ffd0e6', '#FF5FA2', '#ffffff'],
    ['#ff8a3d', '#ffd23f', '#ff3b5c'], ['#30366e', '#4CC9F0', '#FF5FA2'], ['#d8f1ff', '#4CC9F0', '#ffffff'],
    ['#ffd23f', '#ff8a3d', '#fff4c2'], ['#e6f4ff', '#8fd0ff', '#ffffff'], ['#16161f', '#FFC83D', '#7b6630'],
  ];
  const THEMES = {
    toybox: { card: '#E07A2E', bg: ['#1b1446', '#14163A', '#0F1130'], glow: 'rgba(255,200,61,0.22)', bokeh: ['#FFC83D', '#FF8A3D', '#FF5FA2', '#4CC9F0'],
      main: '#B97A41', hi: '#F1C68C', wall: ['#D9483B', '#FF8A75'], bowl: ['#9A5C2C', '#D99B5E'], post: ['#6b4424', '#8a5a30'],
      slow: ['#5a2e1a', '#8a5034'], deco: 'blocks', bump: ['#ff8aa0', '#FF3B5C', '#a3132e'], plank: ['#B97A41', '#F1C68C'], icon: '🧸' },
    candy: { card: '#E0457F', bg: ['#3a1240', '#2a0f3a', '#170a24'], glow: 'rgba(255,95,162,0.25)', bokeh: ['#FF5FA2', '#FFD23F', '#3DDC97', '#ffffff'],
      main: '#FFF4F0', stripe: '#FF3B5C', hi: '#ffffff', wall: ['#8B5CF6', '#C4A8FF'], bowl: ['#FF5FA2', '#FFB3D6'], post: ['#c98a5a', '#e8b48a'],
      slow: ['#5a2e1a', '#9a5a38'], deco: 'lollies', bump: ['#e4fff1', '#3DDC97', '#14825a'], plank: ['#FFD23F', '#fff2b0'], icon: '🍭' },
    ice: { card: '#2F7DB8', bg: ['#0f2d55', '#0a1a38', '#06102a'], glow: 'rgba(159,216,255,0.22)', bokeh: ['#cfeeff', '#9fd8ff', '#ffffff', '#8B5CF6'],
      main: 'rgba(160,220,255,0.92)', hi: '#ffffff', wall: ['#4CC9F0', '#c8f1ff'], bowl: ['#7fb8e6', '#e0f4ff'], post: ['#4f7fa8', '#8fc4ec'],
      slow: ['#e8f4ff', '#ffffff'], deco: 'flakes', bump: ['#ffffff', '#9fd8ff', '#3d8ec4'], plank: ['#cfeeff', '#ffffff'], icon: '❄️' },
    space: { card: '#7048D8', bg: ['#160c38', '#0a0820', '#04030f'], glow: 'rgba(139,92,246,0.25)', bokeh: ['#8B5CF6', '#4CC9F0', '#FF5FA2', '#ffffff'],
      main: '#9aa5b8', hi: '#e6ecf5', strip: '#4CC9F0', wall: ['#FF8A3D', '#FFD0A8'], bowl: ['#3b3f63', '#8f95c0'], post: ['#454b6b', '#6b7296'],
      slow: ['#2a2450', '#5a4f9a'], deco: 'planets', bump: ['#b8aa9a', '#857767', '#4a4038'], plank: ['#9aa5b8', '#e6ecf5'], icon: '🪐' },
    jungle: { card: '#2E9D5B', bg: ['#123f2c', '#0b2a20', '#061a14'], glow: 'rgba(190,255,140,0.18)', bokeh: ['#A3E635', '#3DDC97', '#FFD23F', '#ffffff'],
      main: '#9bbf4a', hi: '#e6f7a8', wall: ['#7a5230', '#b07a4a'], bowl: ['#5b7a2a', '#a6c46a'], post: ['#4a3420', '#6d4c2e'],
      slow: ['#5a3d22', '#8a6040'], deco: 'leaves', bump: ['#ffe2a0', '#FF8A3D', '#a8481a'], plank: ['#9bbf4a', '#e6f7a8'], icon: '🌴' },
    seaside: { card: '#2F9CC4', bg: ['#2c2466', '#8a3f6e', '#1b1440'], glow: 'rgba(255,170,90,0.32)', bokeh: ['#FFD23F', '#FF8A3D', '#4CC9F0', '#ffffff'],
      main: '#d9b07a', hi: '#fff0d0', wall: ['#2F9CC4', '#a8e6ff'], bowl: ['#e2bf80', '#fff3d4'], post: ['#7a5a3a', '#a07a52'],
      slow: ['#e8c98a', '#fff3d4'], deco: 'balls', bump: ['#ffffff', '#FF3B5C', '#b8122e'], plank: ['#d9b07a', '#fff0d0'], icon: '🏖️' },
    clockwork: { card: '#B8862E', bg: ['#2e1d10', '#1c120a', '#0e0905'], glow: 'rgba(255,190,90,0.26)', bokeh: ['#FFC83D', '#FF8A3D', '#e6ecf5', '#c9963a'],
      main: '#c9963a', hi: '#ffe3a0', wall: ['#7a4a2a', '#c48a5a'], bowl: ['#8a6a3a', '#d9b878'], post: ['#4a3a2a', '#6a5440'],
      slow: ['#3a2a1e', '#6a5038'], deco: 'gears', bump: ['#e6ecf5', '#9aa5b8', '#4a5268'], plank: ['#c9963a', '#ffe3a0'], icon: '⚙️' },
  };
  const theme = () => THEMES[(world && world.t.meta.theme) || 'toybox'] || THEMES.toybox;
  const NOTE_COLORS = ['#FF3B5C', '#FF8A3D', '#FFD23F', '#3DDC97', '#4CC9F0', '#5B7CFA', '#8B5CF6', '#FF5FA2'];
  const ITEM_ICON = { turbo: '🌪️', jelly: '🟢', oil: '🛢️', big: '⚫', bubble: '🫧' };
  const ITEM_NAME = { turbo: 'Turbo Tornado', jelly: 'Sticky Jelly', oil: 'Oil Slick', big: 'Big Bertha', bubble: 'Bubble Shield' };
  const KEYSETS = [
    { press: 'Space', item: 'KeyX', label: 'Space · X' },
    { press: 'Enter', item: 'ShiftRight', label: 'Enter · R-Shift' },
    { press: 'KeyA', item: 'KeyS', label: 'A · S' },
    { press: 'KeyL', item: 'KeyK', label: 'L · K' },
  ];
  const CPU_NAMES = ['Clackbot', 'Rolly', 'Marbo', 'Glassie', 'Pebble', 'Bonk', 'Swirly', 'Zoomer'];

  /* ---------- Settings ---------- */
  const settings = Object.assign(
    { items: true, catchup: true, music: true, sfx: true, fx: 'auto', reduce: false, cup: 4 },
    load('mr_settings') || {}
  );
  function load(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage off */ } }

  /* ---------- DOM ---------- */
  const $ = s => document.querySelector(s);
  const cv = $('#cv'), ctx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1, S = 1;
  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = cv.width = Math.round(innerWidth * DPR);
    H = cv.height = Math.round(innerHeight * DPR);
    S = Math.min(W / 1920, H / 1080);
    document.documentElement.style.setProperty('--u', (Math.min(innerWidth / 1920, innerHeight / 1080)) + 'px');
  }
  addEventListener('resize', resize); resize();

  /* ---------- Assets (manifest written by the build; optional) ---------- */
  const IMG = {};
  const SND = {};
  fetch('assets/manifest.json').then(r => r.ok ? r.json() : null).then(man => {
    if (!man) return;
    (man.images || []).forEach(o => {
      const im = new Image();
      im.onload = () => {
        IMG[o.k] = im;
        if (o.k.startsWith('party_thumb_') || o.k.startsWith('party_card_')) applyPartyArt();
        if (o.k === 'logo_marblerush') {
          for (const logo of document.querySelectorAll('.logo')) {
            if (logo.classList.contains('asset-logo')) continue;
            const artwork = document.createElement('img');
            artwork.src = im.src; artwork.alt = 'Marble Rush';
            logo.appendChild(artwork);
            logo.classList.add('asset-logo');
          }
        }
      };
      im.src = `assets/img/${o.f}`;
    });
    (man.audio || []).forEach(o => { SND[o.k] = `assets/audio/${o.f}`; });
    Audio_.loadFiles();
  }).catch(() => { /* no assets yet — everything is code-drawn */ });

  // Approved ChatGPT artwork is applied only when built into the local asset manifest.
  // The game still works with code-drawn fallback cards when art has not been uploaded.
  const PARTY_ART_MODES = ['grandprix','derby','dropzone','brawl','curling','golf'];
  function applyPartyArt() {
    for (const id of PARTY_ART_MODES) {
      const card=document.querySelector('.partyModeCard[data-mode="'+id+'"]');
      const im=IMG['party_thumb_'+id];
      if (!card || !im) continue;
      card.style.setProperty('--party-thumb','url("'+im.src+'")');
      card.classList.add('has-art');
    }
    const banner=IMG.party_header;
    const heading=document.querySelector('#partyPicker h2');
    if(banner && heading)heading.style.setProperty('--party-banner','url("'+banner.src+'")');
  }
  /* ---------- Optional approved art helpers ---------- */
  // Every replacement has a code-drawn fallback for still-loading images.
  // This is presentation-only; collision geometry and physics remain unchanged.
  function drawSprite(key, x, y, w, h, opacity = 1) {
    const im = IMG[key];
    if (!im || !im.complete || !im.naturalWidth || w <= 0 || h <= 0) return false;
    ctx.save();
    ctx.globalAlpha *= opacity;
    ctx.drawImage(im, x, y, w, h);
    ctx.restore();
    return true;
  }
  /* ======================================================================
     AUDIO — synth fallbacks now, real files later (Section 11.4)
     ====================================================================== */
  const Audio_ = (() => {
    let ac = null, master, music, sfx, rollGain, rollFilter, noiseBuf;
    const buffers = {};
    let introDone=false;
    let introSource=null, introEnvelope=null, introTimer=null;
    function init() {
      if (ac) return;
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.9; master.connect(ac.destination);
      const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      comp.connect(master);
      music = ac.createGain(); music.gain.value = settings.music ? 0.34 : 0; music.connect(comp);
      sfx = ac.createGain(); sfx.gain.value = settings.sfx ? 0.8 : 0; sfx.connect(comp);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      // rolling bed: one shared filtered-noise voice driven by marble speeds
      const src = ac.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
      rollFilter = ac.createBiquadFilter(); rollFilter.type = 'bandpass'; rollFilter.frequency.value = 500; rollFilter.Q.value = 0.9;
      rollGain = ac.createGain(); rollGain.gain.value = 0;
      src.connect(rollFilter); rollFilter.connect(rollGain); rollGain.connect(sfx); src.start();
      loadFiles();
      Music.start();
    }
    function loadFiles() {
      if (!ac) return;
      for (const k in SND) {
        if (buffers[k]) continue;
        buffers[k] = 'loading';
        fetch(SND[k]).then(r => {if(!r.ok)throw Error('Sound '+k+' not found');return r.arrayBuffer();})
          .then(b => ac.decodeAudioData(b)).then(buf => {
            buffers[k] = buf;
            if(k==='music_party')Music.useTrack(buf);
            if(k==='vo_party_intro' && state==='lobby' && !introDone) startIntro();
          })
          .catch(() => { delete buffers[k]; });
      }
    }
    function stopIntro() {
      if(introTimer){clearTimeout(introTimer);introTimer=null;}
      if(!ac || !introSource)return;
      try {
        const now=ac.currentTime;
        introEnvelope.gain.cancelScheduledValues(now);
        introEnvelope.gain.setValueAtTime(Math.max(.0001,introEnvelope.gain.value),now);
        introEnvelope.gain.linearRampToValueAtTime(0,now+.13);
        introSource.stop(now+.16);
      } catch(e) {}
      introSource=null;introEnvelope=null;
    }
    function startIntro() {
      if(introDone || state!=='lobby' || !settings.sfx || !ac)return;
      const buf=buffers.vo_party_intro;
      if(!buf || buf==='loading')return;
      introDone=true;
      stopIntro();
      introSource=ac.createBufferSource();introSource.buffer=buf;
      introEnvelope=ac.createGain();introEnvelope.gain.value=.55;
      // A modest speech-only band limit suppresses recording hiss without
      // filtering or modifying the game's music and impact effects.
      const voiceHigh=ac.createBiquadFilter();voiceHigh.type='highpass';voiceHigh.frequency.value=105;
      const voiceLow=ac.createBiquadFilter();voiceLow.type='lowpass';voiceLow.frequency.value=5600;voiceLow.Q.value=.7;
      introSource.connect(voiceHigh);voiceHigh.connect(voiceLow);
      voiceLow.connect(introEnvelope);introEnvelope.connect(sfx);
      introSource.onended=()=>{introSource=null;introEnvelope=null;};
      // Keep the introduction brief: finish before 9 seconds, and taper the
      // clip's noisy tail instead of replaying the full 26-second script.
      const duration=Math.min(9,Math.max(.1,buf.duration));
      const start=ac.currentTime;
      introEnvelope.gain.setValueAtTime(.55,start);
      introEnvelope.gain.setValueAtTime(.55,start+Math.max(0,duration-.55));
      introEnvelope.gain.linearRampToValueAtTime(0,start+duration);
      introSource.start(start,0,duration);
      introTimer=setTimeout(stopIntro,Math.ceil(duration*1000)+250);
    }
    function file(k, vol = 1, rate = 1) {
      const b = buffers[k];
      if (!b || b === 'loading') return false;
      const s = ac.createBufferSource(); s.buffer = b; s.playbackRate.value = rate;
      const g = ac.createGain(); g.gain.value = vol; s.connect(g); g.connect(sfx); s.start();
      return true;
    }
    function tone(f, dur, type = 'sine', vol = 0.3, f2 = null, delay = 0, dest = null) {
      const t = ac.currentTime + delay;
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + dur + 0.02);
    }
    function noise(dur, f, q = 1, vol = 0.3, type = 'bandpass', f2 = null, delay = 0) {
      const t = ac.currentTime + delay;
      const s = ac.createBufferSource(); s.buffer = noiseBuf;
      const fl = ac.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
      if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t + dur);
      const g = ac.createGain();
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      s.connect(fl); fl.connect(g); g.connect(sfx);
      s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.02);
    }
    const XYLO = [523.25, 587.33, 659.25, 698.46, 783.99, 880, 987.77, 1046.5];
    const last = {};
    function play(k, o = {}) {
      if (!ac || !settings.sfx) return;
      const now = ac.currentTime;
      const gap = o.gap ?? 0.03;
      if (last[k] && now - last[k] < gap) return;
      last[k] = now;
      const v = o.vol ?? 1, pr = 1 + (Math.random() - 0.5) * 0.08;
      if (file(k, v, pr)) return;
      switch (k) {
        case 'clack': tone(2600 * pr, 0.05, 'sine', 0.22 * v); noise(0.04, 3800, 3, 0.25 * v); break;
        case 'land_hard': tone(140, 0.18, 'sine', 0.4 * v, 60); noise(0.08, 1800, 1, 0.2 * v); break;
        case 'land_soft': noise(0.05, 1400, 1.5, 0.12 * v); break;
        case 'sfx_boost': noise(0.35, 600, 1.2, 0.35 * v, 'bandpass', 3800); tone(320, 0.3, 'triangle', 0.18 * v, 980); break;
        case 'sfx_empty': tone(110, 0.15, 'square', 0.12 * v, 70); break;
        case 'sfx_count_beep': tone(440, 0.22, 'square', 0.16); break;
        case 'sfx_count_go': tone(880, 0.5, 'square', 0.18); tone(1320, 0.5, 'sine', 0.1); break;
        case 'sfx_gate_drop': noise(0.12, 900, 2, 0.4); tone(180, 0.15, 'square', 0.15, 90); break;
        case 'sfx_perfect_start': [0, 0.06, 0.12, 0.18].forEach((d, i) => tone(XYLO[i * 2] * 1.5, 0.25, 'sine', 0.18, null, d)); break;
        case 'sfx_offtrack': tone(1400, 0.7, 'sine', 0.18, 300); break;
        case 'sfx_respawn': noise(0.3, 2400, 1, 0.25, 'lowpass', 300); tone(1600, 0.12, 'sine', 0.12, null, 0.12); break;
        case 'sfx_finish': tone(1318.5, 1.2, 'sine', 0.25); tone(1975.5, 1.2, 'sine', 0.15); tone(659.25, 0.9, 'triangle', 0.12); break;
        case 'sfx_bumper': tone(440, 0.25, 'square', 0.12, 180); tone(1760, 0.08, 'sine', 0.2); break;
        case 'sfx_boostpad': noise(0.4, 400, 2, 0.3, 'bandpass', 5000); tone(220, 0.35, 'sawtooth', 0.08, 880); break;
        case 'sfx_item_pickup': [0, 0.05, 0.1, 0.15].forEach((d, i) => tone(XYLO[[0, 2, 4, 7][i]] * 2, 0.18, 'triangle', 0.14, null, d)); break;
        case 'sfx_item_turbo': noise(0.9, 300, 0.8, 0.35, 'bandpass', 2400); break;
        case 'sfx_item_jelly': tone(260, 0.35, 'sine', 0.3, 520); tone(390, 0.3, 'sine', 0.2, 180, 0.1); break;
        case 'sfx_item_oil': noise(0.25, 500, 1, 0.35, 'lowpass', 120); break;
        case 'sfx_oil_slip': tone(900, 0.5, 'sawtooth', 0.06, 200); noise(0.4, 2500, 4, 0.12); break;
        case 'sfx_item_big': tone(90, 0.7, 'sine', 0.4, 220); break;
        case 'sfx_item_bubble': tone(700, 0.45, 'sine', 0.18, 1500); break;
        case 'sfx_photo_shutter': noise(0.06, 4000, 1, 0.4); noise(0.08, 2000, 1, 0.3, 'bandpass', null, 0.08); break;
        case 'sfx_slowmo_in': tone(300, 0.6, 'sine', 0.25, 70); break;
        case 'sfx_confetti': noise(0.12, 3000, 0.7, 0.4); noise(0.6, 6000, 1, 0.12, 'highpass'); break;
        case 'crowd_cheer': noise(2.2, 1200, 0.4, 0.22, 'bandpass', 900); noise(2.0, 2600, 0.6, 0.12); break;
        case 'crowd_ooh': noise(1.3, 500, 2, 0.18, 'bandpass', 900); break;
        case 'sfx_trophy': [0, 0.18, 0.36, 0.54, 0.9].forEach((d, i) => { tone([587.33, 739.99, 880, 1174.66, 1174.66][i], i === 4 ? 1.6 : 0.3, 'sawtooth', 0.09, null, d); tone([587.33, 739.99, 880, 1174.66, 1479.98][i], i === 4 ? 1.6 : 0.3, 'sine', 0.12, null, d); }); break;
        case 'xylo': {
          const f = XYLO[o.note % 8];
          if (!file('xylo_' + ['c4', 'd4', 'e4', 'f4', 'g4', 'a4', 'b4', 'c5'][o.note % 8], v)) {
            tone(f, 0.6, 'sine', 0.28 * v); tone(f * 4, 0.12, 'sine', 0.08 * v);
          }
          break;
        }
        case 'sfx_golf_putt': tone(420*pr,.2,'sine',.18*v,155);
          noise(.09,1700,1.8,.11*v);break;
        case 'sfx_curl_sweep': noise(.12,2500,1.1,.12*v,'bandpass',700);break;
        case 'sfx_brawl_ram': tone(120,.23,'sawtooth',.16*v,55);noise(.11,900,1.5,.26*v);break;
        case 'sfx_drop_release': tone(890,.16,'triangle',.17*v,280);break;
        case 'sfx_derby_cheer': [0,.07,.14].forEach((d,i)=>tone([660,880,1100][i],.19,'triangle',.08*v,null,d));break;
        case 'sfx_ui_tap': tone(900, 0.05, 'sine', 0.12); break;
        default: break;
      }
    }
    function setRoll(level, pitch) {
      if (!ac) return;
      // Continuous filtered noise is ONLY used in active Grand Prix races.
      // A stale non-zero gain on a menu/game switch sounds like broadband hiss.
      if (!['race','countdown'].includes(state)) level=0;
      const t = ac.currentTime;
      rollGain.gain.setTargetAtTime(settings.sfx ? Math.min(0.32, level) : 0, t, 0.08);
      rollFilter.frequency.setTargetAtTime(380 + pitch * 900, t, 0.1);
    }
    function setMusic(on) { if (music && ac) music.gain.setTargetAtTime(on ? 0.34 : 0, ac.currentTime, 0.3); }
    function setSfx(on) { if (sfx) sfx.gain.setTargetAtTime(on ? 0.8 : 0, ac.currentTime, 0.1); if(!on)stopIntro(); }

    /* Original adaptive Web Audio Party Pack score. No external samples required. */
    const Music = (() => {
      let next = 0, step = 0, timer = null, externalTrack = null, externalSource = null;
      const BPM = 128, SPB = 60 / BPM / 4; // sixteenth notes
      const ROOTS = [146.83, 123.47, 98.0, 110.0]; // D3 B2 G2 A2
      const CH = [[293.66, 369.99, 440], [246.94, 293.66, 369.99], [196, 246.94, 293.66], [220, 277.18, 329.63]];
      let mode = 'lobby', intensity = 0;
      const MODE_TIMBRES={grandprix:1,derby:1.12,dropzone:1.33,brawl:.8,curling:1.5,golf:1.25,lobby:1,race:1,quiet:1};
      const MODE_PATTERNS={
        derby:[0,3,7,10],dropzone:[1,5,9,13],brawl:[0,4,8,12],
        curling:[2,6,10,14],golf:[3,7,11,15]
      };
      function kick(t) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        o.connect(g); g.connect(music); o.start(t); o.stop(t + 0.2);
      }
      function hat(t, v) {
        const s = ac.createBufferSource(); s.buffer = noiseBuf;
        const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000;
        const g = ac.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        s.connect(f); f.connect(g); g.connect(music); s.start(t, Math.random()); s.stop(t + 0.05);
      }
      function clap(t) {
        const s = ac.createBufferSource(); s.buffer = noiseBuf;
        const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1500; f.Q.value = 1.2;
        const g = ac.createGain(); g.gain.setValueAtTime(0.45, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
        s.connect(f); f.connect(g); g.connect(music); s.start(t, Math.random()); s.stop(t + 0.16);
      }
      function note(t, f, dur, type, v) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(music); o.start(t); o.stop(t + dur + 0.02);
      }
      function schedule() {
        if(externalSource)return;
        while (next < ac.currentTime + 0.12) {
          const s = step % 16, bar = Math.floor(step / 16) % 4, t = next;
          const race = mode === 'race';
          if (s % 4 === 0) kick(t);
          if (s === 4 || s === 12) clap(t);
          if (s % 2 === 0 || (race && intensity > 0.5)) hat(t, s % 4 === 2 ? 0.14 : 0.07);
          const bassPat = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
          if (bassPat[s]) note(t, ROOTS[bar] * (s === 13 ? 2 : 1), SPB * 1.6, 'triangle', 0.32);
          if ((s === 2 || s === 10) && mode !== 'quiet') CH[bar].forEach(f => note(t, f, SPB * 1.2, 'square', 0.035));
          // Mode identity: distinct melodic contour and pitch colour within the
          // existing harmonic bed, while obeying the user's music toggle.
          const seq=MODE_PATTERNS[mode];
          if (seq && seq.includes(s)) {
            const voice=MODE_TIMBRES[mode], n=CH[bar][(s+bar)%3];
            note(t,n*voice,SPB*(mode==='curling'?2.1:1.35),
              mode==='brawl'?'sawtooth':'triangle',mode==='brawl'?.037:.075);
            if(mode==='golf'&&s===15)note(t,n*voice*2,SPB*1.8,'sine',.035);
          }
          if (race && intensity > 0.5 && s % 2 === 1) note(t, CH[bar][s % 3] * 2, SPB * 0.8, 'sine', 0.05);
          if (mode === 'lobby' && (s === 7 || s === 15)) note(t, CH[bar][2] * 2, SPB * 2, 'sine', 0.05);
          next += SPB; step++;
        }
      }
      return {
        start() { next = ac.currentTime + 0.1; timer = setInterval(schedule, 40); },
        useTrack(buffer){
          if(!ac || !buffer || externalSource)return;
          externalTrack=buffer;
          externalSource=ac.createBufferSource();
          externalSource.buffer=externalTrack;externalSource.loop=true;
          externalSource.connect(music);
          externalSource.start();
        },
        mode(m) { mode = m; },
        intensity(v) { intensity = v; },
      };
    })();

    return { init, play, setRoll, stopIntro, setMusic, setSfx, loadFiles, Music: { mode: m => ac && Music.mode(m), intensity: v => ac && Music.intensity(v) }, get debug() { return { introPlaying: !!introSource, introDone, rollGain: rollGain?.gain.value||0, state }; }, get on() { return !!ac; } };
  })();

  /* ======================================================================
     NETWORK — relay through the Render server (Section 7.3 / 7.4)
     ====================================================================== */
  const Net = (() => {
    let ws = null, code = null, open = false, retry = 0;
    const local = location.protocol === 'file:';
    function connect() {
      if (local) {
        setStatus('Local mode — add keyboard or CPU racers to test');
        $('.joinCard h2').textContent = 'Local test mode';
        $('.joinRow').innerHTML = '<div class="joinStep">Phones can join once the game is hosted on Render. For now, add keyboard or CPU racers below.</div>';
        return;
      }
      setStatus('Polishing the marbles… (waking the server)');
      ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
      ws.onopen = () => { open = true; retry = 0; send({ t: 'host', code: sessionStorage.getItem('mr_code') || null }); };
      ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch (x) { return; } onMsg(m); };
      ws.onclose = () => {
        open = false; setStatus('Connection lost — reconnecting…');
        setTimeout(connect, Math.min(8000, 800 * ++retry));
      };
    }
    function send(m) { if (open) ws.send(JSON.stringify(m)); }
    function onMsg(m) {
      switch (m.t) {
        case 'room':
          code = m.code; sessionStorage.setItem('mr_code', code);
          $('#roomCode').textContent = code;
          $('#joinUrl').textContent = `${location.host}/play`;
          drawQR(`${location.origin}/play?room=${code}`);
          setStatus('');
          (m.pids || []).forEach(pid => { const p = players.get(pid); if (p) p.connected = true; });
          break;
        case 'join': Game.onJoin(m.pid, m.name, m.swirl); break;
        case 'leave': Game.onLeave(m.pid); break;
        case 'in': Game.onInput(m.pid, m.k); break;
        case 'act': Game.onAction(m.pid, m.a, m.v); break;
        default: break;
      }
    }
    return {
      connect, send,
      to(pid, msg) { send({ t: 'to', pid, m: msg }); },
      get code() { return code; }, get local() { return local; },
    };
  })();
  function drawQR(text) {
    const c = $('#qr');
    try {
      const m = QR.encode(text), n = m.length, q = 3, px = 8;
      c.width = c.height = (n + q * 2) * px;
      const g = c.getContext('2d');
      g.fillStyle = '#ffffff'; g.fillRect(0, 0, c.width, c.height);
      g.fillStyle = '#14163A';
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) g.fillRect((x + q) * px, (y + q) * px, px, px);
      c.hidden = false;
    } catch (e) { c.hidden = true; }
  }
  function setStatus(t) { const el = $('#status'); el.textContent = t; el.hidden = !t; }

  /* ======================================================================
     PLAYERS
     ====================================================================== */
  const players = new Map(); // id → player
  function freeToken() {
    const used = new Set([...players.values()].map(p => p.tok));
    for (let i = 0; i < TOKENS.length; i++) if (!used.has(i)) return i;
    return -1;
  }
  function makePlayer(id, name, opts = {}) {
    const tok = freeToken();
    if (tok < 0) return null;
    const p = {
      id, name: cleanName(name), tok, color: TOKENS[tok].c, shape: TOKENS[tok].s,
      swirl: opts.swirl ?? (tok * 3 + 1) % SWIRLS.length,
      cpu: !!opts.cpu, keys: opts.keys ?? null, connected: true, leftAt: 0,
      points: 0, lastPts: 0, races: 0, wins: 0,
      tot: { perfect: 0, offs: 0, maxAir: 0, bumps: 0, climb: 0, topSpeed: 0 },
      bot: opts.cpu ? { skill: 0.3 + Math.random() * 0.5, rel: 0, itemAt: 0 } : null,
    };
    players.set(id, p);
    return p;
  }
  const BAD = ['fuck', 'shit', 'cunt', 'bitch', 'dick', 'cock', 'piss', 'wank', 'twat', 'bastard', 'prick', 'slag', 'bollock', 'arse'];
  function cleanName(n) {
    n = String(n || '').replace(/[^\p{L}\p{N} '\-!?.]/gu, '').trim().slice(0, 10) || 'Racer';
    const low = n.toLowerCase().replace(/[^a-z]/g, '');
    return BAD.some(b => low.includes(b)) ? 'Marble' : n;
  }
  function vipId() {
    for (const p of players.values()) if (!p.cpu && p.keys == null && p.connected) return p.id;
    return null;
  }

  /* ======================================================================
     CAMERA (Section 5.6)
     ====================================================================== */
  const cam = { x: 0, y: 0, z: 0.8, vx: 0, vy: 0, vz: 0, tx: 0, ty: 0, tz: 0.8, trauma: 0, sx: 0, sy: 0 };
  function spring(o, k, tk, vk, stiff, damp, dt) {
    const a = -stiff * (o[k] - o[tk]) - damp * o[vk];
    o[vk] += a * dt; o[k] += o[vk] * dt;
  }
  function camSnap() { cam.x = cam.tx; cam.y = cam.ty; cam.z = cam.tz; cam.vx = cam.vy = cam.vz = 0; }
  function camUpdate(dt) {
    spring(cam, 'x', 'tx', 'vx', 120, 20, dt);
    spring(cam, 'y', 'ty', 'vy', 120, 20, dt);
    spring(cam, 'z', 'tz', 'vz', 80, 18, dt);
    cam.trauma = Math.max(0, cam.trauma - 1.8 * dt);
    const sh = settings.reduce ? 0 : cam.trauma * cam.trauma * 12;
    const t = performance.now() / 1000;
    cam.sx = sh * (Math.sin(t * 47.3) + Math.sin(t * 31.7)) * 0.5;
    cam.sy = sh * (Math.sin(t * 53.1 + 1) + Math.sin(t * 29.3 + 2)) * 0.5;
  }
  const toScreen = (x, y) => [(x - cam.x) * cam.z * S + W / 2 + cam.sx * S, (y - cam.y) * cam.z * S + H / 2 + cam.sy * S];

  /* ======================================================================
     PARTICLES (Section 5.7 / 5.8)
     ====================================================================== */
  const parts = [];
  function lite() { return settings.fx === 'lite' || (settings.fx === 'auto' && perf.lite); }
  function emit(kind, x, y, n, o = {}) {
    if (lite()) n = Math.ceil(n / 2);
    const cap = lite() ? 350 : 800;
    for (let i = 0; i < n && parts.length < cap; i++) {
      const a = o.dir != null ? o.dir + (Math.random() - 0.5) * (o.spread ?? 1) : Math.random() * Math.PI * 2;
      const sp = (o.speed ?? 300) * (0.4 + Math.random() * 0.8);
      parts.push({
        kind, x, y, vx: Math.cos(a) * sp + (o.vx || 0), vy: Math.sin(a) * sp + (o.vy || 0),
        life: (o.life ?? 0.6) * (0.7 + Math.random() * 0.6), age: 0,
        size: (o.size ?? 6) * (0.6 + Math.random() * 0.8), color: o.colors ? o.colors[(Math.random() * o.colors.length) | 0] : (o.color || '#fff'),
        g: o.g ?? 0, rot: Math.random() * 6.28, vr: (Math.random() - 0.5) * 14, drag: o.drag ?? 0.985,
      });
    }
  }
  const pops = []; // floating world text
  function pop(text, x, y, color = '#FFF4E0', size = 34) { pops.push({ text, x, y, color, size, age: 0, life: 1.3 }); }
  function updateParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.age += dt;
      if (p.age >= p.life) { parts.splice(i, 1); continue; }
      p.vy += p.g * dt; p.vx *= p.drag; p.vy *= p.drag;
      if (p.kind === 'confetti') { p.vx += Math.sin(p.age * 9 + p.rot) * 30 * dt * 60 * 0.05; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
    }
    for (let i = pops.length - 1; i >= 0; i--) { pops[i].age += dt; if (pops[i].age > pops[i].life) pops.splice(i, 1); }
  }
  function drawParts() {
    for (const p of parts) {
      const k = 1 - p.age / p.life;
      ctx.globalAlpha = Math.min(1, k * 1.4);
      // Approved particles are optional, with lightweight procedural effects
      // retained for reduced-motion / slow hardware and while art loads.
      const sprite = {
        star: 'fx_sparkle', spark: 'fx_spark',
        dust: world && world.t.meta.theme === 'ice' ? 'fx_frost' : 'fx_dust',
        sprite_sprinkle: 'fx_sprinkle', sprite_frost: 'fx_frost',
        sprite_splash: 'fx_splash', sprite_poof: 'fx_poof',
        sprite_star_burst: 'fx_star_burst'
      }[p.kind];
      if (sprite && !lite() && IMG[sprite]) {
        const scale = p.kind === 'star' ? 4.0 : p.kind === 'spark' ? 5.5
          : p.kind === 'dust' ? 6 : p.kind.startsWith('sprite_') ? 5.2 : 5;
        const size = p.size * scale * (0.7 + 0.3 * k);
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.drawImage(IMG[sprite], -size / 2, -size / 2, size, size);
        ctx.restore();
        continue;
      }
      if (p.kind === 'spark') {
        ctx.strokeStyle = p.color; ctx.lineWidth = p.size * 0.35; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03); ctx.stroke();
      } else if (p.kind === 'dust') {
        const r = p.size * (1 + (1 - k) * 2.2);
        ctx.fillStyle = p.color; ctx.globalAlpha *= 0.45;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 6.283); ctx.fill();
      } else if (p.kind === 'star') {
        ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        star4(p.size * (0.6 + k * 0.6)); ctx.restore();
      } else if (p.kind === 'confetti') {
        ctx.fillStyle = p.color; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.scale(1, Math.abs(Math.sin(p.age * 8 + p.rot))); ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); ctx.restore();
      } else if (p.kind === 'ring') {
        ctx.strokeStyle = p.color; ctx.lineWidth = 4 * k + 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (1 + (1 - k) * 5), 0, 6.283); ctx.stroke();
      } else if (p.kind === 'blob') {
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * k, 0, 6.283); ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }
  function star4(r) {
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, rr = i % 2 ? r * 0.32 : r;
      ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    ctx.closePath(); ctx.fill();
  }

  /* ======================================================================
     TRACK ART — prebuilt paths (Section 6.3)
     ====================================================================== */
  let art = null;
  /* Rails are drawn as chunky beams hanging BELOW the collision line, so a marble
     sits on top of a solid-looking track. Physics is untouched: the top face of
     every beam is exactly the line the engine collides with. */
  const TH = 30;            // beam thickness in design px (a marble is 36 across)
  const CELL = 900;         // rails are grouped into cells so only what's on screen is drawn
  const BEAMS = ['main', 'bowl', 'pad', 'slow', 'conveyor', 'short'];
  function underSide(s, T, bowlC) {
    let nx = -s.dy, ny = s.dx; const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
    const mx = (s.x1 + s.x2) / 2, my = (s.y1 + s.y2) / 2;
    let c = null;
    if (s.kind === 'loop') { let bd = Infinity; for (const L of T.loops) { const d = Math.hypot(mx - L.cx, my - L.cy); if (d < bd) { bd = d; c = { x: L.cx, y: L.cy }; } } }
    else if (s.kind === 'bowl' || s.mat === 'bowl') {
      let bd = Infinity; for (const B of T.bowls) { const d = Math.hypot(mx - B.cx, my - B.cy); if (d < bd) { bd = d; c = { x: B.cx, y: B.cy }; } }
      if (!c) c = bowlC;
    }
    if (c) { if (nx * (mx - c.x) + ny * (my - c.y) < 0) { nx = -nx; ny = -ny; } return [nx, ny]; }
    if (Math.abs(ny) < 0.2) return [0, 0];       // near-vertical: draw it centred
    if (ny < 0) { nx = -nx; ny = -ny; }
    return [nx, ny];
  }
  function buildArt(T) {
    const MAP = { wood: 'main', candy: 'main', ice: 'main', metal: 'main', choc: 'slow' };
    const cells = new Map();
    const cellAt = (x, y) => {
      const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL), k = cx + ',' + cy;
      let c = cells.get(k);
      if (!c) {
        c = { x0: cx * CELL, y0: cy * CELL, wall: new Path2D(), cushion: new Path2D(), g: {} };
        for (const b of BEAMS) c.g[b] = { deck: new Path2D(), low: new Path2D(), lip: new Path2D(), n: 0 };
        cells.set(k, c);
      }
      return c;
    };
    const gate = new Path2D();
    const posts = [];
    const r = rng(77);
    // centre of a bowl that isn't registered as one (the lobby half-pipe)
    let bx = 0, by = 0, bn = 0;
    for (const s of T.segs) if (s.kind === 'bowl') { bx += s.x1 + s.x2; by += s.y1 + s.y2; bn += 2; }
    const bowlC = bn ? { x: bx / bn, y: by / bn - 200 } : null;
    const put = (path, s, ux, uy, o) => { path.moveTo(s.x1 + ux * o, s.y1 + uy * o); path.lineTo(s.x2 + ux * o, s.y2 + uy * o); };
    for (const s of T.segs) {
      if (s.mat === 'plate') continue;
      const c = cellAt((s.x1 + s.x2) / 2, (s.y1 + s.y2) / 2);
      if (s.mat === 'gate') { put(gate, s, 0, 0, 0); continue; }
      if (s.mat === 'wall' || s.mat === 'cushion') { put(c[s.mat], s, 0, 0, 0); continue; }
      const [ux, uy] = underSide(s, T, bowlC);
      s._ux = ux; s._uy = uy;
      const add = name => { const g = c.g[name]; put(g.deck, s, ux, uy, TH / 2); put(g.low, s, ux, uy, TH * 0.8); put(g.lip, s, ux, uy, 4.5); g.n++; };
      add(MAP[s.mat] || (c.g[s.mat] ? s.mat : 'main'));
      if (s.kind === 'short') add('short');
      const len = Math.sqrt(s.len2);
      if (s.mat !== 'bowl' && s.kind !== 'loop' && s.kind !== 'bowl' && len > 120 && uy > 0.8) {
        for (let d = 90; d < len - 40; d += 320) {
          const u = d / len;
          posts.push({ x: s.x1 + s.dx * u, y: s.y1 + s.dy * u + TH - 6, h: 0, w: 16 + r() * 4 });
        }
      }
    }
    // scaffold: every post runs down to the rail beneath it, so the run reads as one built structure
    for (const p of posts) {
      let best = Infinity;
      for (const s of T.segs) {
        if (s.mat === 'wall' || s.mat === 'cushion' || s.mat === 'gate' || Math.abs(s.dx) < 1) continue;
        const u = (p.x - s.x1) / s.dx;
        if (u < 0 || u > 1) continue;
        const yy = s.y1 + s.dy * u;
        if (yy > p.y + 30 && yy < best) best = yy;
      }
      if (best - p.y < 520) { p.h = best - p.y + 4; p.foot = false; } else { p.h = 220; p.foot = true; }
    }
    // decorative toy blocks in the far-mid layer
    const deco = [];
    const b = T.bounds;
    for (let i = 0; i < 70; i++) {
      deco.push({
        x: b.minX - 500 + r() * (b.maxX - b.minX + 1000), y: b.minY - 300 + r() * (b.maxY - b.minY + 600),
        w: 60 + r() * 90, kind: (r() * 4) | 0, c: (THEMES[T.meta.theme] || THEMES.toybox).bokeh[(r() * 4) | 0], rot: (r() - 0.5) * 0.5,
      });
    }
    // Eight approved theme cut-outs sit in the far-mid parallax layer, behind
    // the physical rails and marbles. Keep the existing procedural decoration
    // as a fallback while Jungle Jumble 01-04 and other art remain unavailable.
    const props = [];
    const propRng = rng(17311);
    if (T.way && T.way.length) {
      for (let i = 0; i < 8; i++) {
        const at = T.way[Math.min(T.way.length - 1, Math.floor((i + 0.5) * T.way.length / 8))];
        const side = (i % 2 === 0) ? -1 : 1;
        props.push({
          k: 'prop_' + T.meta.theme + '_' + String(i + 1).padStart(2, '0'),
          x: at.x + (propRng() - 0.5) * 140,
          y: at.y + side * (210 + propRng() * 70),
          w: 170 + propRng() * 45,
          rot: (propRng() - 0.5) * 0.10,
        });
      }
    }
    const bokeh = [];
    const nb = ['planets', 'flakes'].includes((THEMES[T.meta.theme] || {}).deco) ? 140 : 46;
    for (let i = 0; i < nb; i++) bokeh.push({ x: r(), y: r(), r: 10 + r() * 40, c: NOTE_COLORS[(r() * 4) | 0], a: 0.05 + r() * 0.12, p: 0.02 + r() * 0.06 });
    return { cells: [...cells.values()], gate, posts, deco, props, bokeh, pat: null, patKey: '' };
  }

  function drawBackground() {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    const th = theme();
    g.addColorStop(0, th.bg[0]); g.addColorStop(0.55, th.bg[1]); g.addColorStop(1, th.bg[2]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const stage = state === 'boot' || state === 'lobby' ? 'bg_lobby'
      : state === 'results' || state === 'finale' ? 'bg_results'
      : 'bg_far_' + (world && world.t.meta.theme || 'toybox');
    const bg = IMG[stage];
    if (bg) {
      const sc = Math.max(W / bg.width, H / bg.height) * 1.15;
      const ox = -((cam.x * 0.05) % 200) * S, oy = -((cam.y * 0.03) % 200) * S;
      ctx.globalAlpha = 0.85;
      ctx.drawImage(bg, (W - bg.width * sc) / 2 + ox, (H - bg.height * sc) / 2 + oy, bg.width * sc, bg.height * sc);
      ctx.globalAlpha = 1;
    } else if (art) {
      // warm window glow + bokeh lights
      const wx = W * 0.78 - (cam.x * 0.02) * S, wy = H * 0.24 - (cam.y * 0.01 % 300) * S;
      const gl = ctx.createRadialGradient(wx, wy, 10, wx, wy, 420 * S);
      gl.addColorStop(0, th.glow); gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl; ctx.fillRect(0, 0, W, H);
      for (const k of art.bokeh) {
        let x = (k.x * W * 1.4 - cam.x * k.p * S) % (W * 1.4); if (x < 0) x += W * 1.4; x -= W * 0.2;
        let y = (k.y * H * 1.4 - cam.y * k.p * S) % (H * 1.4); if (y < 0) y += H * 1.4; y -= H * 0.2;
        ctx.globalAlpha = k.a; ctx.fillStyle = th.bokeh[NOTE_COLORS.indexOf(k.c) % 4] || k.c;
        if (th.deco === 'planets' || th.deco === 'flakes') {
          ctx.globalAlpha = Math.min(0.9, k.a * 5) * (0.6 + 0.4 * Math.sin(performance.now() / 600 + k.r));
          ctx.beginPath(); ctx.arc(x, y, (th.deco === 'planets' ? 1.6 : 2.4) * S + k.r * 0.04 * S, 0, 6.283); ctx.fill();
        } else { ctx.beginPath(); ctx.arc(x, y, k.r * S, 0, 6.283); ctx.fill(); }
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawDeco() {
    if (!art || lite()) return;
    const p = 0.55;
    ctx.save();
    ctx.translate(cam.x * (1 - p), cam.y * (1 - p));
    // Use approved transparent props whenever that numbered art exists.
    // These sit BEHIND track geometry; if absent, the procedural art still runs.
    for (const d of art.props || []) {
      const img = IMG[d.k];
      if (!img) continue;
      const h = d.w * img.height / Math.max(1, img.width);
      ctx.save();
      ctx.globalAlpha = 0.78;
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot);
      ctx.drawImage(img, -d.w / 2, -h / 2, d.w, h);
      ctx.restore();
    }
    ctx.globalAlpha = 0.28;
    for (const d of art.deco) {
      ctx.save(); ctx.translate(d.x, d.y); ctx.rotate(d.rot);
      ctx.fillStyle = d.c;
      const dk = theme().deco;
      if (dk === 'lollies') {
        ctx.fillStyle = '#f3e3d0'; ctx.fillRect(-4, 0, 8, d.w * 1.1);
        ctx.fillStyle = d.c; ctx.beginPath(); ctx.arc(0, 0, d.w / 2, 0, 6.283); ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 6; ctx.beginPath();
        for (let a = 0; a < 12; a += 0.2) ctx.lineTo(Math.cos(a) * a * d.w / 26, Math.sin(a) * a * d.w / 26);
        ctx.stroke(); ctx.restore(); continue;
      }
      if (dk === 'flakes') {
        ctx.strokeStyle = d.c; ctx.lineWidth = 5; ctx.lineCap = 'round';
        for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, d.w / 2); ctx.moveTo(0, d.w / 4); ctx.lineTo(d.w / 8, d.w / 3); ctx.moveTo(0, d.w / 4); ctx.lineTo(-d.w / 8, d.w / 3); ctx.stroke(); }
        ctx.restore(); continue;
      }
      if (dk === 'leaves') {
        for (let i = 0; i < 5; i++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(0, d.w * 0.32, d.w * 0.14, d.w * 0.34, 0, 0, 6.283); ctx.fill(); }
        ctx.restore(); continue;
      }
      if (dk === 'balls') {
        const cols = ['#FF3B5C', '#FFD23F', '#4CC9F0', '#ffffff'];
        for (let i = 0; i < 4; i++) { ctx.fillStyle = cols[i]; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, d.w / 2, i * Math.PI / 2, (i + 1) * Math.PI / 2); ctx.closePath(); ctx.fill(); }
        ctx.restore(); continue;
      }
      if (dk === 'gears') {
        ctx.rotate(performance.now() / 4000 * (d.kind % 2 ? 1 : -1));
        const R = d.w / 2;
        ctx.beginPath();
        for (let i = 0; i < 24; i++) { const a = i * Math.PI / 12, rr = (i % 2) ? R * 0.82 : R; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
        ctx.closePath(); ctx.fill();
        ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(0, 0, R * 0.35, 0, 6.283); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
        ctx.restore(); continue;
      }
      if (dk === 'planets') {
        ctx.beginPath(); ctx.arc(0, 0, d.w / 2, 0, 6.283); ctx.fill();
        if (d.kind % 2 === 0) { ctx.strokeStyle = d.c; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, d.w * 0.9, d.w * 0.22, -0.3, 0, 6.283); ctx.stroke(); }
        ctx.restore(); continue;
      }
      if (d.kind === 0) { roundRect(-d.w / 2, -d.w / 2, d.w, d.w, 12); ctx.fill(); }
      else if (d.kind === 1) { ctx.beginPath(); ctx.arc(0, 0, d.w / 2, 0, 6.283); ctx.fill(); }
      else if (d.kind === 2) { ctx.beginPath(); ctx.moveTo(0, -d.w / 2); ctx.lineTo(d.w / 2, d.w / 2); ctx.lineTo(-d.w / 2, d.w / 2); ctx.closePath(); ctx.fill(); }
      else { roundRect(-d.w * 0.7, -d.w * 0.25, d.w * 1.4, d.w * 0.5, 10); ctx.fill(); }
      ctx.restore();
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
  function roundRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  function strokePath(p, width, color, ox = 0, oy = 0) {
    ctx.save(); ctx.translate(ox, oy); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke(p); ctx.restore();
  }
  function drawTrack(T, time) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const th = theme();
    // low-gravity zones
    for (const z of T.zones) {
      ctx.fillStyle = 'rgba(200,180,255,0.55)';
      for (let i = 0; i < 26; i++) {
        const fx = z.x0 + ((i * 197.3) % (z.x1 - z.x0)), fy = z.y1 - ((time * 40 + i * 83) % (z.y1 - z.y0));
        ctx.beginPath(); ctx.arc(fx, fy, 2.5, 0, 6.283); ctx.fill();
      }
      ctx.font = '700 26px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(220,205,255,0.55)';
      ctx.fillText('LOW GRAVITY', (z.x0 + z.x1) / 2, z.y0 + 300);
    }
    // what part of the world is on screen (cull everything else)
    const vw = W / (cam.z * S) / 2 + 80, vh = H / (cam.z * S) / 2 + 80;
    const vx0 = cam.x - vw, vx1 = cam.x + vw, vy0 = cam.y - vh, vy1 = cam.y + vh;
    const vis = art.cells.filter(c => c.x0 + CELL + 460 > vx0 && c.x0 - 460 < vx1 && c.y0 + CELL + 460 > vy0 && c.y0 - 460 < vy1);
    const low = lite();
    const EDGE = 'rgba(14,10,34,0.92)';
    // scaffold posts (behind the rails)
    for (const p of art.posts) {
      if (p.x < vx0 || p.x > vx1 || p.y > vy1 || p.y + p.h < vy0) continue;
      const hw = p.w / 2;
      ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fillRect(p.x - hw + 7, p.y + 8, p.w, p.h);
      if (p.foot) {
        const g = ctx.createLinearGradient(0, p.y, 0, p.y + p.h);
        g.addColorStop(0, th.post[0]); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g; ctx.fillRect(p.x - hw, p.y, p.w, p.h);
        continue;
      }
      ctx.fillStyle = EDGE; ctx.fillRect(p.x - hw - 2, p.y, p.w + 4, p.h);
      ctx.fillStyle = th.post[0]; ctx.fillRect(p.x - hw, p.y, p.w, p.h);
      ctx.fillStyle = th.post[1]; ctx.fillRect(p.x - hw, p.y, p.w * 0.36, p.h);
      ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.fillRect(p.x + hw - p.w * 0.22, p.y, p.w * 0.22, p.h);
      ctx.fillStyle = th.post[1]; ctx.fillRect(p.x - hw - 5, p.y + p.h - 9, p.w + 10, 9); // foot plate
    }
    const texKey = 'tex_rail_' + (T.meta.theme || 'toybox');
    if (art.patKey !== texKey + !!IMG[texKey]) { art.patKey = texKey + !!IMG[texKey]; art.pat = IMG[texKey] ? ctx.createPattern(IMG[texKey], 'repeat') : null; }
    const pat = art.pat;
    const bodyOf = { main: pat || th.main, bowl: th.bowl[0], pad: '#1597b8', slow: th.slow[0], conveyor: '#3b3f4a' };
    const hiOf = { main: th.hi, bowl: th.bowl[1], pad: '#7FE8FF', slow: th.slow[1], conveyor: '#8c93a6' };
    const each = (name, fn) => { for (const c of vis) { const g = c.g[name]; if (g.n) fn(g, c); } };
    const KINDS = ['main', 'bowl', 'pad', 'slow', 'conveyor'];
    // 1 — soft drop shadow under the whole structure
    if (!low) {
      for (const k of KINDS) each(k, g => strokePath(g.deck, TH + 4, 'rgba(0,0,0,0.30)', 12, 20));
      for (const c of vis) { strokePath(c.wall, 24, 'rgba(0,0,0,0.30)', 10, 14); strokePath(c.cushion, 26, 'rgba(0,0,0,0.30)', 10, 14); }
    }
    // 2 — dark outline, so rails read against any painted background
    for (const k of KINDS) each(k, g => strokePath(g.deck, TH + 8, EDGE));
    for (const c of vis) { strokePath(c.wall, 26, EDGE); strokePath(c.cushion, 30, EDGE); }
    // 3 — beam body (theme texture when the art is in, flat colour until then)
    for (const k of KINDS) each(k, g => strokePath(g.deck, TH, bodyOf[k]));
    if (th.stripe && !pat) { ctx.save(); ctx.setLineDash([18, 18]); each('main', g => strokePath(g.deck, TH, th.stripe)); ctx.restore(); }
    if (pat) each('main', g => strokePath(g.deck, TH, 'rgba(255,255,255,0.06)'));
    // conveyor belt: moving yellow slats
    ctx.save(); ctx.setLineDash([10, 14]); ctx.lineDashOffset = -time * 120; each('conveyor', g => strokePath(g.deck, TH * 0.55, '#FFD23F')); ctx.restore();
    // 4 — shaded underside gives the beam its depth
    if (!low) for (const k of KINDS) each(k, g => strokePath(g.low, TH * 0.4, 'rgba(8,6,30,0.34)'));
    // 5 — bright running surface on top
    for (const k of KINDS) each(k, g => strokePath(g.lip, 8, hiOf[k]));
    if (th.strip) each('main', g => strokePath(g.deck, 4, th.strip));
    for (const k of KINDS) each(k, g => strokePath(g.lip, 2.5, 'rgba(255,255,255,0.6)', 0, -2));
    // walls: plain barriers, and padded cushions at the end of each level
    for (const c of vis) {
      strokePath(c.wall, 20, th.wall[0]); strokePath(c.wall, 6, th.wall[1], -4, 0);
      strokePath(c.cushion, 24, th.wall[0]);
      ctx.save(); ctx.setLineDash([3, 26]); strokePath(c.cushion, 24, 'rgba(0,0,0,0.22)'); ctx.restore(); // quilting
      strokePath(c.cushion, 7, th.wall[1], -5, 0);
    }
    // shortcut rails glow gold
    ctx.save(); ctx.globalAlpha = 0.55 + 0.25 * Math.sin(time * 4); each('short', g => strokePath(g.deck, TH + 22, 'rgba(255,200,61,0.35)')); ctx.restore();
    each('short', g => strokePath(g.lip, 8, '#FFC83D'));
    // fork signposts
    for (const F of T.forks) {
      ctx.save(); ctx.translate(F.signX, F.signY);
      ctx.fillStyle = '#4a3020'; ctx.fillRect(-5, -150, 10, 150);
      const board = (y, text, col, dir) => {
        ctx.save(); ctx.translate(0, y);
        ctx.fillStyle = col; ctx.strokeStyle = '#14163A'; ctx.lineWidth = 4;
        ctx.beginPath();
        const w = 190, hh = 40, tip = 26;
        if (dir > 0) { ctx.moveTo(-w / 2, -hh / 2); ctx.lineTo(w / 2, -hh / 2); ctx.lineTo(w / 2 + tip, 0); ctx.lineTo(w / 2, hh / 2); ctx.lineTo(-w / 2, hh / 2); }
        else { ctx.moveTo(w / 2, -hh / 2); ctx.lineTo(-w / 2, -hh / 2); ctx.lineTo(-w / 2 - tip, 0); ctx.lineTo(-w / 2, hh / 2); ctx.lineTo(w / 2, hh / 2); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#14163A'; ctx.font = '700 22px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(text, 0, 1);
        ctx.restore();
      };
      board(-130, 'BOOST: SHORTCUT', '#FFC83D', F.h);
      board(-80, F.kind === 'gems' ? 'GEM ALLEY' : 'LONG WAY', F.kind === 'gems' ? '#FF5FA2' : '#e6ebf5', -F.h);
      ctx.restore();
    }
    if (T.meta.theme === 'ice' && !low) { ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(time * 2); each('main', g => strokePath(g.deck, TH + 14, 'rgba(160,220,255,0.22)')); ctx.restore(); }
    // seesaws
    for (const ss of T.seesaws) {
      const g = ss.seg;
      ctx.fillStyle = th.post[0];
      ctx.beginPath(); ctx.moveTo(ss.px, ss.py + 4); ctx.lineTo(ss.px + 26, ss.py + 70); ctx.lineTo(ss.px - 26, ss.py + 70); ctx.closePath(); ctx.fill();
      ctx.lineCap = 'round';
      { // plank hangs below its collision line, like every other rail
        let ux = -(g.y2 - g.y1), uy = g.x2 - g.x1; const ul = Math.hypot(ux, uy) || 1; ux /= ul; uy /= ul; if (uy < 0) { ux = -ux; uy = -uy; }
        const ln = (o, w, col, sx = 0, sy = 0) => { ctx.lineWidth = w; ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(g.x1 + ux * o + sx, g.y1 + uy * o + sy); ctx.lineTo(g.x2 + ux * o + sx, g.y2 + uy * o + sy); ctx.stroke(); };
        ln(12, 28, 'rgba(0,0,0,0.3)', 10, 16); ln(12, 32, EDGE); ln(12, 24, th.plank[0]); ln(19, 9, 'rgba(8,6,30,0.3)'); ln(4, 7, th.plank[1]);
      }
      ctx.save(); ctx.translate(ss.px, ss.py); ctx.rotate(time * 0.6);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
      for (let i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 16); ctx.stroke(); }
      ctx.restore();
    }
    // boost pad chevrons
    for (const pd of T.pads) {
      const s = pd.s, len = Math.sqrt(s.len2), off = (time * 260) % 50;
      const ox = (s._ux || 0) * TH * 0.55, oy = (s._uy == null ? 1 : s._uy) * TH * 0.55;
      ctx.save(); ctx.translate(s.x1 + ox, s.y1 + oy); ctx.rotate(Math.atan2(s.dy, s.dx));
      ctx.fillStyle = pd.glow > 0 ? '#ffffff' : '#c8f7ff';
      for (let d = off; d < len - 14; d += 50) {
        ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.moveTo(d, -9); ctx.lineTo(d + 15, 0); ctx.lineTo(d, 9); ctx.lineTo(d + 6, 0); ctx.closePath(); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
      if (pd.glow > 0) { ctx.save(); ctx.globalAlpha = pd.glow * 1.5; strokePath(new Path2D(`M${s.x1 + ox} ${s.y1 + oy}L${s.x2 + ox} ${s.y2 + oy}`), TH + 22, 'rgba(127,232,255,0.5)'); ctx.restore(); }
    }
    // xylophone plates
    for (const s of T.stairs) {
      const col = NOTE_COLORS[s.note];
      const bar = (o, w, c, sx = 0, sy = 0) => { ctx.lineWidth = w; ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(s.x1 + sx, s.y1 + o + sy); ctx.lineTo(s.x2 + sx, s.y2 + o + sy); ctx.stroke(); };
      bar(13, 28, 'rgba(0,0,0,0.3)', 10, 16); bar(13, 32, EDGE); bar(13, 24, col); bar(20, 9, 'rgba(8,6,30,0.28)'); bar(4, 7, 'rgba(255,255,255,0.6)');
      ctx.fillStyle = '#e8edf6';
      for (const u of [0.18, 0.82]) { ctx.beginPath(); ctx.arc(s.x1 + s.dx * u, s.y1 + s.dy * u + 14, 4.5, 0, 6.283); ctx.fill(); }
      if (s.flash > 0) { ctx.globalAlpha = s.flash * 3; bar(13, 44, col); ctx.globalAlpha = 1; }
    }
    // Starting gate: visual art tracks the existing gate geometry, never
    // changes the closed/open state or collision rules.
    if (world.phase === 'pen') {
      if (!drawSprite('gate_start', T.gateX - 112, T.gateY - 185, 224, 176)) {
        strokePath(art.gate, 12, '#e6ebf5'); strokePath(art.gate, 4, '#FF3B5C', 0, 0);
      }
    }
    // hazard signs
    for (const hz of T.hazards) {
      ctx.save(); ctx.translate(hz.x, hz.y - 70);
      ctx.fillStyle = '#4a3020'; ctx.fillRect(-4, 10, 8, 56);
      ctx.fillStyle = '#FFD23F'; ctx.strokeStyle = '#1b1446'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(0, -30); ctx.lineTo(30, 20); ctx.lineTo(-30, 20); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#1b1446'; ctx.font = '700 30px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('!', 0, 6);
      ctx.restore();
    }
    // bumpers
    for (const b of T.bumpers) {
      const k = b.flash > 0 ? 1 + b.flash * 0.6 : 1;
      ctx.save(); ctx.translate(b.x, b.y); ctx.scale(k, k);
      if (b.flash > 0) { ctx.fillStyle = `rgba(255,210,63,${b.flash * 2})`; ctx.beginPath(); ctx.arc(0, 0, b.r * 1.8, 0, 6.283); ctx.fill(); }
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.arc(4, 7, b.r, 0, 6.283); ctx.fill();
      const bumperSize = b.r * 2.65;
      if (drawSprite('bumper', -bumperSize / 2, -bumperSize / 2, bumperSize, bumperSize)) {
        ctx.restore();
        continue;
      }
      const g = ctx.createRadialGradient(-6, -8, 2, 0, 0, b.r);
      g.addColorStop(0, th.bump[0]); g.addColorStop(0.6, th.bump[1]); g.addColorStop(1, th.bump[2]);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, b.r, 0, 6.283); ctx.fill();
      ctx.lineWidth = 5; ctx.strokeStyle = '#e6ebf5'; ctx.stroke();
      ctx.fillStyle = b.flash > 0 ? '#fff' : '#FFD23F'; ctx.beginPath(); ctx.arc(0, 0, b.r * 0.35, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    // gems
    for (const gm of T.gems) {
      const bob = Math.sin(time * 3 + gm.phase) * 4;
      ctx.save(); ctx.translate(gm.x, gm.y + bob);
      if (gm.cd > 0) { ctx.globalAlpha = 0.18; ctx.scale(0.6, 0.6); }
      if (!drawSprite('fx_glow', -43, -43, 86, 86, 0.65)) {
        const gl = ctx.createRadialGradient(0, 0, 2, 0, 0, 34);
        gl.addColorStop(0, 'rgba(255,240,180,0.6)'); gl.addColorStop(1, 'rgba(255,240,180,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 6.283); ctx.fill();
      }
      if (drawSprite('item_box', -24, -24, 48, 48)) {
        ctx.restore(); ctx.globalAlpha = 1;
        continue;
      }
      ctx.rotate(time * 1.2 + gm.phase);
      const hue = (time * 80 + gm.phase * 60) % 360;
      ctx.fillStyle = `hsl(${hue},90%,62%)`; ctx.strokeStyle = '#FFC83D'; ctx.lineWidth = 3;
      ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; ctx.lineTo(Math.cos(a) * 15, Math.sin(a) * 15); } ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(-6, -8); ctx.lineTo(4, -10); ctx.lineTo(-2, 0); ctx.closePath(); ctx.fill();
      ctx.restore(); ctx.globalAlpha = 1;
    }
    // finish arch
    for (const a of T.arches) {
      const x = a.x, y = a.y;
      ctx.save();
      // chequered floor strip
      for (let i = 0; i < 6; i++) for (let j = 0; j < 2; j++) {
        ctx.fillStyle = (i + j) % 2 ? '#111' : '#fff'; ctx.fillRect(x - 12 + j * 12, y - 2 + i * 6 - 18, 12, 6);
      }
      if (drawSprite('arch_finish', x - 112, y - 230, 224, 225)) {
        ctx.restore();
        continue;
      }
      ctx.fillStyle = '#c9d1e2';
      ctx.fillRect(x - 90, y - 230, 12, 230); ctx.fillRect(x + 78, y - 230, 12, 230);
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 ? '#111' : '#fff'; ctx.fillRect(x - 90 + i * 15, y - 250, 15, 14);
        ctx.fillStyle = i % 2 ? '#fff' : '#111'; ctx.fillRect(x - 90 + i * 15, y - 236, 15, 14);
      }
      ctx.fillStyle = '#FF3B5C'; ctx.fillRect(x - 96, y - 258, 192, 8);
      for (let i = 0; i < 7; i++) {
        const on = Math.floor(time * 6 + i) % 2;
        ctx.fillStyle = on ? '#FFE9A0' : '#FFC83D';
        ctx.beginPath(); ctx.arc(x - 84 + i * 28, y - 262, 5, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    }
    // oil puddles
    for (const p of world.puddles) {
      ctx.save(); ctx.translate(p.x, p.y + 10);
      ctx.rotate(Math.atan2(-p.nx, p.ny) || 0);
      ctx.globalAlpha = Math.min(1, p.t);
      if (drawSprite('oil_puddle', -p.r * 1.28, -p.r * 0.33, p.r * 2.56, p.r * 0.66)) {
        ctx.restore();
        continue;
      }
      const g = ctx.createRadialGradient(0, 0, 4, 0, 0, p.r);
      g.addColorStop(0, '#2a2140'); g.addColorStop(0.6, '#131022'); g.addColorStop(0.8, 'rgba(76,201,240,0.6)'); g.addColorStop(1, 'rgba(255,95,162,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.32, 0, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* ---------- Marbles (Section 10: swirl rotates, highlight fixed) ---------- */
  function drawMarble(m, p, time, alpha = 1) {
    const r = m.r;
    const pal = SWIRLS[p.swirl % SWIRLS.length];
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(m.x, m.y);
    if (m.appearT > 0) { const k = 1 - m.appearT / 0.3; ctx.scale(k, k); }
    // contact shadow
    if (m.gTime !== undefined && m.gTime < 0.08) {
      ctx.save(); ctx.translate(-m.nx * r * 0.85, -m.ny * r * 0.85); ctx.rotate(Math.atan2(m.ny, m.nx) + Math.PI / 2);
      const sg = ctx.createRadialGradient(0, 0, 1, 0, 0, r);
      sg.addColorStop(0, 'rgba(0,0,0,0.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sg; ctx.beginPath(); ctx.ellipse(0, 0, r * 1.05, r * 0.32, 0, 0, 6.283); ctx.fill();
      ctx.restore();
    }
    // squash
    if (m.squash > 0) {
      const a = Math.atan2(m.ny, m.nx), k = m.squash * 0.16;
      ctx.rotate(a); ctx.scale(1 - k, 1 + k); ctx.rotate(-a);
    }
    // glow for big/bubble/jelly
    if (m.fx && m.fx.jelly > 0) { ctx.fillStyle = 'rgba(61,220,151,0.35)'; ctx.beginPath(); ctx.arc(0, 0, r * 1.28, 0, 6.283); ctx.fill(); }
    // body
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 0, r, 0, 6.283); ctx.clip();
    const sw = IMG['marble_swirl_' + String(p.swirl % 12 + 1).padStart(2, '0')];
    ctx.fillStyle = pal[0]; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.rotate(m.ang);
    if (sw) ctx.drawImage(sw, -r, -r, r * 2, r * 2);
    else {
      ctx.lineCap = 'round';
      ctx.strokeStyle = pal[1]; ctx.lineWidth = r * 0.5;
      ctx.beginPath(); ctx.moveTo(-r, -r * 0.5); ctx.bezierCurveTo(-r * 0.2, -r * 1.1, r * 0.2, r * 1.1, r, r * 0.5); ctx.stroke();
      ctx.strokeStyle = pal[2]; ctx.lineWidth = r * 0.22;
      ctx.beginPath(); ctx.moveTo(-r, r * 0.35); ctx.bezierCurveTo(-r * 0.3, -r * 0.2, r * 0.3, r * 0.9, r * 0.95, -r * 0.2); ctx.stroke();
      ctx.globalAlpha = alpha * 0.6; ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(r * 0.35, -r * 0.45, r * 0.09, 0, 6.283); ctx.arc(-r * 0.4, r * 0.4, r * 0.06, 0, 6.283); ctx.fill();
      ctx.globalAlpha = alpha;
    }
    ctx.rotate(-m.ang);
    const shade = ctx.createRadialGradient(-r * 0.25, -r * 0.3, r * 0.2, 0, 0, r * 1.05);
    shade.addColorStop(0, 'rgba(255,255,255,0.05)'); shade.addColorStop(0.7, 'rgba(10,10,40,0.15)'); shade.addColorStop(1, 'rgba(10,10,40,0.6)');
    ctx.fillStyle = shade; ctx.fillRect(-r, -r, r * 2, r * 2);
    ctx.restore();
    // rim ring in player colour
    ctx.lineWidth = Math.max(2.5, r * 0.15); ctx.strokeStyle = p.color;
    ctx.beginPath(); ctx.arc(0, 0, r - 0.5, 0, 6.283); ctx.stroke();
    // highlight (fixed — does not rotate)
    const hl = IMG.marble_highlight;
    if (hl) ctx.drawImage(hl, -r, -r, r * 2, r * 2);
    else {
      ctx.save(); ctx.translate(-r * 0.36, -r * 0.42); ctx.rotate(-0.6);
      const hg = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.45);
      hg.addColorStop(0, 'rgba(255,255,255,0.95)'); hg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.ellipse(0, 0, r * 0.46, r * 0.26, 0, 0, 6.283); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(150,210,255,0.55)'; ctx.lineWidth = r * 0.1;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.82, -0.6, 0.9); ctx.stroke();
    }
    if (m.fx) {
      if (m.fx.jelly > 0) {
        drawSprite('fx_jelly_coat', -r * 1.38, -r * 1.38, r * 2.76, r * 2.76, 0.82);
      }
      if (m.fx.bubble > 0) {
        if (!drawSprite('fx_bubble_shield', -r * 1.58, -r * 1.58, r * 3.16, r * 3.16, 0.88)) {
          ctx.strokeStyle = `hsla(${(time * 200) % 360},90%,75%,0.8)`; ctx.lineWidth = 3;
          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          ctx.beginPath(); ctx.arc(0, 0, r * 1.5, 0, 6.283); ctx.fill(); ctx.stroke();
        }
      }
      if (m.fx.slip > 0) {
        ctx.strokeStyle = `hsla(${(time * 400) % 360},90%,60%,0.7)`; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, r + 4, time * 8, time * 8 + 2); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawTrails(time) {
    if (lite()) return;
    for (const m of world.marbles) {
      if (m.respawnT > 0) continue;
      const sp = Math.hypot(m.vx, m.vy);
      const p = players.get(m.id); if (!p) continue;
      if (m.slipstream && sp > 1) {
        if (IMG.fx_wind) {
          ctx.save();
          ctx.translate(m.x - m.vx / sp * 65, m.y - m.vy / sp * 65);
          ctx.rotate(Math.atan2(m.vy, m.vx));
          ctx.globalAlpha = 0.48;
          ctx.drawImage(IMG.fx_wind, -85, -28, 170, 56);
          ctx.restore();
        }
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) {
          const o = ((time * 9 + i * 0.33) % 1) * 60;
          ctx.beginPath(); ctx.moveTo(m.x - m.vx / sp * (20 + o), m.y - m.vy / sp * (20 + o) + (i - 1) * 10);
          ctx.lineTo(m.x - m.vx / sp * (50 + o), m.y - m.vy / sp * (50 + o) + (i - 1) * 10); ctx.stroke();
        }
      }
      if (sp < 1250 || m.trail.length < 6) continue;
      const k = Math.min(1, (sp - 1250) / 800);
      ctx.lineCap = 'round';
      ctx.strokeStyle = p.color; ctx.globalAlpha = 0.28 * k; ctx.lineWidth = m.r * 1.5;
      ctx.beginPath(); ctx.moveTo(m.trail[0], m.trail[1]);
      for (let i = 2; i < m.trail.length; i += 2) ctx.lineTo(m.trail[i], m.trail[i + 1]);
      ctx.lineTo(m.x, m.y); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.globalAlpha = 0.25 * k; ctx.lineWidth = m.r * 0.4; ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  /* ---------- token shapes ---------- */
  function shapePath(c, shape, x, y, s) {
    c.beginPath();
    switch (shape) {
      case 'square': c.rect(x - s * 0.8, y - s * 0.8, s * 1.6, s * 1.6); break;
      case 'triangle': c.moveTo(x, y - s); c.lineTo(x + s, y + s * 0.8); c.lineTo(x - s, y + s * 0.8); c.closePath(); break;
      case 'star': for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? s * 0.45 : s; c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); } c.closePath(); break;
      case 'heart': c.moveTo(x, y + s * 0.85); c.bezierCurveTo(x - s * 1.4, y - s * 0.1, x - s * 0.6, y - s * 1.2, x, y - s * 0.4); c.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.4, y - s * 0.1, x, y + s * 0.85); break;
      case 'diamond': c.moveTo(x, y - s); c.lineTo(x + s * 0.8, y); c.lineTo(x, y + s); c.lineTo(x - s * 0.8, y); c.closePath(); break;
      case 'hexagon': for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; c.lineTo(x + Math.cos(a) * s, y + Math.sin(a) * s); } c.closePath(); break;
      case 'cross': { const t = s * 0.38; c.moveTo(x - t, y - s); c.lineTo(x + t, y - s); c.lineTo(x + t, y - t); c.lineTo(x + s, y - t); c.lineTo(x + s, y + t); c.lineTo(x + t, y + t); c.lineTo(x + t, y + s); c.lineTo(x - t, y + s); c.lineTo(x - t, y + t); c.lineTo(x - s, y + t); c.lineTo(x - s, y - t); c.lineTo(x - t, y - t); c.closePath(); break; }
      default: c.arc(x, y, s * 0.9, 0, 6.283);
    }
  }
  function shapeSVG(shape, color, size = 28) {
    const cvs = document.createElement('canvas'); cvs.width = cvs.height = size * 2;
    const c = cvs.getContext('2d'); c.fillStyle = color; c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = size * 0.12;
    shapePath(c, shape, size, size, size * 0.72); c.fill(); c.stroke();
    return cvs.toDataURL();
  }
  const shapeCache = {};
  function shapeImg(shape, color) { const k = shape + color; return shapeCache[k] || (shapeCache[k] = shapeSVG(shape, color)); }

  /* ---------- tags & off-screen arrows (screen space) ---------- */
  function drawTags() {
    if (!['lobby', 'countdown', 'race'].includes(state)) { drawPops(); return; }
    const leader = world.phase === 'race' ? world.standings()[0] : null;
    ctx.textBaseline = 'middle';
    const placed = [], arrows = [];
    const order = world.marbles.slice().sort((a, b) => a.x - b.x);
    for (const m of order) {
      if (m.respawnT > 0) continue;
      const p = players.get(m.id); if (!p) continue;
      let [sx, sy] = toScreen(m.x, m.y);
      const fs = Math.round(22 * S);
      const margin = 60 * S;
      const off = sx < margin || sx > W - margin || sy < margin || sy > H - margin;
      if (off && world.phase === 'race') {
        let cx = Math.max(margin, Math.min(W - margin, sx)), cy = Math.max(150 * S, Math.min(H - margin * 1.6, sy));
        if (cx > W - 380 * S && cy < 520 * S) cx = W - 380 * S;
        for (let n = 0; n < 8; n++) {
          const hit = arrows.find(a => Math.abs(a[0] - cx) < 72 * S && Math.abs(a[1] - cy) < 72 * S);
          if (!hit) break;
          cx += (cx > W / 2 ? -76 : 76) * S;
        }
        arrows.push([cx, cy]);
        ctx.fillStyle = 'rgba(15,17,48,0.85)'; ctx.strokeStyle = p.color; ctx.lineWidth = 3 * S;
        ctx.beginPath(); ctx.arc(cx, cy, 30 * S, 0, 6.283); ctx.fill(); ctx.stroke();
        ctx.fillStyle = p.color; shapePath(ctx, p.shape, cx, cy, 13 * S); ctx.fill();
        const a = Math.atan2(sy - cy, sx - cx);
        ctx.save(); ctx.translate(cx + Math.cos(a) * 40 * S, cy + Math.sin(a) * 40 * S); ctx.rotate(a);
        ctx.fillStyle = p.color; ctx.beginPath(); ctx.moveTo(10 * S, 0); ctx.lineTo(-6 * S, -9 * S); ctx.lineTo(-6 * S, 9 * S); ctx.closePath(); ctx.fill();
        ctx.restore();
        if (leader && leader !== m && !m.finished) {
          const gap = (leader.prog - m.prog) / 700;
          ctx.font = `700 ${Math.round(18 * S)}px Fredoka, sans-serif`; ctx.textAlign = 'center';
          ctx.fillStyle = '#FFF4E0'; ctx.fillText(`−${gap.toFixed(1)}s`, cx, cy + 46 * S);
        }
        continue;
      }
      let ty = sy - (m.r * cam.z * S) - 26 * S;
      ctx.font = `700 ${fs}px Nunito, sans-serif`;
      const tw = ctx.measureText(p.name).width;
      const w = tw + 42 * S, h = 34 * S;
      for (let n = 0; n < 8; n++) {
        const hit = placed.find(q => Math.abs(q[0] - sx) < (q[2] + w) / 2 + 4 * S && Math.abs(q[1] - ty) < h + 2 * S);
        if (!hit) break;
        ty = hit[1] - h - 6 * S;
      }
      placed.push([sx, ty, w]);
      if (ty < sy - (m.r * cam.z * S) - 40 * S) {
        ctx.strokeStyle = p.color; ctx.lineWidth = 2 * S; ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.moveTo(sx, ty + h / 2); ctx.lineTo(sx, sy - m.r * cam.z * S - 4 * S); ctx.stroke(); ctx.globalAlpha = 1;
      }
      ctx.fillStyle = 'rgba(15,17,48,0.82)'; ctx.strokeStyle = p.color; ctx.lineWidth = 2.5 * S;
      ctx.beginPath(); ctx.roundRect(sx - w / 2, ty - h / 2, w, h, h / 2); ctx.fill(); ctx.stroke();
      ctx.fillStyle = p.color; shapePath(ctx, p.shape, sx - w / 2 + 17 * S, ty, 8 * S); ctx.fill();
      ctx.fillStyle = '#FFF4E0'; ctx.textAlign = 'left'; ctx.fillText(p.name, sx - w / 2 + 30 * S, ty + 1);
      if (leader === m) {
        ctx.fillStyle = '#FFC83D';
        const cx = sx, cy = ty - h / 2 - 12 * S, s = 12 * S;
        ctx.beginPath(); ctx.moveTo(cx - s, cy + s * 0.6); ctx.lineTo(cx - s, cy - s * 0.4); ctx.lineTo(cx - s * 0.5, cy + s * 0.1);
        ctx.lineTo(cx, cy - s * 0.7); ctx.lineTo(cx + s * 0.5, cy + s * 0.1); ctx.lineTo(cx + s, cy - s * 0.4); ctx.lineTo(cx + s, cy + s * 0.6); ctx.closePath(); ctx.fill();
      }
      if (p.id === vipId() && world.phase !== 'race') {
        ctx.font = `${Math.round(16 * S)}px sans-serif`; ctx.textAlign = 'center'; ctx.fillText('👑', sx, ty - h / 2 - 12 * S);
      }
    }
    drawPops();
  }
  function drawPops() {
    for (const pp of pops) {
      const [sx, sy] = toScreen(pp.x, pp.y);
      const k = pp.age / pp.life;
      const sc = k < 0.15 ? 0.6 + k / 0.15 * 0.5 : 1.1 - Math.min(0.1, (k - 0.15));
      ctx.save(); ctx.translate(sx, sy - k * 60 * S); ctx.scale(sc, sc);
      ctx.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
      ctx.font = `700 ${Math.round(pp.size * S)}px Fredoka, sans-serif`; ctx.textAlign = 'center';
      ctx.lineWidth = 6 * S; ctx.strokeStyle = '#14163A'; ctx.strokeText(pp.text, 0, 0);
      ctx.fillStyle = pp.color; ctx.fillText(pp.text, 0, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  /* ======================================================================
     COMMENTARY — Captain Clatter (Section 12; text now, voice later)
     ====================================================================== */
  const Clatter = (() => {
    let lastAt = -99, hideAt = 0;
    const el = $('#clatter'), txt = $('#clatterText');
    const portrait = $('#clatterArt');
    const poseFor = key => {
      if (/winner|cup|perfect|finish|shortcut|trophy|champ/.test(key)) return 'clatter_cheer';
      if (/offtrack|air|photo|neck|gasp/.test(key)) return 'clatter_gasp';
      if (/bump|oil|wince|clack|slip/.test(key)) return 'clatter_wince';
      if (/go|countdown|flag/.test(key)) return 'clatter_flag';
      if (/vote|ready|overtake|announce|final_stretch/.test(key)) return 'clatter_announce';
      return 'clatter_reference';
    };
    const recent = {};
    function say(key, text, prio = 1) {
      if (state === 'lobby' && prio < 3) return;
      const now = performance.now() / 1000;
      if (now - lastAt < (prio >= 3 ? 0.8 : 3.2)) return;
      if (recent[key] && now - recent[key] < 14 && prio < 3) return;
      recent[key] = now; lastAt = now; hideAt = now + 2.6;
      txt.textContent = text;
      const pose = IMG[poseFor(key)] || IMG.clatter_reference;
      if (portrait && pose) {
        portrait.src = pose.src;
        portrait.hidden = false;
        portrait.parentElement.classList.add('withArt');
      }
      el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
      Audio_.play('vo_' + key, { gap: 0.5 });
    }
    function tick() { if (performance.now() / 1000 > hideAt) el.classList.remove('show'); }
    function clear() {hideAt=0;el.classList.remove('show');}
    return { say, tick, clear };
  })();

  /* ======================================================================
     PERFORMANCE GUARD (Section 5.9)
     ====================================================================== */
  const perf = { lite: false, acc: 0, n: 0 };
  function perfTick(dt) {
    perf.acc += dt; perf.n++;
    if (perf.n >= 60) {
      const avg = perf.acc / perf.n;
      if (avg > 0.02) perf.lite = true; else if (avg < 0.013) perf.lite = false;
      perf.acc = 0; perf.n = 0;
    }
  }

  /* ======================================================================
     GAME FLOW (Section 3.1)
     ====================================================================== */
  let world = null, state = 'boot', stateT = 0, raceNo = 0;
  const cup = { n: 4, race: 0, played: [], trackId: 'toybox' };
  // Phase 2: only Grand Prix is playable; other modes remain locked until tested.
  let selectedMode = 'grandprix';
  let partyLength = 0; // 0 = ordinary Grand Prix; otherwise 3/5/7-game Party Night
  let partyRun = null;
  let derbyTvHorse = 0;
  let brawlLastCue='',brawlWarningKey='';
  let attractMode = null, attractUntil = 0, attractFrom = 0;
  const cheerTime = new Map();
  const vote = { opts: [], votes: new Map(), endAt: 0, picked: -1, revealAt: 0 };
  let timeScale = 1, slowUntil = 0, lastSlow = -99;
  let replayBuf = [], photo = null, photoPending = null, endAt = 0, results = null;

  const Game = {
    toLobby() {
      state = 'lobby'; stateT = 0;
      partyRun = null;
      attractMode = null; $('#partyAttractPanel').hidden = true;
      world = new World(TRACKS.lobby(), { free: true, seed: 1 });
      art = buildArt(world.t);
      for (const p of players.values()) world.addMarble(p.id, p);
      cam.tx = 0; cam.ty = 150; cam.tz = 0.6; camSnap();
      Audio_.Music.mode('lobby');
      showScreen('lobby');
      renderLobby();
    },
    beginCup() {
      if (players.size === 0 || !MODES[selectedMode]?.available || (!partyLength && players.size < MODES[selectedMode].minPlayers)) return;
      if (partyLength && !partyRun) {
        const ids = PartyNight.plan(partyLength, players.size, (Date.now() >>> 0));
        partyRun = PartyCoordinator.start({playlist:ids, playerIds:[...players.keys()]});
      }
      if (partyRun) selectedMode = PartyCoordinator.begin(partyRun);
      if (selectedMode === 'golf') {
        MODES.golf.setup({players,seed:Date.now()>>>0,
          championship: !partyRun,onFinish:r=>this.finishGolf(r)});
        state='golf';stateT=0;showScreen('golf');
        Audio_.Music.mode('golf');Audio_.play('sfx_count_go');sendHud(true);return;
      }
      if (selectedMode === 'curling') {
        MODES.curling.setup({players,seed:Date.now()>>>0,onFinish:r=>this.finishCurling(r)});
        state='curling';stateT=0;showScreen('curling');
        Audio_.Music.mode('curling');sendHud(true);return;
      }
      if (selectedMode === 'derby') {
        if(!partyRun)this.resetNight();
        MODES.derby.setup({players,seed:Date.now()>>>0,onFinish:ranking=>this.finishDerby(ranking)});
        derbyTvHorse=0;state='derby';stateT=0;showScreen('derby');Audio_.Music.mode('derby');sendHud(true);return;
      }
      if (selectedMode === 'brawl') {
        brawlLastCue='';brawlWarningKey='';
        if(!partyRun)this.resetNight();
        MODES.brawl.setup({players,seed:Date.now()>>>0,onFinish:ranking=>this.finishBrawl(ranking)});
        state='brawl';stateT=0;showScreen('brawl');
        Audio_.Music.mode('brawl');sendHud(true);return;
      }
      if (selectedMode === 'dropzone') {
        if (!partyRun) this.resetNight();
        MODES.dropzone.setup({
          players, seed: (Date.now()>>>0),
          onFinish: (ranking) => this.finishDropZone(ranking)
        });
        state='dropzone';stateT=0;
        showScreen('dropzone');
        Audio_.Music.mode('dropzone');
        sendHud(true);
        return;
      }
      // Grand Prix still uses the original cup setup order.
      MODES[selectedMode].setup({
        resetNight: () => this.resetNight(), cup, settings,
        toVote: () => this.toVote()
      });
    },
    nextPartyGame() {
      if (!partyRun || partyRun.status !== 'ready' || state !== 'finale') return;
      this.beginCup();
    },
    finishGolf(ranking) {
      if (state !== 'golf') return;
      if (partyRun && partyRun.status === 'playing') {
        const outcome=PartyCoordinator.complete(partyRun,ranking.map(p=>p.id));
        for (const p of players.values()) p.points=outcome.totals.get(p.id)||0;
      } else {
        for (let i=0;i<ranking.length;i++) {
          const r=ranking[i],p=players.get(r.id);
          if(p){p.points=Math.max(0,50-r.strokes);p.lastPts=r.strokes;p.lastPlace=i+1;}
        }
      }
      world=new World(TRACKS.toybox(),{seed:1,free:true});art=buildArt(world.t);
      for(const p of players.values())world.addMarble(p.id,p);
      Audio_.play('crowd_cheer');this.finale();
    },
    finishCurling(ranking) {
      if(state!=='curling')return;
      if(partyRun&&partyRun.status==='playing'){
        const result=PartyCoordinator.complete(partyRun,ranking.map(p=>p.id));
        for(const p of players.values())p.points=result.totals.get(p.id)||0;
      }else{
        for(const result of ranking){
          const p=players.get(result.id);
          if(p){p.points=result.points;p.lastPts=result.endPoints.at(-1)||0;p.lastPlace=ranking.indexOf(result)+1;}
        }
      }
      world=new World(TRACKS.toybox(),{seed:1,free:true});art=buildArt(world.t);
      for(const p of players.values())world.addMarble(p.id,p);
      this.finale();
    },
    finishDerby(ranking) {
      if(state!=='derby')return;
      if(partyRun&&partyRun.status==='playing'){
        const outcome=PartyCoordinator.complete(partyRun,ranking.map(p=>p.id));
        for(const p of players.values())p.points=outcome.totals.get(p.id)||0;
      }else{
        for(const racer of ranking){const p=players.get(racer.id);
          if(p){p.points=racer.gems;p.lastPts=racer.totalProfit;p.lastPlace=ranking.indexOf(racer)+1;}
        }
      }
      world=new World(TRACKS.toybox(),{seed:1,free:true});art=buildArt(world.t);
      for(const p of players.values())world.addMarble(p.id,p);
      this.finale();
    },
    finishBrawl(ranking) {
      if(state!=='brawl')return;
      if(partyRun&&partyRun.status==='playing'){
        const result=PartyCoordinator.complete(partyRun,ranking.map(p=>p.id));
        for(const p of players.values())p.points=result.totals.get(p.id)||0;
      }else{
        for(const p of ranking){
          const player=players.get(p.id);
          if(player){player.points=p.points;player.lastPts=p.roundPoints.at(-1)||0;player.lastPlace=ranking.indexOf(p)+1;}
        }
      }
      world=new World(TRACKS.toybox(),{seed:1,free:true});
      art=buildArt(world.t);
      for(const p of players.values())world.addMarble(p.id,p);
      this.finale();
    },
    finishDropZone(ranking) {
      if (state !== 'dropzone') return;
      const ids=ranking.map(p=>p.id);
      if (partyRun && partyRun.status==='playing') {
        const finished=PartyCoordinator.complete(partyRun,ids);
        for(const p of players.values())p.points=finished.totals.get(p.id)||0;
      } else {
        for(const p of ranking) {
          const original=players.get(p.id);
          if(original){original.points=p.score;original.lastPts=p.results[p.results.length-1]||0;
            original.lastPlace=ranking.indexOf(p)+1;}
        }
      }
      // The existing winner presentation expects a racing World with a finish
      // arch. Swap from the lobby bowl to a display-only Toy Box track before
      // handing off, without changing the completed Drop Zone score.
      world = new World(TRACKS.toybox(),{seed:1,free:true});
      art = buildArt(world.t);
      for(const p of players.values())world.addMarble(p.id,p);
      this.finale();
    },
    toVote() {
      state = 'vote'; stateT = 0;
      MODES.grandprix.startRound({cup,trackInfo:TRACK_INFO,vote,players,now:performance.now()/1000});
      showScreen('vote'); renderVote();
      Audio_.Music.mode('lobby');
      Clatter.say('vote', 'Pick your track, racers!', 3);
      sendHud(true);
    },
    castVote(pid, i) {
      if (!MODES.grandprix.castVote({state,vote,pid,index:i})) return;
      Audio_.play('sfx_ui_tap'); renderVote();
    },
    resolveVote() {
      MODES.grandprix.resolveVote({vote,now:performance.now()/1000});
      Audio_.play('sfx_item_pickup');
      renderVote();
    },
    startRace(trackId) {
      if (players.size === 0) return;
      raceNo++;
      cup.trackId = trackId || cup.trackId || 'toybox';
      const seed = (Date.now() & 0xffff) + raceNo * 977;
      world = MODES.grandprix.createRace({WorldCtor:World,tracks:TRACKS,
        trackId:cup.trackId,seed,settings,players,random:rng(seed)});
      art = buildArt(world.t);
      state = 'countdown'; stateT = 0;
      replayBuf = []; photo = null; photoPending = null; endAt = 0; results = null;
      $('#trackName').textContent = world.t.meta.name;
      showScreen('race');
      Audio_.Music.mode('quiet');
      Clatter.say('ready', 'Marbles at the ready…', 3);
      this.count = 0;
    },
    endRace() {
      const st = world.standings();
      results = MODES.grandprix.roundResults({standings:st,players,points:POINTS});
      cup.race++; cup.played.push(cup.trackId);
      if (photo) { state = 'photo'; stateT = 0; Audio_.play('sfx_photo_shutter'); Clatter.say('photo', "It's a photo finish!", 3); }
      else this.showResults();
    },
    showResults() {
      state = 'results'; stateT = 0;
      showScreen('results');
      renderResults();
      Audio_.Music.mode('lobby');
      Audio_.play('crowd_cheer');
      const winner = players.get(results[0]);
      if (winner) Clatter.say('winner', `What a race! ${winner.name} takes it!`, 3);
      const [fx, fy] = [world.t.arches[0].x, world.t.arches[0].y];
      emit('confetti', fx, fy - 260, 120, { speed: 700, g: 900, life: 2.6, size: 14, colors: ['#FF3B5C', '#FFD23F', '#4CC9F0', '#3DDC97', '#FF5FA2', '#FFF4E0'], drag: 0.97 });
    },
    finale() {
      if (partyRun && partyRun.status === 'playing') {
        const ranking = MODES.grandprix.finalResults(players.values()).map(p=>p.id);
        const outcome = PartyCoordinator.complete(partyRun, ranking);
        for (const p of players.values()) p.points = outcome.totals.get(p.id) || 0;
      }
      state = 'finale'; stateT = 0;
      const list = [...players.values()];
      const aw = giveAwards(list);
      for (const p of list) p.award = aw.get(p.id);
      showScreen('finale');
      renderFinale();
      Audio_.play('sfx_trophy');
      Clatter.say('cup', partyRun && partyRun.status !== 'complete' ? 'One game down! Ready for the next?' : 'Ladies and gentlemen — your Marble Rush champion!', 3);
      const next = $('#btnNewNight');
      if (next) next.textContent = partyRun && partyRun.status === 'ready' ? 'Next Party Game' : 'New night';
      sendHud(true);
    },
    resetNight() { for (const p of players.values()) { p.points = 0; p.races = 0; p.wins = 0; p.tot = { perfect: 0, offs: 0, maxAir: 0, bumps: 0, climb: 0, topSpeed: 0 }; } },

    onJoin(pid, name, swirl) {
      let p = players.get(pid);
      if (p) { p.connected = true; p.name = cleanName(name); if (swirl != null) p.swirl = swirl | 0; }
      else {
        if (partyRun) { Net.to(pid, {t:'full'}); return; } // Party Night roster stays fixed
        p = makePlayer(pid, name, { swirl: swirl != null ? swirl | 0 : undefined });
        if (!p) { Net.to(pid, { t: 'full' }); return; }
        if (state === 'lobby' && world) world.addMarble(p.id, p);
        Audio_.play('sfx_item_pickup');
      }
      if (state === 'lobby') renderLobby();
      sendHud(true);
    },
    onLeave(pid) {
      const p = players.get(pid); if (!p) return;
      p.connected = false; p.leftAt = performance.now();
      if (state === 'lobby') renderLobby();
    },
    onInput(pid, k) {
      if (!world) return;
      const p = players.get(pid); if (!p) return;
      if (!['lobby','countdown','race','dropzone','brawl','derby','curling','golf'].includes(state)) return;
      if (state==='golf') {MODES.golf.onInput(pid,k);return;}
      if (state==='curling') {MODES.curling.onInput(pid,k);return;}
      if (state==='derby') {MODES.derby.onInput(pid,k);return;}
      if (state==='brawl') {MODES.brawl.onInput(pid,k);return;}
      if (state==='dropzone') {MODES.dropzone.onInput(pid,k);return;}
      if (selectedMode === 'grandprix') MODES.grandprix.onInput({world,pid,k});
      else MODES[selectedMode]?.onInput(pid,k);
    },
    onAction(pid, a, v) {
      const isVip = pid === vipId() || pid === 'tv';
      if (a === 'swirl' && players.get(pid)) { players.get(pid).swirl = (v | 0) % SWIRLS.length; if (state === 'lobby') renderLobby(); return; }
      if (a === 'vote') { this.castVote(pid, v | 0); return; }
      if (a === 'cheer' && players.has(pid) && state === 'race') {
        const now = performance.now();
        if (now - (cheerTime.get(pid) || -4000) < 3000) return;
        cheerTime.set(pid,now);
        const m = world && world.get(pid);
        if (m) emit('confetti',m.x,m.y-75,18,{speed:210,g:380,life:.9,size:8,
          colors:['#FF3B5C','#FFD23F','#4CC9F0'],drag:.96});
        Audio_.play('crowd_cheer');
        return;
      }
      if (a === 'mode' && isVip && state === 'lobby' && typeof v === 'string' && MODES[v]?.available) {
        selectedMode = v; Audio_.play('sfx_ui_tap'); renderLobby(); sendHud(true); return;
      }
      // Host may abandon any active game, including countdown/vote/Grand Prix.
      // Resetting Party Night here prevents a partial mode being scored.
      if (a === 'lobby' && isVip && !['boot','lobby'].includes(state)) {
        partyLength=0;partyRun=null;
        this.toLobby();sendHud(true);return;
      }




      if (a === 'party' && isVip && state === 'lobby' && [0,3,5,7].includes(v)) {
        partyLength = v; Audio_.play('sfx_ui_tap'); renderLobby(); sendHud(true); return;
      }
      // Future modes receive only scoped, bounded actions from known players;
      // player choices are validated in that mode, never by the relay.
      if (state === 'golf' && players.has(pid) && ['left','right','aim','power','powerup','powerdown','shoot','preview','cheer'].includes(a)) {
        if(MODES.golf.onAction(pid,a,v))Audio_.play(a==='shoot'?'sfx_golf_putt':'sfx_ui_tap',{gap:.07,vol:.45});
        sendHud(true);return;
      }
      if (state === 'curling' && players.has(pid) && ['left','right','aim','power','powerup','powerdown','throw','sweep','curlleft','curlright','predict'].includes(a)) {if(MODES.curling.onAction(pid,a,v)&&['throw','sweep'].includes(a))Audio_.play(a==='throw'?'sfx_golf_putt':'sfx_curl_sweep',{gap:.15,vol:.55});sendHud(true);return;}
      if (state === 'derby' && players.has(pid) && ['stake','bet','cheer'].includes(a)) {if(MODES.derby.onAction(pid,a,v)&&a==='cheer')Audio_.play('sfx_derby_cheer',{gap:.35,vol:.6});sendHud(true);return;}
      if (state === 'brawl' && players.has(pid) && ['left','right','aim','ram','anchor','recover','spectate'].includes(a)) {
        const accepted=MODES.brawl.onAction(pid,a,v);
        if(accepted&&a==='ram')Audio_.play('sfx_brawl_ram',{gap:.16,vol:.85});
        if(accepted&&a==='recover')Audio_.play('sfx_bumper',{gap:.14,vol:.95});
        sendHud(true);return;
      }
      if (state === 'dropzone' && players.has(pid) && ['left','right','aim','drop','predict'].includes(a)) {
        if(MODES.dropzone.onAction(pid,a,v)&&a==='drop')Audio_.play('sfx_drop_release',{gap:.12,vol:.75});
        sendHud(true);
        return;
      }
      if (!isVip) return;
      if (a === 'start' && state === 'lobby') this.beginCup();
      else if ((a === 'next' || a === 'again') && state === 'results') {
        if(MODES.grandprix.nextStep({cup})==='finale')this.finale();
        else this.toVote();
      }
      else if (a === 'skip' && state === 'vote' && vote.picked < 0) this.resolveVote();
      else if (a === 'lobby' && ['results', 'finale'].includes(state)) this.toLobby();
      else if (a === 'finale' && state === 'results') this.finale();
      else if (a === 'newnight' && state === 'finale') {
        if (partyRun && partyRun.status === 'ready') this.nextPartyGame();
        else { partyLength = 0; this.resetNight(); this.toLobby(); }
      }
      else if (a === 'cpu' && state === 'lobby') addCpu();
    },
  };

  function addCpu() {
    if (players.size >= 8) return;
    const used = new Set([...players.values()].map(p => p.name));
    const name = CPU_NAMES.find(n => !used.has(n)) || 'Bot';
    const p = makePlayer('cpu' + Math.random().toString(36).slice(2, 7), name, { cpu: true });
    if (p && world && state === 'lobby') world.addMarble(p.id, p);
    renderLobby();
  }
  function addKeyboard() {
    const usedSets = new Set([...players.values()].filter(p => p.keys != null).map(p => p.keys));
    const ks = KEYSETS.findIndex((_, i) => !usedSets.has(i));
    if (ks < 0 || players.size >= 8) return;
    const p = makePlayer('kb' + ks, 'Player ' + (players.size + 1), { keys: ks });
    if (p && world && state === 'lobby') world.addMarble(p.id, p);
    renderLobby();
  }
  function removePlayer(id) {
    players.delete(id);
    if (world && state === 'lobby') world.removeMarble(id);
    renderLobby();
  }

  /* ---------- CPU racers ---------- */
  function botTick() {
    MODES.grandprix.botTick({state,players,vote,world,MR,
      now:performance.now()/1000,castVote:(pid,i)=>Game.castVote(pid,i)});
  }

  /* ---------- keyboard racers (local testing) ---------- */
  addEventListener('keydown', e => {
    if (e.repeat) return;
    if (state === 'boot') return;
    for (const p of players.values()) {
      if (p.keys == null) continue;
      const ks = KEYSETS[p.keys];
      if (e.code === ks.press) { e.preventDefault(); Game.onInput(p.id, 'p'); }
      if (e.code === ks.item) { e.preventDefault(); Game.onInput(p.id, 'i'); }
    }
    if (e.code === 'KeyM') { settings.music = !settings.music; Audio_.setMusic(settings.music); save('mr_settings', settings); }
  });
  addEventListener('keyup', e => {
    for (const p of players.values()) {
      if (p.keys == null) continue;
      if (e.code === KEYSETS[p.keys].press) Game.onInput(p.id, 'r');
    }
  });

  /* ---------- events → sound, particles, commentary ---------- */
  function handleEvents() {
    for (const e of world.events) {
      const p = players.get(e.id), name = p ? p.name : '';
      const m = e.id ? world.get(e.id) : null;
      switch (e.type) {
        case 'impact':
          if (e.mat === 'plate') {
            Audio_.play('xylo', { note: e.note, gap: 0.04, vol: Math.min(1, e.v / 500) });
            const s = world.t.stairs.find(s => s.note === e.note && Math.abs(s.y1 - e.y) < 6 && e.x >= Math.min(s.x1, s.x2) - 2 && e.x <= Math.max(s.x1, s.x2) + 2);
            if (s) s.flash = 0.3;
            emit('star', e.x, e.y - 10, 3, { speed: 160, life: 0.5, size: 8, colors: [NOTE_COLORS[e.note], '#fff'], g: 300 });
          } else if (e.v > 520) {
            Audio_.play('land_hard', { vol: Math.min(1, e.v / 1200), gap: 0.05 });
            emit('dust', e.x, e.y, 6, { speed: 120, life: 0.6, size: 7, color: '#E7C9A0', dir: -Math.PI / 2, spread: 2.4 });
            if (m) m.squash = 1;
            if (e.v > 900) cam.trauma = Math.min(1, cam.trauma + 0.3);
          } else Audio_.play('land_soft', { vol: e.v / 520, gap: 0.05 });
          break;
        case 'clack':
          Audio_.play('clack', { vol: Math.min(1, e.v / 700), gap: 0.02 });
          emit('star', e.x, e.y, e.pass ? 3 : 4, { speed: 200, life: 0.3, size: 6, color: '#fff' });
          if (e.bertha && e.v > 400) { cam.trauma = Math.min(1, cam.trauma + 0.5); slowMo(); Clatter.say('big', "Big Bertha's coming through!", 2); }
          else if (e.v > 380 && Math.random() < 0.08) Clatter.say('bump', 'Oof! Marble on marble!');
          break;
        case 'boost': {
          Audio_.play('sfx_boost', { gap: 0.02, vol: e.sup ? 1 : 0.7 });
          const a = Math.atan2(-e.dy, -e.dx);
          emit('spark', e.x, e.y, e.sup ? 26 : 12, { dir: a, spread: e.sup ? 1.2 : 0.9, speed: e.sup ? 620 : 420, life: e.sup ? 0.5 : 0.35, size: e.sup ? 13 : 10, colors: [p ? p.color : '#fff', '#FFE9A0', '#ffffff'] });
          emit('ring', e.x, e.y, 1, { speed: 0, life: 0.35, size: e.sup ? 20 : 10, color: e.sup ? '#FFD23F' : p ? p.color : '#fff' });
          if (e.sup) { emit('star', e.x, e.y, 8, { speed: 320, life: 0.5, size: 10, colors: ['#FFD23F', '#FFF4E0'] }); if (!p || !p.cpu) pop('SUPER!', e.x, e.y - 46, '#FFD23F', 30); }
          break;
        }
        case 'empty': break;
        case 'bumper':
          Audio_.play('sfx_bumper');
          cam.trauma = Math.min(1, cam.trauma + 0.2);
          emit('ring', e.x, e.y, 1, { speed: 0, life: 0.4, size: 22, color: '#FFD23F' });
          emit('star', e.x, e.y, 8, { speed: 360, life: 0.5, size: 9, colors: ['#FFD23F', '#FF3B5C', '#fff'] });
          break;
        case 'pad':
          Audio_.play('sfx_boostpad');
          emit('spark', e.x, e.y, 14, { speed: 380, life: 0.4, size: 10, colors: ['#7FE8FF', '#ffffff'] });
          break;
        case 'pickup':
          Audio_.play('sfx_item_pickup');
          emit('star', e.x, e.y, 14, { speed: 300, life: 0.6, size: 10, colors: ['#FFC83D', '#FF5FA2', '#4CC9F0', '#fff'] });
          if (world.t.meta.theme === 'candy') {
            emit('sprite_sprinkle', e.x, e.y, 3, { speed: 100, g: 160, life: 0.6, size: 11 });
          }
          if (p) pop(ITEM_NAME[e.item], e.x, e.y - 30, '#FFE9A0', 26);
          break;
        case 'item': {
          const snd = { turbo: 'sfx_item_turbo', jelly: 'sfx_item_jelly', oil: 'sfx_item_oil', big: 'sfx_item_big', bubble: 'sfx_item_bubble' }[e.item];
          Audio_.play(snd);
          emit('ring', e.x, e.y, 2, { speed: 0, life: 0.5, size: 16, color: { turbo: '#4CC9F0', jelly: '#3DDC97', oil: '#8B5CF6', big: '#FF8A3D', bubble: '#FF5FA2' }[e.item] });
          if (e.item === 'oil') Clatter.say('oil', 'Slippery stuff out there!');
          if (e.item === 'big') Clatter.say('big', "Big Bertha's coming through!");
          if (e.item === 'turbo') emit('spark', e.x, e.y, 20, { speed: 600, life: 0.5, size: 12, colors: ['#4CC9F0', '#fff'] });
          break;
        }
        case 'slip':
          Audio_.play('sfx_oil_slip');
          emit('blob', e.x, e.y, 8, { speed: 200, life: 0.6, size: 6, color: '#1b1430', g: 900 });
          if (world.t.meta.theme === 'candy') {
            emit('sprite_splash', e.x, e.y, 1, { speed: 0, g: 0, life: 0.45, size: 22 });
          }
          break;
        case 'poof':
          if (e.reason === 'off') { Audio_.play('sfx_offtrack'); Clatter.say(Math.random() < 0.5 ? 'offtrack' : 'offtrack_2', Math.random() < 0.5 ? 'Whoops! Off the rails!' : "And they're airborne! …And they're gone!"); }
          else Audio_.play('sfx_respawn');
          emit('dust', e.x, e.y, 10, { speed: 160, life: 0.7, size: 12, color: '#FFF4E0' });
          emit('star', e.x, e.y, 6, { speed: 220, life: 0.6, size: 8, color: '#FFC83D' });
          emit('sprite_poof', e.x, e.y, 1, { speed: 0, life: 0.55, size: 26 });
          if (e.reason === 'off' && p) pop('WHOOPS!', e.x, e.y - 20, '#FF8A75', 32);
          break;
        case 'appear':
          Audio_.play('sfx_respawn', { gap: 0.1 });
          if (m) m.appearT = 0.3;
          emit('star', e.x, e.y, 10, { speed: 200, life: 0.5, size: 9, colors: [p ? p.color : '#fff', '#fff'] });
          break;
        case 'perfect':
          Audio_.play('sfx_perfect_start');
          emit('star', e.x, e.y, 16, { speed: 320, life: 0.7, size: 11, colors: ['#FFC83D', '#fff'] });
          pop('PERFECT START!', e.x, e.y - 40, '#FFC83D', 30);
          Clatter.say('perfect', `Ooh, perfect start from ${name}!`, 2);
          break;
        case 'early':
          pop('Too early!', m ? m.x : 0, m ? m.y - 40 : 0, '#FF8A75', 26);
          break;
        case 'go':
          Audio_.play('sfx_count_go'); Audio_.play('sfx_gate_drop');
          Audio_.Music.mode('race');
          break;
        case 'bigair':
          if (e.t > 0.95) slowMo();
          if (Math.random() < 0.4) Clatter.say('air', 'Look at the air on that!');
          break;
        case 'shortcut':
          Audio_.play('sfx_perfect_start', { gap: 0.3 });
          emit('star', e.x, e.y, 14, { speed: 300, life: 0.6, size: 10, colors: ['#FFC83D', '#fff'] });
          pop('SHORTCUT!', e.x, e.y - 40, '#FFC83D', 30);
          Clatter.say('shortcut', `${name} takes the shortcut!`, 2);
          break;
        case 'looptop':
          if (Math.random() < 0.25) Clatter.say('loop', 'Round the loop they go!');
          break;
        case 'overtake':
          if (e.rank === 1 && world.time - world.goTime > 4) Clatter.say('overtake', `${name} takes the lead!`);
          break;
        case 'finish': {
          Audio_.play('sfx_finish');
          emit('confetti', e.x, e.y - 60, 40, { speed: 500, g: 900, life: 1.8, size: 12, colors: [p ? p.color : '#fff', '#FFD23F', '#fff'] });
          emit('sprite_star_burst', e.x, e.y - 75, 1, { speed: 0, g: 0, life: 0.7, size: 34 });
          const ord = ['1st', '2nd', '3rd'][e.place - 1] || e.place + 'th';
          toast(`${ord}  ${name}  ${e.t.toFixed(2)}s`, p ? p.color : '#fff');
          if (e.place === 1) Clatter.say('winner', `${name} wins it!`, 3);
          if (e.place === 2) {
            const first = world.marbles.find(x => x.place === 1);
            if (first && e.t - first.finishTime <= 0.3) photoPending = world.time + 0.6;
          }
          break;
        }
        default: break;
      }
    }
    world.events.length = 0;
  }
  function slowMo() {
    if (settings.reduce) return;
    const now = performance.now() / 1000;
    if (now - lastSlow < 6) return;
    lastSlow = now; slowUntil = now + 0.35;
    Audio_.play('sfx_slowmo_in');
  }

  /* ---------- camera targeting ---------- */
  function aimCamera(dt) {
    if (state === 'lobby') { cam.tx = 0; cam.ty = 150; cam.tz = 0.6 * Math.min(1, W / H / (16 / 9)); return; }
    if (state === 'countdown' && stateT < 3.8) {
      // fly-through from finish to start
      const T = world.t, k = Math.min(1, stateT / 3.6);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const d = T.finishDist * (1 - e);
      let i = 0; while (i < T.cum.length - 1 && T.cum[i + 1] < d) i++;
      const w = T.way[i];
      cam.tx = w.x; cam.ty = w.y; cam.tz = 0.62;
      if (stateT < 0.05) camSnap();
      return;
    }
    if (state === 'photo' || state === 'results' || state === 'finale') {
      const a = world.t.arches[0];
      cam.tx = a.x; cam.ty = a.y - 90; cam.tz = state === 'photo' ? 1.25 : 0.9;
      return;
    }
    const ms = world.marbles.filter(m => m.respawnT <= 0);
    if (!ms.length) return;
    const st = world.standings();
    const leader = st.find(m => !m.finished && m.respawnT <= 0) || st[0];
    // Frame every active racer, including stragglers. Do not drop a marble
    // from the shot merely because its progress falls far behind the leader.
    const consider = ms.filter(m => !m.finished);
    if (!consider.length) consider.push(leader);
    let sx = 0, sy = 0, wsum = 0, minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const m of consider) {
      const w = m === leader ? 2 : 1;
      sx += m.x * w; sy += m.y * w; wsum += w;
      minX = Math.min(minX, m.x); maxX = Math.max(maxX, m.x); minY = Math.min(minY, m.y); maxY = Math.max(maxY, m.y);
    }
    // Elastic broadcast framing: retain the close v0.4 pack shot when racers
    // are together, but expand to include the whole field if one falls behind.
    const aspect = W / H;
    const allMinX = minX, allMaxX = maxX, allMinY = minY, allMaxY = maxY;
    const ahead = Math.max(...consider.map(m => m.prog));
    const behind = Math.min(...consider.map(m => m.prog));
    const separation = ahead - behind;
    const wide = Math.max(0, Math.min(1, (separation - 650) / 950));
    // Retain the largest close group as the zoom-in target.
    let anchor = leader, bestN = 0;
    for (const a of consider) {
      const n = consider.filter(m => a.prog - m.prog >= 0 && a.prog - m.prog < 1100).length;
      if (n > bestN || (n === bestN && a.prog > anchor.prog)) { bestN = n; anchor = a; }
    }
    const pack = consider.filter(m => anchor.prog - m.prog >= -60 && anchor.prog - m.prog < 1100);
    let packMinX = Infinity, packMaxX = -Infinity, packMinY = Infinity, packMaxY = -Infinity;
    let packX = 0, packY = 0, packW = 0;
    for (const m of pack) {
      const w = m === leader ? 2 : 1;
      packX += m.x * w; packY += m.y * w; packW += w;
      packMinX = Math.min(packMinX, m.x); packMaxX = Math.max(packMaxX, m.x);
      packMinY = Math.min(packMinY, m.y); packMaxY = Math.max(packMaxY, m.y);
    }
    // Blend both camera centre and bounds so that zooming remains smooth.
    const lerp = (a, b) => a + (b - a) * wide;
    minX = lerp(packMinX, allMinX); maxX = lerp(packMaxX, allMaxX);
    minY = lerp(packMinY, allMinY); maxY = lerp(packMaxY, allMaxY);
    const z = Math.min((1080 * aspect * 0.8) / (maxX - minX + 360),
                       (1080 * 0.78) / (maxY - minY + 300));
    const look = 0.25 * (1 - wide);
    cam.tx = lerp(packX / packW, (allMinX + allMaxX) * 0.5) + anchor.vx * look * 0.6;
    cam.ty = lerp(packY / packW, (allMinY + allMaxY) * 0.5) + anchor.vy * look * 0.6;
    const sp = Math.hypot(leader.vx, leader.vy);
    cam.tz = Math.max(0.42, Math.min(1.3, z)) * (1 - Math.min(0.06, sp / 30000));
    void dt;
  }

  /* ---------- HUD ---------- */
  function showScreen(name) {
    if (name !== 'lobby') {
      attractMode = null;
      const preview = $('#partyAttractPanel');
      if (preview) preview.hidden = true;
    }
    if(name!=='lobby')Audio_.stopIntro();
    // No previous finale announcement may cover the next game's new UI.
    if(name!=='finale'&&name!=='results')Clatter.clear();
    Audio_.setRoll(0,0);
    const isPartyStage=['derby','dropzone','brawl','curling','golf'].includes(name);
    const visibleScreen=isPartyStage?'party-stage':name;
    for (const el of document.querySelectorAll('.screen')) el.hidden = el.dataset.screen !== visibleScreen;
    $('#raceHud').hidden = !(name === 'race');
    // A single new stage is exclusive: no legacy game canvas exists behind it.
    if(isPartyStage)MarblePartyUI.enter(name);
    // This is host-only TV navigation and remains available during all modes.
    const lobbyBtn=$('#partyBackLobby');
    lobbyBtn.hidden = !['dropzone','brawl','derby','curling','golf','race','vote','results','finale'].includes(name);
    lobbyBtn.dataset.navState=name;
    // Race leaderboard is top-right; it MUST NOT be covered by navigation.
  }
  let lastStandKey = '';
  function updateRaceHud() {
    if (state !== 'race' && state !== 'countdown') return;
    const t = Math.max(0, world.time - world.goTime);
    $('#raceTime').textContent = state === 'race' ? fmtTime(t) : '0:00.0';
    const st = world.standings();
    const box = $('#standings');
    const key = st.map(m => m.id).join();
    if (box.childElementCount !== st.length) {
      box.innerHTML = '';
      for (const m of st) {
        const p = players.get(m.id);
        const row = document.createElement('div');
        row.className = 'srow'; row.dataset.id = m.id;
        row.innerHTML = `<span class="spos"></span><img class="sshape" alt=""><span class="sname"></span><span class="sitem"></span>`;
        row.querySelector('img').src = shapeImg(p.shape, p.color);
        row.querySelector('.sname').textContent = p.name;
        row.style.setProperty('--pc', p.color);
        box.appendChild(row);
      }
    }
    for (const row of box.children) {
      const m = world.get(row.dataset.id); if (!m) continue;
      row.style.transform = `translateY(${(m.rank - 1) * 100}%)`;
      row.querySelector('.spos').textContent = m.rank;
      const slot = row.querySelector('.sitem');
      const artKey = m.item ? 'item_' + m.item : '';
      const icon = !m.finished && artKey ? IMG[artKey] : null;
      const key = m.finished ? 'finished' : icon ? artKey + ':image' : artKey + ':fallback';
      if (slot.dataset.key !== key) {
        slot.dataset.key = key;
        if (icon) {
          const im = document.createElement('img');
          im.src = icon.src; im.alt = ITEM_NAME[m.item] || 'Item';
          slot.replaceChildren(im);
          slot.title = im.alt;
        } else {
          slot.textContent = m.finished ? '🏁' : m.item ? ITEM_ICON[m.item] : '';
          slot.title = m.item ? ITEM_NAME[m.item] : '';
        }
      }
      row.classList.toggle('fin', m.finished);
    }
    if (key !== lastStandKey) lastStandKey = key;
  }
  function fmtTime(t) { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; }
  let toastT = null;
  function toast(text, color) {
    const el = $('#toast'); el.textContent = text; el.style.setProperty('--pc', color);
    el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('show'), 2200);
  }
  function countdownShow(text, go = false) {
    const el = $('#countdown'); el.textContent = text; el.classList.toggle('go', go);
    el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  }

  function showAttract(id) {
    if (state !== 'lobby' || !MODES[id]) return;
    if (attractMode === id && performance.now() < attractUntil) return;
    attractMode = id;
    attractFrom = performance.now();
    attractUntil = attractFrom + PartyAttract.maxSeconds * 1000;
    $('#partyAttractPanel').hidden = false;
    const canvas=$('#partyAttractCanvas');
    if(canvas)canvas.dataset.previewMode=id;
  }
  function renderModePicker() {
    const box = $('#partyModeCards');
    if (!box) return;
    // Identical selection path for TV and VIP phone, gated against unfinished modes.
    box.replaceChildren();
    for (const mode of Object.values(MODES)) {
      const card = document.createElement('button');
      card.className = 'partyModeCard';
      card.dataset.mode = mode.id;
      card.type = 'button';
      card.dataset.locked = String(!mode.available);
      card.disabled=!mode.available;
      card.setAttribute('aria-disabled', String(!mode.available));
      card.setAttribute('aria-pressed', String(mode.id === selectedMode));
      card.setAttribute('aria-label', mode.name + (mode.available ? '' : ', coming soon'));
      const icon = document.createElement('span'); icon.className = 'modeIcon'; icon.textContent = mode.icon;
      const info = document.createElement('span');
      const name = document.createElement('strong'); name.textContent = mode.name;
      const sub = document.createElement('small'); sub.textContent = mode.available ? mode.tagline : 'Coming in a later phase';
      info.append(name, sub); card.append(icon, info);
      card.onmouseenter = () => showAttract(mode.id);
      card.onfocus = () => showAttract(mode.id);
      card.onclick = () => {
        showAttract(mode.id);
        if (mode.available) Game.onAction('tv', 'mode', mode.id);
      };
      box.appendChild(card);
    }
    applyPartyArt();
    $('#partyModeStatus').textContent = partyLength ? 'Party Night preview: '+partyLength+' rounds · ready modes repeat' :
      'UI REBUILD v2 · all five Party Pack modes rebuilt · final visual QA pending';
    const opts = $('#partyNightOptions');
    if (opts) for (const b of opts.querySelectorAll('[data-party]')) {
      b.setAttribute('aria-pressed', String(Number(b.dataset.party) === partyLength));
    }
  }
  function renderLobby() {
    renderModePicker();
    const box = $('#lobbyPlayers'); box.innerHTML = '';
    const vip = vipId();
    for (let i = 0; i < 8; i++) {
      const p = [...players.values()].find(q => q.tok === i);
      const card = document.createElement('div');
      card.className = 'pcard' + (p ? '' : ' empty');
      if (p) {
        card.style.setProperty('--pc', p.color);
        const pal = SWIRLS[p.swirl % SWIRLS.length];
        card.innerHTML = `<div class="pmarble" style="--a:${pal[0]};--b:${pal[1]};--c:${pal[2]}"></div>
          <div class="pinfo"><div class="pname"><img alt="" src="${shapeImg(p.shape, p.color)}"><span></span>${p.id === vip ? ' <b class="crown">👑</b>' : ''}</div>
          <div class="psub">${p.cpu ? 'CPU racer' : p.keys != null ? 'Keys: ' + KEYSETS[p.keys].label : p.connected ? 'Phone connected' : 'Reconnecting…'}</div></div>
          ${p.cpu || p.keys != null ? '<button class="pdel" aria-label="Remove racer">×</button>' : ''}`;
        card.querySelector('.pname span').textContent = p.name;
        const del = card.querySelector('.pdel'); if (del) del.onclick = () => removePlayer(p.id);
      } else card.innerHTML = '<div class="pempty">Waiting for a racer</div>';
      box.appendChild(card);
    }
    const required = partyLength ? 1 : MODES[selectedMode].minPlayers;
    $('#btnStart').disabled = players.size < required;
    $('#btnStart').textContent = partyLength ? 'Start Party Night' :
      players.size < required ? 'Need '+required+' players' :
      selectedMode === 'brawl' ? 'Start Bowl Brawl' :
      selectedMode === 'dropzone' ? 'Start Drop Zone' :
      selectedMode === 'golf' ? 'Start Marble Golf' :
      selectedMode === 'curling' ? 'Start Curling' :
      selectedMode === 'derby' ? 'Start Derby' : 'Start the Cup';
    $('#btnCpu').disabled = players.size >= 8;
    $('#btnKb').disabled = players.size >= 8 || [...players.values()].filter(p => p.keys != null).length >= 4;
    for (const b of document.querySelectorAll('[data-set]')) {
      const k = b.dataset.set;
      b.setAttribute('aria-pressed', k === 'fx' || k === 'cup' ? 'true' : String(!!settings[k]));
      if (k === 'fx') b.querySelector('em').textContent = settings.fx === 'lite' ? 'Lite' : settings.fx === 'full' ? 'Full' : 'Auto';
      if (k === 'cup') b.querySelector('em').textContent = settings.cup === 1 ? '1 race' : settings.cup === 7 ? 'Grand Prix (7)' : settings.cup + ' races';
    }
  }
  function renderVote() {
    $('#voteSub').textContent = `Race ${cup.race + 1} of ${cup.n}`;
    const box = $('#voteCards'); box.innerHTML = '';
    vote.opts.forEach((t, i) => {
      const th = THEMES[t.theme];
      const card = document.createElement('button');
      card.className = 'vcard' + (vote.picked === i ? ' won' : vote.picked >= 0 ? ' lost' : '');
      card.style.setProperty('--g1', th.bg[0]); card.style.setProperty('--g2', th.bokeh[0]); card.style.setProperty('--g3', th.bokeh[1]);
      card.innerHTML = `<span class="vnum">${i + 1}</span><span class="vicon">${th.icon}</span><span class="vname"></span><span class="vblurb"></span><span class="vvoters"></span>`;
      card.querySelector('.vname').textContent = t.name;
      card.querySelector('.vblurb').textContent = t.blurb;
      const vv = card.querySelector('.vvoters');
      for (const [pid, v] of vote.votes) {
        if (v !== i) continue;
        const p = players.get(pid); if (!p) continue;
        const im = document.createElement('img'); im.alt = p.name; im.src = shapeImg(p.shape, p.color); vv.appendChild(im);
      }
      card.onclick = () => Game.castVote('tv', i);
      box.appendChild(card);
    });
    $('#btnSkipVote').hidden = vote.picked >= 0;
  }
  function renderResults() {
    const box = $('#resultRows'); box.innerHTML = '';
    results.forEach((id, i) => {
      const p = players.get(id); if (!p) return;
      const row = document.createElement('div');
      row.className = 'rrow' + (i === 0 ? ' first' : '');
      row.style.setProperty('--pc', p.color);
      row.style.animationDelay = (i * 0.08) + 's';
      row.innerHTML = `<span class="rpos">${['1st', '2nd', '3rd'][i] || (i + 1) + 'th'}</span><img alt="" src="${shapeImg(p.shape, p.color)}"><span class="rname"></span>
        <span class="rtime">${p.lastTime != null ? p.lastTime.toFixed(2) + 's' : 'DNF'}</span><span class="rpts">+${p.lastPts}</span><span class="rtot">${p.points}</span>`;
      row.querySelector('.rname').textContent = p.name;
      if (i < 3) {
        const medal = IMG[['medal_gold', 'medal_silver', 'medal_bronze'][i]];
        if (medal) {
          const im = document.createElement('img');
          im.src = medal.src; im.alt = '';
          im.className = 'rmedal';
          row.querySelector('.rpos').prepend(im);
        }
      }
      box.appendChild(row);
    });
    $('#raceCount').textContent = `Race ${cup.race} of ${cup.n} · Cup points`;
    const done = cup.race >= cup.n;
    $('#btnAgain').textContent = done ? 'Crown the champion' : 'Next race';
    $('#btnFinale').hidden = done;
  }
  function renderFinale() {
    const awardTrophy = $('#finaleTrophy');
    if (awardTrophy && IMG.trophy_cup) {
      const trophyImg = document.createElement('img');
      trophyImg.src = IMG.trophy_cup.src;
      trophyImg.alt = 'Marble Rush championship trophy';
      awardTrophy.replaceChildren(trophyImg);
    }
    const list = [...players.values()].sort((a, b) => b.points - a.points || b.wins - a.wins);
    const champ = list[0];
    $('#champName').textContent = champ ? champ.name : '';
    $('#champName').style.color = champ ? champ.color : '';
    const box = $('#awardRows'); box.innerHTML = '';
    if(typeof PartyPresentation !== 'undefined'){
      const root=$('[data-screen="finale"]');
      if(['derby','dropzone','brawl','curling','golf'].includes(selectedMode))
        PartyPresentation.applyFinale(root,selectedMode,list,settings.reduce);
      else PartyPresentation.clear(root);
    }
    for (const p of list) {
      const row = document.createElement('div'); row.className = 'arow'; row.style.setProperty('--pc', p.color);
      row.innerHTML = `<img alt="" src="${shapeImg(p.shape, p.color)}"><span class="aname"></span><span class="aaward"></span><span class="apts">${p.points} pts</span>`;
      row.querySelector('.aname').textContent = p.name;
      row.querySelector('.aaward').textContent = p.award;
      box.appendChild(row);
    }
  }

  /* ---------- phone HUD (10 Hz) ---------- */
  let hudAcc = 0;
  function sendHud(force) {
    if (Net.local) return;
    const vip = vipId();
    for (const p of players.values()) {
      if (p.cpu || p.keys != null || !p.connected) continue;
      const m = world ? world.get(p.id) : null;
      const msg = {
        t: 'hud', s: state === 'photo' ? 'results' : state, mode: selectedMode, phase: state,
        availableModes: Object.values(MODES).filter(m => m.available).map(m => ({ id: m.id, name: m.name })), name: p.name, color: p.color, shape: p.shape, swirl: p.swirl, vip: p.id === vip,
        place: ['dropzone','brawl','derby','curling','golf'].includes(state) ? 0 : m ? m.rank : 0,
        n: ['dropzone','brawl','derby','curling','golf'].includes(state) ? players.size : world ? world.marbles.length : 0,
        boost: ['dropzone','brawl','derby','curling','golf'].includes(state) ? 100 : m ? Math.round(m.boost) : 100,
        item: ['dropzone','brawl','derby','curling','golf'].includes(state) ? null : m ? m.item : null, fin: ['dropzone','brawl','derby','curling'].includes(state) ? false : m ? m.finished : false,
        off: m ? m.respawnT > 0 : false, prog: m && world.t.finishDist < Infinity ? Math.min(1, m.prog / world.t.finishDist) : 0,
        pts: p.lastPts, total: p.points, lastPlace: p.lastPlace || 0, award: p.award || '', inRace: !!m,
        players: players.size, cd: state === 'countdown' ? Math.max(0, Math.ceil(world.goTime - world.time)) : 0,
        opts: state === 'vote' ? vote.opts.map(t => ({ name: t.name, icon: THEMES[t.theme].icon, c: THEMES[t.theme].card })) : null,
        myVote: state === 'vote' && vote.votes.has(p.id) ? vote.votes.get(p.id) : -1, picked: state === 'vote' ? vote.picked : -1,
        cupRace: cup.race, cupN: cup.n, cupDone: cup.race >= cup.n,
        modeControls: state==='golf' ? MODES.golf.hud(p).modeControls : state==='curling' ? MODES.curling.hud(p).modeControls : state==='derby' ? MODES.derby.hud(p).modeControls : state==='brawl' ? MODES.brawl.hud(p).modeControls : state==='dropzone' ? MODES.dropzone.hud(p).modeControls : null,
        ...(state==='golf' ? MODES.golf.hud(p) : state==='curling' ? MODES.curling.hud(p) : state==='derby' ? MODES.derby.hud(p) : state==='brawl' ? MODES.brawl.hud(p) : state === 'dropzone' ? MODES.dropzone.hud(p) : {}),
        cheerReady: performance.now() - (cheerTime.get(p.id) ?? -4000) >= 3000,
        partyLength, partyIndex: partyRun ? partyRun.session.index : 0,
        partyPending: !!partyRun && partyRun.status === 'ready',
      };
      const key = JSON.stringify(msg);
      if (force || key !== p.lastHud) { p.lastHud = key; Net.to(p.id, msg); }
    }
  }

  /* ======================================================================
     MAIN LOOP
     ====================================================================== */
  let lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    perfTick(dt);
    if (state === 'lobby' && attractMode && now < attractUntil) {
      const c = $('#partyAttractCanvas').getContext('2d');
      PartyAttract.preview(c, attractMode, (now - attractFrom)/1000);
      const previewArt=IMG['party_card_'+attractMode];
      if(previewArt){
        c.save();
        c.fillStyle='#090d24';c.fillRect(0,0,c.canvas.width,c.canvas.height);
        const iw=previewArt.naturalWidth,ih=previewArt.naturalHeight;
        const scale=Math.min(c.canvas.width/iw,c.canvas.height/ih);
        const dw=iw*scale,dh=ih*scale;
        c.drawImage(previewArt,(c.canvas.width-dw)/2,(c.canvas.height-dh)/2,dw,dh);
        c.restore();
      }
    } else if (attractMode && now >= attractUntil) {
      attractMode = null; $('#partyAttractPanel').hidden = true;
    }
    if (state==='derby') {
      stateT+=dt;MODES.derby.tick(dt);
      const derby=MODES.derby.session();
      if(derby)MarblePartyUI.drawDerby(derby.state,IMG,{selectedHorse:derbyTvHorse,reduce:settings.reduce});
      Clatter.tick();
      hudAcc+=dt;if(hudAcc>.1){hudAcc=0;sendHud(false);}return;
    }
    if (state==='dropzone') {
      stateT+=dt;MODES.dropzone.tick(dt);
      const drop=MODES.dropzone.session();
      if(drop)MarblePartyUI.drawDropZone(drop.state,IMG,{reduce:settings.reduce});
      Clatter.tick();
      hudAcc+=dt;if(hudAcc>.1){hudAcc=0;sendHud(false);}return;
    }
    if (state==='brawl') {
      stateT+=dt;MODES.brawl.tick(dt);
      const combat=MODES.brawl.session();
      if(combat){
        const st=combat.state,pulseIn=st.pulseAt==null?null:st.pulseAt-st.elapsed;
        const warningKey=st.round+':'+st.pulseIndex;
        if(pulseIn!=null&&pulseIn<=3&&pulseIn>0&&brawlWarningKey!==warningKey){
          brawlWarningKey=warningKey;
          Clatter.say('announce',"Shockwave incoming! Brace yourselves!",2);
        }
        const cue=(st.events||[]).slice(-30).reverse().find(e=>
          ['shockwave','knockout','recover'].includes(e.kind)&&
          typeof e.time==='number'&&st.time-e.time<.9);
        if(cue){
          const key=st.round+':'+cue.kind+':'+cue.time;
          if(key!==brawlLastCue){
            brawlLastCue=key;
            if(cue.kind==='shockwave'){
              Audio_.play('sfx_bumper',{gap:.2,vol:.95});
              Clatter.say('gasp',"The shockwave's hit the bowl!",2);
            }else if(cue.kind==='knockout'){
              const winner=st.roster.find(p=>p.id===cue.id)?.name||'Someone';
              Audio_.play('crowd_cheer',{gap:.15,vol:.9});
              Clatter.say('winner',winner+" earns a knockout bonus!",2);
            }else if(cue.kind==='recover'){
              Clatter.say('gasp',"What a save! Right off the edge!",2);
            }
          }
        }
        MarbleBrawlUI.draw(st,IMG,{reduce:settings.reduce});
      }
      Clatter.tick();
      hudAcc+=dt;if(hudAcc>.1){hudAcc=0;sendHud(false);}return;
    }
    if (state==='curling') {
      stateT+=dt;MODES.curling.tick(dt);
      const ice=MODES.curling.session();
      if(ice)MarbleCurlingUI.draw(ice.state,IMG,{reduce:settings.reduce});
      Clatter.tick();
      hudAcc+=dt;if(hudAcc>.1){hudAcc=0;sendHud(false);}return;
    }
    if (state==='golf') {
      stateT+=dt;MODES.golf.tick(dt);
      const putting=MODES.golf.session();
      if(putting)MarbleGolfUI.draw(putting.state,IMG,{reduce:settings.reduce});
      Clatter.tick();
      hudAcc+=dt;if(hudAcc>.1){hudAcc=0;sendHud(false);}return;
    }

    if (!world) { drawBackground(); return; }
    timeScale = performance.now() / 1000 < slowUntil ? 0.3 : 1;
    const sdt = dt * timeScale;
    stateT += dt;
    botTick();

    if (state === 'countdown') {
      world.step(sdt);
      const left = world.goTime - world.time;
      const n = Math.ceil(left);
      if (left <= 3 && n !== Game.count && n > 0) { Game.count = n; countdownShow(String(n)); Audio_.play('sfx_count_beep'); if (n === 3) Clatter.say('countdown', 'Three… two… one…', 3); }
      if (left <= 0) { world.go(); state = 'race'; stateT = 0; countdownShow('ROLL!', true); Clatter.say('go', 'ROLL!', 3); }
      handleEvents();
    } else if (state === 'race') {
      world.step(sdt);
      handleEvents();
      // replay buffer for photo finish
      replayBuf.push({ t: world.time, ms: world.marbles.map(m => [m.id, m.x, m.y, m.ang, m.r, m.respawnT > 0 ? 1 : 0]) });
      while (replayBuf.length && replayBuf[0].t < world.time - 4.5) replayBuf.shift();
      if (photoPending && world.time >= photoPending) {
        photoPending = null;
        const ff = world.firstFinishTime;
        const frames = replayBuf.filter(f => f.t >= ff - 2.4);
        if (frames.length > 10) photo = { frames, t0: frames[0].t, t1: frames[frames.length - 1].t, flashAt: ff };
      }
      const st = world.standings();
      const lead = st[0];
      const k = lead ? lead.prog / world.t.finishDist : 0;
      Audio_.Music.intensity(k > 0.8 ? 1 : 0);
      if (k > 0.8 && !world._fs) { world._fs = true; Clatter.say('final_stretch', 'Into the final stretch!', 2); }
      if (st.length > 1 && !st[0].finished && Math.abs(st[0].prog - st[1].prog) < 40 && Math.random() < 0.004) Clatter.say('neck', "It's neck and neck!");
      if (!endAt) endAt = MODES.grandprix.shouldEnd({world,endAt,photoPending});
      if (endAt && MODES.grandprix.shouldEnd({world,endAt,photoPending}) === true) Game.endRace();
    } else if (state === 'lobby') {
      world.step(dt);
      handleEvents();
      // drop stale phone players from the lobby after 25 s away
      for (const p of [...players.values()]) if (!p.connected && !p.cpu && p.keys == null && performance.now() - p.leftAt > 25000) removePlayer(p.id);
    } else if (state === 'vote') {
      world.step(dt); world.events.length = 0;
      const now = performance.now() / 1000;
      if (vote.picked < 0) {
        const voters = [...players.values()].filter(p => p.cpu || (p.keys == null && p.connected));
        const allIn = voters.length > 0 && voters.every(p => vote.votes.has(p.id));
        if (now >= vote.endAt || allIn) Game.resolveVote();
        const bar = $('#voteBar'); if (bar) bar.style.transform = `scaleX(${Math.max(0, (vote.endAt - now) / 12)})`;
      } else if (now >= vote.revealAt) Game.startRace(vote.opts[vote.picked].id);
    } else if (state === 'results' || state === 'finale') {
      world.step(dt);
      world.events.length = 0;
      if (state === 'finale' && Math.random() < 0.08) {
        const a = world.t.arches[0];
        emit('confetti', a.x + (Math.random() - 0.5) * 900, a.y - 520, 6, { speed: 120, g: 380, life: 3.5, size: 14, colors: ['#FF3B5C', '#FFD23F', '#4CC9F0', '#3DDC97', '#FF5FA2'], drag: 0.99 });
      }
    }

    for (const m of world.marbles) {
      if (m.squash > 0) m.squash = Math.max(0, m.squash - dt * 9);
      if (m.appearT > 0) m.appearT -= dt;
    }
    for (const s of world.t.stairs) if (s.flash > 0) s.flash -= dt;

    // rolling sound bed
    if (Audio_.on && world) {
      let lv = 0, pitch = 0, n = 0;
      for (const m of world.marbles) {
        if (m.respawnT > 0 || m.gTime > 0.06) continue;
        const sp = Math.hypot(m.vx, m.vy); lv += sp; pitch += sp; n++;
      }
      Audio_.setRoll(n ? Math.min(0.32, lv / 9000) : 0, n ? Math.min(1, pitch / n / 1600) : 0);
    }

    aimCamera(dt);
    camUpdate(dt);
    updateParts(sdt);
    Clatter.tick();
    updateRaceHud();
    hudAcc += dt; if (hudAcc > 0.1) { hudAcc = 0; sendHud(false); }

    // ---- draw ----
    drawBackground();
    ctx.save();
    ctx.translate(W / 2 + cam.sx * S, H / 2 + cam.sy * S);
    ctx.scale(cam.z * S, cam.z * S);
    ctx.translate(-cam.x, -cam.y);
    drawDeco();
    drawTrack(world.t, world.time);
    if (state === 'photo' && photo) drawPhoto(dt);
    else {
      drawTrails(world.time);
      for (const m of world.marbles) { if (m.respawnT > 0) continue; const p = players.get(m.id); if (p) drawMarble(m, p, world.time); }
    }
    drawParts();
    ctx.restore();
    drawTags();
    if (state === 'photo') drawPhotoOverlay();
  }

  /* ---------- photo finish replay (Section 5.7) ---------- */
  function drawPhoto() {
    const span = photo.t1 - photo.t0;
    const pt = photo.t0 + Math.min(span, stateT * 0.25);
    let i = 0; while (i < photo.frames.length - 2 && photo.frames[i + 1].t < pt) i++;
    const a = photo.frames[i], b = photo.frames[i + 1] || a;
    const u = b.t > a.t ? (pt - a.t) / (b.t - a.t) : 0;
    for (let j = 0; j < a.ms.length; j++) {
      const A = a.ms[j], B = b.ms[j] || A;
      if (A[5]) continue;
      const p = players.get(A[0]); if (!p) continue;
      drawMarble({ x: A[1] + (B[1] - A[1]) * u, y: A[2] + (B[2] - A[2]) * u, ang: A[3] + (B[3] - A[3]) * u, r: A[4], nx: 0, ny: -1, gTime: 0 }, p, pt);
    }
    if (!photo.flashed && pt >= photo.flashAt) { photo.flashed = true; photo.flashT = stateT; Audio_.play('sfx_photo_shutter'); }
    if (stateT * 0.25 >= span + 0.2 || stateT > 7) Game.showResults();
  }
  function drawPhotoOverlay() {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(0, 0, W, 90 * S); ctx.fillRect(0, H - 90 * S, W, 90 * S);
    ctx.font = `700 ${Math.round(56 * S)}px Fredoka, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFC83D'; ctx.fillText('PHOTO FINISH', W / 2, 46 * S);
    if (photo && photo.flashT && stateT - photo.flashT < 0.4) {
      ctx.fillStyle = `rgba(255,255,255,${1 - (stateT - photo.flashT) / 0.4})`; ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }

  /* ======================================================================
     BOOT + UI WIRING
     ====================================================================== */
  function bootStart() {
    Audio_.init();
    Audio_.setMusic(settings.music);
    $('#boot').hidden = true;
    Net.connect();
    Game.toLobby();
  }
  $('#btnBoot').onclick = bootStart;
  $('#partyBackLobby').onclick = () => Game.onAction('tv','lobby');
  document.addEventListener('keydown', e => {
    if(e.key==='Escape' && !['boot','lobby'].includes(state)) {
      e.preventDefault();Game.onAction('tv','lobby');
    }
  });
  $('#btnStart').onclick = () => Game.onAction('tv', 'start');
  // Retired the four old mode control bars along with their canvases.
  $('#derbyRunner').onclick=()=>{const g=MODES.derby.session();
    if(g?.state.phase==='betting')derbyTvHorse=(derbyTvHorse+1)%6;};
  $('#derbyStake').onclick=()=>{const g=MODES.derby.session();
    const p=g?.state.roster.find(x=>!x.cpu);if(!p)return;
    const opts=[25,50,100,200].filter(x=>x<=p.gems),i=opts.indexOf(p.stake);
    if(opts.length)g.action(p.id,'stake',opts[(i+1)%opts.length]);};
  $('#derbyPick').onclick=()=>{const g=MODES.derby.session();
    if(!g||g.state.phase!=='betting')return;
    const p=g.state.roster.find(x=>!x.cpu&&!g.state.wagers.has(x.id));
    if(p)g.action(p.id,'bet',{horse:derbyTvHorse,stake:Math.min(p.stake,p.gems)});};
  $('#derbyCheer').onclick=()=>{const g=MODES.derby.session();
    const p=g?.state.roster.find(x=>!x.cpu&&g.state.wagers.has(x.id));
    if(p)g.action(p.id,'cheer');};
  // New Drop Zone controls send the same authorised actions as phones.
  // They are part of the replacement stage, not the withdrawn legacy bar.
  for(const [id,action] of [['dropLeft','left'],['dropRight','right'],['dropNow','drop']]){
    $('#'+id).onclick=()=>{
      const g=MODES.dropzone.session(),owner=g?.owner();
      if(owner&&!owner.cpu)Game.onAction(owner.id,action,action==='drop'?undefined:2);
    };
  }
  // New Bowl Brawl combat controls use the original authoritative action router.
  for(const [id,action] of [['ppBrawlLeft','left'],['ppBrawlRight','right'],
                             ['ppBrawlRam','ram'],['ppBrawlAnchor','anchor'],
                             ['ppBrawlRecover','recover']]){
    $('#'+id).onclick=()=>{
      const g=MODES.brawl.session();
      const p=g?.state.roster.find(x=>!x.cpu&&g.current(x.id)?.alive);
      if(p)Game.onAction(p.id,action,action==='left'||action==='right'?2:0);
    };
  }
  // Curling v2 TV controls use the same authorised actions as connected phones.
  // The current player is read from the unchanged deterministic turn engine.
  for(const [id,action,value] of [
    ['ppCurlLeft','left',2],['ppCurlRight','right',2],
    ['ppCurlPowerDown','powerdown',0],['ppCurlPowerUp','powerup',0],
    ['ppCurlLeftSpin','curlleft',0],['ppCurlRightSpin','curlright',0],
    ['ppCurlThrow','throw',0],['ppCurlSweepBtn','sweep',0]
  ]){
    $('#'+id).onclick=()=>{
      const g=MODES.curling.session();
      if(!g)return;
      const p=(g.state.phase==='slide'&&g.state.moving)
        ?g.state.roster.find(q=>q.id===g.state.moving.id)
        :g.current();
      if(p&&!p.cpu)Game.onAction(p.id,action,value);
    };
  }
  // Marble Golf v2 TV controls use the unchanged authorised player-action
  // router. A CPU turn never accepts fake human TV input.
  for(const [id,action,value] of [
    ['ppGolfLeft','left',1],['ppGolfRight','right',1],
    ['ppGolfPowerDown','powerdown',0],['ppGolfPowerUp','powerup',0],
    ['ppGolfPreview','preview',0],['ppGolfShoot','shoot',0]
  ]){
    $('#'+id).onclick=()=>{
      const g=MODES.golf.session(),player=g?.current();
      if(player&&!player.cpu)Game.onAction(player.id,action,value);
    };
  }
  for (const b of document.querySelectorAll('[data-party]')) {
    b.onclick = () => Game.onAction('tv', 'party', Number(b.dataset.party));
  }
  $('#btnSkipVote').onclick = () => Game.onAction('tv', 'skip');
  $('#btnCpu').onclick = () => { Audio_.play('sfx_ui_tap'); addCpu(); };
  $('#btnKb').onclick = () => { Audio_.play('sfx_ui_tap'); addKeyboard(); };
  $('#btnAgain').onclick = () => Game.onAction('tv', 'next');
  $('#btnLobby').onclick = () => Game.onAction('tv', 'lobby');
  $('#btnFinale').onclick = () => Game.onAction('tv', 'finale');
  $('#btnNewNight').onclick = () => Game.onAction('tv', 'newnight');
  for (const b of document.querySelectorAll('[data-set]')) {
    b.onclick = () => {
      const k = b.dataset.set;
      if (k === 'fx') settings.fx = settings.fx === 'auto' ? 'full' : settings.fx === 'full' ? 'lite' : 'auto';
      else if (k === 'cup') settings.cup = { 1: 2, 2: 4, 4: 7, 7: 1 }[settings.cup] || 4;
      else settings[k] = !settings[k];
      if (k === 'music') Audio_.setMusic(settings.music);
      if (k === 'sfx') Audio_.setSfx(settings.sfx);
      save('mr_settings', settings);
      Audio_.play('sfx_ui_tap');
      renderLobby();
    };
  }
  // test hooks for automated checks
  window.__MR = { Audio_, Game, players, MODES, PartyNight, PartyCoordinator, DropZone, BowlBrawl, MarbleDerby, MarbleCurling, get partyRun() { return partyRun; }, get partyLength() { return partyLength; }, get selectedMode() { return selectedMode; }, get world() { return world; }, get state() { return state; }, addCpu, addKeyboard, settings };

  requestAnimationFrame(frame);
})();
