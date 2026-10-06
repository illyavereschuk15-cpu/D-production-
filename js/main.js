(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  function ease(t){ return t < .5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2; }
  function range(p, a, b){ return clamp((p - a) / (b - a), 0, 1); }

  // ---------- projects: data lives in js/projects.js ----------
  var MODES = DK.MODES, projects = DK.projects;
  var track = document.getElementById('track'), panels = [], activeMode = 0;
  var ABOUT_HTML = DK.ABOUT_HTML;
  var finalFilm = null, focusFilm = null, workInView = false, idleT = 0;
  function setFinalFilm(p){
    if (!p || p === finalFilm) return; finalFilm = p;
    document.getElementById('projStill').className = 'still ' + p.still;
    document.getElementById('projTitle').textContent = p.title;
  }
  function modeProjects(){ return projects.filter(function(p){ return p.mode === MODES[activeMode].id; }); }
  function buildTrack(){
    track.innerHTML = ''; panels = [];
    var isAbout = MODES[activeMode].id === 'about';
    track.classList.toggle('about-mode', isAbout);
    var workEl = document.getElementById('work'); if (workEl) workEl.classList.toggle('is-about', isAbout);
    if (isAbout) { track.innerHTML = ABOUT_HTML; return; }
    modeProjects().forEach(function(p){
      var b = document.createElement('button');
      b.className = 'panel'; b.setAttribute('aria-label', 'Open film: ' + p.title);
      b.innerHTML = '<div class="frame"><div class="still ' + p.still + '"></div><h3 class="display">' + p.title + '</h3><span class="client">' + p.client + '</span><span class="year">' + p.year + '</span></div>';
      b.addEventListener('click', function(){ openProject(p); });
      track.appendChild(b); panels.push(b);
    });
    if (modeProjects()[0] && (!finalFilm || finalFilm.mode !== MODES[activeMode].id)) setFinalFilm(modeProjects()[0]);
  }
  buildTrack();

  // ---------- engine sound (synthesised, only after the user presses start) ----------
  var ctx = null, master = null, soundOn = false, soundBtn = document.getElementById('soundBtn');
  function setSound(on){
    soundOn = on; soundBtn.classList.toggle('on', on); soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    soundBtn.querySelector('span').textContent = on ? 'Sound on' : 'Sound off';
    if (master) master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.1);
  }
  soundBtn.addEventListener('click', function(){ var first = !ctx; if (first) startAudio(); setSound(first ? true : !soundOn); });
  function startAudio(){
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
      var t = ctx.currentTime;
      var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; lp.Q.value = 6;
      var g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.25); g.gain.exponentialRampToValueAtTime(0.18, t + 1.6); g.gain.exponentialRampToValueAtTime(0.0001, t + 4.2);
      lp.connect(g); g.connect(master);
      [1, 2, 0.5].forEach(function(m, i){
        var o = ctx.createOscillator(); o.type = i === 1 ? 'square' : 'sawtooth';
        o.frequency.setValueAtTime(28 * m, t); o.frequency.exponentialRampToValueAtTime(95 * m, t + 0.55); o.frequency.exponentialRampToValueAtTime(42 * m, t + 1.5);
        var og = ctx.createGain(); og.gain.value = i === 1 ? 0.12 : 0.3; o.connect(og); og.connect(lp); o.start(t); o.stop(t + 4.4);
      });
      var buf = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
      var n = ctx.createBufferSource(); n.buffer = buf; var bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 160; bp.Q.value = 1.2;
      var ng = ctx.createGain(); ng.gain.setValueAtTime(0.0001, t); ng.gain.exponentialRampToValueAtTime(0.25, t + 0.2); ng.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);
      n.connect(bp); bp.connect(ng); ng.connect(master); n.start(t);
    } catch(e){ ctx = null; }
  }

  var body = document.body;
  // ---------- intro: fit the scene, fly into the projection on scroll ----------
  var intro = document.getElementById('intro'), istage = document.getElementById('istage'), iscene = document.getElementById('iscene');
  var ireel = document.getElementById('ireel'), ifoot = document.getElementById('ifoot'), ihint = document.getElementById('ihint');
  var idmark = document.getElementById('idmark'), ibeam = document.getElementById('ibeam'), icredit = document.getElementById('icredit');
  var iwords = document.getElementById('iwords'), iscreen = document.getElementById('iscreen');
  function introDone(){ if (!intro.classList.contains('done')) { intro.classList.add('done'); } body.classList.add('started'); }
  if (reduce) introDone();
  setTimeout(introDone, 4000);
  // if nobody scrolls, fly into the projection by itself two seconds after the logo animation
  var userMoved = false, autoRaf = 0;
  ['wheel','touchstart','keydown','pointerdown'].forEach(function(ev){
    window.addEventListener(ev, function(){ userMoved = true; if (autoRaf) { cancelAnimationFrame(autoRaf); autoRaf = 0; } }, { passive:true });
  });
  var lastHover = 0; window.addEventListener('mousemove', function(){ lastHover = performance.now(); }, { passive:true });
  function autoZoom(){
    if (userMoved || window.scrollY > 4 || reduce) return;
    if (performance.now() - lastHover < 2000) { setTimeout(autoZoom, 500); return; }   // someone is playing with the cursor: wait
    var from = window.scrollY, to = (intro.offsetHeight - istage.clientHeight) * 0.8, dur = 2600, t0 = performance.now();
    function step(now){
      var t = clamp((now - t0) / dur, 0, 1), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      if (step.prev !== undefined && Math.abs(window.scrollY - step.prev) > 3) { autoRaf = 0; return; }   // something else moved the page
      var y = from + (to - from) * e; window.scrollTo(0, y); step.prev = window.scrollY; if (typeof sCur !== 'undefined') { sCur = sTarget = y; }
      if (t < 1 && !userMoved) autoRaf = requestAnimationFrame(step); else autoRaf = 0;
    }
    autoRaf = requestAnimationFrame(step);
  }
  setTimeout(autoZoom, 6000);
  function renderIntro(){
    var vw = istage.clientWidth, vh = istage.clientHeight;
    // landing composition is 30% larger, but never wider than the screen allows
    var k = vw < 700 ? Math.min(vw * 0.84 / 830, vh / 720) : Math.min(Math.min(vw / 1280, vh / 720) * 1.3, vw * 0.92 / 830);
    var L = vw / 2 - 735 * k, T = (vh - 720 * k) / 2;
    var r = intro.getBoundingClientRect(); var p = clamp(-r.top / (intro.offsetHeight - vh), 0, 1);
    if (p > 0.01) introDone();
    var z = Math.max(vw / (450 * k), vh / (188 * k));
    var e = ease(range(p, 0.04, 0.72)), S = k * Math.pow(z, e);
    var p0x = L + 925 * k, p0y = T + 360 * k, px = p0x + (vw / 2 - p0x) * e, py = p0y + (vh / 2 - p0y) * e;
    iscene.style.transform = 'translate(' + (px - 925 * S) + 'px,' + (py - 360 * S) + 'px) scale(' + S + ')';
    if (intro.classList.contains('done')) {
      var f = 1 - range(p, 0.04, 0.3);
      idmark.style.opacity = f; ibeam.style.opacity = f; icredit.style.opacity = f; idustC.style.opacity = f;
      iwords.style.opacity = 1 - range(p, 0.08, 0.3); iscreen.style.opacity = 1 - range(p, 0.42, 0.62);
      ihint.style.opacity = 1 - range(p, 0, 0.06);
    }
    var w = 450 * S, h = 188 * S, x = px - w / 2, y = py - h / 2;
    ireel.style.clipPath = 'inset(' + Math.max(0, y) + 'px ' + Math.max(0, vw - x - w) + 'px ' + Math.max(0, vh - y - h) + 'px ' + Math.max(0, x) + 'px)';
    var out = 1 - range(p, 0.9, 1);                    // fade the showreel to black before the work section
    ireel.style.opacity = range(p, 0.12, 0.45) * out;
    ifoot.style.opacity = range(p, 0.72, 0.84) * (1 - range(p, 0.86, 0.96));
    var rvEl = document.getElementById('ireveal'); if (rvEl) rvEl.style.opacity = 1 - range(p, 0.02, 0.12);
  }


  var revealField = DK.revealField, liquidReveal = DK.liquidReveal;   // js/liquid.js

  // ---------- timecode ----------
  var tc = document.getElementById('tc'), t0 = performance.now();
  function pad(n){ return n < 10 ? '0' + n : '' + n; }
  function tick(now){ var s = (now - t0) / 1000; tc.textContent = pad(Math.floor(s / 3600)) + ':' + pad(Math.floor(s / 60) % 60) + ':' + pad(Math.floor(s) % 60) + ':' + pad(Math.floor((s % 1) * 25)); requestAnimationFrame(tick); }
  if (!reduce) requestAnimationFrame(tick);


  // ---------- dust in the projector beam: drifting specks, a few soft out-of-focus ones ----------
  function dustField(canvas, getAlpha){
    var W = 1280, H = 720, dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr; canvas.height = H * dpr;
    var c = canvas.getContext('2d'); c.scale(dpr, dpr);
    var X0 = 461, X1 = 704;
    function top(x){ return 343 + (268 - 343) * Math.min(1, (x - X0) / 239); }
    function bot(x){ return 377 + (452 - 377) * Math.min(1, (x - X0) / 239); }
    function spawn(p, anywhere){
      var u = Math.sqrt(Math.random());                    // more specks where the beam is wider
      p.x = X0 + 18 + u * (X1 - X0 - 18); var t = top(p.x), b = bot(p.x);
      p.y = t + Math.random() * (b - t);
      var big = Math.random() < 0.12;
      p.r = big ? 1.4 + Math.random() * 2.2 : 0.25 + Math.random() * 0.75;
      p.big = big; p.a = big ? 0.12 + Math.random() * 0.18 : 0.35 + Math.random() * 0.6;
      p.vx = (Math.random() - 0.5) * 0.05; p.vy = (Math.random() - 0.55) * 0.045;
      p.ph = Math.random() * 6.28; p.f = 0.4 + Math.random() * 1.6; p.w = 0.15 + Math.random() * 0.35;
      p.life = anywhere ? Math.random() : 0;
    }
    var parts = []; for (var i = 0; i < 130; i++) { var p = {}; spawn(p, true); parts.push(p); }
    var last = performance.now();
    function frame(now){
      var dt = Math.min(50, now - last); last = now;
      var r = canvas.getBoundingClientRect(), visible = r.bottom > 0 && r.top < window.innerHeight && getAlpha() > 0.01;
      if (visible) {
        c.clearRect(0, 0, W, H);
        var t = now / 1000;
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          if (!reduce) { p.x += p.vx * dt * 0.06 + Math.sin(t * p.w + p.ph) * 0.02; p.y += p.vy * dt * 0.06 + Math.cos(t * p.w * 1.3 + p.ph) * 0.02; p.life = Math.min(1, p.life + dt / 1500); }
          var tp = top(p.x), bt = bot(p.x);
          if (p.x < X0 + 10 || p.x > X1 || p.y < tp - 2 || p.y > bt + 2) { spawn(p, false); continue; }
          var edge = Math.min(1, (p.y - tp) / 10, (bt - p.y) / 10, (X1 - p.x) / 16);   // fade near the beam edges
          var beamLight = 1 - 0.55 * ((p.x - X0) / (X1 - X0));                          // brighter close to the lens
          var tw = reduce ? 1 : 0.55 + 0.45 * Math.sin(t * p.f * 2.2 + p.ph);           // specks catch the light as they turn
          var a = p.a * Math.max(0, edge) * beamLight * tw * p.life;
          if (a <= 0.004) continue;
          if (p.big) {
            var g = c.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
            g.addColorStop(0, 'rgba(232,238,248,' + a + ')'); g.addColorStop(1, 'rgba(232,238,248,0)');
            c.fillStyle = g; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
          } else {
            c.fillStyle = 'rgba(240,244,252,' + a + ')'; c.beginPath(); c.arc(p.x, p.y, p.r, 0, 6.283); c.fill();
          }
        }
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  // ---------- horizontal work ----------
  var work = document.getElementById('work'), bar = document.getElementById('bar'), count = document.getElementById('count');
  var viewport = work.querySelector('.viewport'), dist = 0;
  function sizeWork(){ dist = track.classList.contains('about-mode') ? 0 : Math.max(0, track.scrollWidth - viewport.clientWidth); work.style.height = (dist + work.querySelector('.pin').clientHeight) + 'px'; }
  function renderWork(){
    var r = work.getBoundingClientRect(); var span = work.offsetHeight - work.querySelector('.pin').clientHeight; var p = span > 0 ? clamp(-r.top / span, 0, 1) : 0;
    track.style.transform = 'translate3d(' + (-p * dist) + 'px,0,0)';
    var vh = window.innerHeight, pinEl = work.querySelector('.pin');
    var fin = clamp(1 - r.top / (vh * 0.55), 0, 1), fout = clamp((r.bottom - vh * 0.45) / (vh * 0.55), 0, 1);
    pinEl.style.opacity = Math.min(fin, fout);
    bar.style.transform = 'scaleX(' + (dist ? p : 1) + ')';
    var vr = viewport.getBoundingClientRect(), mid = vr.left + vr.width / 2, idx = 0;
    panels.forEach(function(el, i){ var b = el.getBoundingClientRect(); if (b.left < mid) idx = i; });
    panels.forEach(function(el){
      var b = el.getBoundingClientRect(), c = b.left + b.width / 2;
      var rack = Math.min(5, Math.pow(Math.abs(c - mid) / vr.width, 1.4) * 9);             // films away from the centre are slightly out of focus
      el.style.setProperty('--b', Math.max(rack, focusBlur || 0).toFixed(2) + 'px');
    });
    if (panels.length) count.textContent = pad(idx + 1) + ' / ' + pad(panels.length);
    if (panels.length) focusFilm = modeProjects()[idx];
    workInView = r.top < vh * 0.5 && r.bottom > vh * 0.5;
  }

  // ---------- drive-mode knob ----------
  var list = document.getElementById('modeList'), needle = document.getElementById('needle'), ticksG = document.getElementById('ticks');
  var ANG = [-48, -16, 16, 48];                       // label positions on the arc, in degrees
  var tickEls = [];
  for (var t = -180; t < 180; t += 10) {
    var rad = t * Math.PI / 180, l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    l.setAttribute('x1', 50 + 43 * Math.cos(rad)); l.setAttribute('y1', 50 + 43 * Math.sin(rad));
    l.setAttribute('x2', 50 + (t % 30 === 0 ? 38 : 40.5) * Math.cos(rad)); l.setAttribute('y2', 50 + (t % 30 === 0 ? 38 : 40.5) * Math.sin(rad));
    l.dataset.a = t; ticksG.appendChild(l); tickEls.push(l);
  }
  MODES.forEach(function(m, i){
    var li = document.createElement('li');
    var b = document.createElement('button'); b.setAttribute('role', 'radio'); b.textContent = m.label;
    b.addEventListener('click', function(){ setMode(i); });
    li.appendChild(b); list.appendChild(li);
  });
  var modeBtns = list.querySelectorAll('button');
  function click(){
    if (!ctx || !soundOn) return;
    var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 1800; g.gain.setValueAtTime(0.06, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.05);
  }
  // ---------- focus ring: turns freely; how close it sits to a mark decides how sharp the films are ----------
  var STEP = 30, ringA = 0, ringT = 0, ringRaf = 0, ringGoal = null, ringLast = 0, focusBlur = 0;
  function maxRing(){ return (MODES.length - 1) * STEP; }
  function smooth(x){ x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }
  function paintKnob(){
    var near = clamp(Math.round(ringA / STEP), 0, MODES.length - 1);
    var off = Math.abs(ringA - near * STEP) / (STEP / 2);          // 0 = on the mark, 1 = halfway to the next one
    var sharp = off < 0.07;
    modeBtns.forEach(function(b, i){
      var a = i * STEP - ringA, li = b.parentNode, d = Math.abs(a);
      li.style.setProperty('--a', a + 'deg');
      li.style.opacity = d > 82 ? 0 : (d > 62 ? 0.4 : 1); li.style.pointerEvents = d > 82 ? 'none' : '';
      b.setAttribute('aria-checked', i === near ? 'true' : 'false'); b.tabIndex = i === near ? 0 : -1;
      b.classList.toggle('sharp', i === near && sharp);
    });
    ticksG.style.transform = 'rotate(' + (-ringA) + 'deg)';
    focusBlur = reduce ? 0 : smooth(off * 1.15) * 11;
    renderWork();
  }
  function ringTick(now){
    var dt = ringLast ? Math.min(48, now - ringLast) : 16.7; ringLast = now;
    var k = 1 - Math.pow(1 - (ringGoal === null ? 0.07 : 0.05), dt / 16.7);   // slow, weighted like a real focus ring
    ringA += (ringT - ringA) * k;
    if (Math.abs(ringT - ringA) < 0.02) ringA = ringT;
    var near = clamp(Math.round(ringA / STEP), 0, MODES.length - 1);
    if (near !== activeMode && (ringGoal === null || near === ringGoal)) switchMode(near);
    paintKnob();
    if (ringA !== ringT) ringRaf = requestAnimationFrame(ringTick); else { ringRaf = 0; ringLast = 0; ringGoal = null; }
  }
  function spin(){ if (!ringRaf) ringRaf = requestAnimationFrame(ringTick); }
  function turn(deg){ ringGoal = null; ringT = clamp(ringT + deg, 0, maxRing()); spin(); }
  // the picture is at its softest when the films change, so the swap happens behind the blur
  function switchMode(i){
    activeMode = i; click();
    buildTrack(); sizeWork();
    var top = work.offsetTop; if (window.scrollY > top) { if (sRaf) { cancelAnimationFrame(sRaf); sRaf = 0; } window.scrollTo(0, top); sTarget = sCur = top; }
    render();
  }
  function setMode(i, focus){
    i = clamp(i, 0, MODES.length - 1);
    ringGoal = i; ringT = i * STEP; spin();
    if (focus) modeBtns[i].focus();
  }
  list.addEventListener('keydown', function(e){
    var cur = clamp(Math.round(ringT / STEP), 0, MODES.length - 1);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); setMode(cur + 1, true); }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); setMode(cur - 1, true); }
  });
  var knobWrap = document.getElementById('knobWrap');
  knobWrap.addEventListener('wheel', function(e){
    e.preventDefault();
    var d = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
    turn(clamp(d, -100, 100) * 0.07);
  }, { passive:false });
  var knob = document.getElementById('knob'), dragY = null, dragged = false;
  knob.addEventListener('pointerdown', function(e){ dragY = e.clientY; dragged = false; knob.setPointerCapture(e.pointerId); });
  knob.addEventListener('pointermove', function(e){ if (dragY === null) return; var d = e.clientY - dragY; if (Math.abs(d) > 3) dragged = true; turn(d * 0.3); dragY = e.clientY; });
  knob.addEventListener('pointerup', function(){ dragY = null; });
  knob.addEventListener('pointercancel', function(){ dragY = null; });
  knob.addEventListener('click', function(){ if (!dragged) { var cur = clamp(Math.round(ringT / STEP), 0, MODES.length - 1); setMode(cur + 1 > MODES.length - 1 ? 0 : cur + 1); } dragged = false; });
  paintKnob();

  // local time in Munich
  var clockEl = document.getElementById('clock');
  function clockTick(){
    try { clockEl.textContent = 'MUNICH ' + new Intl.DateTimeFormat('en-GB', { timeZone:'Europe/Berlin', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false }).format(new Date()); } catch(e){}
  }
  clockTick(); setInterval(clockTick, 1000);

  // ---------- finale: zoom out ----------
  var finale = document.getElementById('finale'), fpin = document.getElementById('fpin'), scene = document.getElementById('scene');
  var proj = document.getElementById('proj'), ask = document.getElementById('ask');
  var dmark = scene.querySelector('.dmark'), beam = scene.querySelector('.beam'), tcard = document.getElementById('titlecard');
  var SCX = 925, SCY = 360, SW = 450, SH = 188;
  function renderFinale(){
    var vw = fpin.clientWidth, vh = fpin.clientHeight;
    var k = vw < 700 ? Math.min(vw * 0.84 / 830, vh / 720) : Math.min(Math.min(vw / 1280, vh / 720) * 1.3, vw * 0.92 / 830);   // same size as the landing
    var L = vw / 2 - 735 * k, T = (vh - 720 * k) / 2 - vh * 0.08;
    var r = finale.getBoundingClientRect(); var p = clamp(-r.top / (finale.offsetHeight - vh), 0, 1);
    var z = Math.max(vw / (SW * k), vh / (SH * k));
    var q = ease(range(p, 0.02, 0.7));           // 0 = projection fills the screen, 1 = back at the D
    var S = k * Math.pow(z, 1 - q);
    var p0x = L + SCX * k, p0y = T + SCY * k;
    var px = vw / 2 + (p0x - vw / 2) * q, py = vh / 2 + (p0y - vh / 2) * q;
    scene.style.transform = 'translate(' + (px - SCX * S) + 'px,' + (py - SCY * S) + 'px) scale(' + S + ')';
    var w = SW * S, h = SH * S, x = px - w / 2, y = py - h / 2;
    proj.style.clipPath = 'inset(' + Math.max(0, y) + 'px ' + Math.max(0, vw - x - w) + 'px ' + Math.max(0, vh - y - h) + 'px ' + Math.max(0, x) + 'px)';
    var rr = finale.getBoundingClientRect(); var po = clamp(1 - rr.top / (vh * 0.2), 0, 1); proj.style.opacity = po * po;
    var f = range(p, 0.35, 0.65); dmark.style.opacity = f; beam.style.opacity = f; fdustC.style.opacity = f;
    var pc = document.getElementById('pcap'); pc.style.left = x + 'px'; pc.style.top = y + 'px'; pc.style.width = w + 'px'; pc.style.height = h + 'px';
    pc.style.fontSize = Math.min(h * 0.16, w * 0.07) + 'px'; pc.style.opacity = 1 - range(p, 0.12, 0.4);
    tcard.style.left = x + 'px'; tcard.style.top = y + 'px'; tcard.style.width = w + 'px'; tcard.style.height = h + 'px';
    tcard.style.fontSize = (h * 0.15) + 'px'; tcard.style.opacity = range(p, 0.5, 0.75);
    ask.style.top = Math.min(y + h + Math.min(110, vh * 0.11), vh - ask.offsetHeight - 16) + 'px';
    ask.classList.toggle('on', p > 0.78);
    document.getElementById('fsocial').classList.toggle('on', p > 0.7);
  }

  var idustC = document.getElementById('idust'), fdustC = document.getElementById('fdust');
  dustField(idustC, function(){ return +(getComputedStyle(idustC).opacity) * (+(ibeam.style.opacity || 1)); });
  dustField(fdustC, function(){ return +(beam.style.opacity || 0); });
  if (!liquidReveal()) {                                     // no WebGL2: fall back to the simpler reveal
    revealField(document.getElementById('istage'), document.getElementById('ireveal'), document.getElementById('imat'),
      function(){ return document.getElementById('idmark').getBoundingClientRect(); },
      function(){ return window.scrollY < (intro.offsetHeight - istage.clientHeight) * 0.1; });
    revealField(document.getElementById('fpin'), document.getElementById('freveal'), document.getElementById('fmat'),
      function(){ return document.querySelector('#scene .dmark').getBoundingClientRect(); }, null);
  }
  function render(){ renderIntro(); renderWork(); renderFinale(); }

  // ---------- smooth, inertial scrolling for mouse wheels (touch keeps its native momentum) ----------
  var sTarget = window.scrollY, sCur = window.scrollY, sRaf = 0, sOwn = false, sLast = 0;
  function maxY(){ return document.documentElement.scrollHeight - window.innerHeight; }
  function sLoop(now){
    var dt = sLast ? Math.min(48, now - sLast) : 16.7; sLast = now;
    var k = 1 - Math.pow(1 - 0.085, dt / 16.7);
    sCur += (sTarget - sCur) * k;
    if (Math.abs(sTarget - sCur) < 0.4) sCur = sTarget;
    sOwn = true; window.scrollTo(0, sCur);
    if (sCur !== sTarget) sRaf = requestAnimationFrame(sLoop); else { sRaf = 0; sLast = 0; }
  }
  function smoothTo(y){
    if (reduce) { window.scrollTo(0, y); return; }
    if (!sRaf) { sCur = window.scrollY; }
    sTarget = clamp(y, 0, maxY());
    if (!sRaf) sRaf = requestAnimationFrame(sLoop);
  }
  window.addEventListener('wheel', function(e){
    if (reduce || e.defaultPrevented || e.ctrlKey || modal.classList.contains('show')) return;
    if (e.target.closest && e.target.closest('.about-pane')) return;
    e.preventDefault();
    var d = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaMode === 2 ? e.deltaY * window.innerHeight : e.deltaY;
    if (!sRaf) sCur = window.scrollY;
    smoothTo((sRaf ? sTarget : window.scrollY) + d);
  }, { passive:false });
  window.addEventListener('scroll', function(){
    if (Math.abs(window.scrollY - sCur) > 2) {            // scrollbar, touch, keyboard or code moved the page
      if (sRaf) { cancelAnimationFrame(sRaf); sRaf = 0; sLast = 0; }
      sTarget = sCur = window.scrollY;
    }
  }, { passive:true });
  window.addEventListener('keydown', function(e){
    if (modal.classList.contains('show') || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
    if (document.activeElement && document.activeElement.closest && document.activeElement.closest('#modeList')) return;
    var vh = window.innerHeight, base = sRaf ? sTarget : window.scrollY, map = { ArrowDown:120, ArrowUp:-120, PageDown:vh * .9, PageUp:-vh * .9, ' ':e.shiftKey ? -vh * .9 : vh * .9 };
    if (e.key === 'Home') { e.preventDefault(); smoothTo(0); return; }
    if (e.key === 'End') { e.preventDefault(); smoothTo(maxY()); return; }
    if (map[e.key] !== undefined && !(e.key === ' ' && document.activeElement.tagName === 'BUTTON')) { e.preventDefault(); smoothTo(base + map[e.key]); }
  });
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute('href').length < 2 || modal.classList.contains('show')) return;
    var t = document.querySelector(a.getAttribute('href')); if (!t) return;
    e.preventDefault(); smoothTo(t.getBoundingClientRect().top + window.scrollY);
  });

  var ticking = false;
  function req(){ if (!ticking) { ticking = true; requestAnimationFrame(function(){ ticking = false; render(); }); } }
  window.addEventListener('scroll', req, { passive:true });
  window.addEventListener('scroll', function(){ clearTimeout(idleT); idleT = setTimeout(function(){ if (workInView && focusFilm) setFinalFilm(focusFilm); }, 350); }, { passive:true });
  var lastW = window.innerWidth, lastH = window.innerHeight;
  window.addEventListener('resize', function(){
    if (window.innerWidth !== lastW || Math.abs(window.innerHeight - lastH) > 140) { lastW = window.innerWidth; lastH = window.innerHeight; sizeWork(); }
    req();
  });
  sizeWork(); render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function(){ sizeWork(); render(); });

  // ---------- Yes / No ----------
  var yes = document.getElementById('yesBtn'), no = document.getElementById('noBtn'), tease = document.getElementById('tease');
  var lines = ['Are you sure?', 'Think about it once more.', 'Okay, I see what you mean. Yes it is.'];
  var tries = 0;
  yes.addEventListener('click', function(){ ask.classList.add('yes'); });
  function dodge(){
    if (reduce) return;
    var dx = (Math.random() < .5 ? -1 : 1) * (90 + Math.random() * 140), dy = (Math.random() < .5 ? -1 : 1) * (20 + Math.random() * 50);
    var nr = no.getBoundingClientRect();
    if (nr.left + dx < 20 || nr.right + dx > window.innerWidth - 20) dx = -dx;
    no.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
    tease.textContent = tries++ % 2 ? 'Nope, not that one.' : 'Try the other one.';
  }
  if (window.matchMedia('(hover:hover)').matches) no.addEventListener('mouseenter', dodge);
  no.addEventListener('click', function(){
    if (tries >= lines.length - 1) { ask.classList.add('yes'); return; }
    tease.textContent = lines[Math.min(tries, lines.length - 1)]; tries++;
    if (tries === lines.length - 1) { no.textContent = 'Yes'; no.classList.remove('no'); }
  });

  // ---------- cursor ----------
  var cursor = document.getElementById('cursor');
  if (window.matchMedia('(hover:hover)').matches) {
    document.addEventListener('mousemove', function(e){ cursor.style.left = e.clientX + 'px'; cursor.style.top = e.clientY + 'px'; });
    track.addEventListener('mouseover', function(e){ cursor.classList.toggle('on', !!e.target.closest('.panel')); });
    track.addEventListener('mouseleave', function(){ cursor.classList.remove('on'); });
  }

  // ---------- overlay pages, with a clear way back ----------
  var modal = document.getElementById('modal'), mBody = document.getElementById('mBody'), lastFocus = null, pushed = false;
  var backLabel = document.getElementById('mBackLabel'), mPos = document.getElementById('mPos');
  function show(html, label, pos){
    if (!modal.classList.contains('show')) lastFocus = document.activeElement;
    mBody.innerHTML = html; backLabel.textContent = label || 'Back'; mPos.textContent = pos || '';
    modal.classList.add('show'); modal.scrollTop = 0; body.style.overflow = 'hidden'; cursor.classList.remove('on');
    if (!pushed) { try { history.pushState({ overlay:true }, ''); pushed = true; } catch(e){} }
    document.getElementById('mClose').focus();
  }
  function closeOverlay(){
    modal.classList.remove('show'); body.style.overflow = '';
    if (lastFocus && document.contains(lastFocus)) lastFocus.focus();
  }
  function hide(){ if (pushed) { history.back(); } else closeOverlay(); }
  window.addEventListener('popstate', function(){ if (modal.classList.contains('show')) { pushed = false; closeOverlay(); } });
  document.getElementById('mClose').addEventListener('click', hide);
  document.addEventListener('keydown', function(e){ if (e.key === 'Escape' && modal.classList.contains('show')) hide(); });
  function openProject(p){
    setFinalFilm(p);
    var list = projects.filter(function(x){ return x.mode === p.mode; }), i = list.indexOf(p), next = list[(i + 1) % list.length];
    var modeLabel = MODES.filter(function(m){ return m.id === p.mode; })[0].label;
    var nextHtml = list.length > 1 ?
      '<div class="mnext"><span class="lbl">Next film</span><a class="nf" href="#" id="nextFilm"><div class="still ' + next.still + '"></div><h3 class="display">' + next.title + '</h3></a>' +
      '<div class="ret"><a class="tlink" href="#" id="backAll"><span>All ' + modeLabel.toLowerCase() + '</span></a></div></div>' :
      '<div class="mnext"><div class="ret" style="grid-column:1 / -1"><a class="tlink" href="#" id="backAll"><span>Back to ' + modeLabel.toLowerCase() + '</span></a></div></div>';
    show('<div class="player"><div class="still ' + p.still + '"></div><span>Video placeholder for ' + p.title + '</span></div>' +
      '<div class="m-wrap"><h2 class="display m-title" id="mTitle">' + p.title + '</h2>' +
      '<div class="m-grid"><p>' + p.text + '</p><dl><dt>Category</dt><dd>' + p.cat + '</dd><dt>Year</dt><dd>' + p.year + '</dd><dt>Client</dt><dd>' + p.client + '</dd><dt>Role</dt><dd>' + p.role + '</dd></dl></div>' +
      '<div class="m-stills"><div class="' + p.still + '"></div><div class="' + p.still + '" style="filter:brightness(.75)"></div><div class="' + p.still + '" style="filter:brightness(1.15)"></div></div>' + nextHtml + '</div>',
      'Back to ' + modeLabel, pad(i + 1) + ' / ' + pad(list.length));
    var nf = document.getElementById('nextFilm'); if (nf) nf.addEventListener('click', function(e){ e.preventDefault(); openProject(next); });
    document.getElementById('backAll').addEventListener('click', function(e){ e.preventDefault(); hide(); });
  }
  // About in the header jumps to the "About me" drive mode
  document.getElementById('navAbout').addEventListener('click', function(){
    var ai = MODES.length - 1; smoothTo(work.offsetTop); setMode(ai);
  });
  var pages = {
    about: '<div class="m-wrap"><h2 class="display m-title" id="mTitle">About</h2><div class="about-grid"><div class="portrait" role="img" aria-label="Portrait placeholder"><span>Portrait placeholder</span></div><div class="about-text">' +
      '<p>I\'m Illia Vereshchuk, a director and cinematographer based in Munich. Darkinsider is the name I work under.</p>' +
      '<p>Most of my work happens around cars, often at night, when the city becomes a set. Alongside that I make short films, image films and event films for people who want their story told like cinema.</p>' +
      '<p>I study Filmmaking at Macromedia University of Applied Sciences in Munich and take on freelance projects across Germany and abroad.</p>' +
      '<dl class="roll"><dt>Directed by</dt><dd>Illia Vereshchuk</dd><dt>Director of photography</dt><dd>Illia Vereshchuk</dd><dt>Edited by</dt><dd>Illia Vereshchuk</dd><dt>Colour</dt><dd>Illia Vereshchuk</dd></dl></div></div></div>',
    impressum: '<div class="m-wrap legal"><h2 class="display m-title" id="mTitle">Impressum</h2><p>Placeholder. Add your full name, postal address and email, as required by German law.</p></div>',
    privacy: '<div class="m-wrap legal"><h2 class="display m-title" id="mTitle">Privacy</h2><p>Placeholder. Add a privacy policy covering hosting, embedded videos and email contact.</p></div>'
  };
  document.querySelectorAll('[data-open]').forEach(function(el){ el.addEventListener('click', function(e){ e.preventDefault(); show(pages[el.dataset.open], 'Back'); }); });
})();
