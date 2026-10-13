/* ==========================================================================
   BOG CLOUD — VAULT

   Rewritten to match the neobrutalist vault.html:
     - entry-list / skeleton__row exist in app.css (added, not assumed)
     - rows are DOM nodes, never innerHTML of server data
     - no inline onclick, no alert/confirm, no classList "open" that never
       matched the new modal[hidden] stylesheet
   Behaviour preserved from the old vault-1.js:
     - Firebase Firestore, collection "vault", field userId == uid
     - fields site / email / password (tolerates title/username shape too)
     - auth guard -> /auth/login.html
     - add, edit, delete, reveal
   ========================================================================== */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import {
  getFirestore, collection, addDoc, getDocs, query, where,
  deleteDoc, doc, updateDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

var C = window.BOG.config;
var BOG = window.BOG;

var app = initializeApp(C.firebase);
var auth = getAuth(app);
var db = getFirestore(app);

var currentUser = null;
var editingId = null;
var previousFocus = null;
var vaultItems = [];

var el = {
  alert:        document.getElementById('alert'),
  list:         document.getElementById('vaultList'),
  skeleton:     document.getElementById('vaultSkeleton'),
  empty:        document.getElementById('vaultEmpty'),
  count:        document.getElementById('vaultCount'),
  modal:        document.getElementById('vaultModal'),
  modalTitle:   document.getElementById('modalTitle'),
  form:         document.getElementById('vaultForm'),
  siteInput:    document.getElementById('siteInput'),
  emailInput:   document.getElementById('emailInput'),
  passwordInput:document.getElementById('passwordInput'),
  siteError:    document.getElementById('siteError'),
  emailError:   document.getElementById('emailError'),
  passwordError:document.getElementById('passwordError'),
  revealToggle: document.getElementById('revealToggle'),
  cancelBtn:    document.getElementById('cancelBtn'),
  saveBtn:      document.getElementById('saveBtn'),
  addBtn:       document.getElementById('addBtn'),
  addBtnEmpty:  document.getElementById('addBtnEmpty'),
};

var icons = {
  edit:   '<path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>',
  trash:  '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>',
  eye:    '<path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>',
  eyeOff: '<path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>',
  vault:  '<path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>',
};

function svgPath(d) {
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="' + d.slice(d.indexOf('d="')+3, d.indexOf('"', d.indexOf('d="')+3)) + '"/></svg>';
}
function iconSvg(name) {
  var inner = icons[name] || '';
  // icons already contain <path d="...">, inject into wrapper
  return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + inner + '</svg>';
}

function start() {
  BOG.mountApp({ search: true });
  wire();
}

function wire() {
  if (el.addBtn) el.addBtn.addEventListener('click', function () { openModal(null, {}); });
  if (el.addBtnEmpty) el.addBtnEmpty.addEventListener('click', function () { openModal(null, {}); });
  if (el.cancelBtn) el.cancelBtn.addEventListener('click', closeModal);
  if (el.revealToggle) {
    el.revealToggle.addEventListener('click', function () {
      var isPw = el.passwordInput.type === 'password';
      el.passwordInput.type = isPw ? 'text' : 'password';
      el.revealToggle.setAttribute('aria-pressed', String(isPw));
      el.revealToggle.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
      // keep caret
      el.passwordInput.focus();
      try { var at = el.passwordInput.value.length; el.passwordInput.setSelectionRange(at, at); } catch (e) {}
    });
  }
  if (el.form) el.form.addEventListener('submit', function (e) {
    e.preventDefault();
    handleSave();
  });
  if (el.modal) {
    el.modal.addEventListener('click', function (e) {
      if (e.target === el.modal) closeModal();
    });
  }
  document.addEventListener('keydown', function (e) {
    if (!el.modal.hidden) {
      if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
      if (BOG.a11y && BOG.a11y.trap) BOG.a11y.trap(el.modal.querySelector('.modal__panel'), e);
    }
  });
  // delegation for vault list
  if (el.list) {
    el.list.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      var action = btn.getAttribute('data-action');
      var id = btn.getAttribute('data-id');
      if (!action || !id) return;
      if (action === 'reveal') toggleReveal(id);
      else if (action === 'edit') {
        var item = vaultItems.find(function (x) { return x.id === id; });
        if (item) openModal(id, { site: pick(item.data, ['site','title','name']), email: pick(item.data, ['email','username','user']), password: pick(item.data, ['password','pass']) });
      } else if (action === 'delete') handleDelete(id);
    });
  }
  // shell search filters vault rows
  var search = document.getElementById('shell-search');
  if (search) search.addEventListener('input', function () {
    applySearch(search.value.trim().toLowerCase());
  });
}

function applySearch(term) {
  if (!term) {
    vaultItems.forEach(function (x) { if (x.row) x.row.hidden = false; });
    if (el.count) el.count.textContent = vaultItems.length ? vaultItems.length + ' item' + (vaultItems.length === 1 ? '' : 's') : '';
    return;
  }
  var shown = 0;
  vaultItems.forEach(function (x) {
    var hay = String(pick(x.data, ['site','title','name']) || '') + ' ' + String(pick(x.data, ['email','username','user']) || '');
    var hit = hay.toLowerCase().indexOf(term) !== -1;
    if (x.row) x.row.hidden = !hit;
    if (hit) shown++;
  });
  if (el.count) el.count.textContent = shown + ' of ' + vaultItems.length;
}

function pick(obj, names) {
  if (!obj) return '';
  for (var i = 0; i < names.length; i++) if (obj[names[i]] != null) return obj[names[i]];
  return '';
}

function openModal(id, data) {
  editingId = id || null;
  previousFocus = document.activeElement;
  el.modalTitle.textContent = editingId ? 'Edit password' : 'Add password';
  el.siteInput.value = data.site || '';
  el.emailInput.value = data.email || '';
  el.passwordInput.value = data.password || '';
  el.passwordInput.type = 'password';
  if (el.revealToggle) {
    el.revealToggle.setAttribute('aria-pressed', 'false');
    el.revealToggle.setAttribute('aria-label', 'Show password');
  }
  // clear field errors
  if (BOG.setFieldError) {
    BOG.setFieldError(el.siteInput, '');
    BOG.setFieldError(el.emailInput, '');
    BOG.setFieldError(el.passwordInput, '');
  }
  BOG.clearAlert(el.alert);
  el.modal.hidden = false;
  // focus first field
  setTimeout(function(){ el.siteInput.focus(); }, 0);
}

function closeModal() {
  el.modal.hidden = true;
  editingId = null;
  if (previousFocus && previousFocus.focus) previousFocus.focus();
}

async function handleSave() {
  var site = el.siteInput.value.trim();
  var email = el.emailInput.value.trim();
  var password = el.passwordInput.value;
  var valid = true;
  if (!site) { if (BOG.setFieldError) BOG.setFieldError(el.siteInput, 'Enter a site or app'); valid = false; }
  if (!email) { if (BOG.setFieldError) BOG.setFieldError(el.emailInput, 'Enter a username or email'); valid = false; }
  if (!password) { if (BOG.setFieldError) BOG.setFieldError(el.passwordInput, 'Enter a password'); valid = false; }
  if (!valid) return;
  if (!currentUser) return;

  BOG.busy(el.saveBtn, true, 'Saving…');
  try {
    if (editingId) {
      await updateDoc(doc(db, 'vault', editingId), { site: site, email: email, password: password });
      BOG.alert(el.alert, 'Password updated.', 'success');
    } else {
      await addDoc(collection(db, 'vault'), { userId: currentUser.uid, site: site, email: email, password: password, createdAt: serverTimestamp() });
      BOG.alert(el.alert, 'Password saved.', 'success');
    }
    closeModal();
    await loadVault();
  } catch (err) {
    BOG.alert(el.alert, err.message || 'Could not save. Try again.', 'error');
  } finally {
    BOG.busy(el.saveBtn, false);
  }
}

function toggleReveal(id) {
  var input = document.getElementById('pass-' + id);
  var btn = document.getElementById('eye-' + id);
  if (!input || !btn) return;
  var isPw = input.type === 'password';
  input.type = isPw ? 'text' : 'password';
  btn.setAttribute('aria-label', isPw ? 'Hide password' : 'Show password');
  btn.setAttribute('aria-pressed', String(isPw));
  // swap icon
  btn.innerHTML = isPw ? iconSvg('eyeOff') : iconSvg('eye');
}

async function handleDelete(id) {
  var item = vaultItems.find(function (x) { return x.id === id; });
  var label = item ? pick(item.data, ['site','title','name']) : 'this password';
  var ok = await BOG.confirm({
    title: 'Delete password?',
    body: 'Delete "' + label + '"? This cannot be undone.',
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!ok) return;
  try {
    await deleteDoc(doc(db, 'vault', id));
    BOG.alert(el.alert, 'Deleted.', 'success');
    await loadVault();
  } catch (err) {
    BOG.alert(el.alert, err.message || 'Could not delete.', 'error');
  }
}

async function loadVault() {
  if (!currentUser) return;
  vaultItems = [];
  if (el.skeleton) el.skeleton.hidden = false;
  if (el.list) { el.list.textContent = ''; }
  if (el.empty) el.empty.classList.add('is-hidden');
  if (el.count) el.count.textContent = '';

  try {
    var q = query(collection(db, 'vault'), where('userId', '==', currentUser.uid));
    var snap = await getDocs(q);

    if (el.skeleton) el.skeleton.hidden = true;

    var docs = [];
    snap.forEach(function (d) { docs.push({ id: d.id, data: d.data() }); });

    if (!docs.length) {
      if (el.empty) el.empty.classList.remove('is-hidden');
      if (el.count) el.count.textContent = '0 items';
      return;
    }

    renderList(docs);
  } catch (err) {
    if (el.skeleton) el.skeleton.hidden = true;
    BOG.alert(el.alert, err.message || 'Could not load vault.', 'error');
  }
}

function renderList(docs) {
  var frag = document.createDocumentFragment();
  vaultItems = [];

  docs.forEach(function (entry) {
    var id = entry.id;
    var data = entry.data;
    var site = pick(data, ['site','title','name']) || 'Untitled';
    var email = pick(data, ['email','username','user']) || '';
    var password = pick(data, ['password','pass']) || '';

    var row = document.createElement('div');
    row.className = 'entry';
    row.setAttribute('role', 'listitem');

    var iconWrap = document.createElement('div');
    iconWrap.className = 'entry__icon';
    iconWrap.setAttribute('aria-hidden', 'true');
    iconWrap.innerHTML = iconSvg('vault');

    var body = document.createElement('div');
    body.className = 'entry__body';

    var nameEl = document.createElement('div');
    nameEl.className = 'entry__name';
    nameEl.textContent = site;

    var metaEl = document.createElement('div');
    metaEl.className = 'entry__meta';
    metaEl.textContent = email;

    // password row: masked input + reveal button inline
    var pwWrap = document.createElement('div');
    pwWrap.className = 'reveal';
    pwWrap.style.marginTop = '6px';
    pwWrap.style.maxWidth = '360px';

    var pwInput = document.createElement('input');
    pwInput.className = 'field-input';
    pwInput.type = 'password';
    pwInput.id = 'pass-' + id;
    pwInput.value = password;
    pwInput.readOnly = true;
    pwInput.autocomplete = 'off';
    pwInput.setAttribute('aria-label', 'Password for ' + site);

    var revealBtn = document.createElement('button');
    revealBtn.type = 'button';
    revealBtn.className = 'icon-btn';
    revealBtn.id = 'eye-' + id;
    revealBtn.setAttribute('data-action', 'reveal');
    revealBtn.setAttribute('data-id', id);
    revealBtn.setAttribute('aria-label', 'Show password');
    revealBtn.setAttribute('aria-pressed', 'false');
    revealBtn.innerHTML = iconSvg('eye');
    revealBtn.style.flexShrink = '0';

    pwWrap.appendChild(pwInput);
    pwWrap.appendChild(revealBtn);

    body.appendChild(nameEl);
    if (email) body.appendChild(metaEl);
    body.appendChild(pwWrap);

    var actions = document.createElement('div');
    actions.className = 'entry__actions';

    var editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'btn btn--ghost';
    editBtn.setAttribute('data-action', 'edit');
    editBtn.setAttribute('data-id', id);
    editBtn.setAttribute('aria-label', 'Edit ' + site);
    editBtn.innerHTML = iconSvg('edit');
    // keep text for a11y but visually icon; add sr-only?
    var editLabel = document.createElement('span');
    editLabel.className = 'sr-only';
    editLabel.textContent = 'Edit';
    editBtn.appendChild(editLabel);

    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn--danger';
    delBtn.setAttribute('data-action', 'delete');
    delBtn.setAttribute('data-id', id);
    delBtn.setAttribute('aria-label', 'Delete ' + site);
    delBtn.innerHTML = iconSvg('trash');
    var delLabel = document.createElement('span');
    delLabel.className = 'sr-only';
    delLabel.textContent = 'Delete';
    delBtn.appendChild(delLabel);

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    row.appendChild(iconWrap);
    row.appendChild(body);
    row.appendChild(actions);

    frag.appendChild(row);
    vaultItems.push({ id: id, data: data, row: row });
  });

  el.list.appendChild(frag);
  if (el.empty) el.empty.classList.add('is-hidden');
  if (el.count) el.count.textContent = vaultItems.length + ' item' + (vaultItems.length === 1 ? '' : 's');
}

// legacy aliases so no inline handler breaks if cached HTML still references them
window.openModal = function(id, data) { openModal(id, data); };
window.closeModal = function() { closeModal(); };

onAuthStateChanged(auth, function (user) {
  if (user) {
    currentUser = user;
    start();
    loadVault();
  } else if (canReuseSession()) {
    guestShell();
  } else {
    window.location.href = '/auth/login.html';
  }
});

/* Signed in via the Express backend (login-1.js) but not into Firebase.
   Keep the app shell up instead of bouncing these pages to login. */
function canReuseSession(){
  return !!(window.BOG && window.BOG.auth && window.BOG.auth.readToken());
}
function guestShell(){
  window.BOG.mountApp({ search: false });
  var al = document.getElementById('alert');
  if (al) window.BOG.alert(al, 'You are signed in, but this section needs a Firebase session to load your stored data yet.', 'warning');
}

// in case auth already resolves before listener
if (auth.currentUser) { currentUser = auth.currentUser; start(); loadVault(); }
