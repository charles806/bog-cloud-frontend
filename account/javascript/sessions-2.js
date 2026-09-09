import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {apiKey: "AIzaSyD7Ve_lk5waFwPNcQwHxM9DpYFkeEsQa74",authDomain: "bog-cloud.firebaseapp.com",projectId: "bog-cloud",storageBucket: "bog-cloud.appspot.com",messagingSenderId: "219071508992",appId: "1:219071508992:web:42516a44ed5d2f6a59dee5"};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let userLocation = "Getting location...";

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

function getBrowserName(userAgent){
  if(/Brave/i.test(userAgent)) return "Brave";
  if(/Edg/i.test(userAgent)) return "Edge";
  if(/Chrome/i.test(userAgent)) return "Chrome";
  if(/Firefox/i.test(userAgent)) return "Firefox";
  if(/Safari/i.test(userAgent)) return "Safari";
  return "Browser";
}

async function getLocation(){
  try{
    const res = await fetch('https://ipapi.co/json/');
    const data = await res.json();
    userLocation = `${data.city}, ${data.country_name}`;
  }catch(e){
    userLocation = "Lagos, Nigeria"; // fallback
  }
}

function showCurrentSession(){
  const sessionsList = document.getElementById('sessionsList');
  const now = new Date().toLocaleString(); // REAL TIME
  sessionsList.innerHTML = `
    <div class="session-item current-session">
      <div class="session-info">
        <div class="session-icon"><svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg></div>
        <div>
          <div class="session-name">Current Session</div>
          <div class="session-meta">${userLocation} • ${getBrowserName(navigator.userAgent)} • ${now}</div>
        </div>
      </div>
    </div>
  `;
}

async function loadSessionsFromFirebase(user){
  const sessionsSnap = await getDocs(query(collection(db, "sessions"), where("uid", "==", user.uid)));
  const sessionsList = document.getElementById('sessionsList');
  let html = sessionsList.innerHTML;
  const currentSessionId = sessionStorage.getItem('sessionId');

  sessionsSnap.forEach(d => {
    const data = d.data();
    if(data.sessionId!== currentSessionId){
      const time = data.timestamp? new Date(data.timestamp.seconds * 1000).toLocaleString() : 'Unknown';
      html += `
        <div class="session-item">
          <div class="session-info">
            <div class="session-icon"><svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/></svg></div>
            <div>
              <div class="session-name">${data.location || 'Unknown Location'}</div>
              <div class="session-meta">${data.browser || 'Browser'} • ${time}</div>
            </div>
          </div>
        </div>
      `;
    }
  });

  sessionsList.innerHTML = html;
}

window.signOutAllOthers = async () => {
  const currentSessionId = sessionStorage.getItem('sessionId');
  const sessionsSnap = await getDocs(query(collection(db, "sessions"), where("uid", "==", currentUser.uid)));
  sessionsSnap.forEach(d => {
    if(d.data().sessionId!== currentSessionId){
      deleteDoc(doc(db, "sessions", d.id));
    }
  });
  loadSessionsFromFirebase(currentUser);
}

async function registerSession(user){
  const sessionId = sessionStorage.getItem('sessionId') || Date.now().toString();
  sessionStorage.setItem('sessionId', sessionId);
  await addDoc(collection(db, "sessions"), {
    uid: user.uid,
    sessionId: sessionId,
    browser: getBrowserName(navigator.userAgent), // REAL BROWSER
    location: userLocation, // REAL LOCATION
    timestamp: serverTimestamp() // REAL TIME
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

    await getLocation(); // Get real location first
    showCurrentSession(); // Show with real browser + real time
    await registerSession(user);
    setTimeout(()=> loadSessionsFromFirebase(user), 1500);
  } else { window.location.href = '/auth/login.html'; }
});
