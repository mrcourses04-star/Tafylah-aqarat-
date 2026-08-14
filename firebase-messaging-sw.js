importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBAInCbFZlGJNfwbIAEYb7bNMC22B_nfTw",
  authDomain: "al-tafylah-aqarat.firebaseapp.com",
  projectId: "al-tafylah-aqarat",
  storageBucket: "al-tafylah-aqarat.firebasestorage.app",
  messagingSenderId: "729805047644",
  appId: "1:729805047644:web:80eae6947f4bbd908ee399"
});

const messaging = firebase.messaging();
