/* Order of 86 GIF maker: reskins Doginal Dogs graphics-library GIFs with a chosen wizard, entirely in the browser.
 * Each scene ships dog-free "plates" (the original frames with the old dog removed and the scene rebuilt behind it)
 * plus per-frame cell ops; the wizard's official 25x25 portrait is pasted cell by cell, hat always on top,
 * then the frames are encoded with js/gifenc.js. Nothing is uploaded. */
(function () {
  "use strict";
  var BASE = "gifs/", V = "11";
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var state = { dog: null, mode: "dog", index: [], dogs: {}, scenes: {}, open: null, timer: 0, token: 0 };

  function json(u) { return fetch(BASE + u + "?v=" + V).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
  function hex(h) { return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function img(u) {
    return new Promise(function (ok, bad) { var i = new Image(); i.onload = function () { ok(i); }; i.onerror = bad; i.src = BASE + u + "?v=" + V; });
  }
  /* Memory-light loading (phones): scene.json is cached; decoded plates are kept only for the scene being previewed. */
  var jsonCache = {}, plateKeep = { id: null, plates: null };
  function sceneJSON(id) { return jsonCache[id] || (jsonCache[id] = json(id + "/scene.json")); }
  function decode(J, ims) {
    var c = document.createElement("canvas"); c.width = J.w; c.height = J.h;
    var x = c.getContext("2d", { willReadFrequently: true });
    var out = ims.map(function (im) { x.clearRect(0, 0, J.w, J.h); x.drawImage(im, 0, 0); return x.getImageData(0, 0, J.w, J.h).data; });
    c.width = c.height = 1; return out;
  }
  /* full scene (all plates) for the preview; replaces whatever was kept before */
  function loadScene(id) {
    return sceneJSON(id).then(function (J0) {
      if (plateKeep.id === id) return withPlates(J0, plateKeep.plates);
      plateKeep = { id: null, plates: null };
      var jobs = []; for (var k = 0; k < J0.np; k++) jobs.push(img(id + "/p" + k + ".png"));
      return Promise.all(jobs).then(function (ims) {
        var pl = decode(J0, ims); plateKeep = { id: id, plates: pl }; return withPlates(J0, pl);
      });
    });
  }
  function withPlates(J0, pl) { var J = Object.create(J0); J.plates = pl; return J; }
  /* just frame 0's plate, for a thumbnail; nothing is kept afterwards */
  function loadThumb(id) {
    return sceneJSON(id).then(function (J0) {
      var p0 = J0.frames[0].p;
      if (plateKeep.id === id) { var J = withPlates(J0, []); J.plates[p0] = plateKeep.plates[p0]; return J; }
      return img(id + "/p" + p0 + ".png").then(function (im) {
        var J = withPlates(J0, []); J.plates[p0] = decode(J0, [im])[0]; return J;
      });
    });
  }
  /* background family -> the wizard's PFP background, keeping each shade's lightness (same rule as the build) */
  function bgMap(J, dog) {
    var T = hex(dog.bg), M = new Map();
    Object.keys(J.fam).forEach(function (h) {
      var m = J.fam[h], k = m[1], out;
      if (m[0] === 0) out = T.map(function (t) { return Math.round(t * k); });
      else if (m[0] === 1) out = T.map(function (t) { return Math.round(t + (255 - t) * k); });
      else { var X = hex(m[2]); out = T.map(function (t, i) { return Math.round(t * (1 - k) + X[i] * k); }); }
      M.set(parseInt(h, 16), out);
    });
    return M;
  }
  // body texture: the dog's own fur pixel; outline stays black; only the scene's dark shading survives on the base fur
  function texCol(dog, pal, roles, kind, v, u, ro) {
    if (ro === 4) return roles[4];
    var ti = (kind === 5 ? dog.tb : dog.tf).charCodeAt(v * 25 + u) - 48;
    if (ti === 0) return roles[ro];
    var col = pal[ti];
    if (ro === 0 || col[0] !== roles[0][0] || col[1] !== roles[0][1] || col[2] !== roles[0][2]) return col;
    // the scene's shading on the base fur: the dark shade always; the light/mid roles (paws, belly) only when the
    // dog's own body fur has that colour (Gary's tan paws stay; a white or green muzzle never paints a grey body)
    if (ro === 1) return roles[1];
    if (!dog._tset) { dog._tset = {}; for (var i = 0; i < dog.tf.length; i++) { var k = dog.tf.charCodeAt(i) - 48; if (k) dog._tset[dog.pal[k]] = 1; } }
    return dog._tset[dog.roles[ro]] ? roles[ro] : col;
  }
  function compose(J, dog, mode, f) {
    var fr = J.frames[f], src = J.plates[fr.p], d = new Uint8ClampedArray(src), W = J.w;
    if (mode === "dog") {
      var M = bgMap(J, dog), last = -1, hit = null;
      for (var i = 0; i < d.length; i += 4) {
        var c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        if (c !== last) { last = c; hit = M.get(c) || null; }
        if (hit) { d[i] = hit[0]; d[i + 1] = hit[1]; d[i + 2] = hit[2]; }
      }
    }
    var pal = dog._pal || (dog._pal = dog.pal.map(hex)), roles = dog._roles || (dog._roles = dog.roles.map(hex));
    var g = dog.g[fr.st], ops = fr.ops, xs = J.xs, ys = J.ys;
    for (var o = 0; o < ops.length; o += 6) {
      var r = ops[o], cc = ops[o + 1], kind = ops[o + 2], col;
      if (kind === 8) {
        // inset portrait (the whole dog scaled into a picture frame): y, x in pixels, 8, v, u, block size
        var ii = g.charCodeAt(ops[o + 3] * 25 + ops[o + 4]) - 48;
        if (ii === 0) continue;
        col = pal[ii];
        var sz = ops[o + 5];
        for (var yy = r; yy < r + sz; yy++) {
          var q = (yy * W + cc) * 4;
          for (var xx = 0; xx < sz; xx++, q += 4) { d[q] = col[0]; d[q + 1] = col[1]; d[q + 2] = col[2]; d[q + 3] = 255; }
        }
        continue;
      }
      if (kind === 2) col = roles[ops[o + 5]];
      else if (kind === 7) {
        // scene prop in the dog's own hat colour (copy of portrait cell v,u), e.g. the broom's bristles
        var hi = g.charCodeAt(ops[o + 3] * 25 + ops[o + 4]) - 48;
        if (hi === 0) continue;
        col = pal[hi];
      }
      else if (kind >= 5) {
        // body texture: the dog's own torso / fur pixel (outline black; base fur keeps the scene's shading role)
        col = texCol(dog, pal, roles, kind, ops[o + 3], ops[o + 4], ops[o + 5]);
      }
      else {
        var pi = g.charCodeAt(ops[o + 3] * 25 + ops[o + 4]) - 48;
        if (pi === 0) {
          if (kind !== 1) continue;
          // body cell where the portrait is background: the dog's own body fur texture there
          col = texCol(dog, pal, roles, 6, Math.min(24, Math.max(19, ops[o + 3])), Math.min(22, Math.max(2, ops[o + 4])), ops[o + 5]);
        }
        else col = pal[pi];
      }
      for (var y = ys[r]; y < ys[r + 1]; y++) {
        var p = (y * W + xs[cc]) * 4;
        for (var x = xs[cc]; x < xs[cc + 1]; x++, p += 4) { d[p] = col[0]; d[p + 1] = col[1]; d[p + 2] = col[2]; d[p + 3] = 255; }
      }
    }
    return d;
  }
  var bigCv = null;
  function paint(canvas, J, data) {
    if (!bigCv) bigCv = document.createElement("canvas");
    if (bigCv.width !== J.w || bigCv.height !== J.h) { bigCv.width = J.w; bigCv.height = J.h; }
    bigCv.getContext("2d").putImageData(new ImageData(data, J.w, J.h), 0, 0);
    var x = canvas.getContext("2d"); x.imageSmoothingEnabled = false;
    x.clearRect(0, 0, canvas.width, canvas.height); x.drawImage(bigCv, 0, 0, canvas.width, canvas.height);
  }
  function wizardName0(w) { return w.starter ? w.name : (window.wizardName ? window.wizardName(w) : "Dog #" + w.number); }
  /* everyone the picker offers: the 9 starter wizards first, then the Order's 86 */
  function people() {
    if (state.people) return state.people;
    var st = Object.keys(state.dogs).map(function (k) { return state.dogs[k]; }).filter(function (d) { return d.image; })
      .map(function (d) { return { number: d.n, name: d.name, image: d.image, starter: true }; });
    return (state.people = st.concat(WIZARDS.filter(function (w) { return state.dogs[w.number]; })));
  }
  function person(n) { return people().filter(function (w) { return w.number === n; })[0]; }
  function wizardName(n) { var w = person(n); return w ? wizardName0(w) : "Dog #" + n; }
  function label(w) { return w.starter ? w.name.replace("Starter, ", "") : "#" + w.number; }

  /* ---------- picker ---------- */
  function renderPicker(q) {
    var box = $("#gm-results"); box.innerHTML = "";
    var raw = String(q || "").trim().toLowerCase(), qs = raw.replace(/[^0-9]/g, "");
    var all = people(), list = all.filter(function (w) {
      if (!raw) return true;
      if (w.starter) return !qs && w.name.toLowerCase().indexOf(raw.replace(/^#/, "")) >= 0;
      return qs && String(w.number).indexOf(qs) >= 0;
    });
    var ns = list.filter(function (w) { return w.starter; }).length, nw = list.length - ns;
    $("#gm-count").textContent = (ns ? ns + " starter" + (ns === 1 ? "" : "s") + (nw ? " + " : "") : "") + (nw || !ns ? nw + (nw === 1 ? " wizard" : " wizards") : "");
    var head = function (t) { var h = document.createElement("p"); h.className = "gm-group small"; h.textContent = t; box.appendChild(h); };
    var last = null;
    list.forEach(function (w) {
      if (w.starter !== last) { head(w.starter ? "Starter wizards" : "The Order's 86"); last = w.starter; }
      var b = document.createElement("button");
      b.type = "button"; b.className = "gm-pick" + (w.starter ? " is-starter" : "") + (w.number === state.dog ? " is-on" : "");
      b.setAttribute("aria-pressed", w.number === state.dog ? "true" : "false");
      b.style.setProperty("--bgc", "#" + (state.dogs[w.number] ? state.dogs[w.number].bg : "333"));
      b.innerHTML = '<img src="' + w.image + '" alt="" width="64" height="64" loading="lazy"><span>' + label(w) + "</span>";
      b.title = wizardName0(w);
      b.addEventListener("click", function () { choose(w.number, true); });
      box.appendChild(b);
    });
    if (!list.length) box.innerHTML = '<p class="muted small gm-empty">No wizard matches. Try 6164, or a hat colour such as "purple".</p>';
  }
  function choose(n, push) {
    state.dog = n;
    var w = person(n), d = state.dogs[n];
    $("#gm-chosen-img").src = w.image; $("#gm-chosen-name").textContent = wizardName0(w);
    $("#gm-chosen-num").textContent = w.starter ? "Starter wizard" : "#" + n;
    $("#gm-chosen").style.setProperty("--bgc", "#" + d.bg);
    $("#gm-bg-swatch").style.background = "#" + d.bg;
    if (push && history.replaceState) history.replaceState(null, "", "?dog=" + n);
    renderPicker($("#gm-search").value);
    renderGrid();
    if (state.open) openPreview(state.open);
  }
  /* ---------- grid ---------- */
  /* thumbnails render one at a time, only when their card scrolls near the screen */
  var queue = [], busy = false, seen = {}, io = null;
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    var job = queue.shift();
    loadThumb(job.id).then(function (J) {
      if (job.tok === state.token) { paint(job.cv, J, compose(J, state.dogs[state.dog], state.mode, 0)); job.card.classList.remove("is-loading"); }
    }).catch(function () { job.card.classList.add("is-error"); })
      .then(function () { busy = false; setTimeout(pump, 0); });
  }
  function want(card) {
    var id = card.dataset.scene;
    if (seen[id] === state.token) return; seen[id] = state.token;
    queue = queue.filter(function (q) { return q.id !== id; });
    queue.push({ id: id, card: card, cv: $("canvas", card), tok: state.token }); pump();
  }
  function renderGrid() {
    ++state.token; queue = []; seen = {};
    var cards = document.querySelectorAll(".gm-card");
    cards.forEach(function (c) { c.classList.add("is-loading"); });
    if (!("IntersectionObserver" in window)) { cards.forEach(want); return; }
    if (!io) io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) want(e.target); }); }, { rootMargin: "400px 0px" });
    cards.forEach(function (c) { io.unobserve(c); io.observe(c); });
  }
  function buildCards() {
    var grid = $("#gm-grid");
    grid.innerHTML = state.index.map(function (s) {
      return '<li><button type="button" class="card gm-card" data-scene="' + s.id + '" aria-haspopup="dialog">' +
        '<span class="card-art gm-art"><canvas width="360" height="360" aria-hidden="true"></canvas><span class="gm-play" aria-hidden="true">&#9654;</span></span>' +
        '<span class="card-body"><span class="card-name">' + s.title + '</span><span class="card-tag">' + s.nf + " frames &middot; " + (s.ms / 1000).toFixed(1) + "s loop</span></span></button></li>";
    }).join("");
    grid.querySelectorAll(".gm-card").forEach(function (b) { b.addEventListener("click", function () { openPreview(b.dataset.scene); }); });
  }
  /* ---------- preview + download ---------- */
  function frameDelay(d) { return d <= 10 ? 100 : d; }   // what browsers show for 0/10 ms frames
  function openPreview(id) {
    var dlg = $("#gm-dialog"), s = state.index.filter(function (x) { return x.id === id; })[0];
    state.open = id; clearTimeout(state.timer);
    $("#gm-d-title").textContent = s.title + " \u00b7 " + wizardName(state.dog);
    $("#gm-d-status").textContent = "Loading\u2026";
    $("#gm-download").disabled = true;
    if (!dlg.open) { if (dlg.showModal) dlg.showModal(); else dlg.setAttribute("open", ""); }
    var dog = state.dogs[state.dog], mode = state.mode, tok = state.token;
    loadScene(id).then(function (J) {
      if (state.open !== id) return;
      /* frames are composed as they play, so only one is in memory at a time */
      state.cur = { J: J, id: id, n: state.dog, mode: mode, dog: dog };
      var cv = $("#gm-canvas"), k = 0;
      (function tick() {
        if (state.open !== id || !dlg.open) return;
        paint(cv, J, compose(J, dog, mode, k)); var d = frameDelay(J.durs[k]); k = (k + 1) % J.frames.length;
        state.timer = setTimeout(tick, d);
      })();
      $("#gm-d-status").textContent = J.nf + " frames, " + J.w + "\u00d7" + J.h + (mode === "dog" ? ", your dog's background" : ", tan background");
      $("#gm-download").disabled = false;
    }).catch(function () { $("#gm-d-status").textContent = "Couldn't load this GIF. Try again."; });
  }
  function download() {
    var c = state.cur; if (!c) return;
    var btn = $("#gm-download"), st = $("#gm-d-status"); btn.disabled = true; st.textContent = "Building your GIF\u2026";
    setTimeout(function () {
      var lazy = c.J.frames.map(function (_, f) {
        var o = { delay: c.J.durs[f] };
        Object.defineProperty(o, "data", { get: function () { return compose(c.J, c.dog, c.mode, f); } });
        return o;
      });
      var bytes = encodeGIF(lazy, { width: c.J.w, height: c.J.h, loop: c.J.loop });
      var url = URL.createObjectURL(new Blob([bytes], { type: "image/gif" }));
      var a = document.createElement("a"); a.href = url; a.download = "order86-" + c.id + "-" + c.n + ".gif";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      st.textContent = "Saved order86-" + c.id + "-" + c.n + ".gif (" + Math.round(bytes.length / 1024) + " KB)"; btn.disabled = false;
    }, 30);
  }
  function closePreview() { var dlg = $("#gm-dialog"); state.open = null; clearTimeout(state.timer); if (dlg.close) dlg.close(); else dlg.removeAttribute("open"); }

  function init() {
    if (!$("#gm-grid")) return;
    Promise.all([json("index.json"), json("dogs.json")]).then(function (r) {
      state.index = r[0]; r[1].forEach(function (d) { state.dogs[d.n] = d; });
      buildCards();
      var m = (location.search.match(/[?&]dog=([a-z0-9-]+)/i) || [])[1], q = /^\d+$/.test(m || "") ? parseInt(m, 10) : m;
      choose(q !== undefined && person(q) ? q : 6164, false);
    }).catch(function () { $("#gm-grid").innerHTML = '<li class="muted">The GIF maker could not load its files.</li>'; });
    $("#gm-search").addEventListener("input", function (e) {
      renderPicker(e.target.value);
      var v = e.target.value.trim().toLowerCase(), n = /^#?\d+$/.test(v) ? parseInt(v.replace("#", ""), 10) : NaN;
      if (person(n) && !person(n).starter && n !== state.dog) choose(n, true);
    });
    document.querySelectorAll('input[name="gm-bg"]').forEach(function (r) {
      r.addEventListener("change", function () { if (r.checked) { state.mode = r.value; renderGrid(); if (state.open) openPreview(state.open); } });
    });
    $("#gm-download").addEventListener("click", download);
    $("#gm-close").addEventListener("click", closePreview);
    $("#gm-dialog").addEventListener("close", function () { state.open = null; clearTimeout(state.timer); });
    $("#gm-dialog").addEventListener("click", function (e) { if (e.target.id === "gm-dialog") closePreview(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init); else init();
})();
