/* Home hero: a gentle slideshow through the wizards, one image loaded ahead. */
(function () {
  var box = document.getElementById("hero-show");
  if (!box || !window.WIZARDS || !window.WIZARDS.length) return;
  var imgs = box.querySelectorAll(".hs-img"), cap = box.querySelector(".hs-cap");
  var list = window.WIZARDS.slice();
  for (var i = list.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = list[i]; list[i] = list[j]; list[j] = t; }
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var cur = 0, on = 0, timer = null, delay = reduce ? 6000 : 3200;
  function label(w) { return (window.wizardName ? wizardName(w) : "Dog #" + w.number); }
  function show(w, el) {
    el.alt = label(w); cap.textContent = label(w) + (w.title || w.name ? " \u00b7 #" + w.number : "");
    box.href = "wizard.html?dog=" + w.number; box.setAttribute("aria-label", "Meet " + label(w));
  }
  // first slide
  imgs[0].src = list[0].image; show(list[0], imgs[0]);
  function next() {
    var n = (cur + 1) % list.length, off = 1 - on, el = imgs[off], w = list[n];
    var go = function () {
      el.onload = null;
      imgs[on].classList.remove("is-on"); el.classList.add("is-on"); show(w, el);
      on = off; cur = n; timer = setTimeout(next, delay);
    };
    el.onload = go; el.onerror = function () { cur = n; timer = setTimeout(next, 200); };
    el.src = w.image;
    if (el.complete && el.naturalWidth) go();
  }
  function start() { if (!timer) timer = setTimeout(next, delay); }
  function stop() { clearTimeout(timer); timer = null; }
  document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (e) { e[0].isIntersecting ? start() : stop(); }).observe(box);
  } else start();
})();
