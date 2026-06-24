import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp, updateDoc,
} from 'firebase/firestore';
import { db } from '../firebase';

export function usePois() {
  const [pois, setPois] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pois'), (snap) => {
      setPois(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return unsub;
  }, []);

  const addPoi = (data) =>
    addDoc(collection(db, 'pois'), { ...data, createdAt: serverTimestamp() });

  const deletePoi = (id) => deleteDoc(doc(db, 'pois', id));

  const updatePoi = (id, data) => updateDoc(doc(db, 'pois', id), data);

  return { pois, loading, addPoi, deletePoi, updatePoi };
}
