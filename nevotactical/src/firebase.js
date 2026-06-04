import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBcCcXZj0ZG89uHiG7_xjpbw3NUYBY8EMQ",
  authDomain: "nevotactical.firebaseapp.com",
  projectId: "nevotactical",
  storageBucket: "nevotactical.firebasestorage.app",
  messagingSenderId: "649883475318",
  appId: "1:649883475318:web:1a329cdbfd5d488a80ae57",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
