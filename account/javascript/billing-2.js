import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {apiKey: "AIzaSyD7Ve_lk5waFwPNcQwHxM9DpYFkeEsQa74",authDomain: "bog-cloud.firebaseapp.com",projectId: "bog-cloud",storageBucket: "bog-cloud.appspot.com",messagingSenderId: "219071508992",appId: "1:219071508992:web:42516a44ed5d2f6a59dee5"};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;

// DARK MODE
function updateThemeButton(){
  const isDark = document.documentElement.classList.contains('dark');
  document.getElementById('themeToggle').textContent = isDark? 'Light' : 'Dark';
}
function toggleTheme(){
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('bog-theme', document.documentElement.classList.contains('dark')? 'dark' : 'light');
  updateThemeButton();
}
document.getElementById('themeToggle').onclick = toggleTheme;
updateThemeButton();

function toggleSidebar() {document.getElementById('sidebar').classList.toggle('open');document.getElementById('overlay').classList.toggle('open');if(window.innerWidth > 1024){document.getElementById('main').classList.toggle('shifted');}}
window.toggleSidebar = toggleSidebar;
window.toggleAccountMenu = () => {document.getElementById('accountMenu').classList.toggle('open');}
window.logout = async () => { await signOut(auth); window.location.href = '/auth/login.html'; }

window.selectPlan = async (element, plan, price) => {
  if(!currentUser) return;

  document.querySelectorAll('.plan').forEach(p => {
    p.classList.remove('selected');
    const btn = p.querySelector('button');
    btn.className = 'btn-text';
    btn.textContent = 'Upgrade';
  });

  element.classList.add('selected');
  const btn = element.querySelector('button');
  btn.className = 'btn-primary';
  btn.textContent = 'Selected';

  // SHOW SUMMARY UNDERNEATH
  document.getElementById('selectedSummary').classList.add('show');
  document.getElementById('summaryText').textContent = `${plan} - ₦${price.toLocaleString()}/month`;

  // SILENT SAVE
  await addDoc(collection(db, "billing"), {
    uid: currentUser.uid,
    plan: plan,
    price: price,
    currency: "NGN",
    upgradedAt: serverTimestamp()
  });
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    const firstName = user.displayName? user.displayName.split(' ')[0] : user.email.split('@')[0];
    const initial = firstName[0].toUpperCase();
    document.getElementById('userFirstName').textContent = firstName;
    document.getElementById('userAvatar').textContent = initial;
    document.getElementById('menuAvatar').textContent = initial;
    document.getElementById('menuUserName').textContent = user.displayName || firstName;
    document.getElementById('menuUserEmail').textContent = user.email;

    const filesSnap = await getDocs(query(collection(db, "files"), where("uid", "==", user.uid)));
    let totalSize = 0; filesSnap.forEach(d => totalSize += d.data().size || 0);
    const gb = (totalSize / 1024 / 1024 / 1024).toFixed(2);
    document.getElementById('storageUsed').textContent = gb + ' GB';
    document.getElementById('storageBar').style.width = Math.min((gb / 50 * 100), 100) + '%';
  } else { window.location.href = '/auth/login.html'; }
});
