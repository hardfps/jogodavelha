const firebaseConfig = {
  apiKey: "AIzaSyDcH52wSoBgysIpSB-JdpRro7Mv1dTXI_A",
  authDomain: "jogo-da-velha-f8447.firebaseapp.com",
  databaseURL: "https://jogo-da-velha-f8447-default-rtdb.firebaseio.com",
  projectId: "jogo-da-velha-f8447",
  storageBucket: "jogo-da-velha-f8447.firebasestorage.app",
  messagingSenderId: "396268611844",
  appId: "1:396268611844:web:499caaeb22bcd9dbfa4851"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
