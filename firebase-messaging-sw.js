importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBAInCbFZ1GJnfwIAEYb7bNMC22B_nfTw",
  authDomain: "al-tafylah-aqarat.firebaseapp.com",
  projectId: "al-tafylah-aqarat",
  storageBucket: "al-tafylah-aqarat.firebasestorage.app",
  messagingSenderId: "729805047644",
  appId: "1:729805047644:web:80eae6947f4bbd908ee399"
});

const messaging = firebase.messaging();
