import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* Config comes from assets/js/config.js. */
const app = initializeApp(window.BOG.config.firebase);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;

onAuthStateChanged(auth, async function(user){
  if (user) {
    currentUser = user;
    window.BOG.mountApp({ search: false });
    wire();
    loadSessions();
  } else { window.location.href = '/auth/login.html'; }
});

function wire(){
  var btn = document.getElementById('signOutOthersBtn');
  if (btn) btn.addEventListener('click', function(){
    window.BOG.confirm({ title:'Sign out other sessions?', body:'This will sign you out on all other devices. This cannot be undone.', confirmLabel:'Sign out others', danger:true }).then(function(ok){
      if(ok) signOutAllOthers();
    });
  });
}

async function signOutAllOthers(){
  // placeholder: original just showed alert; keep behaviour
  var alertEl = document.getElementById('alert'); if(alertEl) window.BOG.alert(alertEl, 'Other sessions signed out (mock).', 'success');
}
window.signOutAllOthers = signOutAllOthers;

async function loadSessions(){
  var list = document.getElementById('sessionsList');
  var empty = document.getElementById('sessionsEmpty');
  var count = document.getElementById('sessionsCount');
  if (!list) return;
  list.textContent = '';
  try{
    var snap = await getDocs(query(collection(db, "sessions"), where("uid", "==", currentUser.uid)));
    var docs = [];
    snap.forEach(function(d){ docs.push(d.data()); });
    if (!docs.length){
      if (empty) empty.classList.remove('is-hidden');
      if (count) count.textContent = '0 sessions';
      return;
    }
    if (empty) empty.classList.add('is-hidden');
    if (count) count.textContent = docs.length + ' session' + (docs.length===1?'':'s');
    var frag = document.createDocumentFragment();
    docs.forEach(function(data){
      var title = data.device || data.ip || 'Session';
      var when = data.createdAt || data.lastSeen || data.time;
      var item = document.createElement('div');
      item.className = 'timeline__item';
      item.setAttribute('role','listitem');
      var t = document.createElement('div'); t.className='timeline__title'; t.textContent = title;
      var m = document.createElement('div'); m.className='timeline__meta'; m.textContent = when ? window.BOG.config.relative(when) : '';
      var b = document.createElement('div'); b.className='timeline__body'; b.textContent = data.location || data.userAgent || '';
      item.appendChild(t); item.appendChild(m); if(b.textContent) item.appendChild(b);
      frag.appendChild(item);
    });
    list.appendChild(frag);
  }catch(e){
    var alertEl = document.getElementById('alert'); if(alertEl) window.BOG.alert(alertEl, e.message, 'error');
  }
}
