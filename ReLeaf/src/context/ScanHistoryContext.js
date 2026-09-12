import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BUCKET_META } from "../utils/formatting";

const STORAGE_KEY = "scan_history_v1";

const ScanHistoryContext = createContext(null);

export function ScanHistoryProvider({ children }) {
  const [scans, setScans] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) setScans(JSON.parse(value).scans || []);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return; // avoid overwriting stored value before it's loaded
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ scans }));
  }, [scans, loaded]);

  function addScan(scanData) {
    const entry = {
      id: `scan_${Date.now()}`,
      timestamp: Date.now(),
      ...scanData,
    };
    setScans((prev) => [entry, ...prev]);
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
