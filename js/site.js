/* Shared: mobile nav, starfield, scroll reveal, the wizard gallery and the wizard detail page. */
(function () {
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.documentElement.classList.add("js");

  // ---- Mobile nav
  var toggle = document.querySelector(".nav-toggle"), nav = document.getElementById("nav-links");
  function setNav(open) {
    if (!toggle || !nav) return;
    nav.classList.toggle("open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    document.body.classList.toggle("nav-open", open);
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () { setNav(!nav.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) setNav(false); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) { setNav(false); toggle.focus(); } });
    window.addEventListener("resize", function () { if (window.innerWidth > 820) setNav(false); });
  }
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () { header.classList.toggle("scrolled", window.scrollY > 8); };
    window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
  }

  // ---- Starfield (static positions, CSS twinkle that switches off for reduced motion)
  var sky = document.querySelector(".stars");
  if (sky) {
    var html = "", count = window.innerWidth < 600 ? 36 : 80;
    for (var s = 0; s < count; s++) {
      var size = Math.random() < 0.12 ? 3 : Math.random() < 0.5 ? 2 : 1;
      html += '<span style="left:' + (Math.random() * 100).toFixed(2) + "%;top:" + (Math.random() * 100).toFixed(2) +
        "%;width:" + size + "px;height:" + size + "px;" + (s % 6 === 0 ? "" : "animation:none;") + "animation-delay:" + (Math.random() * 7).toFixed(2) + "s;opacity:" + (0.25 + Math.random() * 0.65).toFixed(2) + '"></span>';
    }
    sky.innerHTML = html;
  }

  // ---- Scroll reveal
  function observeReveal(root) {
    var els = (root || document).querySelectorAll(".reveal:not(.in)");
    if (reduce || !("IntersectionObserver" in window)) { Array.prototype.forEach.call(els, function (el) { el.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px" });
    Array.prototype.forEach.call(els, function (el) { io.observe(el); });
  }
  observeReveal();

  // ---- Lore table of contents: highlight the section in view
  var tocLinks = document.querySelectorAll(".toc a");
  if (tocLinks.length && "IntersectionObserver" in window) {
    var byId = {};
    Array.prototype.forEach.call(tocLinks, function (a) { byId[a.getAttribute("href").slice(1)] = a; });
    var tio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        Array.prototype.forEach.call(tocLinks, function (a) { a.classList.remove("active"); a.removeAttribute("aria-current"); });
        var a = byId[en.target.id]; if (a) { a.classList.add("active"); a.setAttribute("aria-current", "true"); }
      });
    }, { rootMargin: "-20% 0px -70% 0px" });
    Object.keys(byId).forEach(function (id) { var el = document.getElementById(id); if (el) tio.observe(el); });
  }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function fmt(n) { return Number(n).toLocaleString("en-US"); }

  // Doginal Dogs background colours (same values as the banner maker).
  var BG = { Aqua: "#4ffcd1", Blue: "#64ffff", Green: "#8dffa4", Pink: "#ffd0eb", Purple: "#debcff", Red: "#ff7d82", Rose: "#ffb1dd", Tan: "#f8e49e", Yellow: "#ffe154" };
  function trait(w, k) { for (var i = 0; i < w.traits.length; i++) if (w.traits[i][0] === k) return w.traits[i][1]; return ""; }
  function bgColor(w) { return BG[trait(w, "Background")] || "#b994ff"; }

  // Image with sigil fallback: if the dog image fails, swap in the placeholder sigil.
  window.dogImgFail = function (img) {
    var n = parseInt(img.getAttribute("data-n"), 10), size = parseInt(img.getAttribute("data-size"), 10) || 96;
    var span = document.createElement("span");
    span.className = "sigil-fallback";
    span.innerHTML = window.makeSigil ? makeSigil(n, size) : "";
    img.replaceWith(span);
  };
  function dogImg(w, size, cls, lazy) {
    return '<img class="' + cls + '" src="' + esc(w.image) + '" alt="Doginal Dog #' + w.number + (w.title ? ", " + esc(w.title) : "") + ', a pixel dog in a wizard hat" width="' + size + '" height="' + size +
      '" decoding="async"' + (lazy ? ' loading="lazy"' : "") + ' data-n="' + w.number + '" data-size="' + size + '" onerror="dogImgFail(this)">';
  }
  function traitText(w) { return w.traits.map(function (t) { return t[1]; }).join(" "); }

  // Orders (moon colours match the lore page) and current holders (X handle only, from js/holders.js).
  var ORDER_C = { Flame: "#ff7a45", Radiant: "#ffd65a", Deep: "#3fb5ff", Wild: "#5fe08a", Arcane: "#a46bff", Dream: "#ff8fc8", Wanderer: "#dfe3ea" };
  function orderLabel(w) { return w.order ? (w.order === "Wanderer" ? "The Wanderer" : w.order + " Order") : ""; }
  function orderChip(w, cls) {
    return w.order ? '<span class="order-chip ' + (cls || "") + '" style="--oc:' + (ORDER_C[w.order] || "#b994ff") + '">' + esc(orderLabel(w)) + "</span>" : "";
  }
  function holder(w) {
    var h = window.HOLDERS && window.HOLDERS[String(w.number)];
    return h && /^[A-Za-z0-9_]{1,15}$/.test(h) ? h : null;
  }
  function holderLink(h, cls) {
    return '<a class="' + cls + '" href="https://x.com/' + encodeURIComponent(h) + '" target="_blank" rel="noopener noreferrer">@' + esc(h) + "</a>";
  }
  // Lore: paragraphs split by a blank line; *x* is emphasis.
  function loreHtml(t) {
    return String(t).split(/\n\s*\n/).map(function (para) {
      return "<p>" + esc(para).replace(/\*([^*\n]+)\*/g, "<em>$1</em>") + "</p>";
    }).join("");
  }

  // ---- Home gallery
  var grid = document.getElementById("wizard-grid");
  if (grid && window.WIZARDS) {
    var search = document.getElementById("wizard-search"), sortSel = document.getElementById("wizard-sort"),
        filterSel = document.getElementById("wizard-filter"), countEl = document.getElementById("wizard-count");
    var orderIndex = {}; WIZARDS.forEach(function (w, i) { orderIndex[w.number] = i; });

    if (filterSel) {
      var pats = {};
      WIZARDS.forEach(function (w) { var p = trait(w, "Fur Pattern"); if (p) pats[p] = (pats[p] || 0) + 1; });
      var ords = {};
      WIZARDS.forEach(function (w) { if (w.order) ords[w.order] = (ords[w.order] || 0) + 1; });
      var gO = document.createElement("optgroup"); gO.label = "Order";
      Object.keys(ords).sort().forEach(function (k) {
        var o = document.createElement("option"); o.value = "order:" + k; o.textContent = orderLabel({ order: k }) + " (" + ords[k] + ")"; gO.appendChild(o);
      });
      if (gO.children.length) filterSel.appendChild(gO);
      var gP = document.createElement("optgroup"); gP.label = "Fur pattern";
      Object.keys(pats).sort().forEach(function (p) {
        var o = document.createElement("option"); o.value = p; o.textContent = p + " (" + pats[p] + ")"; gP.appendChild(o);
      });
      filterSel.appendChild(gP);
    }
    var cards = {};
    WIZARDS.forEach(function (w, i) {
      var shell = document.createElement("div");
      shell.className = "card-shell";
      var a = document.createElement("a");
      a.className = "card" + (w.title ? " card-titled" : "") + (i === 0 ? " card-wanderer" : "");
      a.href = "wizard.html?dog=" + w.number;
      a.style.setProperty("--bgc", bgColor(w));
      a.style.setProperty("--d", Math.min(i, 24) * 22 + "ms");
      var tags = [trait(w, "Fur Pattern"), trait(w, "Fur Color")].filter(Boolean).join(" · ");
      a.innerHTML =
        '<span class="card-art">' + dogImg(w, 240, "card-img", i > 7) +
          '<span class="card-num">#' + w.number + "</span>" +
          (w.rank ? '<span class="card-rank" title="Market rarity rank ' + fmt(w.rank) + ' of 10,000"><span class="sr-only">Rarity rank </span>Rank ' + fmt(w.rank) + "</span>" : "") +
        "</span>" +
        '<span class="card-body">' +
          '<span class="card-name">' + (w.title ? esc(w.title) : "Dog #" + w.number) + "</span>" +
          '<span class="card-tag">' + esc(tags) + "</span>" +
          orderChip(w, "card-order") +
        "</span>";
      shell.appendChild(a);
      var h = holder(w), hl = document.createElement("div");
      hl.className = "card-holder" + (h ? "" : " card-holder-none");
      hl.innerHTML = h ? '<span class="k">Held by</span> ' + holderLink(h, "holder-link") : '<span class="k">Holder not linked</span>';
      shell.appendChild(hl);
      cards[w.number] = shell;
    });

    var render = function () {
      var q = (search ? search.value : "").trim().toLowerCase().replace(/^#/, "");
      var pat = filterSel ? filterSel.value : "", sort = sortSel ? sortSel.value : "order";
      var list = WIZARDS.filter(function (w) {
        if (pat && pat.indexOf("order:") === 0) { if (w.order !== pat.slice(6)) return false; }
        else if (pat && trait(w, "Fur Pattern") !== pat) return false;
        if (!q) return true;
        if (/^\d+$/.test(q)) return String(w.number).indexOf(q) === 0 || String(w.number) === q;
        var hay = ("dog " + w.number + " " + (w.title || "") + " " + (w.name || "") + " " + (w.order || "") + " " + (w.realm || "") + " " + (holder(w) ? "@" + holder(w) : "") + " " + traitText(w)).toLowerCase();
        return q.split(/\s+/).every(function (t) { return hay.indexOf(t) >= 0; });
      });
      var big = 1e9;
      var cmp = {
        order: function (a, b) { return orderIndex[a.number] - orderIndex[b.number]; },
        rank: function (a, b) { return (a.rank || big) - (b.rank || big); },
        "rank-desc": function (a, b) { return (b.rank || 0) - (a.rank || 0); },
        num: function (a, b) { return a.number - b.number; },
        "num-desc": function (a, b) { return b.number - a.number; }
      }[sort] || null;
      if (cmp) list = list.slice().sort(cmp);
      var frag = document.createDocumentFragment();
      list.forEach(function (w) { frag.appendChild(cards[w.number]); });
      grid.innerHTML = "";
      if (list.length) grid.appendChild(frag);
      else grid.innerHTML = '<div class="empty"><p><strong>No wizard matches that search.</strong></p><p class="muted">Try a dog number like 6164, or a trait like Husky or Scarf.</p><button type="button" class="btn btn-ghost btn-sm" id="wizard-clear">Clear filters</button></div>';
      var clr = document.getElementById("wizard-clear");
      if (clr) clr.addEventListener("click", function () { if (search) search.value = ""; if (filterSel) filterSel.value = ""; render(); search && search.focus(); });
      if (countEl) countEl.textContent = list.length === WIZARDS.length ? "Showing all " + WIZARDS.length + " wizards" : "Showing " + list.length + " of " + WIZARDS.length + " wizards";
      grid.setAttribute("data-count", list.length);
    };
    render();
    if (!reduce) { grid.classList.add("animate"); setTimeout(function () { grid.classList.remove("animate"); }, 1600); }
    if (search) search.addEventListener("input", render);
    if (sortSel) sortSel.addEventListener("change", render);
    if (filterSel) filterSel.addEventListener("change", render);
  }

  // ---- Wizard detail
  var detail = document.getElementById("wizard-detail");
  if (detail && window.WIZARDS) {
    var p = new URLSearchParams(location.search);
    var i = findWizard(parseInt(p.get("dog"), 10));
    if (i < 0) i = 0;
    var w = WIZARDS[i], L = WIZARDS.length;
    var prev = WIZARDS[(i - 1 + L) % L], next = WIZARDS[(i + 1) % L];
    document.title = "Dog #" + w.number + (w.title ? " · " + w.title : "") + " · The Order of 86";
    var md = document.querySelector('meta[name="description"]');
    if (md && w.lore) md.setAttribute("content", (w.title ? w.title + ": " : "") + w.lore.split(/\n/)[0].replace(/\*/g, "").slice(0, 150));
    detail.style.setProperty("--bgc", bgColor(w));
    var tiles = w.traits.map(function (t) {
      return '<div class="trait"><dt>' + esc(t[0]) + "</dt><dd>" + esc(t[1]) + "</dd></div>";
    }).join("");
    function navCard(x, dir) {
      return '<a class="pn pn-' + dir + '" href="wizard.html?dog=' + x.number + '" style="--bgc:' + bgColor(x) + '">' +
        '<img src="' + esc(x.image) + '" alt="" width="56" height="56" loading="lazy">' +
        '<span><small>' + (dir === "prev" ? "&larr; Previous" : "Next &rarr;") + "</small><b>Dog #" + x.number + "</b></span></a>";
    }
    detail.innerHTML =
      '<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html#wizards">The 86 wizards</a><span aria-hidden="true">/</span><span aria-current="page">Dog #' + w.number + "</span></nav>" +
      '<div class="detail-grid">' +
        '<div class="detail-art reveal"><div class="portrait">' + dogImg(w, 480, "detail-img") + "</div></div>" +
        '<div class="detail-text reveal">' +
          '<p class="eyebrow">Wizard ' + (i + 1) + " of " + L + (i === 0 ? " &middot; Unaffiliated" : "") + "</p>" +
          '<h1 class="display display-sm">Dog #' + w.number + "</h1>" +
          (w.title ? '<p class="detail-title">' + esc(w.title) + "</p>" : "") +
          (w.epithet ? '<p class="detail-epithet">' + esc(w.epithet) + "</p>" : "") +
          (w.order || w.realm ? '<p class="detail-meta">' + orderChip(w) + (w.realm ? '<span class="realm-chip">' + esc(w.realm) + "</span>" : "") + "</p>" : "") +
          (w.name ? '<p class="detail-title">' + esc(w.name) + "</p>" : "") +
          '<dl class="facts">' +
            '<div><dt>Dog number</dt><dd>#' + w.number + "</dd></div>" +
            (w.rank ? '<div><dt>Rarity rank</dt><dd>' + fmt(w.rank) + ' <small>/ 10,000</small></dd></div>' : "") +
            '<div><dt>Seat</dt><dd>' + (i + 1) + ' <small>/ ' + L + "</small></dd></div>" +
          "</dl>" +
          '<div class="holder-row"><span class="k">Current holder</span> ' + (holder(w) ? holderLink(holder(w), "holder-link holder-link-lg") : '<span class="muted">Holder not linked</span>') + "</div>" +
          (w.summary ? '<p class="detail-summary">' + esc(w.summary) + "</p>" : "") +
          '<h2 class="h3">Biography</h2>' +
          '<div class="detail-lore">' + (w.lore ? loreHtml(w.lore) : "<p>This wizard's story has not been written into the archive yet. When leadership adds it, it will appear here.</p>") + "</div>" +
          '<h2 class="h3">Traits</h2><dl class="traits">' + tiles + "</dl>" +
          '<p class="muted small">Rarity rank is the Doginal Dogs market rank: 1 is the rarest of 10,000. The holder is the X account linked to this dog on market.doginaldogs.com' + (window.HOLDERS_UPDATED ? " (checked " + esc(window.HOLDERS_UPDATED) + ")" : "") + ".</p>" +
        "</div>" +
      "</div>" +
      '<nav class="prevnext" aria-label="Wizard navigation">' + navCard(prev, "prev") +
        '<a class="btn btn-ghost" href="index.html#wizards">All wizards</a>' + navCard(next, "next") + "</nav>";
    observeReveal(detail);
    document.addEventListener("keydown", function (e) {
      if (e.target.closest && e.target.closest("input,select,textarea")) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft") location.href = "wizard.html?dog=" + prev.number;
      if (e.key === "ArrowRight") location.href = "wizard.html?dog=" + next.number;
    });
  }
})();
