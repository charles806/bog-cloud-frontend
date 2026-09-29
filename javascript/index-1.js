// ===== BACKEND CONNECTION =====
const API_BASE = 'https://bog-cloud-backend.vercel.app';

async function bogAPI(endpoint, method='GET', body=null) {
  const token = localStorage.getItem('bog_token');
  const res = await fetch(API_BASE + endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    },
    body: body ? JSON.stringify(body) : null
  });
  return res.json();
}

// Mobile menu + Check login state
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if(hamburger){hamburger.onclick = () => mobileMenu.classList.toggle('open');}
  document.querySelectorAll('.mobile-menu a').forEach(link => {link.onclick = () => mobileMenu.classList.remove('open');});

  if(localStorage.getItem('bog_token')){
    document.getElementById('navRight').innerHTML = `<a href="dashboard.html" class="btn-brand">Dashboard</a>`;
  }
});
