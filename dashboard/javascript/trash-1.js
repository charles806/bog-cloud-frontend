import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { getFirestore, collection, getDocs, query, where, deleteDoc, doc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

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

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loadTrash();
  } else { window.location.href = '/auth/login.html'; }
});

async function loadTrash(){
  const q = query(collection(db, "trash"), where("uid", "==", currentUser.uid));
  const snapshot = await getDocs(q);
  const tbody = document.getElementById('trashList');
  tbody.innerHTML = '';
  
  if(snapshot.empty){
    document.getElementById('emptyState').style.display = 'block';
    return;
  }

  snapshot.forEach(docSnap => {
    const data = docSnap.data();
    const deletedDate = data.deletedAt?.toDate().toLocaleDateString() || 'N/A';
    tbody.innerHTML += `
      <tr>
        <td>${data.name}</td>
        <td>${deletedDate}</td>
        <td class="actions">
          <button class="btn btn-restore" onclick="restoreFile('${docSnap.id}', '${data.name}', '${data.url}', ${data.size})">Restore</button>
          <button class="btn btn-delete" onclick="deletePermanent('${docSnap.id}')">Delete</button>
        </td>
      </tr>
    `;
  });
}

window.restoreFile = async (id, name, url, size) => {
  await addDoc(collection(db, "files"), {uid: currentUser.uid, name, url, size, createdAt: serverTimestamp()});
  await deleteDoc(doc(db, "trash", id));
  loadTrash();
  alert("Restored to My Drive");
}

window.deletePermanent = async (id) => {
  if(confirm("Delete permanently?")){
    await deleteDoc(doc(db, "trash", id));
    loadTrash();
  }
}

window.emptyTrash = async () => {
  if(!confirm("Delete everything in trash?")) return;
  const q = query(collection(db, "trash"), where("uid", "==", currentUser.uid));
  const snapshot = await getDocs(q);
  snapshot.forEach(d => deleteDoc(doc(db, "trash", d.id)));
  loadTrash();
}
