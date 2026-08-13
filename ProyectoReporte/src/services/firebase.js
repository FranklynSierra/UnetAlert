
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth,GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAE1OaexdKhJuHUu14I5yHnd_WoJMVa27A",
  authDomain: "universidad-e12a2.firebaseapp.com",
  projectId: "universidad-e12a2",
  storageBucket: "universidad-e12a2.firebasestorage.app",
  messagingSenderId: "224678477034",
  appId: "1:224678477034:web:61210d159358cf2a802b93",
  measurementId: "G-DFG7BQMDDD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
// Inicializar y exportar los servicios para usarlos en tu app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider=new GoogleAuthProvider()

export default app;