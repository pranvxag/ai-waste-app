import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BUCKET_META } from "../utils/formatting";
import { collection, doc, onSnapshot, orderBy, query, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "scan_history_v1";

const ScanHistoryContext = createContext(null);

export function ScanHistoryProvider({ children }) {
  const [scans, setScans] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(`${STORAGE_KEY}_${user.uid}`).then((value) => {
      if (!active) return;
      if (value) setScans(JSON.parse(value).scans || []);
      setLoaded(true);
    }).catch((error) => {
      console.error("Could not load local scan history", error);
      setLoaded(true);
    });
    const scansQuery = query(collection(db, "users", user.uid, "scans"), orderBy("timestamp", "desc"));
    const unsubscribe = onSnapshot(scansQuery, (snapshot) => {
      const remoteScans = snapshot.docs.map((scanDoc) => ({ id: scanDoc.id, ...scanDoc.data() }));
      setScans(remoteScans);
      setLoaded(true);
    }, (error) => console.error("Could not sync scan history", error));
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user.uid]);

  useEffect(() => {
    if (!loaded) return; // avoid overwriting stored value before it's loaded
    AsyncStorage.setItem(`${STORAGE_KEY}_${user.uid}`, JSON.stringify({ scans }))
      .catch((error) => console.error("Could not cache scan history", error));
  }, [scans, loaded, user.uid]);

  function addScan(scanData) {
    const entry = {
      id: `scan_${Date.now()}`,
      timestamp: Date.now(),
      ...scanData,
    };
    setScans((prev) => [entry, ...prev]);
    setDoc(doc(db, "users", user.uid, "scans", entry.id), entry)
      .catch((error) => console.error("Could not save scan history", error));
  }

  const totalScans = scans.length;

  const countsByBucket = Object.keys(BUCKET_META).reduce((counts, bucket) => {
    counts[bucket] = 0;
    return counts;
  }, {});
  scans.forEach((scan) => {
    const bucket = scan.bucketMeta?.bucket;
    if (bucket && bucket in countsByBucket) countsByBucket[bucket] += 1;
  });

  return (
    <ScanHistoryContext.Provider value={{ scans, addScan, totalScans, countsByBucket }}>
      {children}
    </ScanHistoryContext.Provider>
  );
}

export function useScanHistory() {
  const ctx = useContext(ScanHistoryContext);
  if (!ctx) throw new Error("useScanHistory must be used within a ScanHistoryProvider");
  return ctx;
}
