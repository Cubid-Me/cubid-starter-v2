// firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyDAukBd-jcZNAhxiE29V6mTlnG6g8NkVv4",
    authDomain: "cubid-starter.firebaseapp.com",
    projectId: "cubid-starter",
    storageBucket: "cubid-starter.appspot.com",
    messagingSenderId: "478896723113",
    appId: "1:478896723113:web:efeff9aa183a36d583c5b8",
    measurementId: "G-ZKCT4T5ET1"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
