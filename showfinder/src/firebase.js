import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  projectId: 'showfinder-il',
  appId: '1:991407670751:web:8168d695e775b7f729f06a',
  storageBucket: 'showfinder-il.firebasestorage.app',
  apiKey: 'AIzaSyBmuYnvaxiQZGujQ1TSJBUeguxX9tR-Z1w',
  authDomain: 'showfinder-il.firebaseapp.com',
  messagingSenderId: '991407670751',
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
