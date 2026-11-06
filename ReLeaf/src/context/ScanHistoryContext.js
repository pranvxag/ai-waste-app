import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BUCKET_META } from "../utils/formatting";
import { db } from "../firebase";
import { deleteScanImage, uploadScanImage } from "../services/scanStorage";
import { deleteScan, getScanHistory, saveScan } from "../services/firestore";
import { useAuth } from "./AuthContext";

const STORAGE_KEY = "scan_history_v1";
const ScanHistoryContext = createContext(null);

function normalizeScan(scanDoc) {
  const data = scanDoc.data ? scanDoc.data() : scanDoc;
  const scannedAt = data.scannedAt?.toMillis?.() || data.scannedAt || Date.now();
  return {
    id: data.scanId || scanDoc.id,
    scanId: data.scanId || scanDoc.id,
    timestamp: scannedAt,
    imageUri: data.imageURL || null,
    predictedClass: data.wasteType || "",
    confidence: data.confidence ?? null,
    material: data.material || "",
    recyclable: data.recyclable ?? null,
    category: data.category || "",
    disposal: data.disposalMethod || "",
    environmentalImpact: data.environmentalImpact || "",
    pointsEarned: data.pointsEarned || 0,
    storagePath: data.storagePath || "",
    source: data.detectionSource || "",
    bucket: data.bucket || "general",
    aiIdeas: data.aiIdeas || [],
  };
}

export function ScanHistoryProvider({ children }) {
  const [scans, setScans] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    if (!user?.uid || !db) {
      setScans([]);
      setLoaded(true);
      return undefined;
    }
    const cacheKey = `${STORAGE_KEY}_${user.uid}`;
    AsyncStorage.getItem(cacheKey)
      .then((value) => {
        if (active && value) setScans(JSON.parse(value).scans || []);
      })
      .catch((error) => console.error("Could not load local scan history", error));

    const unsubscribe = getScanHistory(
      user.uid,
      (snapshot) => {
        if (!active) return;
        setScans(snapshot.docs.map(normalizeScan));
        setLoaded(true);
      },
      (error) => {
        console.error("Could not sync scan history", error);
        if (active) setLoaded(true);
      }
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [user?.uid]);

  useEffect(() => {
    if (!loaded || !user?.uid) return;
    AsyncStorage.setItem(`${STORAGE_KEY}_${user.uid}`, JSON.stringify({ scans }))
      .catch((error) => console.error("Could not cache scan history", error));
  }, [scans, loaded, user?.uid]);

  async function addScan(scanData, onProgress) {
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    let uploaded = null;

    try {
      uploaded = await uploadScanImage(scanData.imageUri, user.uid, scanId, onProgress);
      await saveScan(user.uid, scanId, {
        wasteType: scanData.predictedClass || "",
        confidence: scanData.confidence ?? null,
        material: scanData.material || scanData.predictedClass || "",
        recyclable: scanData.recyclable ?? null,
        disposalMethod: scanData.disposal || "",
        environmentalImpact: scanData.environmentalImpact || "",
        pointsEarned: scanData.pointsEarned || 0,
        imageURL: uploaded.downloadURL,
        storagePath: uploaded.storagePath,
        detectionSource: scanData.source || "unknown",
        category: scanData.category || "",
        bucket: scanData.bucket || "general",
        aiIdeas: scanData.aiIdeas || [],
      });
      setScans((previous) => [
        normalizeScan({
          ...scanData,
          scanId,
          imageURL: uploaded.downloadURL,
          storagePath: uploaded.storagePath,
          scannedAt: Date.now(),
          wasteType: scanData.predictedClass,
          disposalMethod: scanData.disposal,
          detectionSource: scanData.source,
        }),
        ...previous,
      ]);
      return scanId;
    } catch (error) {
      if (uploaded) {
        await deleteScanImage(uploaded.storagePath).catch((cleanupError) => {
          console.error("Could not clean up failed scan upload", cleanupError);
        });
      }
      throw error;
    }
  }

  async function removeScan(scan) {
    await deleteScan(user.uid, scan.scanId || scan.id);
    if (scan.storagePath) await deleteScanImage(scan.storagePath);
    setScans((previous) => previous.filter((item) => item.id !== scan.id));
  }

  const totalScans = scans.length;
  const countsByBucket = Object.keys(BUCKET_META).reduce((counts, bucket) => {
    counts[bucket] = 0;
    return counts;
  }, {});
  scans.forEach((scan) => {
    if (scan.bucket in countsByBucket) countsByBucket[scan.bucket] += 1;
  });
  const totalPoints = scans.reduce((total, scan) => total + (scan.pointsEarned || 0), 0);

  return (
    <ScanHistoryContext.Provider value={{ scans, addScan, removeScan, totalScans, totalPoints, countsByBucket }}>
      {children}
    </ScanHistoryContext.Provider>
  );
}

export function useScanHistory() {
  const context = useContext(ScanHistoryContext);
  if (!context) throw new Error("useScanHistory must be used within a ScanHistoryProvider");
  return context;
}
