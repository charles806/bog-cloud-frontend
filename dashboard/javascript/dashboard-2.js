const API_BASE = 'https://bog-cloud-1.onrender.com';
let currentUser = null;

// 1. AUTH GUARD - Check token and get user from backend
async function checkAuth() {
  const token = localStorage.getItem('token');
  if(!token){
    window.location.href = '/auth/login.html';
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if(!res.ok) throw new Error('Not logged in');

    const data = await res.json();
    currentUser = data.user || data;

    const firstName = currentUser.name? currentUser.name.split(' ')[0] : currentUser.email.split('@')[0];
    const initial = firstName[0].toUpperCase();

    document.getElementById('userFirstName').textContent = firstName;
    document.getElementById('userName').textContent = firstName;
    document.getElementById('userAvatar').textContent = initial;
    document.getElementById('menuAvatar').textContent = initial;
    document.getElementById('menuUserName').textContent = currentUser.name || firstName;
    document.getElementById('menuUserEmail').textContent = currentUser.email;

    loadDashboardData();

  } catch(e) {
    console.error(e);
    alert('Session expired. Please login again.');
    localStorage.removeItem('token');
    window.location.href = '/auth/login.html';
  }
}

// 2. LOGOUT
window.logout = () => {
  localStorage.removeItem('token');
  window.location.href = '/index.html';
}

// 3. THEME + UI
function updateThemeButton(){
  const isDark = document.documentElement.classList.contains('dark');
  document.getElementById('themeToggle').textContent = isDark? 'Light' : 'Dark';
  document.getElementById('themeToggleSidebar').textContent = isDark? 'Light Mode' : 'Dark Mode';
}
function toggleTheme(){
  document.documentElement.classList.toggle('dark');
  localStorage.setItem('bog-theme', document.documentElement.classList.contains('dark')? 'dark' : 'light');
  updateThemeButton();
}
document.getElementById('themeToggle').onclick = toggleTheme;
document.getElementById('themeToggleSidebar').onclick = toggleTheme;
updateThemeButton();

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('open');
  if(window.innerWidth > 1024){
    document.getElementById('main').classList.toggle('shifted');
  }
}
window.toggleSidebar = toggleSidebar;

function toggleAccountMenu() {
  document.getElementById('accountMenu').classList.toggle('open');
}
window.toggleAccountMenu = toggleAccountMenu;

// 4. FILE UPLOAD TO BACKEND
document.getElementById('uploadBtn').onclick = () => document.getElementById('fileInput').click();
document.getElementById('fileInput').addEventListener('change', async (e) => {
  const files = e.target.files;
  const token = localStorage.getItem('token');
  if(!token || files.length === 0) return;

  const formData = new FormData();
  for(let file of files) formData.append('files', file);

  document.getElementById('progressWrap').style.display = 'block';
  document.getElementById('progressText').textContent = `Uploading ${files.length} file(s)...`;

  try {
    const res = await fetch(`${API_BASE}/api/v1/files/upload`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if(!res.ok) throw new Error('Upload failed');
    alert('Upload complete!');
  } catch(err) {
    alert(err.message);
  }
  document.getElementById('progressWrap').style.display = 'none';
  document.getElementById('fileInput').value = '';
  loadDashboardData();
});

async function loadDashboardData(){
  loadFiles();
  loadStats();
}

async function loadFiles(){
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/v1/files`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if(!res.ok) return;
  const files = await res.json();
  const tbody = document.getElementById('recentFiles');
  tbody.innerHTML = '';
  files.slice(0,10).forEach(data => {
    const sizeMB = (data.size / 1024 / 1024).toFixed(2) + ' MB';
    tbody.innerHTML += `<tr data-name="${data.name.toLowerCase()}">
      <td><a href="${data.url}" target="_blank" class="file-name"><svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6z"/></svg>${data.name}</a></td>
      <td>${sizeMB}</td>
      <td><button class="btn-delete" onclick="deleteFile('${data._id}')">Delete</button></td>
    </tr>`;
  });
}

document.getElementById('searchInput').addEventListener('keyup', (e) => {
  const searchTerm = e.target.value.toLowerCase();
  document.querySelectorAll('#recentFiles tr').forEach(row => {
    const fileName = row.getAttribute('data-name') || '';
    row.style.display = fileName.includes(searchTerm)? '' : 'none';
  });
});

window.deleteFile = async (id) => {
  if(!confirm('Delete this file?')) return;
  const token = localStorage.getItem('token');
  await fetch(`${API_BASE}/api/v1/files/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  loadDashboardData();
}

async function loadStats(){
  const token = localStorage.getItem('token');
  const res = await fetch(`${API_BASE}/api/v1/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if(!res.ok) return;
  const stats = await res.json();
  document.getElementById('storageUsed').textContent = stats.storageUsed || '0.00 GB';
  document.getElementById('vaultCount').textContent = stats.vaultCount || '0';
  document.getElementById('apiCallsCount').textContent = stats.apiCalls || '0';
  document.getElementById('trashCount').textContent = stats.trashCount || '0';
}

// START APP
checkAuth();
