import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* Config comes from assets/js/config.js. */
const app = initializeApp(window.BOG.config.firebase);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;

function esc(s){ return window.BOG.config.esc(String(s==null?'':s)); }

onAuthStateChanged(auth, async function(user){
  if (user) {
    currentUser = user;
    window.BOG.mountApp({ search: false });
    loadDevices();
  } else { window.location.href = '/auth/login.html'; }
});

async function loadDevices(){
  var list = document.getElementById('devicesList');
  var empty = document.getElementById('devicesEmpty');
  var count = document.getElementById('devicesCount');
  if (!list) return;
  list.textContent = '';
  try{
    var snap = await getDocs(query(collection(db, "devices"), where("uid", "==", currentUser.uid)));
    var docs = [];
    snap.forEach(function(d){ docs.push(d.data()); });
    if (!docs.length){
      if (empty) empty.classList.remove('is-hidden');
      if (count) count.textContent = '0 devices';
      return;
    }
    if (empty) empty.classList.add('is-hidden');
    if (count) count.textContent = docs.length + ' device' + (docs.length===1?'':'s');
    var frag = document.createDocumentFragment();
    docs.forEach(function(data){
      var name = data.name || data.device || data.userAgent || 'Unknown device';
      var last = data.lastSeen || data.updatedAt || data.createdAt;
      var row = document.createElement('div');
      row.className = 'entry';
      row.setAttribute('role','listitem');
      var icon = document.createElement('div'); icon.className='entry__icon'; icon.setAttribute('aria-hidden','true');
      icon.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v12H3V4zm2 2v8h14V6H5zm4 12h6v2H9v-2z"/></svg>';
      var body = document.createElement('div'); body.className='entry__body';
      var n = document.createElement('div'); n.className='entry__name'; n.textContent = name;
      var m = document.createElement('div'); m.className='entry__meta'; m.textContent = last ? window.BOG.config.relative(last) : '';
      body.appendChild(n); body.appendChild(m);
      row.appendChild(icon); row.appendChild(body);
      frag.appendChild(row);
    });
    list.appendChild(frag);
  }catch(e){
    var alertEl = document.getElementById('alert'); if(alertEl) window.BOG.alert(alertEl, e.message, 'error');
  }
}
