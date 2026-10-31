/* Banner generator: a 1500x500 X header drawn on a canvas, entirely in the browser.
 * Layout (measured from the reference banner, in units of the name's cap height C, C = 104px by default):
 * the name is centred with its cap middle at y=260, the pixel wizard hat sits tilted on the first letter,
 * the verified badge sits top-right of the name, and the @handle is centred underneath.
 */
(function () {
  var canvas = document.getElementById("banner-canvas");
  if (!canvas) return;
  var W = 1500, H = 500, ctx = canvas.getContext("2d");
  var $ = function (id) { return document.getElementById(id); };
  var nameIn = $("b-name"), handleIn = $("b-handle"), badgeIn = $("b-badge"), safeIn = $("b-safe"), safeZone = $("safe-zone");

  var NAME_FONT = '"Banner Display", "Archivo Black", "Arial Black", Impact, sans-serif';
  var HANDLE_FONT = '"Banner Handle", "Arial Black", Arial, Helvetica, sans-serif';

  // Wizard hats extracted from the 86 wizard dogs' pixel art (images/hats, 15x10 art pixels each), plus a white, black and red one made to match.
  var HATS = [
    { id: "orange", label: "Orange" }, { id: "purple", label: "Purple" }, { id: "blue", label: "Blue" },
    { id: "green", label: "Green" }, { id: "pink", label: "Pink" }, { id: "yellow", label: "Yellow" },
    { id: "white", label: "White & Red" }   // custom white, black and red hat in the same pixel style
  ];
  // Doginal Dogs Background trait values (market.doginaldogs.com), colours sampled from the dog art.
  var BACKGROUNDS = [
    { id: "Aqua", color: "#4ffcd1" }, { id: "Blue", color: "#64ffff" }, { id: "Green", color: "#8dffa4" },
    { id: "Pink", color: "#ffd0eb" }, { id: "Purple", color: "#debcff" }, { id: "Red", color: "#ff7d82" },
    { id: "Rose", color: "#ffb1dd" }, { id: "Tan", color: "#f8e49e" }, { id: "Yellow", color: "#ffe154" }
  ];

  var L = {            // proportions, all multiplied by the cap height C
    capMax: 104, capMidY: 260, safeW: 1000, nameScaleX: 1.12, nameTrack: -7 / 104,
    hatPx: 8 / 104, hatDX: 23 / 104, hatDY: -21 / 104, hatAngle: -18 * Math.PI / 180, hatHalfBox: 70 / 104,
    badgeD: 74 / 104, badgeGap: 20 / 104, badgeDY: -23 / 104,
    handleSize: 36.7 / 104, handleGap: 15 / 104
  };
  var BADGE_BLUE = "#258bf9";

  var state = { hat: "orange", bg: "#4ffcd1", bgName: "Aqua", ink: "#000000" };
  var hatImgs = {};
  HATS.forEach(function (h) { var im = new Image(); im.onload = draw; im.src = "images/hats/" + h.id + ".png"; hatImgs[h.id] = im; });

  var pixelCache = {};
  function hatPixels(id) {   // read the hat PNG's pixels once (same-origin, so the canvas stays untainted)
    if (pixelCache[id]) return pixelCache[id];
    var im = hatImgs[id]; if (!im || !im.complete || !im.naturalWidth) return null;
    var c = document.createElement("canvas"); c.width = im.naturalWidth; c.height = im.naturalHeight;
    var cx = c.getContext("2d"); cx.drawImage(im, 0, 0);
    var d = cx.getImageData(0, 0, c.width, c.height).data, list = [];
    for (var y = 0; y < c.height; y++) for (var x = 0; x < c.width; x++) {
      var i = (y * c.width + x) * 4;
      if (d[i + 3] > 127) list.push([x, y, "rgb(" + d[i] + "," + d[i + 1] + "," + d[i + 2] + ")"]);
    }
    return (pixelCache[id] = { w: c.width, h: c.height, list: list });
  }

  function handleText() {
    var h = (handleIn.value || "").trim().replace(/\s+/g, "");
    if (!h) return "";
    return h.charAt(0) === "@" ? h : "@" + h;
  }

  function drawBadge(cx, cy, d) {
    var R = d / 2, lobes = 8, k;
    ctx.fillStyle = BADGE_BLUE;
    ctx.beginPath(); ctx.arc(cx, cy, R * 0.84, 0, Math.PI * 2); ctx.fill();
    for (k = 0; k < lobes; k++) {
      var a = (k / lobes) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath(); ctx.arc(cx + Math.cos(a) * R * 0.70, cy + Math.sin(a) * R * 0.70, R * 0.30, 0, Math.PI * 2); ctx.fill();
    }
    ctx.strokeStyle = "#ffffff"; ctx.lineWidth = R * 0.21; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.36, cy + R * 0.02); ctx.lineTo(cx - R * 0.10, cy + R * 0.28); ctx.lineTo(cx + R * 0.38, cy - R * 0.26);
    ctx.stroke();
  }

  // The reference lettering is a touch wider and tighter than the font: stretch 12% and tighten the tracking.
  function setNameFont(size, C) {
    ctx.font = "900 " + size + "px " + NAME_FONT;
    if ("letterSpacing" in ctx) ctx.letterSpacing = (L.nameTrack * C / L.nameScaleX).toFixed(2) + "px";
  }
  function layout(name, C) {
    // Returns geometry for a given cap height C.
    var probe = 100; ctx.font = "900 " + probe + "px " + NAME_FONT; if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    var capRatio = ctx.measureText("H").actualBoundingBoxAscent / probe || 0.72;
    var size = C / capRatio; setNameFont(size, C);
    var m = ctx.measureText(name), sx = L.nameScaleX;
    var inkL = -m.actualBoundingBoxLeft * sx, inkR = m.actualBoundingBoxRight * sx;   // relative to draw x, after the horizontal stretch
    var hatOn = !!state.hat, badgeOn = badgeIn.checked;
    var hatCx = inkL + L.hatDX * C, left = hatOn ? Math.min(inkL, hatCx - L.hatHalfBox * C) : inkL;
    var badgeCx = inkR + L.badgeGap * C + L.badgeD * C / 2, right = badgeOn ? badgeCx + L.badgeD * C / 2 : inkR;
    return { size: size, C: C, left: left, right: right, width: right - left, hatCx: hatCx, badgeCx: badgeCx };
  }

  function draw() {
    var name = (nameIn.value || "").trim().toUpperCase(), handle = handleText();
    ctx.save();
    ctx.fillStyle = state.bg; ctx.fillRect(0, 0, W, H);
    if (name) {
      var g = layout(name, L.capMax);
      if (g.width > L.safeW) g = layout(name, L.capMax * L.safeW / g.width);   // auto-shrink long names
      var C = g.C, x = W / 2 - (g.left + g.right) / 2, capTop = L.capMidY - C / 2, base = L.capMidY + C / 2;
      setNameFont(g.size, C); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = state.ink;
      ctx.save(); ctx.translate(x, base); ctx.scale(L.nameScaleX, 1); ctx.fillText(name, 0, 0); ctx.restore();
      if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
      var px = state.hat && hatPixels(state.hat);
      if (px) {
        // One filled square per art pixel inside the rotated frame: stays crisp at any size and angle.
        var p = L.hatPx * C, hw = px.w * p, hh = px.h * p;
        ctx.save(); ctx.translate(x + g.hatCx, capTop + L.hatDY * C); ctx.rotate(L.hatAngle); ctx.translate(-hw / 2, -hh / 2);
        ctx.imageSmoothingEnabled = false;
        px.list.forEach(function (q) { ctx.fillStyle = q[2]; ctx.fillRect(q[0] * p - 0.35, q[1] * p - 0.35, p + 0.7, p + 0.7); });
        ctx.restore();
      }
      if (badgeIn.checked) drawBadge(x + g.badgeCx, capTop + L.badgeDY * C, L.badgeD * C);
      var handleTop = base + L.handleGap * C;
      if (handle) drawHandle(handle, handleTop, Math.max(L.handleSize * C, 26));
    } else if (handle) {
      drawHandle(handle, L.capMidY - 20, L.handleSize * L.capMax * 1.4);
    }
    ctx.restore();
  }
  function drawHandle(text, top, size) {
    ctx.font = "800 " + size + "px " + HANDLE_FONT;
    var asc = ctx.measureText("l").actualBoundingBoxAscent || size * 0.72;
    while (ctx.measureText(text).width > L.safeW && size > 12) { size -= 1; ctx.font = "800 " + size + "px " + HANDLE_FONT; }
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = state.ink;
    ctx.fillText(text, W / 2, top + asc);
  }

  // Pickers
  function pressed(group, btn) {
    Array.prototype.forEach.call(group.querySelectorAll(".swatch"), function (b) { b.setAttribute("aria-pressed", b === btn ? "true" : "false"); });
  }
  var hatsBox = $("b-hats"), bgsBox = $("b-bgs");
  hatsBox.innerHTML = HATS.map(function (h) {
    return '<button type="button" class="swatch" data-hat="' + h.id + '" aria-pressed="' + (h.id === state.hat) + '"><img src="images/hats/' + h.id + '.png" alt="" width="60" height="40">' + h.label + "</button>";
  }).join("") + '<button type="button" class="swatch" data-hat="" aria-pressed="false"><span class="none" aria-hidden="true">&#8856;</span>No hat</button>';
  hatsBox.addEventListener("click", function (e) {
    var b = e.target.closest(".swatch"); if (!b) return;
    state.hat = b.getAttribute("data-hat"); pressed(hatsBox, b); draw();
  });
  bgsBox.innerHTML = BACKGROUNDS.map(function (b) {
    return '<button type="button" class="swatch" data-bg="' + b.color + '" data-name="' + b.id + '" aria-pressed="' + (b.id === state.bgName) + '"><span class="chip" style="background:' + b.color + '"></span>' + b.id + "</button>";
  }).join("") + '<label class="swatch custom" aria-pressed="false"><input id="b-color" type="color" value="#3ef0d6" aria-label="Custom background colour">Custom</label>';
  bgsBox.addEventListener("click", function (e) {
    var b = e.target.closest("button.swatch"); if (!b) return;
    state.bg = b.getAttribute("data-bg"); state.bgName = b.getAttribute("data-name"); pressed(bgsBox, b); draw();
  });
  var colorIn = $("b-color");
  colorIn.addEventListener("input", function () { state.bg = colorIn.value; state.bgName = "Custom"; pressed(bgsBox, colorIn.parentNode); draw(); });

  document.querySelectorAll('input[name="b-ink"]').forEach(function (r) { r.addEventListener("change", function () { state.ink = r.value; draw(); }); });
  nameIn.addEventListener("input", draw);
  handleIn.addEventListener("input", draw);
  handleIn.addEventListener("blur", function () { var h = handleText(); if (h && h !== handleIn.value) handleIn.value = h; });
  badgeIn.addEventListener("change", draw);
  safeIn.addEventListener("change", function () { safeZone.hidden = !safeIn.checked; });

  // Full-size export (the canvas is always 1500x500; the safe-zone overlay is HTML, so it's never exported).
  window.bannerExport = function () { draw(); return canvas.toDataURL("image/png"); };
  window.bannerSet = function (o) {   // test hook: {hat, bg, ink, name, handle, badge}
    if ("hat" in o) state.hat = o.hat; if (o.bg) { state.bg = o.bg; state.bgName = o.bgName || ""; } if (o.ink) state.ink = o.ink;
    if ("name" in o) nameIn.value = o.name; if ("handle" in o) handleIn.value = o.handle; if ("badge" in o) badgeIn.checked = !!o.badge;
    draw();
  };
  $("banner-download").addEventListener("click", function () {
    draw();
    canvas.toBlob(function (blob) {
      var a = document.createElement("a"), url = URL.createObjectURL(blob);
      var slug = ((nameIn.value || "banner").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "banner");
      a.href = url; a.download = "x-header-" + slug + ".png";
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    }, "image/png");
  });

  draw();
  window.bannerReady = false;
  var fontsReady = document.fonts && document.fonts.load ?
    Promise.all([document.fonts.load('900 100px "Banner Display"', "WIZARD"), document.fonts.load('800 40px "Banner Handle"', "@wizard")]) : Promise.resolve();
  var hatsReady = Promise.all(HATS.map(function (h) { var im = hatImgs[h.id]; return im.complete ? 1 : new Promise(function (r) { im.addEventListener("load", r); im.addEventListener("error", r); }); }));
  Promise.all([fontsReady.catch(function () {}), hatsReady]).then(function () { draw(); window.bannerReady = true; });
})();
