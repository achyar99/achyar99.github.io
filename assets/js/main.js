// Site interactions: theme, mobile menu, nav shadow, reveal-on-scroll, research filter,
// interactive timeline, lightbox, word rotator, count-up stats, image save guard, copy-to-clipboard, back-to-top.
(function () {
  var root = document.documentElement;

  // ---- theme (system by default; remembers an explicit choice)
  function isDark() {
    var t = root.getAttribute('data-theme');
    return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  }
  document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  });

  // ---- mobile drawer
  var burger = document.querySelector('.burger'), drawer = document.querySelector('.drawer');
  if (burger && drawer) {
    burger.addEventListener('click', function () {
      var open = drawer.classList.toggle('open');
      burger.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    drawer.addEventListener('click', function (e) { if (e.target.closest('a')) { drawer.classList.remove('open'); document.body.style.overflow = ''; } });
    addEventListener('keydown', function (e) { if (e.key === 'Escape' && drawer.classList.contains('open')) burger.click(); });
  }

  // ---- nav border + back-to-top
  var nav = document.querySelector('.nav'), top = document.querySelector('.to-top');
  function onScroll() {
    var y = scrollY;
    if (nav) nav.classList.toggle('scrolled', y > 8);
    if (top) top.classList.toggle('show', y > 700);
  }
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  if (top) top.addEventListener('click', function () { scrollTo({ top: 0, behavior: 'smooth' }); });

  // ---- reveal on scroll (only when motion is welcome and the API exists)
  var motionOK = !matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window;
  if (motionOK) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    document.querySelectorAll('[data-reveal]').forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.top < innerHeight) return;           // already on screen: leave it visible
      el.classList.add('pre'); io.observe(el);
    });
  }

  // ---- rotating word in the hero
  var rot = document.querySelector('[data-rotate]');
  if (rot && motionOK) {
    var words = rot.getAttribute('data-rotate').split('|'), i = 0;
    setInterval(function () {
      i = (i + 1) % words.length;
      rot.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180 }).onfinish = function () {
        rot.textContent = words[i];
        rot.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 260 });
      };
    }, 2600);
  }

  // ---- count-up stats
  document.querySelectorAll('[data-count]').forEach(function (el) {
    if (!motionOK) return;
    var end = parseFloat(el.getAttribute('data-count')), suffix = el.getAttribute('data-suffix') || '';
    var obs = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return; obs.disconnect();
      var t0 = performance.now();
      (function step(t) {
        var k = Math.min((t - t0) / 900, 1), v = Math.round(end * (1 - Math.pow(1 - k, 3)));
        el.textContent = v + suffix; if (k < 1) requestAnimationFrame(step);
      })(t0);
    });
    obs.observe(el);
  });

  // ---- research filter
  var chips = document.querySelectorAll('[data-filter]');
  if (chips.length) {
    var cards = document.querySelectorAll('[data-topics]');
    function apply(f) {
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-filter') === f); });
      cards.forEach(function (card) {
        var show = f === 'all' || card.getAttribute('data-topics').split(' ').indexOf(f) > -1;
        card.classList.toggle('hide', !show);
        if (show) { card.classList.remove('fade'); void card.offsetWidth; card.classList.add('fade'); }
      });
      try { history.replaceState(null, '', f === 'all' ? location.pathname : '#' + f); } catch (e) {}
    }
    chips.forEach(function (c) { c.addEventListener('click', function () { apply(c.getAttribute('data-filter')); }); });
    var h = location.hash.slice(1);
    if (h && document.querySelector('[data-filter="' + h + '"]')) apply(h);
  }

  // ---- interactive timeline
  var tabs = document.querySelectorAll('.tl-btn');
  if (tabs.length) {
    var panel = document.querySelector('.tl-panel');
    function show(btn) {
      tabs.forEach(function (b) { b.setAttribute('aria-selected', b === btn); b.tabIndex = b === btn ? 0 : -1; });
      panel.querySelector('img').src = btn.getAttribute('data-img');
      panel.querySelector('img').alt = btn.getAttribute('data-alt');
      panel.querySelector('.label').textContent = btn.getAttribute('data-when');
      panel.querySelector('h3').textContent = btn.getAttribute('data-title');
      panel.querySelector('p').textContent = btn.getAttribute('data-text');
    }
    tabs.forEach(function (b, idx) {
      b.addEventListener('click', function () { show(b); });
      b.addEventListener('keydown', function (e) {
        var n = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0;
        if (!n) return; e.preventDefault(); var t = tabs[(idx + n + tabs.length) % tabs.length]; t.focus(); show(t);
      });
    });
  }

  // ---- lightbox for any image marked data-zoom
  var zooms = Array.prototype.slice.call(document.querySelectorAll('img[data-zoom]'));
  if (zooms.length) {
    var lb = document.createElement('div'); lb.className = 'lb'; lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Image viewer');
    var svg = function (d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="' + d + '"/></svg>'; };
    lb.innerHTML = '<button class="x" aria-label="Close">' + svg('M6 6l12 12M18 6L6 18') + '</button>' +
      '<button class="prev" aria-label="Previous image">' + svg('M15 18l-6-6 6-6') + '</button>' +
      '<img alt=""><button class="next" aria-label="Next image">' + svg('M9 18l6-6-6-6') + '</button><div class="cap"></div>';
    document.body.appendChild(lb);
    var big = lb.querySelector('img'), cap = lb.querySelector('.cap'), cur = 0, last = null;
    function open(k) {
      cur = (k + zooms.length) % zooms.length; var im = zooms[cur];
      big.src = im.getAttribute('data-full') || im.currentSrc || im.src; big.alt = im.alt;
      cap.textContent = im.getAttribute('data-caption') || im.alt;
      lb.classList.add('open'); document.body.style.overflow = 'hidden'; lb.querySelector('.x').focus();
      lb.querySelector('.prev').style.display = lb.querySelector('.next').style.display = zooms.length > 1 ? '' : 'none';
    }
    function close() { lb.classList.remove('open'); document.body.style.overflow = ''; if (last) last.focus(); }
    zooms.forEach(function (im, k) {
      im.tabIndex = 0;
      im.addEventListener('click', function () { last = im; open(k); });
      im.addEventListener('keydown', function (e) { if (e.key === 'Enter') { last = im; open(k); } });
    });
    lb.querySelector('.x').addEventListener('click', close);
    lb.querySelector('.prev').addEventListener('click', function () { open(cur - 1); });
    lb.querySelector('.next').addEventListener('click', function () { open(cur + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    addEventListener('keydown', function (e) {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') open(cur - 1); if (e.key === 'ArrowRight') open(cur + 1);
    });
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) open(cur + (dx < 0 ? 1 : -1)); x0 = null; });
  }

  // ---- discourage saving images: no context menu or dragging on any image (including the lightbox)
  ['contextmenu', 'dragstart'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (e.target.tagName === 'IMG') e.preventDefault(); });
  });

  // ---- copy email
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function (e) {
      e.preventDefault(); var v = b.getAttribute('data-copy');
      var done = function () { var t = b.textContent; b.textContent = 'Copied'; setTimeout(function () { b.textContent = t; }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(v).then(done, done); else done();
    });
  });

  // ---- hero hysteresis loop (decorative)
  var loop = document.querySelector('.loop path');
  if (loop) {
    var d = '', n = 400, x = .5;
    for (var k = 0; k <= n; k++) {
      var t = k / n * 2 * Math.PI, v = Math.sin(t);
      x += 2.6 * v * (1 / n) * x * (1 - x) * 6; x = Math.min(.98, Math.max(.02, x));
      var I = v / (1 * x + 6 * (1 - x)); d += (k ? 'L' : 'M') + (v * 92).toFixed(1) + ' ' + (-I * 150).toFixed(1);
    }
    loop.setAttribute('d', d);
  }
})();
