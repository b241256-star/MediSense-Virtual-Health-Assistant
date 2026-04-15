// ============================================================
//  FIREBASE-CONFIG.JS — Central Firebase Configuration
//  Consolidated for MediSense AI (medisense-e8b58)
// ============================================================

const firebaseConfig = {
  apiKey: "AIzaSyBhuWpvYwzUgm4F7wEsE1ldLuyEzwM3Bz0",
  authDomain: "medisense-78e81.firebaseapp.com",
  projectId: "medisense-78e81",
  storageBucket: "medisense-78e81.firebasestorage.app",
  messagingSenderId: "594921048471",
  appId: "1:594921048471:web:a1d5dac85487b9f3f81cd2",
  measurementId: "G-BDC7FBVX8S"
};

// Initialize Firebase
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db   = firebase.firestore();
// const storage = firebase.storage(); // Add if needed later
