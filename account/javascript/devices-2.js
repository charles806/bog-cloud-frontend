import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

function getDeviceIcon(userAgent){
  if(/Android/i.test(userAgent)) return `<svg viewBox="0 0 24 24"><path d="M17.5 2h-11C5.12 2 4 3.12 4 4.5v15C4 20.88 5.12 22 6.5 22h11c1.38 0 2.5-1.12 2.5-2.5v-15C20 3.12 18.88 2 17.5 2zM6.5 20c-.28 0-.5-.22-.5-.5v-15c0-.28.22-.5.5-.5h11c.28 0.5.22.5.5v15c0.28-.22.5-.5.5h-11z"/></svg>`;
  if(/iPhone|iPad/i.test(userAgent)) return `<svg viewBox="0 0 24 24"><path d="M17 2H7c-1.1 0-2-2 2v16c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM7 16.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM17 18H7V4h10v14z"/></svg>`;
  return `<svg viewBox="0 0 24 24"><path d="M20 18c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2H4c-1.1 0-2-2 2v10c0 1.1.9 2 2 2H0v2h24v-2h-4zM4 6h16v10H4V6z"/></svg>`;
}

function getDeviceName(userAgent){
  if(/Windows/i.test(userAgent)) return "Windows PC";
  if(/Macintosh/i.test(userAgent)) return "Mac";
  if(/Android/i.test(userAgent)) return "Android Device";
  if(/iPhone/i.test(userAgent)) return "iPhone";
  if(/iPad/i.test(userAgent)) return "iPad";
  return "Browser";
}

function showCurrentDevice(){
  const devicesList = document.getElementById('devicesList');
  devicesList.innerHTML = `
    <div class="device-item">
      <div class="device-info">
        <div class="device-icon">${getDeviceIcon(navigator.userAgent)}</div>
        <div>
          <div class="device-name">${getDeviceName(navigator.userAgent)} <span class="current-badge">This device</span></div>
          <div class="device-meta">Lagos, Nigeria • Active now</div>
        </div>
      </div>
      <span class="device-status">Active now</span>
    </div>
  `;
}

async function loadDevicesFromFirebase(user){
  const devicesSnap = await getDocs(query(collection(db, "devices"), where("uid", "==", user.uid)));
  const devicesList = document.getElementById('devicesList');
  let html = '';
  const currentSessionId = sessionStorage.getItem('sessionId');

  devicesSnap.forEach(d => {
    const data = d.data();
    const isCurrent = data.sessionId === currentSessionId;
    html += `
      <div class="device-item">
        <div class="device-info">
          <div class="device-icon">${getDeviceIcon(data.userAgent)}</div>
          <div>
            <div class="device-name">${data.deviceName} ${isCurrent? '<span class="current-badge">This device</span>' : ''}</div>
            <div class="device-meta">${data.location || 'Lagos, Nigeria'} • Last active: ${data.lastActive? new Date(data.lastActive.seconds * 1000).toLocaleString() : 'Just now'}</div>
          </div>
        </div>
        ${!isCurrent? `<button class="btn-danger" onclick="signOutDevice('${d.id}')">Sign out</button>` : '<span class="device-status">Active now</span>'}
      </div>
    `;
  });

  if(html) devicesList.innerHTML = html;
}

window.signOutDevice = async (deviceId) => {
  if(confirm('Sign out this device?')){
    await deleteDoc(doc(db, "devices", deviceId));
    loadDevicesFromFirebase(currentUser);
  }
}

async function registerDevice(user){
  const sessionId = Date.now().toString();
  sessionStorage.setItem('sessionId', sessionId);
  await addDoc(collection(db, "devices"), {
    uid: user.uid,
    deviceName: getDeviceName(navigator.userAgent),
    userAgent: navigator.userAgent,
    location: "Lagos, Nigeria",
    sessionId: sessionId,
    lastActive: serverTimestamp()
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

    showCurrentDevice();
    await registerDevice(user);
    setTimeout(()=> loadDevicesFromFirebase(user), 1500);
  } else { window.location.href = '/auth/login.html'; }
});
