// DIRECT CONNECTION - NO PROXY
const API_BASE = 'https://bog-cloud-1.onrender.com';

const form = document.getElementById('signupForm');
const errorDiv = document.getElementById('error');
const successDiv = document.getElementById('success');
const signupBtn = document.getElementById('signupBtn');

form.onsubmit = async (e) => {
  e.preventDefault();

  const firstName = document.getElementById('firstName').value.trim();
  const lastName = document.getElementById('lastName').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  errorDiv.style.display = 'none';
  successDiv.style.display = 'none';

  if(!firstName ||!lastName ||!email ||!password) {
    showError('Please fill all fields');
    return;
  }

  const strongPassword = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if(!strongPassword.test(password)) {
    showError('Password must be at least 8 characters and include:\n1 uppercase, 1 lowercase, 1 number, 1 special character');
    return;
  }

  signupBtn.disabled = true;
  signupBtn.textContent = 'Creating account...';

  try {
    const res = await fetch(API_BASE + '/api/v1/auth/register', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        email,
        password,
        firstName,
        lastName,
        accountType: "trial"
      })
    });

    const data = await res.json().catch(() => ({}));
    console.log("Backend Response:", res.status, data);

    if(res.ok){
      showSuccess('Account created successfully! Redirecting to login...');
      setTimeout(() => { window.location.href = 'login.html'; }, 2000);
    } else {
      const errorMessage = data.message || data.title || data.errors?.[0]?.description || 'Signup failed';
      showError(errorMessage);
    }
  } catch(err){
    showError('Cannot connect to server. CORS error? Backend needs to allow https://bog-cloud.vercel.app');
    console.error('Signup Error:', err);
  } finally {
    signupBtn.disabled = false;
    signupBtn.textContent = 'Sign up';
  }
}

function showError(message){
  errorDiv.textContent = message;
  errorDiv.style.display = 'block';
}
function showSuccess(message){
  successDiv.textContent = message;
  successDiv.style.display = 'block';
}
