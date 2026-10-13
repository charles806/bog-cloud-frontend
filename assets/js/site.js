/* ==========================================================================
   BOG CLOUD — MARKETING CHROME
   Progressive enhancement for the public pages. The header markup lives in
   the HTML (so it works without JS and is crawlable); this file wires the
   behaviours and reuses the focus utilities from shell.js.

   Replaces javascript/index-1.js, which had two live bugs:
     - read localStorage['bog_token'] while auth/javascript/login-1.js
       wrote localStorage['token'], so the Dashboard button never appeared
       for any signed-in user
     - linked to "dashboard.html" from the site root, a 404
   ========================================================================== */

(function (global) {
  'use strict';

  var BOG = global.BOG || {};

  function isDrawerMode() { return global.innerWidth <= 1024; }

  /* ----------------------------------------------------------------------
     AUTH STATE
     ---------------------------------------------------------------------- */
  function signedIn() {
    try {
      return !!(localStorage.getItem('token') || localStorage.getItem('bog_token'));
    } catch (e) { return false; }
  }

  function paintAuthState() {
    var slot = document.getElementById('nav-auth');
    if (!slot) return;
    if (signedIn()) {
      slot.innerHTML = '<a class="btn btn--ghost" href="/auth/login.html">Sign in</a>' +
                       '<a class="btn btn--primary" href="/dashboard/dashboard.html">Dashboard</a>';
    } else {
      slot.innerHTML = '<a class="btn btn--ghost" href="/auth/login.html">Sign in</a>' +
                       '<a class="btn btn--primary" href="/auth/signup.html">Start free</a>';
    }
  }

  /* ----------------------------------------------------------------------
     THEME TOGGLE
     ---------------------------------------------------------------------- */
  function wireTheme() {
    var btn = document.getElementById('site-theme');
    if (!btn) return;

    var paint = function () {
      var dark = BOG.theme.get() === 'dark';
      btn.setAttribute('aria-pressed', String(dark));
      btn.querySelector('.theme-label').textContent = dark ? 'Light' : 'Dark';
      /* The accessible name stays stable across state changes. */
      btn.setAttribute('aria-label', 'Switch to ' + (dark ? 'light' : 'dark') + ' theme');
    };

    paint();
    btn.addEventListener('click', function () {
      BOG.theme.toggle();
      paint();
    });
  }

  /* ----------------------------------------------------------------------
     MOBILE NAV
     Escape closes, focus is trapped while open and returned to the trigger,
     and the page behind cannot scroll. The old hamburger only toggled a
     class and announced nothing.
     ---------------------------------------------------------------------- */
  function wireMobileNav() {
    var btn = document.getElementById('nav-toggle');
    var menu = document.getElementById('nav-menu');
    if (!btn || !menu) return;

    var trigger = null;

    function setOpen(next) {
      menu.classList.toggle('is-open', next);
      menu.toggleAttribute('inert', !next);
      btn.setAttribute('aria-expanded', String(next));
      document.body.classList.toggle('is-locked', next && isDrawerMode());
      if (next) {
        var first = BOG.a11y.focusables(menu)[0];
        if (first) first.focus();
      } else if (trigger) {
        trigger.focus();
      }
    }

    function isOpen() { return menu.classList.contains('is-open'); }

    btn.addEventListener('click', function () {
      trigger = btn;
      setOpen(!isOpen());
    });

    /* Any navigation closes the menu. */
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (!isOpen()) return;
      if (e.key === 'Escape') { e.preventDefault(); setOpen(false); }
      else BOG.a11y.trap(menu, e);
    });

    global.addEventListener('resize', function () {
      if (!isDrawerMode() && isOpen()) setOpen(false);
    });

    setOpen(false);
  }

  /* ----------------------------------------------------------------------
     BOOT
     ---------------------------------------------------------------------- */
  function init() {
    paintAuthState();
    wireTheme();
    wireMobileNav();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  BOG.site = { signedIn: signedIn };

})(window);
