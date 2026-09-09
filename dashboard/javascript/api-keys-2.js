import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
const API_BASE = "https://api.bogcloud.com/v1"; // CHANGE THIS
let idToken = null; let keysData = [];

const firebaseConfig = {apiKey: "AIzaSyD7Ve_lk5waFwPNcQwHxM9DpYFkeEsQa74",authDomain: "bog-cloud.firebaseapp.com",projectId: "bog-cloud",storageBucket: "bog-cloud.appspot.com",messagingSenderId: "219071508992",appId: "1:219071508992:web:42516a44ed5d2f6a59dee5"};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

window.toggleSidebar = () => {document.getElementById('sidebar').classList.toggle('open');document.getElementById('overlay').classList.toggle('open');}
document.getElementById('themeToggle').onclick = () => { document.documentElement.classList.toggle('dark'); localStorage.setItem('bog-theme', document.documentElement.classList.contains('dark')? 'dark' : 'light'); document.getElementById('themeToggle').textContent = document.documentElement.classList.contains('dark')? 'Light' : 'Dark'; }
document.getElementById('themeToggle').textContent = document.documentElement.classList.contains('dark')? 'Light' : 'Dark';

window.copyKey = (btn, key) => { navigator.clipboard.writeText(key); btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy'; }, 2000); }
window.toggleKey = (id) => {
  const keyEl = document.getElementById(`key-${id}`); const btn = document.getElementById(`toggle-${id}`);
  const key = keysData.find(k => k.id === id).key;
  if(keyEl.textContent.includes('•')){ keyEl.textContent = key; btn.textContent = 'Hide'; }
  else { keyEl.textContent = `••••••••${key.slice(-4)}`; btn.textContent = 'Show'; }
}

async function apiFetch(url, options = {}){
  try{
    document.getElementById('genBtn').disabled = true;
    const res = await fetch(url, {...options, headers: {...options.headers, 'Authorization': `Bearer ${idToken}`}});
    if(!res.ok) throw new Error(await res.text());
    return await res.json();
  } catch(e){
    console.error("API Error:", e);
    document.getElementById('errorBox').innerHTML = `<div class="error-box"><b>Backend Error:</b> ${e.message}. Is your API running and CORS enabled?</div>`;
    document.getElementById('keysList').innerHTML = '<p style="color:var(--gray-700);">Failed to load keys.</p>';
  } finally { document.getElementById('genBtn').disabled = false; }
}

window.generateKey = async () => {
  const name = prompt("Name this API Key:"); if(!name) return;
  const data = await apiFetch(`${API_BASE}/keys`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name}) });
  if(data){ showKeyModal(data.key); loadKeys(); }
}
window.regenerateKey = async (id) => {
  if(!confirm("Regenerate? Old key will stop working.")) return;
  const data = await apiFetch(`${API_BASE}/keys/${id}/regenerate`, { method: 'POST' });
  if(data){ showKeyModal(data.key); loadKeys(); }
}
window.renameKey = async (id, oldName) => {
  const name = prompt("New name:", oldName); if(!name || name === oldName) return;
  const data = await apiFetch(`${API_BASE}/keys/${id}`, { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({name}) });
  if(data) loadKeys();
}
window.revokeKey = async (id) => {
  if(!confirm("Revoke this key?")) return;
  const data = await apiFetch(`${API_BASE}/keys/${id}`, { method: 'DELETE' });
  if(data) loadKeys();
}

function showKeyModal(key){
  const modal = document.createElement('div');
  modal.innerHTML = `<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:grid;place-items:center;z-index:999;">
    <div class="card" style="width:90%;max-width:500px;"><h3>Your New API Key</h3>
    <p style="color:var(--gray-700);margin:8px 0 16px 0;">Copy this key now. You won't be able to see it again.</p>
    <div class="key-value"><code style="word-break:break-all;">${key}</code><button class="btn-copy" onclick="copyKey(this, '${key}')">Copy</button></div>
    <button class="btn-primary" style="width:100%;margin-top:16px;" onclick="this.closest('div[style*=fixed]').remove();">Done</button></div></div>`;
  document.body.appendChild(modal);
}

async function loadKeys(){
  document.getElementById('keysList').innerHTML = '<div class="spinner"></div>';
  document.getElementById('errorBox').innerHTML = '';
  keysData = await apiFetch(`${API_BASE}/keys`) || [];
  let html = '';
  keysData.forEach(k => {
    html += `<div class="key-box"><div class="key-header"><b>${k.name}</b><div class="key-actions">
      <button class="btn-secondary" onclick="renameKey('${k.id}', '${k.name}')">Rename</button>
      <button class="btn-secondary" onclick="regenerateKey('${k.id}')">Regenerate</button>
      <button class="btn-danger" onclick="revokeKey('${k.id}')">Revoke</button></div></div>
      <div class="key-value"><span id="key-${k.id}">••••${k.key.slice(-4)}</span>
      <button id="toggle-${k.id}" class="btn-copy" onclick="toggleKey('${k.id}')">Show</button></div>
      <div style="font-size:12px;color:var(--gray-700);margin-top:8px;">
      Created: ${new Date(k.createdAt).toLocaleDateString()} • Last used: ${k.lastUsed? new Date(k.lastUsed).toLocaleDateString() : 'Never'}</div></div>`;
  });
  document.getElementById('keysList').innerHTML = html || '<p style="color:var(--gray-700);">No API keys yet.</p>';
}

onAuthStateChanged(auth, async (user) => {
  if(user){ idToken = await user.getIdToken(); document.getElementById('userAvatar').textContent = user.email[0].toUpperCase(); loadKeys(); }
  else window.location = '/auth/login.html';
});
