/* Tiny self-hosted GIF89a encoder for the Order of 86 GIF maker (no CDN, no dependencies).
 * encodeGIF(frames, opts) -> Uint8Array
 *   frames: [{data: Uint8ClampedArray RGBA, delay: ms}], opts: {width, height, loop: 0 | null}
 * Exact colours: one global palette when the whole animation uses <= 256 colours, else a local palette per frame
 * (<= 256 colours each; a frame with more is reduced to its 256 most used colours, the rest mapped to the nearest).
 * Every frame is a full frame: disposal 2, no transparency. */
(function () {
  "use strict";
  function ByteOut() { this.buf = new Uint8Array(1 << 20); this.n = 0; }
  ByteOut.prototype.grow = function (k) {
    if (this.n + k <= this.buf.length) return;
    var nb = new Uint8Array(Math.max(this.buf.length * 2, this.n + k)); nb.set(this.buf.subarray(0, this.n)); this.buf = nb;
  };
  ByteOut.prototype.b = function (v) { this.grow(1); this.buf[this.n++] = v & 255; };
  ByteOut.prototype.w = function (v) { this.b(v); this.b(v >> 8); };
  ByteOut.prototype.s = function (str) { for (var i = 0; i < str.length; i++) this.b(str.charCodeAt(i)); };
  ByteOut.prototype.bytes = function (arr) { this.grow(arr.length); this.buf.set(arr, this.n); this.n += arr.length; };

  function lzw(out, idx, minCode) {
    var clear = 1 << minCode, eoi = clear + 1, next, size, dict = new Map();
    var block = new Uint8Array(255), bl = 0, acc = 0, nbits = 0;
    function emit(code) {
      acc |= code << nbits; nbits += size;
      while (nbits >= 8) { block[bl++] = acc & 255; acc >>>= 8; nbits -= 8; if (bl === 255) { out.b(255); out.bytes(block); bl = 0; } }
    }
    function reset() { dict.clear(); next = eoi + 1; size = minCode + 1; }
    out.b(minCode); reset(); emit(clear);
    var prefix = idx[0];
    for (var i = 1; i < idx.length; i++) {
      var k = idx[i], key = prefix * 4096 + k, v = dict.get(key);
      if (v !== undefined) { prefix = v; continue; }
      emit(prefix);
      if (next < 4096) { dict.set(key, next++); if (next > (1 << size) && size < 12) size++; }
      else { emit(clear); reset(); }
      prefix = k;
    }
    emit(prefix); emit(eoi);
    if (nbits > 0) { block[bl++] = acc & 255; if (bl === 255) { out.b(255); out.bytes(block); bl = 0; } }
    if (bl) { out.b(bl); out.bytes(block.subarray(0, bl)); }
    out.b(0);
  }
  function colours(data) {
    var m = new Map();
    for (var i = 0; i < data.length; i += 4) {
      var c = (data[i] << 16) | (data[i + 1] << 8) | data[i + 2];
      m.set(c, (m.get(c) || 0) + 1);
    }
    return m;
  }
  function paletteFor(countMap) {
    var cols = Array.from(countMap.keys());
    if (cols.length > 256) cols.sort(function (a, b) { return countMap.get(b) - countMap.get(a); }), cols = cols.slice(0, 256);
    return cols;
  }
  function indexer(pal) {
    var map = new Map(); pal.forEach(function (c, i) { map.set(c, i); });
    return function (c) {
      var i = map.get(c); if (i !== undefined) return i;
      var r = c >> 16, g = (c >> 8) & 255, b = c & 255, best = 0, bd = 1e9;
      for (var j = 0; j < pal.length; j++) {
        var p = pal[j], dr = r - (p >> 16), dg = g - ((p >> 8) & 255), db = b - (p & 255), d = dr * dr * 2 + dg * dg * 4 + db * db * 3;
        if (d < bd) { bd = d; best = j; }
      }
      map.set(c, best); return best;
    };
  }
  function bitsFor(n) { var b = 1; while ((1 << b) < n) b++; return b; }
  function writePal(out, pal, bits) {
    for (var i = 0; i < (1 << bits); i++) { var c = pal[i] || 0; out.b(c >> 16); out.b((c >> 8) & 255); out.b(c & 255); }
  }
  function encodeGIF(frames, opts) {
    var W = opts.width, H = opts.height, out = new ByteOut();
    var counts = frames.map(function (f) { return colours(f.data); });
    var union = new Map();
    counts.forEach(function (m) { m.forEach(function (v, k) { union.set(k, (union.get(k) || 0) + v); }); });
    var global = union.size <= 256 ? Array.from(union.keys()) : null;
    out.s("GIF89a"); out.w(W); out.w(H);
    var gbits = global ? bitsFor(Math.max(2, global.length)) : 1;
    out.b(global ? (0x80 | ((gbits - 1) << 4) | (gbits - 1)) : 0); out.b(0); out.b(0);
    if (global) writePal(out, global, gbits);
    if (opts.loop !== null && opts.loop !== undefined) { out.b(0x21); out.b(0xff); out.b(11); out.s("NETSCAPE2.0"); out.b(3); out.b(1); out.w(opts.loop); out.b(0); }
    var gix = global ? indexer(global) : null;
    frames.forEach(function (f, k) {
      var pal = global || paletteFor(counts[k]), ix = gix || indexer(pal), bits = global ? gbits : bitsFor(Math.max(2, pal.length));
      out.b(0x21); out.b(0xf9); out.b(4); out.b(2 << 2); out.w(Math.round((f.delay || 0) / 10)); out.b(0); out.b(0);
      out.b(0x2c); out.w(0); out.w(0); out.w(W); out.w(H);
      if (global) out.b(0); else { out.b(0x80 | (bits - 1)); writePal(out, pal, bits); }
      var d = f.data, idx = new Uint8Array(W * H), last = -1, li = 0;
      for (var i = 0, p = 0; p < idx.length; i += 4, p++) {
        var c = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
        if (c !== last) { last = c; li = ix(c); }
        idx[p] = li;
      }
      lzw(out, idx, Math.max(2, bits));
    });
    out.b(0x3b);
    return out.buf.slice(0, out.n);
  }
  window.encodeGIF = encodeGIF;
})();
