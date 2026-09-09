import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD7Ve_lk5waFwPNcQwHxM9DpYFkeEsQa74",
  authDomain: "bog-cloud.firebaseapp.com",
  projectId: "bog-cloud",
  storageBucket: "bog-cloud.appspot.com",
  messagingSenderId: "219071508992",
  appId: "1:219071508992:web:42516a44ed5d2f6a59dee5"
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
let currentUser = null;
let editingId = null;

const icons = {
  edit: `<svg viewBox="0 0 24 24"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`,
  delete: `<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>`,
  eye: `<svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>`,
  eyeOff: `<svg viewBox="0 0 24 24"><path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/></svg>`
};

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadVault();
  } else { window.location.href = '/auth/login.html'; }
});

window.openModal = (id = null, data = {}) => {
  editingId = id;
  document.getElementById('modalTitle').textContent = id ? 'Edit Password' : 'Add New Password';
  document.getElementById('siteInput').value = data.site || '';
  document.getElementById('emailInput').value = data.email || '';
  document.getElementById('passwordInput').value = data.password || '';
  document.getElementById('vaultModal').classList.add('open');
}
window.closeModal = () => document.getElementById('vaultModal').classList.remove('open');

window.savePassword = async () => {
  const site = document.getElementById('siteInput').value;
  const email = document.getElementById('emailInput').value;
  const password = document.getElementById('passwordInput').value;
  if(!site || !email || !password) return alert("Fill all fields");
  
  if(editingId){
    await updateDoc(doc(db, "vault", editingId), {site, email, password});
  } else {
    await addDoc(collection(db, "vault"), {userId: currentUser.uid, site, email, password, createdAt: serverTimestamp()});
  }
  closeModal();
  loadVault();
}

window.deletePassword = async (id) => {
  if(confirm("Delete this password?")){
    await deleteDoc(doc(db, "vault", id));
    loadVault();
  }
}

window.togglePassword = (id) => {
  const input = document.getElementById('pass-' + id);
  const btn = document.getElementById('eye-' + id);
  if(input.type === 'password'){
    input.type = 'text';
    btn.innerHTML = icons.eyeOff;
  } else {
    input.type = 'password';
    btn.innerHTML = icons.eye;
  }
}

async function loadVault(){
  const q = query(collection(db, "vault"), where("userId", "==", currentUser.uid));
  const snapshot = await getDocs(q);
  const list = document.getElementById('vaultList');
  list.innerHTML = '';
  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    list.innerHTML += `
      <div class="vault-card">
        <div class="vault-info">
          <div class="site">${data.site}</div>
          <div class="email">${data.email}</div>
          <div class="password-field">
            <input type="password" id="pass-${docSnap.id}" value="${data.password}" readonly>
            <button class="btn-icon" id="eye-${docSnap.id}" onclick="togglePassword('${docSnap.id}')">${icons.eye}</button>
          </div>
        </div>
        <div class="vault-actions">
          <button class="btn-icon" onclick='openModal("${docSnap.id}", ${JSON.stringify(data)})'>${icons.edit}</button>
          <button class="btn-icon delete" onclick="deletePassword('${docSnap.id}')">${icons.delete}</button>
        </div>
      </div>
    `;
  });
}
