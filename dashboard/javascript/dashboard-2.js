/* ==========================================================================
   BOG CLOUD — MY DRIVE

   Behaviour preserved from the previous dashboard-2.js:
     - GET  /api/v1/auth/me      -> current user
     - GET  /api/v1/files        -> recent files, newest 10
     - GET  /api/v1/stats        -> the four dashboard counters
     - POST /api/v1/files/upload -> multipart, one "files" part per file
     - DELETE /api/v1/files/:id

   What changed, and why
   ---------------------
   - The navbar, sidebar, theme toggle and account menu are no longer
     reimplemented here. This file used to rebuild all of it by hand, which
     is how the site ended up with three different theme mechanisms (this
     file toggled a .dark class, shell.js uses data-theme, and admin pages
     used body.dark-mode). It now calls BOG.mountApp() like every other
     signed-in page.
   - alert() and confirm() are gone. Upload results go through BOG.alert()
     and deletion through BOG.confirm(), both of which are announced.
   - File names, URLs and ids are escaped before they reach innerHTML. The
     old code interpolated data.name, data.url and data._id straight into
     markup and into an inline onclick, so a file called
     <img src=x onerror=...> was stored XSS on the user's own dashboard.
     URLs are now scheme-checked too, so a javascript: URL cannot land in
     an href.
   - The progress bar is real. The old version un-hid the bar and never set
     a width on it, so it displayed an empty track during every upload and
     the user was told "Uploading 3 file(s)..." with no indication of
     progress. It now uses XMLHttpRequest because fetch() cannot report
     upload progress.
   - Rows are built once and inserted, instead of tbody.innerHTML += in a
     loop, which re-parsed the whole table on every file.
   - A 401 no longer pops a native alert and leaves a dead page: it clears
     the session and sends the user to sign in.
   ========================================================================== */

(function () {
  'use strict';

  var C = window.BOG.config;
  var BOG = window.BOG;

  var el = {
    alert:    document.getElementById('alert'),
    tbody:    document.getElementById('recentFiles'),
    empty:    document.getElementById('recentFilesEmpty'),
    count:    document.getElementById('recentFilesCount'),
    wrap:     document.getElementById('progressWrap'),
    bar:      document.getElementById('progressBar'),
    progressText: document.getElementById('progressLabel'),
    fileInput:document.getElementById('fileInput'),
    uploadBtn:document.getElementById('uploadBtn'),
    name:     document.getElementById('userName'),
    stats: {
      storage:  document.getElementById('storageUsed'),
      quota:    document.getElementById('storageQuota'),
      vault:    document.getElementById('vaultCount'),
      apiCalls: document.getElementById('apiCallsCount'),
      trash:    document.getElementById('trashCount'),
    }
  };

  var RECENT_LIMIT = 10;   /* matches the table caption */
  var files = [];          /* the rendered rows, used by the search filter */
  var searchTerm = '';

  /* ------------------------------------------------------------ bootstrap */

  function start() {
    if (!C.token()) {
      go('/auth/login.html');
      return;
    }

    /* Render the shell first so the search field exists, then refresh the
       user from the server and re-render if the stored copy was thin. */
    BOG.mountApp({ search: true });
    wire();
    checkAuth();
    loadDashboardData();
  }

  function go(href) {
    window.location.href = href;
  }

  function checkAuth() {
    C.expressFetch('me').then(function (data) {
      var user = (data && (data.user || data)) || {};
      var name = user.name || (user.email ? user.email.split('@')[0] : '');
      var first = name.split(' ')[0];

      if (el.name) el.name.textContent = first || 'there';

      /* The shell reads the user from localStorage. If the session was stored
         without a name, the topbar chip shows a blank; re-render with what we
         now know. */
      var stored = BOG.auth.readUser();
      if (first && (!stored || !stored.name)) {
        try { localStorage.setItem('bog_user', JSON.stringify(user)); } catch (e) {}
        BOG.mountApp({ search: true });
      }
    }).catch(function (err) {
      if (err && err.status === 401) return endSession();
      /* A network blip should not sign the user out. Leave the shell up and
         say so, rather than pretending the session is invalid. */
      BOG.alert(el.alert, 'Could not reach BOG Cloud to refresh your profile.', 'warning');
    });
  }

  function endSession() {
    BOG.auth.signOut();
    go('/auth/login.html');
  }

  /* --------------------------------------------------------------- wiring */

  function wire() {
    if (el.uploadBtn) {
      el.uploadBtn.addEventListener('click', function () { el.fileInput.click(); });
    }

    /* The empty state has its own upload button. */
    var triggers = document.querySelectorAll('[data-upload-trigger]');
    for (var i = 0; i < triggers.length; i++) {
      triggers[i].addEventListener('click', function () { el.fileInput.click(); });
    }

    el.fileInput.addEventListener('change', function (e) {
      var picked = e.target.files;
      if (!picked || !picked.length) return;
      upload(Array.prototype.slice.call(picked));
    });

    /* Delete is delegated: the rows are replaced on every load, so per-row
       listeners would have to be rebound each time. */
    el.tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-delete]');
      if (!btn) return;
      deleteFile(btn.getAttribute('data-delete'), btn.getAttribute('data-name'));
    });

    /* shell.js renders #shell-search into the topbar. */
    var search = document.getElementById('shell-search');
    if (search) {
      search.addEventListener('input', function () {
        searchTerm = search.value.trim().toLowerCase();
        applyFilter();
      });
    }
  }

  function applyFilter() {
    var shown = 0;
    for (var i = 0; i < files.length; i++) {
      var hit = !searchTerm || String(files[i].name || '').toLowerCase().indexOf(searchTerm) !== -1;
      files[i].row.hidden = !hit;
      if (hit) shown++;
    }
    if (el.count) {
      el.count.textContent = searchTerm
        ? shown + ' of ' + files.length + ' files'
        : (files.length ? files.length + ' file' + (files.length === 1 ? '' : 's') : '');
    }
  }

  /* ---------------------------------------------------------------- upload */

  function setProgress(pct, message) {
    if (el.wrap) el.wrap.classList.toggle('is-hidden', pct === null);
    if (el.bar) {
      if (pct === null) {
        el.bar.style.width = '';
        el.bar.setAttribute('aria-valuenow', '0');
      } else {
        el.bar.style.width = pct + '%';
        el.bar.setAttribute('aria-valuenow', String(pct));
      }
    }
    if (el.progressText) el.progressText.textContent = message || '';
  }

  /* fetch() cannot report upload progress, so this is the one place that
     still needs XMLHttpRequest. */
  function postFiles(picked) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', C.url('fileUpload'));

      var t = C.token();
      if (t) xhr.setRequestHeader('Authorization', 'Bearer ' + t);

      xhr.upload.addEventListener('progress', function (e) {
        if (!e.lengthComputable) return;
        setProgress(Math.round((e.loaded / e.total) * 100),
                    'Uploading ' + picked.length + ' file' + (picked.length === 1 ? '' : 's') + '…');
      });

      xhr.addEventListener('load', function () {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else {
          var msg = 'Upload failed';
          try {
            var body = JSON.parse(xhr.responseText);
            msg = body.message || body.error || msg;
          } catch (e) {}
          reject(new Error(msg + ' (HTTP ' + xhr.status + ')'));
        }
      });
      xhr.addEventListener('error', function () {
        reject(new Error('Network error during upload. Check your connection.'));
      });
      xhr.addEventListener('abort', function () {
        reject(new Error('Upload cancelled.'));
      });

      var fd = new FormData();
      for (var i = 0; i < picked.length; i++) fd.append('files', picked[i]);
      xhr.send(fd);
    });
  }

  function upload(picked) {
    BOG.busy(el.uploadBtn, true, 'Uploading');
    setProgress(0, 'Uploading ' + picked.length + ' file' + (picked.length === 1 ? '' : 's') + '…');
    BOG.clearAlert(el.alert);

    postFiles(picked).then(function () {
      BOG.busy(el.uploadBtn, false);
      setProgress(null, '');
      BOG.alert(el.alert,
        picked.length + ' file' + (picked.length === 1 ? '' : 's') + ' uploaded.', 'success');
      loadDashboardData();
    }).catch(function (err) {
      BOG.busy(el.uploadBtn, false);
      setProgress(null, '');
      BOG.alert(el.alert, err.message, 'error');
    }).then(function () {
      /* Let the same file be picked again after a failure. */
      el.fileInput.value = '';
    });
  }

  /* ----------------------------------------------------------------- files */

  /* Only ever put http(s) in an href. A file record containing
     javascript:alert(1) would otherwise become a clickable payload. */
  function safeUrl(u) {
    if (!u) return '';
    try {
      var parsed = new URL(u, window.location.origin);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
    } catch (e) {}
    return '';
  }

  function fileId(f) {
    return C.pick(f, ['_id', 'id', 'fileId', 'file_id', 'key', 'name']) || '';
  }

  function renderFiles(list) {
    var frag = document.createDocumentFragment();

    list.forEach(function (f) {
      var rawUrl = C.pick(f, ['url', 'downloadUrl', 'download_url', 'link', 'path']);
      var href = safeUrl(rawUrl);
      var size = C.bytes(C.pick(f, ['size', 'sizeBytes', 'bytes', 'fileSize']));
      var when = C.pick(f, ['createdAt', 'created_at', 'uploadedAt', 'uploaded_at', 'date', 'timestamp']);
      var id = fileId(f);

      var tr = document.createElement('tr');

      var tdName = document.createElement('td');
      var inner = document.createElement('div');
      inner.className = 'cell-main';
      inner.textContent = C.pick(f, ['name', 'filename', 'fileName']) || 'Untitled';
      if (href) {
        var a = document.createElement('a');
        a.href = href;
        a.target = '_blank';
        /* A file URL from our own origin is safe; anything else gets noopener. */
        a.rel = 'noopener noreferrer';
        a.appendChild(inner);
        tdName.appendChild(a);
      } else {
        tdName.appendChild(inner);
      }
      /* Kept for the search filter, set as a property rather than an HTML
         attribute so a quote in a file name cannot break out of it. */
      tr._name = String(C.pick(f, ['name', 'filename', 'fileName']) || '').toLowerCase();

      var tdSize = document.createElement('td');
      tdSize.className = 'num';
      tdSize.textContent = size;

      var tdWhen = document.createElement('td');
      tdWhen.textContent = when ? C.relative(when) : '—';

      var tdAct = document.createElement('td');
      if (id) {
        var del = document.createElement('button');
        del.type = 'button';
        del.className = 'btn btn--sm btn--danger';
        del.textContent = 'Delete';
        del.setAttribute('data-delete', id);
        del.setAttribute('data-name', C.pick(f, ['name', 'filename', 'fileName']) || 'this file');
        tdAct.appendChild(del);
      }

      tr.appendChild(tdName);
      tr.appendChild(tdSize);
      tr.appendChild(tdWhen);
      tr.appendChild(tdAct);
      frag.appendChild(tr);

      f.row = tr;
    });

    el.tbody.replaceChildren(frag);

    var none = list.length === 0;
    if (el.empty) el.empty.classList.toggle('is-hidden', !none);
    el.tbody.parentElement.parentElement.classList.toggle('is-hidden', none);

    applyFilter();
  }

  function loadFiles() {
    return C.expressFetch('files').then(function (data) {
      /* The old code assumed a bare array and called .slice() on it. Accept
         { files: [...] } or { data: [...] } as well. */
      /* Cap here, not at render time: applyFilter() walks this same array, so
         it must only ever contain rows that actually exist. */
      files = C.pickList(data, ['files', 'items', 'data', 'results']).slice(0, RECENT_LIMIT);
      renderFiles(files);
    }).catch(function (err) {
      files = [];
      renderFiles([]);
      if (err && err.status === 401) return endSession();
      BOG.alert(el.alert, 'Could not load your files: ' + err.message, 'warning');
    });
  }

  /* ---------------------------------------------------------------- delete */

  function deleteFile(id, name) {
    if (!id) return;
    BOG.confirm({
      title: 'Delete this file?',
      body: name + ' will be moved out of your drive. This cannot be undone.',
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: function () {
        return C.request(C.url('files') + '/' + encodeURIComponent(id), { method: 'DELETE' })
          .then(function () {
            BOG.alert(el.alert, 'Deleted ' + name + '.', 'success');
            return loadDashboardData();
          })
          .catch(function (err) {
            if (err && err.status === 401) { endSession(); return false; }
            BOG.alert(el.alert, 'Could not delete ' + name + ': ' + err.message, 'error');
            return false;
          });
      }
    });
  }

  /* ----------------------------------------------------------------- stats */

  function loadStats() {
    return C.expressFetch('stats').then(function (raw) {
      var s = raw || {};

      var used = C.num(C.pick(s, ['storageUsed', 'storage_used', 'used', 'usedBytes', 'storage']));
      if (used === null) {
        el.stats.storage.textContent = '—';
      } else {
        /* Prefer a ready-made label from the API if it sends one. */
        var label = C.pick(s, ['storageUsedLabel', 'storageLabel']);
        el.stats.storage.textContent = label || C.bytes(used);
      }

      var quota = C.num(C.pick(s, ['storageQuota', 'storage_quota', 'quota', 'limit', 'totalStorage']));
      el.stats.quota.textContent = quota
        ? 'of ' + C.bytes(quota) + ' included'
        : 'of plan allowance';

      /* num() rather than ||, so a real zero shows as 0 instead of the
         placeholder. The old code turned every 0 into "0". */
      var v;
      v = C.num(C.pick(s, ['vaultCount', 'vault_count', 'vaultItems', 'vault']));
      el.stats.vault.textContent = v === null ? '—' : v.toLocaleString('en-NG');

      v = C.num(C.pick(s, ['apiCalls', 'api_calls', 'apiCallCount', 'requests']));
      el.stats.apiCalls.textContent = v === null ? '—' : v.toLocaleString('en-NG');

      v = C.num(C.pick(s, ['trashCount', 'trash_count', 'trashItems', 'trashed']));
      el.stats.trash.textContent = v === null ? '—' : v.toLocaleString('en-NG');
    }).catch(function (err) {
      if (err && err.status === 401) return endSession();
      /* Leave the em-dashes. Inventing zeros would be worse than saying
         nothing is known. */
    });
  }

  function loadDashboardData() {
    return Promise.all([loadFiles(), loadStats()]);
  }

  /* ------------------------------------------------------------------ init */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();