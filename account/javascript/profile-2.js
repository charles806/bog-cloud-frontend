import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

/* Config comes from assets/js/config.js. */
const app = initializeApp(window.BOG.config.firebase);
const auth = getAuth(app);
let currentUser = null;

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
  // toggle via is-hidden: if it was hidden, now visible => clear
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
  try { await signOut(auth); } catch(e) {}
  BOGNS.auth.signOut();
  window.location.href = '/index.html';
}

async function saveName() {
  var btn = document.getElementById('saveNameBtn');
  var newName = (document.getElementById('newNameInput').value || '').trim();
  if(!newName) { showAlert("Name cannot be empty", "error"); return; }
  BOGNS.busy(btn, true, "Saving…");
  try{
    await updateProfile(currentUser, { displayName: newName });
    try{ localStorage.setItem('bog_user', JSON.stringify(Object.assign({}, JSON.parse(localStorage.getItem('bog_user')||'{}'), {displayName:newName, name:newName}))); }catch(e){}
    showAlert("Name updated successfully!", "success");
    toggleNameForm();
    var pn=document.getElementById('profileName'); if(pn) pn.textContent = newName;
    var dn=document.getElementById('displayName'); if(dn) dn.textContent = newName;
    var av=document.getElementById('profileAvatar'); if(av) av.textContent = newName[0].toUpperCase();
    BOGNS.mountApp({ search:false });
  } catch(error){
    showAlert("Error: " + error.message, "error");
  }
  BOGNS.busy(btn, false);
}

async function savePassword() {
  var btn = document.getElementById('updatePassBtn');
  var currentPass = document.getElementById('currentPassword').value;
  var newPass = document.getElementById('newPassword').value;
  var confirmPass = document.getElementById('confirmPassword').value;
  if(!currentPass){ showAlert("Please enter current password", "error"); return; }
  if(!newPass || newPass.length < 6){ showAlert("New password must be at least 6 characters", "error"); return; }
  if(newPass!== confirmPass){ showAlert("New passwords do not match", "error"); return; }
  BOGNS.busy(btn, true, "Updating…");
  try{
    var credential = EmailAuthProvider.credential(currentUser.email, currentPass);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPass);
    showAlert("Password updated successfully!", "success");
    togglePasswordForm();
  } catch(error){
    if(error.code === 'auth/wrong-password') showAlert("Current password is incorrect", "error");
    else showAlert("Error: " + error.message, "error");
  }
  BOGNS.busy(btn, false);
}

// expose for legacy onclick if cached
window.toggleNameForm = toggleNameForm;
window.togglePasswordForm = togglePasswordForm;
window.saveName = saveName;
window.savePassword = savePassword;
window.logout = logout;

onAuthStateChanged(auth, function(user){
  if (user) {
    currentUser = user;
    wire();
    var name = user.displayName || user.email.split('@')[0];
    var initial = name[0].toUpperCase();
    var av=document.getElementById('profileAvatar'); if(av) av.textContent = initial;
    var pn=document.getElementById('profileName'); if(pn) pn.textContent = name;
    var pe=document.getElementById('profileEmail'); if(pe) pe.textContent = user.email;
    var dn=document.getElementById('displayName'); if(dn) dn.textContent = name;
    var de=document.getElementById('displayEmail'); if(de) de.textContent = user.email;
    var ni=document.getElementById('newNameInput'); if(ni) ni.value = name;
  } else if (window.BOG.auth && window.BOG.auth.readToken()) {
    wire();
    var al=document.getElementById('alertBox') || document.getElementById('alert');
    if (al) window.BOG.alert(al, 'You are signed in, but profile changes require a Firebase session yet.', 'warning');
  } else {
    window.location.href = '/auth/login.html';
  }
});
