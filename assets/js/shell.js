/* ==========================================================================
   BOG CLOUD — APP SHELL
   The topbar and sidebar were previously copy-pasted verbatim into 9 pages
   (37 of 39 lines byte-identical across the three account pages) with the
   active state maintained by hand-editing class="active" in HTML. They are
   now defined once here, and aria-current is derived from location.pathname.

   Also owns the two behaviours that were missing everywhere before:
   a focus-trapped drawer (Escape, focus return, scroll lock) and a single
   theme implementation persisted under the single key 'bog-theme'.

   No build step, no modules. Plain IIFE exposing a small BOG namespace.
   ========================================================================== */

(function (global) {
  'use strict';

  var BOG = global.BOG || {};
  global.BOG = BOG;

  var THEME_KEY = 'bog-theme';
  var DRAWER_BP = 1024; /* must match the breakpoint in components.css */

  var FOCUSABLE = [
    'a[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])', 'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])'
  ].join(',');

  /* ----------------------------------------------------------------------
     NAVIGATION — single source of truth.
     Paths are root-relative; this project is served from the domain root
     (Vercel), matching the convention already used by the old dashboard.
     ---------------------------------------------------------------------- */
  var NAV = [
    {
      label: 'Cloud',
      items: [
        { href: '/dashboard/dashboard.html', label: 'My Drive', icon: 'folder' },
        { href: '/dashboard/vault.html',     label: 'Vault',    icon: 'shield' },
        { href: '/dashboard/trash.html',     label: 'Trash',    icon: 'trash' }
      ]
    },
    {
      label: 'Developer',
      items: [
        { href: '/dashboard/api-keys.html', label: 'API Keys', icon: 'key' },
        { href: '/dashboard/api-docs.html', label: 'API Docs', icon: 'book' }
      ]
    },
    {
      label: 'Account',
      items: [
        { href: '/account/profile.html',  label: 'Profile',  icon: 'user' },
        { href: '/account/billing.html',  label: 'Billing',  icon: 'card' },
        { href: '/account/devices.html',  label: 'Devices',  icon: 'monitor' },
        { href: '/account/sessions.html', label: 'Sessions', icon: 'lock' }
      ]
    }
  ];

  var ICONS = {
    folder:  '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>',
    shield:  '<path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3zm-1 13-3.5-3.5 1.4-1.4L11 12.2l4.7-4.7 1.4 1.4L11 15z"/>',
    trash:   '<path d="M7 4V3h10v1h4v2H3V4h4zm-2 4h14l-1 13H6L5 8z"/>',
    key:     '<path d="M14 2a6 6 0 0 0-5.7 8L2 16.3V22h5.7l1.4-1.4v-2h2v-2h2l1.6-1.6A6 6 0 1 0 14 2zm2 5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>',
    book:    '<path d="M5 3h11a3 3 0 0 1 3 3v15H8a3 3 0 0 1-3-3V3zm3 5v2h8V8H8zm0 4v2h8v-2H8z"/>',
    user:    '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4.4 0-8 2.2-8 5v3h16v-3c0-2.8-3.6-5-8-5z"/>',
    card:    '<path d="M3 6h18v12H3V6zm0 3v2h18V9H3zm2 6h6v2H5v-2z"/>',
    monitor: '<path d="M3 4h18v12H3V4zm2 2v8h14V6H5zm4 12h6v2H9v-2z"/>',
    lock:    '<path d="M12 2a5 5 0 0 1 5 5v3h1a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1h1V7a5 5 0 0 1 5-5zm0 2a3 3 0 0 0-3 3v3h6V7a3 3 0 0 0-3-3z"/>',
    menu:    '<path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z"/>',
    close:   '<path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z"/>',
    search:  '<path d="M10 2a8 8 0 1 0 4.9 14.3l5.4 5.4 1.4-1.4-5.4-5.4A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/>',
    sun:     '<path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10zm0-5h0v3h0V2zm0 17h0v3h0v-3zM2 12h3v0H2v0zm17 0h3v0h-3v0zM4.9 4.9l2.1 2.1-2.1-2.1zm12 12 2.1 2.1-2.1-2.1zM4.9 19.1l2.1-2.1-2.1 2.1zm12-12 2.1-2.1-2.1 2.1z"/>',
    moon:    '<path d="M13 2a9 9 0 1 0 9 9 7 7 0 0 1-9-9z"/>',
    upload:  '<path d="M12 3 5 10h4v7h6v-7h4l-7-7zM4 19h16v2H4v-2z"/>'
  };

  function icon(name) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + ICONS[name] + '</svg>';
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ======================================================================
     THEME — one implementation. Previously there were three:
       account  -> :root.dark          + localStorage['bog-theme']
       admin    -> body.dark-mode      + localStorage['theme']
     Toggling in one section did not carry to the next, so users followed a
     link from a dark screen into a white flash and an inverted theme.
     ====================================================================== */

  BOG.theme = {
    get: function () {
      try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; }
      catch (e) { return 'light'; }
    },
    set: function (mode) {
      var next = mode === 'dark' ? 'dark' : 'light';
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
      this.apply(next);
      document.dispatchEvent(new CustomEvent('bog:themechange', { detail: { theme: next } }));
    },
    apply: function (mode) {
      document.documentElement.setAttribute('data-theme', mode);
    },
    toggle: function () { this.set(this.get() === 'dark' ? 'light' : 'dark'); }
  };

  /* Runs before first paint when loaded in <head> via assets/js/theme-boot.js,
     so there is no flash of the wrong theme. */
  BOG.theme.boot = function () {
    try {
      var saved = localStorage.getItem(THEME_KEY);
      if (saved) { document.documentElement.setAttribute('data-theme', saved); return; }
    } catch (e) {}
    if (global.matchMedia && global.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  };

  /* ======================================================================
     FOCUS MANAGEMENT
     ====================================================================== */

  function focusables(root) {
    return Array.prototype.filter.call(
      root.querySelectorAll(FOCUSABLE),
      function (n) { return n.offsetWidth || n.offsetHeight || n.getClientRects().length; }
    );
  }

  function trap(container, event) {
    if (event.key !== 'Tab') return;
    var nodes = focusables(container);
    if (!nodes.length) { event.preventDefault(); return; }
    var first = nodes[0];
    var last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  /* ======================================================================
     DRAWER — Escape to close, focus moves in, focus returns to the
     trigger, background scroll locked. None of this existed before.
     ====================================================================== */

  function createDrawer(opts) {
    var sidebar = opts.sidebar;
    var overlay = opts.overlay;
    var toggle  = opts.toggle;
    var trigger = null;
    var open = false;

    function isDrawerMode() { return global.innerWidth <= DRAWER_BP; }

    function sync() {
      var drawer = isDrawerMode();
      /* When not a drawer, the sidebar is always reachable: never inert. */
      sidebar.toggleAttribute('inert', drawer && !open);
      if (!drawer) {
        sidebar.classList.remove('is-open');
        document.body.classList.remove('is-locked');
        overlay.hidden = true;
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
      }
    }

    function openDrawer() {
      open = true;
      sidebar.classList.add('is-open');
      sidebar.removeAttribute('inert');
      overlay.hidden = false;
      document.body.classList.add('is-locked');
      if (toggle) toggle.setAttribute('aria-expanded', 'true');
      var first = sidebar.querySelector('[data-autofocus]') || focusables(sidebar)[0];
      if (first) first.focus();
    }

    function closeDrawer() {
      if (!open) return;
      open = false;
      sidebar.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      overlay.hidden = true;
      if (isDrawerMode()) sidebar.setAttribute('inert', '');
      if (toggle) toggle.setAttribute('aria-expanded', 'false');
      /* Focus goes back where it came from, not to <body>. */
      (trigger || toggle || focusables(sidebar)[0]).focus();
    }

    if (toggle) {
      toggle.addEventListener('click', function () {
        trigger = toggle;
        open ? closeDrawer() : openDrawer();
      });
    }
    if (overlay) overlay.addEventListener('click', closeDrawer);

    document.addEventListener('keydown', function (e) {
      if (!open) return;
      if (e.key === 'Escape') { e.preventDefault(); closeDrawer(); }
      else trap(sidebar, e);
    });

    global.addEventListener('resize', function () {
      if (!isDrawerMode() && open) { open = false; document.body.classList.remove('is-locked'); }
      sync();
    });

    BOG.closeDrawer = closeDrawer;
    sync();
    return { open: openDrawer, close: closeDrawer };
  }

  /* ======================================================================
     DROPDOWN — closes on Escape and on outside click. The old account menu
     could only be dismissed by clicking the avatar a second time.
     ====================================================================== */

  function createMenu(button, menu) {
    function close() {
      menu.hidden = true;
      button.setAttribute('aria-expanded', 'false');
    }
    function toggleMenu() {
      var next = menu.hidden;
      menu.hidden = !next;
      button.setAttribute('aria-expanded', String(next));
      if (next) {
        var first = focusables(menu)[0];
        if (first) first.focus();
      }
    }
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', function (e) { e.stopPropagation(); toggleMenu(); });
    document.addEventListener('click', function (e) {
      if (!menu.hidden && !menu.contains(e.target)) close();
    });
    document.addEventListener('keydown', function (e) {
      if (menu.hidden) return;
      if (e.key === 'Escape') { e.preventDefault(); close(); button.focus(); }
      else trap(menu, e);
    });
    return { close: close };
  }

  /* ======================================================================
     RENDER
     opts: { user: {name,email,initial}, search: bool, brand: string }
     ====================================================================== */

  BOG.renderShell = function (opts) {
    opts = opts || {};
    var user = opts.user || null;
    var mountTop = document.querySelector('[data-shell-topbar]');
    var mountSide = document.querySelector('[data-shell-sidebar]');
    if (!mountTop || !mountSide) return null;

    var path = global.location.pathname;

    /* --- sidebar ---------------------------------------------------- */
    var groups = NAV.map(function (group) {
      var items = group.items.map(function (item) {
        var current = path === item.href;
        return '<a class="nav-link" href="' + esc(item.href) + '"' +
               (current ? ' aria-current="page"' : '') + '>' +
               icon(item.icon) + '<span>' + esc(item.label) + '</span></a>';
      }).join('');
      return '<div class="sidebar__group">' +
               '<div class="sidebar__label">' + esc(group.label) + '</div>' +
               items + '</div>';
    }).join('');

    mountSide.innerHTML =
      '<button type="button" class="icon-btn sidebar__close" data-drawer-close ' +
        'aria-label="Close navigation">' + icon('close') + '</button>' +
      groups +
      '<div class="sidebar__group">' +
        '<button type="button" class="btn btn--primary" style="width:100%">' +
          icon('upload') + '<span>New upload</span></button>' +
      '</div>';

    /* --- topbar ----------------------------------------------------- */
    var searchHtml = opts.search
      ? '<div class="topbar__search">' + icon('search') +
        '<label class="sr-only" for="shell-search">Search your files</label>' +
        '<input class="field-input" id="shell-search" type="search" ' +
        'placeholder="Search files" autocomplete="off"></div>'
      : '';

    var themeBtn =
      '<button type="button" class="icon-btn" id="shell-theme" aria-pressed="' +
        (BOG.theme.get() === 'dark') + '" aria-label="Dark theme">' + icon('sun') + '</button>';

    var userHtml = '';
    if (user) {
      var initial = esc(user.initial || (user.name || '?').charAt(0));
      userHtml =
        '<div style="position:relative;display:flex">' +
          '<button type="button" class="avatar" id="shell-avatar" ' +
            'aria-haspopup="menu" aria-expanded="false" aria-controls="shell-menu" ' +
            'aria-label="Account menu">' + initial + '</button>' +
          '<div class="menu" id="shell-menu" role="menu" hidden>' +
            '<div class="menu__header">' +
              '<div style="font-weight:700;font-size:var(--fs-sm)">' + esc(user.name || '') + '</div>' +
              '<div style="font-size:var(--fs-xs);color:var(--muted)">' + esc(user.email || '') + '</div>' +
            '</div>' +
            '<a class="menu__item" role="menuitem" href="/account/profile.html">Account settings</a>' +
            '<a class="menu__item" role="menuitem" href="/dashboard/dashboard.html">Go to drive</a>' +
            '<a class="menu__item menu__item--danger" role="menuitem" href="/auth/login.html" ' +
              'data-signout>Sign out</a>' +
          '</div>' +
        '</div>';
    }

    mountTop.innerHTML =
      '<button type="button" class="icon-btn icon-btn--plain" id="shell-drawer" ' +
        'aria-expanded="false" aria-controls="shell-sidebar" aria-label="Open navigation" ' +
        'style="display:none">' + icon('menu') + '</button>' +
      '<a class="topbar__brand" href="/index.html">' +
        '<img class="topbar__mark" src="/images/logo.jpeg" alt="" width="34" height="34">' +
        '<span>BOG Cloud</span></a>' +
      '<div class="topbar__spacer"></div>' + searchHtml + themeBtn + userHtml;

    mountTop.id = 'shell-topbar';
    mountTop.className = 'topbar';
    mountSide.id = 'shell-sidebar';
    mountSide.className = 'sidebar';

    /* --- behaviour -------------------------------------------------- */
    var drawerToggle = document.getElementById('shell-drawer');
    var overlay = document.querySelector('[data-shell-overlay]');
    if (!overlay) {
      overlay = document.createElement('button');
      overlay.type = 'button';
      overlay.className = 'overlay';
      overlay.setAttribute('data-shell-overlay', '');
      overlay.setAttribute('aria-label', 'Close navigation');
      overlay.hidden = true;
      document.body.appendChild(overlay);
    }

    var drawer = createDrawer({ sidebar: mountSide, overlay: overlay, toggle: drawerToggle });

    var closeBtn = mountSide.querySelector('[data-drawer-close]');
    if (closeBtn) closeBtn.addEventListener('click', drawer.close);

    /* The drawer button only makes sense below the breakpoint. */
    function syncToggle() {
      if (!drawerToggle) return;
      var isDrawer = global.innerWidth <= DRAWER_BP;
      drawerToggle.style.display = isDrawer ? 'inline-grid' : 'none';
      drawerToggle.setAttribute('aria-expanded', 'false');
    }
    syncToggle();
    global.addEventListener('resize', syncToggle);

    var themeButton = document.getElementById('shell-theme');
    if (themeButton) {
      var paintTheme = function (mode) {
        themeButton.innerHTML = icon(mode === 'dark' ? 'sun' : 'moon');
        themeButton.setAttribute('aria-pressed', String(mode === 'dark'));
      };
      paintTheme(BOG.theme.get());
      themeButton.addEventListener('click', function () {
        BOG.theme.toggle();
        paintTheme(BOG.theme.get());
      });
    }

    var avatar = document.getElementById('shell-avatar');
    var menu = document.getElementById('shell-menu');
    if (avatar && menu) createMenu(avatar, menu);

    var search = document.getElementById('shell-search');
    if (search) {
      search.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') e.preventDefault();
      });
    }

    return { drawer: drawer, closeDrawer: drawer.close };
  };

  /* Exported so site.js (marketing chrome) reuses these instead of
     re-implementing focus management a second time. */
  BOG.a11y = { trap: trap, focusables: focusables };
  BOG.createMenu = createMenu;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { BOG.theme.boot(); });
  } else {
    BOG.theme.boot();
  }

})(window);
