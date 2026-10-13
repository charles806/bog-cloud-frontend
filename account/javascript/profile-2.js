/* Profile page backed by the Express backend: GET/PUT /users/me and
   PUT /users/me/password. Display name maps firstName + lastName. */

var C = window.BOG.config;
var BOGNS = window.BOG;

function showAlert(message, kind) {
  var el = document.getElementById('alertBox') || document.getElementById('alert');
  if (el && BOGNS && BOGNS.alert) BOGNS.alert(el, message, kind || 'error');
  else if (el) { el.textContent = message; el.className = 'alert alert--' + (kind||'error') + ' is-visible'; }
}

function toggleNameForm() {
  var f = document.getElementById('nameForm');
  if (!f) return;
  f.classList.toggle('is-hidden');
  if (!f.classList.contains('is-hidden')) document.getElementById('newNameInput').focus();
}
function togglePasswordForm() {
  var f = document.getElementById('passwordForm');
  if (!f) return;
  var isHidden = f.classList.toggle('is-hidden');
  if (!f.classList.contains('is-hidden')) {
    var a=document.getElementById('currentPassword'); if(a) a.value='';
    var b=document.getElementById('newPassword'); if(b) b.value='';
    var c=document.getElementById('confirmPassword'); if(c) c.value='';
    document.getElementById('currentPassword').focus();
  }
}

function wire() {
  BOGNS.mountApp({ search: false });
  var t1 = document.getElementById('toggleNameBtn');
  if (t1) t1.addEventListener('click', toggleNameForm);
  var c1 = document.getElementById('cancelNameBtn');
  if (c1) c1.addEventListener('click', toggleNameForm);
  var t2 = document.getElementById('togglePasswordBtn');
  if (t2) t2.addEventListener('click', togglePasswordForm);
  var c2 = document.getElementById('cancelPasswordBtn');
  if (c2) c2.addEventListener('click', togglePasswordForm);
  var sb = document.getElementById('saveNameBtn');
  if (sb) sb.addEventListener('click', saveName);
  var ub = document.getElementById('updatePassBtn');
  if (ub) ub.addEventListener('click', savePassword);
  var sOut = document.getElementById('signOutBtn');
  if (sOut) sOut.addEventListener('click', logout);
}

async function logout() {
  BOGNS.auth.signOut();
  window.location.href = '/index.html';
}

async function saveName() {
  var btn = document.getElementById('saveNameBtn');
  var newName = (document.getElementById('newNameInput').value || '').trim();
  if(!newName) { showAlert("Name cannot be empty", "error"); return; }
  BOGNS.busy(btn, true, "Saving…");
  try{
    var first = newName.split(' ')[0];
    var rest = newName.split(' ').slice(1).join(' ');
    var lastName = rest || (currentLastName());
    await C.request(C.url('profile'), { method: 'PUT', body: { firstName: first, lastName: lastName } });
    try{ localStorage.setItem('bog_user', JSON.stringify(Object.assign({}, JSON.parse(localStorage.getItem('bog_user')||'{}'), {displayName:newName, name:newName, firstName:first, lastName:lastName}))); }catch(e){}
    showAlert("Name updated successfully!", "success");
    toggleNameForm();
    renderName(first, lastName);
    BOGNS.mountApp({ search:false });
  } catch(error){
    showAlert("Error: " + (error.message || "Could not save name"), "error");
  }
  BOGNS.busy(btn, false);
}

function currentLastName() {
  try{
    var u = JSON.parse(localStorage.getItem('bog_user')||'{}');
    return u.lastName || '';
  }catch(e){ return ''; }
}

async function savePassword() {
  var btn = document.getElementById('updatePassBtn');
  var currentPass = document.getElementById('currentPassword').value;
  var newPass = document.getElementById('newPassword').value;
  var confirmPass = document.getElementById('confirmPassword').value;
  if(!currentPass){ showAlert("Please enter current password", "error"); return; }
  if(!newPass || newPass.length < 8){ showAlert("New password must be at least 8 characters", "error"); return; }
  if(newPass!== confirmPass){ showAlert("New passwords do not match", "error"); return; }
  BOGNS.busy(btn, true, "Updating…");
  try{
    await C.request(C.url('changePassword'), { method: 'PUT', body: { currentPassword: currentPass, newPassword: newPass } });
    showAlert("Password updated successfully!", "success");
    togglePasswordForm();
  } catch(error){
    if (error && error.status === 401) showAlert("Current password is incorrect", "error");
    else showAlert("Error: " + (error.message || "Could not update password"), "error");
  }
  BOGNS.busy(btn, false);
}

function renderName(first, last) {
  var name = [first, last].filter(Boolean).join(' ') || first;
  var initial = (first || name || '?')[0].toUpperCase();
  var av=document.getElementById('profileAvatar'); if(av) av.textContent = initial;
  var pn=document.getElementById('profileName'); if(pn) pn.textContent = name;
  var dn=document.getElementById('displayName'); if(dn) dn.textContent = name;
  var ni=document.getElementById('newNameInput'); if(ni) ni.value = name;
}

async function loadProfile() {
  try{
    var data = await C.expressFetch('profile');
    var user = (data && (data.user || data)) || {};
    var first = user.firstName || user.name || (user.email ? user.email.split('@')[0] : '');
    var last = user.lastName || '';
    var name = [first, last].filter(Boolean).join(' ') || 'there';
    var pe=document.getElementById('profileEmail'); if(pe) pe.textContent = user.email || '';
    var de=document.getElementById('displayEmail'); if(de) de.textContent = user.email || '';
    try{ localStorage.setItem('bog_user', JSON.stringify(Object.assign({}, JSON.parse(localStorage.getItem('bog_user')||'{}'), {name:name, firstName:first, lastName:last, email:user.email}))); }catch(e){}
    renderName(first, last);
  }catch(err){
    if (err && err.status === 401) { BOGNS.auth.signOut(); window.location.href = '/auth/login.html'; return; }
    var al=document.getElementById('alertBox') || document.getElementById('alert');
    if (al) showAlert('Could not load your profile: ' + err.message, 'warning');
  }
}

// expose for legacy onclick if cached
window.toggleNameForm = toggleNameForm;
window.togglePasswordForm = togglePasswordForm;
window.saveName = saveName;
window.savePassword = savePassword;
window.logout = logout;

function start() {
  if (!C.token()) {
    window.location.href = '/auth/login.html';
    return;
  }
  wire();
  loadProfile();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start);
} else {
  start();
}