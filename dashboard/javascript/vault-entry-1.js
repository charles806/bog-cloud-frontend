/* ==========================================================================
   BOG CLOUD — VAULT ENTRY (add / edit)

   Backed by the Express backend (/api/v1/vault/entries) instead of Firestore.
   The backend has no dedicated "type" column, so the select value round-trips
   through the entry's tags (one tag, "Password" | "Note" | "Card").
   ========================================================================== */

var C = window.BOG.config;
var BOG = window.BOG;

var params = new URLSearchParams(window.location.search);
var editId = params.get('id');

var el = {
  alert: document.getElementById('alert'),
  form: document.getElementById('vaultEntryForm'),
  formTitle: document.getElementById('formTitle'),
  type: document.getElementById('type'),
  title: document.getElementById('title'),
  username: document.getElementById('username'),
  password: document.getElementById('password'),
  url: document.getElementById('url'),
  saveBtn: document.getElementById('saveBtn'),
};

function start(){
  BOG.mountApp({ search:false });
  wire();
}

function wire(){
  if (el.form) el.form.addEventListener('submit', function(e){
    e.preventDefault();
    saveEntry();
  });
}

function escUrl(u){
  if (!u) return '';
  try{
    var parsed = new URL(u, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  }catch(e){}
  return '';
}

async function loadEntry(id){
  if (el.formTitle) el.formTitle.textContent = "Edit Vault Entry";
  try{
    var res = await C.request(C.url('vaultEntry', { id: id }));
    var entry = (res && (res.entry || res.data)) || {};
    var tags = entry.tags || [];
    if (el.type) el.type.value = tags.indexOf('Password') !== -1 ? 'Password'
                               : tags.indexOf('Note') !== -1 ? 'Note'
                               : tags.indexOf('Card') !== -1 ? 'Card'
                               : (entry.type || 'Password');
    if (el.title) el.title.value = entry.siteName || entry.title || entry.site || '';
    if (el.username) el.username.value = entry.username || entry.email || '';
    if (el.password) el.password.value = entry.password || '';
    if (el.url) el.url.value = entry.url || '';
  }catch(err){
    BOG.alert(el.alert, err.message || 'Could not load entry.', 'error');
  }
}

async function saveEntry(){
  var titleVal = (el.title.value || '').trim();
  if (!titleVal){
    if (BOG.setFieldError) BOG.setFieldError(el.title, 'Enter a title');
    return;
  }
  var rawUrl = (el.url.value || '').trim();
  var safe = rawUrl ? escUrl(rawUrl) : '';
  if (rawUrl && !safe){
    if (BOG.setFieldError) BOG.setFieldError(el.url, 'Enter a valid http(s) URL');
    else BOG.alert(el.alert, 'Enter a valid URL (http/https).', 'error');
    return;
  }
  BOG.busy(el.saveBtn, true, 'Saving…');
  var typeVal = el.type ? (el.type.value || 'Password') : 'Password';
  var data = {
    siteName: titleVal,
    username: (el.username.value || '').trim(),
    password: el.password.value,
    url: safe,
    tags: [typeVal]
  };
  try{
    if (editId){
      await C.request(C.url('vaultEntry', { id: editId }), { method: 'PUT', body: data });
    } else {
      await C.request(C.url('vaultEntries'), { method: 'POST', body: data });
    }
    window.location.href = 'vault.html';
  }catch(err){
    BOG.alert(el.alert, err.message || 'Could not save.', 'error');
    BOG.busy(el.saveBtn, false);
  }
}

// keep alias for old inline handler if cached
window.saveEntry = saveEntry;

function startIfReady(){
  if (!C.token()) {
    window.location.href = '/auth/login.html';
    return;
  }
  start();
  if (editId) loadEntry(editId);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startIfReady);
} else {
  startIfReady();
}