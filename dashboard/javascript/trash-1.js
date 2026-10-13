import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const C = window.BOG.config;
const BOG = window.BOG;
const app = initializeApp(C.firebase);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;

var el = {
  alert: document.getElementById('alert'),
  tbody: document.getElementById('trashList'),
  empty: document.getElementById('emptyState'),
  count: document.getElementById('trashCount'),
  emptyBtn: document.getElementById('emptyTrashBtn'),
};

function start(){
  BOG.mountApp({ search: false });
  wire();
  loadTrash();
}

function wire(){
  if (el.emptyBtn) el.emptyBtn.addEventListener('click', emptyTrash);
  if (el.tbody) el.tbody.addEventListener('click', function(e){
    var btn = e.target.closest('button');
    if (!btn) return;
    var action = btn.getAttribute('data-action');
    var id = btn.getAttribute('data-id');
    if (action === 'restore') restoreFile(id);
    else if (action === 'delete') deletePermanent(id);
  });
}

function safeUrl(u){
  if (!u) return '';
  try{
    var parsed = new URL(u, window.location.origin);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
  }catch(e){}
  return '';
}

async function loadTrash(){
  if (!currentUser) return;
  if (el.tbody) el.tbody.textContent = '';
  if (el.empty) el.empty.classList.add('is-hidden');
  if (el.count) el.count.textContent = '';
  try{
    var q = query(collection(db, "trash"), where("uid", "==", currentUser.uid));
    var snapshot = await getDocs(q);
    var docs = [];
    snapshot.forEach(function(d){ docs.push({ id:d.id, data:d.data() }); });
    if (!docs.length){
      if (el.empty) el.empty.classList.remove('is-hidden');
      if (el.count) el.count.textContent = '0 items';
      return;
    }
    if (el.count) el.count.textContent = docs.length + ' item' + (docs.length===1?'':'s');
    var frag = document.createDocumentFragment();
    docs.forEach(function(entry){
      var id = entry.id;
      var data = entry.data;
      var name = C.pick(data, ['name','filename','fileName']) || 'Untitled';
      var deleted = C.pick(data, ['deletedAt','deleted_at','trashedAt']);
      var when = deleted ? C.date(deleted) : '—';
      var tr = document.createElement('tr');
      var tdName = document.createElement('td');
      var nm = document.createElement('div'); nm.className='cell-main'; nm.textContent = name;
      tdName.appendChild(nm);
      var tdWhen = document.createElement('td'); tdWhen.textContent = when;
      var tdAct = document.createElement('td'); tdAct.className='row-actions';
      var restoreBtn = document.createElement('button'); restoreBtn.type='button'; restoreBtn.className='btn btn--ghost'; restoreBtn.setAttribute('data-action','restore'); restoreBtn.setAttribute('data-id', id); restoreBtn.textContent='Restore';
      var delBtn = document.createElement('button'); delBtn.type='button'; delBtn.className='btn btn--danger'; delBtn.setAttribute('data-action','delete'); delBtn.setAttribute('data-id', id); delBtn.textContent='Delete';
      tdAct.appendChild(restoreBtn); tdAct.appendChild(delBtn);
      tr.appendChild(tdName); tr.appendChild(tdWhen); tr.appendChild(tdAct);
      frag.appendChild(tr);
      // stash for restore lookup
      entry.row = tr;
    });
    el.tbody.appendChild(frag);
    // keep docs for restore
    el._docs = docs;
  }catch(err){
    BOG.alert(el.alert, err.message || 'Could not load trash.', 'error');
  }
}

async function restoreFile(id){
  var docs = el._docs || [];
  var entry = docs.find(function(d){ return d.id===id; });
  if (!entry) return;
  var data = entry.data;
  var name = C.pick(data, ['name','filename']) || 'Untitled';
  var url = safeUrl(C.pick(data, ['url','downloadUrl']));
  var size = C.pick(data, ['size','sizeBytes']) || 0;
  try{
    await addDoc(collection(db, "files"), { uid: currentUser.uid, name: name, url: url, size: size, createdAt: serverTimestamp() });
    await deleteDoc(doc(db, "trash", id));
    BOG.alert(el.alert, '"' + name + '" restored to My Drive.', 'success');
    loadTrash();
  }catch(err){
    BOG.alert(el.alert, err.message, 'error');
  }
}

async function deletePermanent(id){
  var docs = el._docs || [];
  var entry = docs.find(function(d){ return d.id===id; });
  var name = entry ? (C.pick(entry.data, ['name']) || 'this file') : 'this file';
  var ok = await BOG.confirm({ title:'Delete permanently?', body:'Delete "' + name + '" permanently? This cannot be undone.', confirmLabel:'Delete', danger:true });
  if (!ok) return;
  try{
    await deleteDoc(doc(db, "trash", id));
    BOG.alert(el.alert, 'Deleted permanently.', 'success');
    loadTrash();
  }catch(err){ BOG.alert(el.alert, err.message, 'error'); }
}

async function emptyTrash(){
  var ok = await BOG.confirm({ title:'Empty trash?', body:'Delete everything in trash permanently? This cannot be undone.', confirmLabel:'Empty trash', danger:true });
  if (!ok) return;
  try{
    var q = query(collection(db, "trash"), where("uid", "==", currentUser.uid));
    var snapshot = await getDocs(q);
    var ops = [];
    snapshot.forEach(function(d){ ops.push(deleteDoc(doc(db, "trash", d.id))); });
    await Promise.all(ops);
    BOG.alert(el.alert, 'Trash emptied.', 'success');
    loadTrash();
  }catch(err){ BOG.alert(el.alert, err.message, 'error'); }
}

// keep legacy aliases
window.restoreFile = restoreFile;
window.deletePermanent = deletePermanent;
window.emptyTrash = emptyTrash;

onAuthStateChanged(auth, function(user){
  if (user){ currentUser=user; start(); }
  else window.location.href='/auth/login.html';
});
