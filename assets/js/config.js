/* ==========================================================================
   BOG CLOUD — RUNTIME CONFIG

   Single source of truth for every backend address and credential the browser
   needs. This file exists because that information was previously hardcoded in
   ELEVEN separate scripts, and they disagreed:

     - storageBucket appeared as BOTH "bog-cloud.appspot.com" (10 files, the
       legacy format) and "bog-cloud.firebasestorage.app" (3 files, current).
     - The Express API base was repeated in login-1.js, signup-1.js,
       dashboard-2.js and mfa-1.js.
     - A THIRD host, api.bogcloud.com, was reached from api-keys-2.js alone.

   Centralising does not make the values secret — a browser bundle is public by
   definition, and the Firebase web key is designed to be shipped. What it does
   fix is having eleven places to update and no way to see them at a glance.

   WHAT STILL MATTERS FOR SECURITY
   --------------------------------
   Firebase Auth is the identity provider for the vault, trash and all four
   account pages, because those talk to Firestore directly from the browser.
   The key below is therefore only safe while the Firestore and Storage rules
   on the bog-cloud project are locked down. The key is not the control; the
   rules are. Nobody has verified those rules — see the note in README-handover.
   ========================================================================== */

(function (global) {
  'use strict';

  var BOG = global.BOG || {};
  global.BOG = BOG;

  /* ------------------------------------------------------------------ URLs */

  var apiBase = 'https://bog-cloud-backend.vercel.app';

  var CONFIG = {
    /* Express backend — the primary API. */
    apiBase: apiBase,
    apiV1: apiBase + '/api/v1',

    /* Third-party keys API. Authenticates with a Firebase ID token, NOT the
       Express token — see expressFetch vs keysFetch below. */
    keysApi: 'https://api.bogcloud.com/v1',

    /* Express routes that are known to exist. Anything not listed here was
       inferred from the shape of the API, not observed. */
    routes: {
      login:      '/auth/login',
      register:   '/auth/register',
      me:         '/auth/me',
      mfaVerify:  '/auth/mfa/verify',
      files:      '/files',
      fileUpload: '/files/upload',
      stats:      '/stats'
    },

    /* ------------------------------------------------------------------
       ADMIN ROUTES — ASSUMPTION, NOT OBSERVATION

       Nothing anywhere in the frontend referenced an admin endpoint before
       this. The six admin pages rendered numbers typed into their HTML, with
       no request behind them. The paths below are a proposal following the
       existing /api/v1 convention.

       They are all in this one block on purpose: correct them here and
       nothing else in the codebase needs to change. Until a route exists,
       the admin pages render an explicit "not connected" state rather than
       inventing figures.
       ------------------------------------------------------------------ */
    adminRoutes: {
      overview:    '/admin/stats',
      users:       '/admin/users',
      setRole:     '/admin/users/:id/role',    // PATCH
      analytics:   '/admin/analytics',
      storage:     '/admin/storage',
      billing:     '/admin/billing'
    },

    firebase: {
      apiKey: 'AIzaSyD7Ve_lk5waFwPNcQwHxM9DpYFkeEsQa74',
      authDomain: 'bog-cloud.firebaseapp.com',
      projectId: 'bog-cloud',
      /* Resolved to the current bucket format. The legacy "appspot.com" value
         that ten files were using is gone; if a page suddenly cannot read or
         write storage, this is the line to change back. */
      storageBucket: 'bog-cloud.firebasestorage.app',
      messagingSenderId: '219071508992',
      appId: '1:219071508992:web:42516a44ed5d2f6a59dee5',
      measurementId: 'G-GBSSD1DLQC'
    },

    firebaseVersion: '9.22.2'
  };

  /* Substitute :id style params. */
  CONFIG.resolve = function (path, params) {
    var out = String(path);
    if (params) {
      Object.keys(params).forEach(function (k) {
        out = out.replace(':' + k, encodeURIComponent(params[k]));
      });
    }
    return out;
  };

  CONFIG.url = function (key, params) {
    var route = CONFIG.routes[key];
    if (!route) throw new Error('Unknown route: ' + key);
    return CONFIG.apiV1 + CONFIG.resolve(route, params);
  };

  CONFIG.adminUrl = function (key, params) {
    var route = CONFIG.adminRoutes[key];
    if (!route) throw new Error('Unknown admin route: ' + key);
    return CONFIG.apiV1 + CONFIG.resolve(route, params);
  };

  /* ============================================================== FETCHING */

  /* Distinguishes "the server said no" from "there is no server", because the
     admin pages must not render invented data when a route 404s. */
  function ApiError(message, status, body) {
    this.name = 'ApiError';
    this.message = message;
    this.status = status;
    this.body = body;
  }
  ApiError.prototype = Object.create(Error.prototype);

  /* A route that does not exist yet. The UI treats this as "not wired", which
     is a different thing from "the request failed" and gets different copy. */
  ApiError.prototype.isUnwired = function () {
    return this.status === 404 || this.status === 501 || this.status === 405;
  };

  function token() {
    try { return localStorage.getItem('token') || localStorage.getItem('bog_token'); }
    catch (e) { return null; }
  }

  async function request(url, options) {
    options = options || {};
    var init = {
      method: options.method || 'GET',
      headers: Object.assign({ 'Content-Type': 'application/json' }, options.headers)
    };
    if (options.auth !== false) {
      var t = token();
      if (t) init.headers.Authorization = 'Bearer ' + t;
    }
    if (options.body != null) {
      init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
    }
    if (options.idToken) init.headers.Authorization = 'Bearer ' + options.idToken;

    var res = await fetch(url, init);

    if (res.status === 204) return null;

    var text = await res.text();
    var data = null;
    try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }

    if (!res.ok) {
      var message = (data && (data.message || data.error || data.title))
        || (typeof data === 'string' && data.slice(0, 200))
        || ('Request failed with status ' + res.status);
      throw new ApiError(message, res.status, data);
    }
    return data;
  }

  CONFIG.request = request;
  CONFIG.ApiError = ApiError;
  CONFIG.token = token;

  /* Express, authenticated with the session token. */
  CONFIG.expressFetch = function (key, options) {
    return request(CONFIG.url(key, options && options.params), options);
  };

  CONFIG.adminFetch = function (key, options) {
    return request(CONFIG.adminUrl(key, options && options.params), options);
  };

  /* The keys API. Takes a Firebase ID token, because that is a different
     identity system from the Express session token. */
  CONFIG.keysFetch = function (path, idToken, options) {
    options = Object.assign({}, options, { idToken: idToken });
    return request(CONFIG.keysApi + path, options);
  };

  /* ====================================================== SHAPE TOLERANCE
     The Express response shapes for admin data are not known — none of these
     endpoints has ever been called from this frontend. Rather than guess one
     exact payload and render em-dashes when reality differs, these read a
     field from any of several plausible names and shapes.
     ====================================================================== */

  /* First defined value among a list of candidate keys, searched at the top
     level and then one level down. Handles camelCase, snake_case and a
     { data: {...} } wrapper without enumerating every combination. */
  CONFIG.pick = function (obj, names) {
    if (obj == null) return undefined;
    if (typeof names === 'string') names = [names];

    for (var i = 0; i < names.length; i++) {
      if (obj[names[i]] !== undefined && obj[names[i]] !== null) return obj[names[i]];
    }
    /* One level down — covers { data: { totalUsers } } and { user: { name } }. */
    for (var key in obj) {
      var v = obj[key];
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        for (var j = 0; j < names.length; j++) {
          if (v[names[j]] !== undefined && v[names[j]] !== null) return v[names[j]];
        }
      }
    }
    return undefined;
  };

  /* Find a list wherever it is hiding. */
  CONFIG.pickList = function (payload, names) {
    if (Array.isArray(payload)) return payload;
    if (payload == null) return [];
    if (names == null) names = ['items', 'data', 'results', 'users', 'rows', 'list'];
    if (typeof names === 'string') names = [names];

    var found = CONFIG.pick(payload, names);
    if (Array.isArray(found)) return found;
    for (var key in payload) {
      if (Array.isArray(payload[key])) return payload[key];
    }
    return [];
  };

  /* Coerce to a number, tolerating "1,248", "4.2 TB", "12%" and null. */
  CONFIG.num = function (value, fallback) {
    if (value === null || value === undefined || value === '') {
      return fallback === undefined ? null : fallback;
    }
    if (typeof value === 'number') return isFinite(value) ? value : (fallback ?? null);
    var n = parseFloat(String(value).replace(/[^0-9.\-]/g, ''));
    return isFinite(n) ? n : (fallback === undefined ? null : fallback);
  };

  /* ============================================================= FORMATTERS */

  /* Naira throughout. admin/admin-dashboard.html showed "$12,430" while
     admin/billing.html showed "₦12,430,000" for the same figure — an implied
     rate of 1000:1, so one of the two was wrong regardless. Everything now
     renders through here so the symbol and the grouping cannot drift again. */
  CONFIG.naira = function (value, opts) {
    opts = opts || {};
    var n = CONFIG.num(value);
    if (n === null) return '—';
    var decimals = opts.decimals !== undefined ? opts.decimals
                 : (Math.abs(n) < 100 && n % 1 !== 0 ? 2 : 0);
    var body = n.toLocaleString('en-NG', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    });
    return (opts.bare ? '' : '₦') + body + (opts.suffix || '');
  };

  /* Storage figures. Accepts a bare byte count ("2147483648"), an explicit
     unit ("4.2 GB", "900B"), or a long form ("4.2 gigabytes"). An explicit unit
     is honoured; a bare number is assumed to be bytes. */
  var BYTE_UNITS = {
    b: 1, byte: 1, bytes: 1,
    kb: 1024, kilobyte: 1024, kilobytes: 1024,
    mb: 1048576, megabyte: 1048576, megabytes: 1048576,
    gb: 1073741824, gigabyte: 1073741824, gigabytes: 1073741824,
    tb: 1099511627776, terabyte: 1099511627776, terabytes: 1099511627776,
    pb: 1125899906842624, petabyte: 1125899906842624, petabytes: 1125899906842624
  };

  CONFIG.bytes = function (value, decimals) {
    if (value === null || value === undefined || value === '') return '—';

    var n, scale = 1;

    if (typeof value === 'string') {
      var m = value.trim().match(/^([0-9]*\.?[0-9]+)\s*([a-z]*)$/i);
      if (m) {
        n = parseFloat(m[1]);
        scale = BYTE_UNITS[(m[2] || 'b').toLowerCase()];
        if (!scale) scale = 1;
      } else {
        n = CONFIG.num(value);
      }
    } else {
      n = CONFIG.num(value);
    }

    if (n === null || !isFinite(n)) return '—';

    var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    var i = 0;
    var bytes = n * scale;
    if (bytes < 1) return bytes.toFixed(1) + ' B';
    while (bytes >= 1024 && i < units.length - 1) { bytes /= 1024; i++; }
    return bytes.toFixed(decimals === undefined ? (bytes < 10 ? 1 : 0) : decimals) + ' ' + units[i];
  };

  CONFIG.percent = function (value, decimals) {
    var n = CONFIG.num(value);
    if (n === null) return '—';
    if (n > 0 && n <= 1) n *= 100;
    return n.toFixed(decimals === undefined ? 1 : decimals) + '%';
  };

  CONFIG.date = function (value, opts) {
    if (!value) return '—';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', opts || { day: 'numeric', month: 'short', year: 'numeric' });
  };

  /* "2026-10-04T11:22:00Z" -> "4 Oct, 11:22" */
  CONFIG.dateTime = function (value) {
    if (!value) return '—';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
           ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  };

  /* Relative time for session and activity lists. */
  CONFIG.relative = function (value) {
    if (!value) return '—';
    var d = value instanceof Date ? value : new Date(value);
    if (isNaN(d.getTime())) return '—';
    var secs = Math.round((Date.now() - d.getTime()) / 1000);
    if (secs < 60) return 'just now';
    if (secs < 3600) return Math.floor(secs / 60) + ' min ago';
    if (secs < 86400) return Math.floor(secs / 3600) + ' h ago';
    if (secs < 604800) return Math.floor(secs / 86400) + ' d ago';
    return CONFIG.date(d);
  };

  CONFIG.initials = function (name, email) {
    var source = name || (email ? email.split('@')[0] : '');
    var parts = String(source).trim().split(/[\s._-]+/).filter(Boolean);
    if (!parts.length) return '?';
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  /* Escape before building markup. Admin tables render server-supplied names,
     and one unescaped value would be a stored-XSS hole on an admin page. */
  CONFIG.esc = function (s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  BOG.config = CONFIG;

})(window);