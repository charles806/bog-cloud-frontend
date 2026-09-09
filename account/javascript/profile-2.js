import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut, updatePassword, updateProfile, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";

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

function showAlert(message, type){
  const box = document.getElementById('alertBox');
  box.textContent = message;
  box.className = `alert ${type}`;
  box.style.display = 'block';
  window.scrollTo(0,0);
  setTimeout(() => box.style.display = 'none', 5000);
}

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    const name = user.displayName || user.email.split('@')[0];
    const initial = name[0].toUpperCase();

    document.getElementById('profileAvatar').textContent = initial;
    document.getElementById('profileName').textContent = name;
    document.getElementById('profileEmail').textContent = user.email;
    document.getElementById('displayName').textContent = name;
    document.getElementById('displayEmail').textContent = user.email;
    document.getElementById('newNameInput').value = name;
  } else {
    window.location.href = '/auth/login.html';
  }
});

window.logout = async () => {
  await signOut(auth);
  window.location.href = '/index.html';
}

window.toggleNameForm = () => {
  document.getElementById('nameForm').classList.toggle('open');
}

window.saveName = async () => {
  const btn = document.getElementById('saveNameBtn');
  const newName = document.getElementById('newNameInput').value.trim();
  if(!newName) { showAlert("Name cannot be empty", "error"); return; }

  btn.disabled = true; btn.textContent = "Saving...";
  try{
    await updateProfile(currentUser, { displayName: newName });
    showAlert("Name updated successfully!", "success");
    toggleNameForm();
    document.getElementById('profileName').textContent = newName;
    document.getElementById('displayName').textContent = newName;
    document.getElementById('profileAvatar').textContent = newName[0].toUpperCase();
  } catch(error){
    showAlert("Error: " + error.message, "error");
  }
  btn.disabled = false; btn.textContent = "Save Name";
}

window.togglePasswordForm = () => {
  document.getElementById('passwordForm').classList.toggle('open');
  document.getElementById('currentPassword').value = '';
  document.getElementById('newPassword').value = '';
  document.getElementById('confirmPassword').value = '';
}

window.savePassword = async () => {
  const btn = document.getElementById('updatePassBtn');
  const currentPass = document.getElementById('currentPassword').value;
  const newPass = document.getElementById('newPassword').value;
  const confirmPass = document.getElementById('confirmPassword').value;

  if(!currentPass){ showAlert("Please enter current password", "error"); return; }
  if(!newPass || newPass.length < 6){
    showAlert("New password must be at least 6 characters", "error");
    return;
  }
  if(newPass!== confirmPass){
    showAlert("New passwords do not match", "error");
    return;
  }

  btn.disabled = true; btn.textContent = "Updating...";
  try{
    const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPass);
    showAlert("Password updated successfully!", "success");
    togglePasswordForm();
  } catch(error){
    if(error.code === 'auth/wrong-password'){
      showAlert("Current password is incorrect", "error");
    } else {
      showAlert("Error: " + error.message, "error");
    }
  }
  btn.disabled = false; btn.textContent = "Update Password";
}
