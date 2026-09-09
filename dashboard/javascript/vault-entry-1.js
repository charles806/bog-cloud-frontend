import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, addDoc, getDoc, updateDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";
const app = initializeApp({apiKey:"AIzaSyD7Ve_lk5waFwPNcQwHxM9DpYFkeEsQa74",authDomain:"bog-cloud.firebaseapp.com",projectId:"bog-cloud",storageBucket:"bog-cloud.firebasestorage.app",messagingSenderId:"219071508992",appId:"1:219071508992:web:42516a44ed5d2f6a59dee5"});
const auth = getAuth(app); const db = getFirestore(app);
const params = new URLSearchParams(window.location.search); const editId = params.get('id'); let currentUser = null;

onAuthStateChanged(auth, user => { if(user){ currentUser=user; if(editId) loadEntry(editId); } else window.location.href='/auth/login.html'; });

async function loadEntry(id){
  document.getElementById('formTitle').textContent = "Edit Vault Entry";
  const snap = await getDoc(doc(db,"vault",id));
  const data = snap.data();
  document.getElementById('type').value = data.type;
  document.getElementById('title').value = data.title;
  document.getElementById('username').value = data.username;
  document.getElementById('password').value = data.password;
  document.getElementById('url').value = data.url;
}

window.saveEntry = async () => {
  const data = {
    uid: currentUser.uid, type: type.value, title: title.value, username: username.value,
    password: password.value, url: url.value, updatedAt: serverTimestamp()
  };
  if(editId){ await updateDoc(doc(db,"vault",editId), data); }
  else { await addDoc(collection(db,"vault"), {...data, createdAt: serverTimestamp()}); }
  window.location.href = 'vault.html';
}
