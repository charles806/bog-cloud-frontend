import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

/* Config comes from assets/js/config.js. */
const app = initializeApp(window.BOG.config.firebase);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;

function wire() {
  window.BOG.mountApp({ search: false });
  document.querySelectorAll('.plan').forEach(function(card){
    var btn = card.querySelector('.plan-select');
    if (btn) btn.addEventListener('click', function(){ selectPlan(card, card.getAttribute('data-plan'), Number(card.getAttribute('data-price'))); });
  });
}

window.selectPlan = async function(element, plan, price) {
  if(!currentUser) return;
  document.querySelectorAll('.plan').forEach(function(p){
    p.classList.remove('plan--current');
    var btn = p.querySelector('button');
    if (btn) { btn.className = 'btn btn--ghost plan-select'; btn.textContent = 'Upgrade'; }
  });
  element.classList.add('plan--current');
  var btn = element.querySelector('button');
  if (btn) { btn.className = 'btn btn--primary plan-select'; btn.textContent = 'Selected'; }
  var sum = document.getElementById('summaryText');
  if (sum) sum.textContent = plan + ' - \u20A6' + price.toLocaleString('en-NG') + '/month';
  try{
    await addDoc(collection(db, "billing"), { uid: currentUser.uid, plan: plan, price: price, currency: "NGN", upgradedAt: serverTimestamp() });
  }catch(e){}
};

onAuthStateChanged(auth, async function(user){
  if (user) {
    currentUser = user;
    wire();
    // storage calc
    try{
      var filesSnap = await getDocs(query(collection(db, "files"), where("uid", "==", user.uid)));
      var totalSize = 0; filesSnap.forEach(function(d){ totalSize += d.data().size || 0; });
      var gb = (totalSize / 1024 / 1024 / 1024).toFixed(2);
      var su = document.getElementById('storageUsed'); if (su) su.textContent = gb + ' GB';
      var bar = document.getElementById('storageBar'); if (bar) { bar.style.width = Math.min((gb / 50 * 100), 100) + '%'; bar.setAttribute('aria-valuenow', String(Math.round(gb/50*100))); }
    }catch(e){}
  } else { window.location.href = '/auth/login'; }
});
