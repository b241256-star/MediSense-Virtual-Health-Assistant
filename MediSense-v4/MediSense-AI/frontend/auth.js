/** 
 * AUTH.JS — MediSense AI Authentication Module
 * Uses centralized config from firebase-config.js
 */
// auth and db are already available from firebase-config.js


/** Get the currently logged-in user session */
function getSession() {
  try {
    return JSON.parse(localStorage.getItem('medisense_session') || 'null');
  } catch (e) {
    return null;
  }
}

/** Save the logged-in user to session */
function saveSession(user) {
  localStorage.setItem('medisense_session', JSON.stringify(user));
}

/** Clear session */
function clearSession() {
  localStorage.removeItem('medisense_session');
}

/** Get JWT Token */
function getToken() {
  const session = getSession();
  return session ? session.token : null;
}

// ===== FORM TAB SWITCHING =====
function switchTab(tab, btn) {
  document.querySelectorAll('.auth-tab').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.getElementById('tab-login').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('tab-register').style.display = tab === 'register' ? 'block' : 'none';
}

function switchTabManual(tab) {
  const btn = document.querySelector('.auth-tab-wrap .auth-tab:' + (tab === 'login' ? 'first-child' : 'last-child'));
  if (btn) switchTab(tab, btn);
}

// ===== PASSWORD SHOW/HIDE TOGGLE =====
function togglePass(inputId, icon) {
  const input = document.getElementById(inputId);
  input.type = input.type === 'password' ? 'text' : 'password';
  icon.classList.toggle('fa-eye');
  icon.classList.toggle('fa-eye-slash');
}

// ===== ERROR MESSAGES =====
function showErr(boxId, message) {
  const el = document.getElementById(boxId);
  if (!el) return;
  el.querySelector('span').textContent = message;
  el.style.display = 'flex';
  setTimeout(() => { el.style.display = 'none'; }, 4000);
}

// ===== LOGIN =====
async function doLogin() {
  const email = document.getElementById('li-email').value.trim().toLowerCase();
  const password = document.getElementById('li-pass').value;

  if (!email || !password) return showErr('login-err', 'Please enter your email and password.');

  try {
    const userCredential = await auth.signInWithEmailAndPassword(email, password);

    const doc = await db.collection("users").doc(userCredential.user.uid).get();
    const userData = doc.data();

    loginSuccess({
      ...userData,
      token: userCredential.user.uid
    });
  } catch (err) {
    showErr('login-err', err.message);
  }
}

// ===== REGISTER =====
async function doRegister() {
  const name = document.getElementById('re-name').value.trim();
  const email = document.getElementById('re-email').value.trim().toLowerCase();
  const password = document.getElementById('re-pass').value;
  const age = document.getElementById('re-age').value;
  const gender = document.getElementById('re-gender').value;

  if (!name || !email || !password) return showErr('reg-err', 'Please fill required fields.');
  if (password.length < 6) return showErr('reg-err', 'Password must be at least 6 characters.');

  try {

    const userCredential = await auth.createUserWithEmailAndPassword(email, password);

    await db.collection("users").doc(userCredential.user.uid).set({
      name, email, age, gender,
      createdAt: new Date()
    });

    loginSuccess({
      name, email, age, gender,
      token: userCredential.user.uid
    });

  } catch (err) {
    showErr('reg-err', err.message);
  }
}

async function doGoogleLogin() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await auth.signInWithPopup(provider);
    const user = result.user;

    // Check if user exists in Firestore
    const doc = await db.collection("users").doc(user.uid).get();
    let userData;

    if (!doc.exists) {
      // Create new user in Firestore
      userData = {
        name: user.displayName || 'No Name',
        email: user.email,
        age: '',
        gender: '',
        createdAt: new Date()
      };
      await db.collection("users").doc(user.uid).set(userData);
    } else {
      userData = doc.data();
    }

    loginSuccess({
      ...userData,
      token: user.uid
    });
  } catch (err) {
    showErr('login-err', err.message);
  }
}

// ===== LOGIN SUCCESS =====
function loginSuccess(user) {
  if (!window.App) window.App = {};
  App.user = user;
  saveSession(user);

  const initials = user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  document.getElementById('navAvatar').textContent = initials;
  document.getElementById('navName').textContent = user.name.split(' ')[0];
  document.getElementById('ddName').textContent = user.name;
  document.getElementById('ddEmail').textContent = user.email;

  if (user.age) {
    const ageEl = document.getElementById('patientAge');
    if (ageEl) ageEl.value = user.age;
  }
  if (user.gender) {
    const genEl = document.getElementById('patientGender');
    if (genEl) genEl.value = user.gender;
  }

  const authPage = document.getElementById('auth-page');
  authPage.classList.remove('active');
  authPage.style.display = 'none';
  document.getElementById('main-app').style.display = 'block';

  // We check if renderHospitals is defined because they might load in different order
  if (typeof renderHospitals === 'function') renderHospitals('all');
  if (typeof renderSymptomCategories === 'function') renderSymptomCategories();
  if (typeof showPage === 'function') showPage('home');
  if (typeof loadChatHistory === 'function') loadChatHistory();
}

// ===== LOGOUT =====
async function doLogout() {
  if (!confirm('Sign out of MediSense AI?')) return;
  try {
    await auth.signOut(); // This will trigger onAuthStateChanged(null)
    clearSession();
    App.user = null;
    if (App.convMsgs) App.convMsgs = [];
    if (App.chips) App.chips.clear();

    document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
    if (document.getElementById('chatMessages')) document.getElementById('chatMessages').innerHTML = '';

    document.getElementById('main-app').style.display = 'none';
    const authPage = document.getElementById('auth-page');
    authPage.style.display = 'flex';
    authPage.classList.add('active');
  } catch (err) {
    alert("Logout error: " + err.message);
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Use Firebase Auth Observer for better reliability
  auth.onAuthStateChanged(async (firebaseUser) => {
    if (firebaseUser) {
      // User is signed in. Fetch detailed profile from Firestore
      try {
        const doc = await db.collection("users").doc(firebaseUser.uid).get();
        if (doc.exists) {
          const userData = doc.data();
          loginSuccess({ ...userData, token: firebaseUser.uid });
        } else {
          // If no doc exists (fallback)
          loginSuccess({ name: firebaseUser.displayName || 'User', email: firebaseUser.email, token: firebaseUser.uid });
        }
      } catch (e) {
        console.error("Auth state error:", e);
      }
    } else {
      // User is signed out.
      clearSession();
      App.user = null;
      document.getElementById('main-app').style.display = 'none';
      const authPage = document.getElementById('auth-page');
      authPage.style.display = 'flex';
      authPage.classList.add('active');
    }
  });

  const bindEnter = (id, fn) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('keydown', e => { if (e.key === 'Enter') fn(); });
  };

  bindEnter('li-email', doLogin);
  bindEnter('li-pass', doLogin);
  bindEnter('re-name', doRegister);
  bindEnter('re-email', doRegister);
  bindEnter('re-pass', doRegister);
});
