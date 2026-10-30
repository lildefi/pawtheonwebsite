/* Deterministic placeholder sigils, generated from a wizard's number.
 * Original procedural art: concentric rings, a moon phase and a star polygon.
 */
(function () {
  function rng(seed) {
    var s = (seed * 2654435761) >>> 0;
    return function () {
      s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
      return (s % 100000) / 100000;
    };
  }
  function star(cx, cy, r, points, step) {
    var d = "";
    for (var i = 0; i <= points; i++) {
      var a = (-Math.PI / 2) + (i * step * 2 * Math.PI) / points;
      d += (i ? "L" : "M") + (cx + r * Math.cos(a)).toFixed(2) + " " + (cy + r * Math.sin(a)).toFixed(2);
    }
    return d + "Z";
  }
  window.sigilHue = function (n) { return Math.round((n * 137.508) % 360); };
  window.makeSigil = function (n, size) {
    size = size || 120;
    var r = rng(n + 7), hue = sigilHue(n), hue2 = (hue + 40 + Math.floor(r() * 80)) % 360;
    var pts = [5, 7, 8, 9, 11][Math.floor(r() * 5)];
    var step = pts === 8 ? 3 : 2 + Math.floor(r() * ((pts - 1) / 2 - 1));
    var phase = r() * 2 - 1, ticks = "", k;
    var tickCount = 12 + Math.floor(r() * 24);
    for (k = 0; k < tickCount; k++) {
      var a = (k / tickCount) * Math.PI * 2, i1 = 44, i2 = k % 3 ? 47 : 50;
      ticks += '<line x1="' + (60 + i1 * Math.cos(a)).toFixed(2) + '" y1="' + (60 + i1 * Math.sin(a)).toFixed(2) +
        '" x2="' + (60 + i2 * Math.cos(a)).toFixed(2) + '" y2="' + (60 + i2 * Math.sin(a)).toFixed(2) + '"/>';
    }
    var id = "g" + n + "_" + Math.floor(Math.random() * 1e6);
    return '<svg class="sigil" viewBox="0 0 120 120" width="' + size + '" height="' + size + '" role="img" aria-label="Placeholder sigil for seat ' + n + '">' +
      '<defs><radialGradient id="' + id + '" cx="50%" cy="45%" r="60%">' +
      '<stop offset="0" stop-color="hsl(' + hue + ',80%,70%)" stop-opacity=".9"/>' +
      '<stop offset="1" stop-color="hsl(' + hue2 + ',70%,25%)" stop-opacity="0"/></radialGradient></defs>' +
      '<circle cx="60" cy="60" r="56" fill="url(#' + id + ')"/>' +
      '<g fill="none" stroke="hsl(' + hue + ',90%,82%)" stroke-width="1.2" stroke-linecap="round">' +
      '<circle cx="60" cy="60" r="52" opacity=".7"/><circle cx="60" cy="60" r="41" opacity=".5"/>' + ticks +
      '<path d="' + star(60, 60, 34, pts, step) + '" opacity=".95"/></g>' +
      '<circle cx="60" cy="60" r="11" fill="hsl(' + hue + ',90%,88%)"/>' +
      '<circle cx="' + (60 + phase * 9).toFixed(2) + '" cy="58" r="10" fill="hsl(' + hue2 + ',60%,12%)"/>' +
      '</svg>';
  };
})();
