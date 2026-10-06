// Cursor reveal effects: liquidReveal() (WebGL2 fluid simulation) and its fallback revealField() (clip-path blobs).
window.DK = window.DK || {};
(function(){
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function clamp(v, a, b){ return Math.max(a, Math.min(b, v)); }
  var intro = document.getElementById('intro'), istage = document.getElementById('istage');
  var finale = document.getElementById('finale'), fpin = document.getElementById('fpin');

  // ---------- cursor reveal: a liquid spill uncovers the negative of the page, and the D shows up in another material ----------
  function revealField(stage, layer, matBox, getD, isOn){
    if (!layer || !window.matchMedia('(hover:hover)').matches || reduce) return;
    var drops = [], raf = 0, last = 0, tx = -1, ty = -1, fx = -1, fy = -1, acc = 0, active = false;
    var rawSpeed = 0, speed = 0, lmx = 0, lmy = 0, lmt = 0, dirx = 1, diry = 0;
    var mats = matBox.querySelectorAll('.mat'), mi = 0, mt = 0;
    mats[0].classList.add('on');
    function rnd(a, b){ return a + Math.random() * (b - a); }
    function lerp(a, b, t){ return a + (b - a) * t; }
    function lobes(amp){ var n = 8 + Math.floor(Math.random() * 5), l = []; for (var i = 0; i < n; i++) l.push({ a:rnd(-amp, amp), f:rnd(0.6, 1.6), ph:rnd(0, 6.283) }); return l; }
    function spill(x, y, s){
      var extra = Math.round(lerp(0.2, 3.5, s) + Math.random() * lerp(0.5, 2.5, s));
      var skipMain = Math.random() < lerp(0, 0.4, s);
      for (var i = skipMain ? 1 : 0; i <= extra; i++) {
        var main = i === 0, spread = lerp(10, 120, s);
        var ang = main ? Math.random() * 6.283 : Math.atan2(diry, dirx) + rnd(-1, 1) * lerp(3.1, 1.2, s);
        var sp = main ? rnd(0.004, lerp(0.02, 0.07, s)) : rnd(lerp(0.02, 0.08, s), lerp(0.05, 0.35, s));
        drops.push({ x:x + rnd(-spread, spread) * (main ? 0.25 : 1), y:y + rnd(-spread, spread) * (main ? 0.25 : 1),
          vx:Math.cos(ang) * sp, vy:Math.sin(ang) * sp,
          r:main ? rnd(lerp(80, 40, s), lerp(125, 105, s)) : rnd(lerp(14, 8, s), lerp(34, 30, s)),
          life:(main ? rnd(2300, 3400) : rnd(1300, 2300)) * lerp(1.2, 0.7, s), ts:lerp(0.6, 1.4, s), age:0,
          rot:Math.atan2(diry, dirx), st:main ? lerp(1, 1.6, s) : lerp(1, 2.2, s), lb:lobes(lerp(0.14, 0.42, s)) });
      }
      if (drops.length > 340) drops.splice(0, drops.length - 340);
    }
    stage.addEventListener('mousemove', function(e){
      if (isOn && !isOn()) return;
      var b = stage.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top, now = performance.now();
      if (lmt) { var dt = Math.max(1, now - lmt), dx = x - lmx, dy = y - lmy, d = Math.hypot(dx, dy); rawSpeed = d / dt; if (d > 0.5) { dirx = dx / d; diry = dy / d; } }
      lmx = x; lmy = y; lmt = now; tx = x; ty = y; if (fx < 0) { fx = x; fy = y; }
      active = true; if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
    });
    stage.addEventListener('mouseleave', function(){ active = false; });
    function blobPath(p, r, now){
      var n = p.lb.length, pts = [], c = Math.cos(p.rot), sn = Math.sin(p.rot);
      for (var i = 0; i < n; i++) {
        var L = p.lb[i], a = i / n * 6.283, rr = r * (1 + L.a * Math.sin(L.ph + now * 0.0011 * L.f * p.ts));
        var lx = Math.cos(a) * rr * p.st, ly = Math.sin(a) * rr / Math.sqrt(p.st);
        pts.push([p.x + lx * c - ly * sn, p.y + lx * sn + ly * c]);
      }
      var m = [(pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2], out = 'M' + m[0].toFixed(1) + ' ' + m[1].toFixed(1);
      for (var j = 0; j < n; j++) { var q = pts[j], nq = pts[(j + 1) % n]; out += 'Q' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + ' ' + ((q[0] + nq[0]) / 2).toFixed(1) + ' ' + ((q[1] + nq[1]) / 2).toFixed(1); }
      return out + 'Z';
    }
    function frame(now){
      var dt = last ? Math.min(40, now - last) : 16.7; last = now;
      var target = Math.min(1, rawSpeed / 2.2); rawSpeed *= Math.pow(0.86, dt / 16.7);
      speed += (target - speed) * (1 - Math.pow(1 - 0.12, dt / 16.7));
      if (active) {
        var k = 1 - Math.pow(1 - lerp(0.08, 0.32, speed), dt / 16.7), ox = fx, oy = fy;
        fx += (tx - fx) * k; fy += (ty - fy) * k;
        acc += Math.hypot(fx - ox, fy - oy);
        var gap = lerp(24, 14, speed) * rnd(0.7, lerp(1.2, 2, speed));
        while (acc > gap) { acc -= gap; var t = Math.random(); spill(ox + (fx - ox) * t, oy + (fy - oy) * t, speed); }
      }
      var path = '';
      for (var i = drops.length - 1; i >= 0; i--) {
        var p = drops[i], step = dt * p.ts; p.age += step;
        var u = p.age / p.life; if (u >= 1) { drops.splice(i, 1); continue; }
        var fr = Math.pow(0.984, step / 16.7); p.vx *= fr; p.vy *= fr; p.x += p.vx * step; p.y += p.vy * step;
        var r = p.r * (1 - Math.pow(1 - Math.min(1, u / 0.3), 3)) * (1 - Math.pow(Math.max(0, (u - 0.3) / 0.7), 1.5));
        if (r > 1) path += blobPath(p, r, now);
      }
      layer.style.clipPath = "path('" + (path || 'M0 0Z') + "')";
      // keep the material D exactly on top of the real D, and change its material every so often
      var dr = getD && getD(); if (dr) { var sb = stage.getBoundingClientRect(); matBox.style.left = (dr.left - sb.left) + 'px'; matBox.style.top = (dr.top - sb.top) + 'px'; matBox.style.width = dr.width + 'px'; matBox.style.height = dr.height + 'px'; }
      mt += dt; if (mt > 1400) { mt = 0; mats[mi].classList.remove('on'); mi = (mi + 1) % mats.length; mats[mi].classList.add('on'); }
      if (drops.length || active) raf = requestAnimationFrame(frame); else { raf = 0; layer.style.clipPath = "path('M0 0Z')"; }
    }
  }

  // ---------- liquid reveal (WebGL): a small fluid simulation is the mask; under it lies the negative of the scene ----------
  // and a D made of another material. The mouse only pushes ink into the fluid; the fluid itself remembers, flows and fades.
  function liquidReveal(){
    if (!window.matchMedia('(hover:hover)').matches || reduce) return true;          // nothing to do, and no fallback needed
    var cv = document.createElement('canvas'); cv.className = 'liquid'; cv.setAttribute('aria-hidden', 'true');
    var gl = cv.getContext('webgl2', { alpha:true, premultipliedAlpha:true, antialias:false, depth:false, stencil:false });
    if (!gl || !gl.getExtension('EXT_color_buffer_float')) return false;
    gl.getExtension('OES_texture_float_linear');

    var VS = DK.shaders.VS, FS = DK.shaders.FS;
    function sh(type, src){ var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); return null; } return s; }
    var vs = sh(gl.VERTEX_SHADER, VS), P = {};
    for (var key in FS) {
      var f = sh(gl.FRAGMENT_SHADER, FS[key]); if (!vs || !f) return false;
      var pr = gl.createProgram(); gl.attachShader(pr, vs); gl.attachShader(pr, f); gl.bindAttribLocation(pr, 0, 'aPos'); gl.linkProgram(pr);
      if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) return false;
      var u = {}, cnt = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
      for (var i = 0; i < cnt; i++) { var nm = gl.getActiveUniform(pr, i).name; u[nm] = gl.getUniformLocation(pr, nm); }
      P[key] = { p:pr, u:u };
    }
    // photographed materials (puffer, grass): real renders of the logo, loaded as textures
    var PHOTO = { puffer:'assets/materials/puffer.webp', grass:'assets/materials/grass.webp' };   // needs a local server (not file://) to load into WebGL
    var MAP_P = [0.0630,0.9348,0.0112,0.9692], MAP_G = [0.0804,0.9291,0.0756,0.8813];
    var texP = null, texG = null;
    function photoTex(src, done){ var img = new Image(); img.onload = function(){ var tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img); gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); done(tx); }; img.src = src; }
    photoTex(PHOTO.puffer, function(t){ texP = t; }); photoTex(PHOTO.grass, function(t){ texG = t; });
    var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1,1,-1,-1,1,1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    function fbo(w, h, fmt, ifmt){
      var tx = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tx);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, gl.HALF_FLOAT, null);
      var fb = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tx, 0);
      gl.viewport(0, 0, w, h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT);
      return { t:tx, f:fb, w:w, h:h };
    }
    function dbl(w, h, fmt, ifmt){ var a = fbo(w, h, fmt, ifmt), b = fbo(w, h, fmt, ifmt); return { r:a, w:b, swap:function(){ var x = this.r; this.r = this.w; this.w = x; } }; }
    var W = 0, H = 0, vel, dye, divg, crl, prs, simW, simH, dyeW, dyeH;
    function alloc(){
      var dpr = Math.min(2, window.devicePixelRatio || 1);
      W = cv.width = Math.round(window.innerWidth * dpr); H = cv.height = Math.round(window.innerHeight * dpr);
      var asp = W / H; simH = 140; simW = Math.round(simH * asp); dyeH = 520; dyeW = Math.round(dyeH * asp);
      vel = dbl(simW, simH, gl.RG, gl.RG16F); dye = dbl(dyeW, dyeH, gl.RGBA, gl.RGBA16F);
      divg = fbo(simW, simH, gl.RED, gl.R16F); crl = fbo(simW, simH, gl.RED, gl.R16F); prs = dbl(simW, simH, gl.RED, gl.R16F);
      l2dirty = true;
    }
    // the hidden layer: the negative of the scene, painted once into a texture whenever the layout changes
    var l2c = document.createElement('canvas'), l2 = l2c.getContext('2d'), l2tex = gl.createTexture(), l2dirty = true, l2sig = '';
    function rectOf(el){ return el ? el.getBoundingClientRect() : null; }
    function paintLayer2(s){
      var dpr = Math.min(1.5, window.devicePixelRatio || 1), w = window.innerWidth, h = window.innerHeight;
      l2c.width = Math.round(w * dpr); l2c.height = Math.round(h * dpr); l2.setTransform(dpr, 0, 0, dpr, 0, 0);
      l2.fillStyle = '#E8EDF6'; l2.fillRect(0, 0, w, h);
      var d = s.d, sc = s.screen;
      if (d && sc) {
        var x0 = d.left + d.width * 0.779, y0 = d.top + d.height * 0.4, y1 = d.top + d.height * 0.6;
        var g = l2.createLinearGradient(x0, 0, sc.left, 0); g.addColorStop(0, 'rgba(10,16,32,.55)'); g.addColorStop(1, 'rgba(10,16,32,.18)');
        l2.fillStyle = g; l2.beginPath(); l2.moveTo(x0, y0); l2.lineTo(sc.left, sc.top); l2.lineTo(sc.left, sc.bottom); l2.lineTo(x0, y1); l2.closePath(); l2.fill();
        l2.fillStyle = '#121A2E'; l2.fillRect(sc.left, sc.top, sc.width, sc.height);
        l2.fillStyle = '#E8EDF6'; l2.textAlign = 'center'; l2.textBaseline = 'middle';
        var fs = sc.height * 0.15; l2.font = '500 ' + fs + 'px Jost, Helvetica, sans-serif';
        if ('letterSpacing' in l2) l2.letterSpacing = (fs * 0.4) + 'px';
        l2.fillText('DARKINSIDER', sc.left + sc.width / 2 + fs * 0.2, sc.top + sc.height * 0.46);
        var fs2 = sc.height * 0.054; l2.font = '300 ' + fs2 + 'px Jost, Helvetica, sans-serif'; if ('letterSpacing' in l2) l2.letterSpacing = (fs2 * 0.7) + 'px';
        l2.fillStyle = '#5B6A8C'; l2.fillText('PRODUCTION', sc.left + sc.width / 2 + fs2 * 0.35, sc.top + sc.height * 0.63);
      }
      if (s.credit) { var c = s.credit, fs3 = parseFloat(getComputedStyle(s.creditEl).fontSize) * (c.height / (s.creditEl.offsetHeight || c.height)); l2.font = '400 ' + fs3 + 'px Jost, Helvetica, sans-serif'; if ('letterSpacing' in l2) l2.letterSpacing = (fs3 * 0.32) + 'px'; l2.fillStyle = '#2E3A55'; l2.textAlign = 'center'; l2.textBaseline = 'middle'; l2.fillText('CAMERA AND DIRECTION BY ILLIA VERESHCHUK', c.left + c.width / 2, c.top + c.height / 2); }
      gl.bindTexture(gl.TEXTURE_2D, l2tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, l2c);
    }
    function blit(target){ if (target) { gl.bindFramebuffer(gl.FRAMEBUFFER, target.f); gl.viewport(0, 0, target.w, target.h); } else { gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); } gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); }
    function use(name, tw, th){ var p = P[name]; gl.useProgram(p.p); if (p.u.texel) gl.uniform2f(p.u.texel, 1 / tw, 1 / th); return p.u; }
    function tex(unit, t, loc){ gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t); gl.uniform1i(loc, unit); }

    function splat(x, y, dx, dy, spd){
      var asp = W / H, px = x / window.innerWidth, py = 1 - y / window.innerHeight;
      var dir = [dx / window.innerWidth * asp, -dy / window.innerHeight];
      var u = use('splat', simW, simH);
      gl.uniform1f(u.aspect, asp); gl.uniform2f(u.pt, px, py); gl.uniform2f(u.dir, dir[0] * 40, dir[1] * 40);
      gl.uniform1f(u.radius, (0.0007 + spd * 0.0012) * 0.49 * 0.49); gl.uniform1f(u.seed, Math.random() * 100); gl.uniform1f(u.ragged, 0);
      gl.uniform3f(u.col, dx * (5 + spd * 9), -dy * (5 + spd * 9), 0);
      tex(0, vel.r.t, u.uT); blit(vel.w); vel.swap();
      u = use('splat', dyeW, dyeH);
      gl.uniform1f(u.aspect, asp); gl.uniform2f(u.pt, px, py); gl.uniform2f(u.dir, dir[0] * 40, dir[1] * 40);
      gl.uniform1f(u.radius, (0.00055 + spd * 0.0011) * 0.49 * 0.49 * (0.7 + Math.random() * 0.6));   // each x0.49 = 30% smaller footprint (radius is squared) gl.uniform1f(u.seed, Math.random() * 100); gl.uniform1f(u.ragged, 0.85);
      var amt = (1.0 - spd * 0.3) * (0.6 + Math.random() * 0.7); gl.uniform3f(u.col, amt, 0, 0);
      tex(0, dye.r.t, u.uT); blit(dye.w); dye.swap();
    }
    function stepSim(dt){
      var u = use('curl', simW, simH); tex(0, vel.r.t, u.uVel); blit(crl);
      u = use('vort', simW, simH); tex(0, vel.r.t, u.uVel); tex(1, crl.t, u.uCurl); gl.uniform1f(u.curl, 26); gl.uniform1f(u.dt, dt); blit(vel.w); vel.swap();
      u = use('div', simW, simH); tex(0, vel.r.t, u.uVel); blit(divg);
      u = use('scale', simW, simH); tex(0, prs.r.t, u.uSrc); gl.uniform1f(u.k, 0.8); blit(prs.w); prs.swap();
      u = use('press', simW, simH); tex(1, divg.t, u.uDiv);
      for (var i = 0; i < 20; i++) { tex(0, prs.r.t, u.uP); blit(prs.w); prs.swap(); }
      u = use('grad', simW, simH); tex(0, prs.r.t, u.uP); tex(1, vel.r.t, u.uVel); blit(vel.w); vel.swap();
      u = use('advect', simW, simH); tex(0, vel.r.t, u.uVel); tex(1, vel.r.t, u.uSrc); gl.uniform1f(u.dt, dt); gl.uniform1f(u.diss, Math.exp(-0.9 * dt)); blit(vel.w); vel.swap();
      u = use('advect', simW, simH); gl.uniform2f(u.texel, 1 / simW, 1 / simH); tex(0, vel.r.t, u.uVel); tex(1, dye.r.t, u.uSrc); gl.uniform1f(u.dt, dt); gl.uniform1f(u.diss, Math.exp(-0.86 * dt)); blit(dye.w); dye.swap();   // ink fades ~30% sooner again
    }
    function clearAll(){ [vel.r, vel.w, dye.r, dye.w, prs.r, prs.w].forEach(function(b){ gl.bindFramebuffer(gl.FRAMEBUFFER, b.f); gl.viewport(0, 0, b.w, b.h); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT); }); }

    // which scene is on screen: the opening shot, the closing shot, or neither
    var where = null, mats = [0, 1, 2, 3, 4, 5], mi = 0, mclock = 0;   // plush, cake, puffer, bubbles, inflatable, grass
    function scene(){
      var ip = clamp(-intro.getBoundingClientRect().top / Math.max(1, intro.offsetHeight - istage.clientHeight), 0, 1);
      if (intro.classList.contains('done') && ip < 0.06) return { name:'intro', host:istage, z:8, d:rectOf(document.getElementById('idmark')), screen:rectOf(document.getElementById('iscreen')), credit:rectOf(document.getElementById('icredit')), creditEl:document.getElementById('icredit') };
      var fr = finale.getBoundingClientRect(), fp = clamp(-fr.top / Math.max(1, finale.offsetHeight - fpin.clientHeight), 0, 1);
      if (fp > 0.74) return { name:'finale', host:fpin, z:3, d:rectOf(document.querySelector('#scene .dmark')), screen:rectOf(document.getElementById('titlecard')) };
      return null;
    }
    var mx = -1, my = -1, pmx = -1, pmy = -1, lastMove = 0, raf = 0, last = 0, speed = 0;
    window.addEventListener('mousemove', function(e){ mx = e.clientX; my = e.clientY; lastMove = performance.now(); if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }, { passive:true });
    window.addEventListener('resize', function(){ alloc(); });
    alloc();
    function frame(now){
      raf = 0;
      var s = scene();
      if (!s) { if (where) { cv.style.display = 'none'; clearAll(); where = null; } pmx = -1; return; }
      if (where !== s.name) { s.host.appendChild(cv); cv.style.zIndex = s.z; cv.style.display = 'block'; clearAll(); where = s.name; pmx = -1; l2dirty = true; }
      var dt = last ? Math.min(1 / 30, (now - last) / 1000) : 1 / 60; last = now;
      // repaint the hidden layer when the scene moved
      var sig = s.d ? [s.d.left | 0, s.d.top | 0, s.d.width | 0, s.screen ? s.screen.left | 0 : 0, s.screen ? s.screen.width | 0 : 0, window.innerWidth].join(',') : '';
      if (l2dirty || sig !== l2sig) { paintLayer2(s); l2sig = sig; l2dirty = false; }
      // the needle: ink along the whole path since the last frame, scaled by speed
      if (mx >= 0 && now - lastMove < 120) {
        if (pmx < 0) { pmx = mx; pmy = my; }
        var dx = mx - pmx, dy = my - pmy, dist = Math.hypot(dx, dy);
        var sp = Math.min(1, dist / dt / 2200); speed += (sp - speed) * 0.35;
        var n = Math.max(1, Math.ceil(dist / 9));
        for (var i = 1; i <= n; i++) splat(pmx + dx * i / n, pmy + dy * i / n, dx / n, dy / n, speed);
        pmx = mx; pmy = my;
      } else { pmx = mx; pmy = my; speed *= 0.9; }
      stepSim(dt);
      // the D changes its material every couple of seconds, with a soft crossfade
      mclock += dt; var period = 2.6, ph = mclock % period, k = clamp((ph - (period - 0.45)) / 0.45, 0, 1);
      if (mclock >= period) { mclock -= period; mi = (mi + 1) % mats.length; }
      var u = use('show', W, H);
      tex(0, dye.r.t, u.uDye); tex(1, l2tex, u.uL2);
      if (texP) tex(2, texP, u.uTexP); if (texG) tex(3, texG, u.uTexG);
      gl.uniform2f(u.uTexOk, texP ? 1 : 0, texG ? 1 : 0); gl.uniform4f(u.uMapP, MAP_P[0], MAP_P[1], MAP_P[2], MAP_P[3]); gl.uniform4f(u.uMapG, MAP_G[0], MAP_G[1], MAP_G[2], MAP_G[3]);
      var dpr = W / window.innerWidth;
      gl.uniform2f(u.res, W, H); gl.uniform1f(u.t, now / 1000); gl.uniform1f(u.th, 0.24); gl.uniform1f(u.aspect, W / H);
      if (s.d) gl.uniform4f(u.dRect, s.d.left * dpr, s.d.top * dpr, s.d.width * dpr, s.d.height * dpr); else gl.uniform4f(u.dRect, 0, 0, 0, 0);
      gl.uniform1f(u.matA, mats[mi]); gl.uniform1f(u.matB, mats[(mi + 1) % mats.length]); gl.uniform1f(u.matMix, k);
      gl.clearColor(0, 0, 0, 0); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.viewport(0, 0, W, H); gl.clear(gl.COLOR_BUFFER_BIT);
      blit(null);
      // keep running while the ink is still alive (about 5 s after the last move)
      if (now - lastMove < 2800) raf = requestAnimationFrame(frame); else { clearAll(); gl.clear(gl.COLOR_BUFFER_BIT); }
    }
    return true;
  }
  DK.revealField = revealField; DK.liquidReveal = liquidReveal;
})();
