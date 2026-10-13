import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDoc, updateDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const C = window.BOG.config;
const BOG = window.BOG;
const app = initializeApp(C.firebase);
const auth = getAuth(app);
const db = getFirestore(app);
const params = new URLSearchParams(window.location.search);
const editId = params.get('id');
let currentUser = null;

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
    var snap = await getDoc(doc(db, "vault", id));
    if (!snap.exists()) { BOG.alert(el.alert, 'Entry not found.', 'error'); return; }
    var data = snap.data();
    if (el.type) el.type.value = data.type || data.site || 'Password';
    if (el.title) el.title.value = data.title || data.site || '';
    if (el.username) el.username.value = data.username || data.email || '';
    if (el.password) el.password.value = data.password || '';
    if (el.url) el.url.value = data.url || '';
  }catch(err){
    BOG.alert(el.alert, err.message || 'Could not load entry.', 'error');
  }
}

async function saveEntry(){
  if (!currentUser) return;
  var titleVal = (el.title.value || '').trim();
  // title is required for new shape, site is alias
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
  var data = {
    userId: currentUser.uid,
    uid: currentUser.uid,
    type: el.type.value || 'Password',
    title: titleVal,
    site: titleVal,
    username: el.username.value.trim(),
    email: el.username.value.trim(),
    password: el.password.value,
    url: safe,
    updatedAt: serverTimestamp()
  };
  try{
    if (editId){ await updateDoc(doc(db, "vault", editId), data); }
    else { await addDoc(collection(db, "vault"), Object.assign({}, data, { createdAt: serverTimestamp()})); }
    window.location.href = 'vault';
  }catch(err){
    BOG.alert(el.alert, err.message || 'Could not save.', 'error');
    BOG.busy(el.saveBtn, false);
  }
}

// keep alias for old inline handler if cached
window.saveEntry = saveEntry;

onAuthStateChanged(auth, function(user){
  if (user){
    currentUser = user;
    start();
    if (editId) loadEntry(editId);
  } else {
    window.location.href = '/auth/login';
  }
});
