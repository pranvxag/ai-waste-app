import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { BUCKET_META } from "../utils/formatting";
import { db } from "../firebase";
import { deleteScanImage, uploadScanImage } from "../services/scanStorage";
import { deleteScan, getScanHistory, saveScan } from "../services/firestore";
import { useAuth } from "./AuthContext";
import { createScanId, logger } from "../utils/logging";

const STORAGE_KEY = "scan_history_v1";
const ScanHistoryContext = createContext(null);
const pendingScanSaves = new Map();
const completedScanIds = new Set();

function normalizeScan(scanDoc) {
  const data = scanDoc.data ? scanDoc.data() : scanDoc;
  const scannedAt = data.scannedAt?.toMillis?.() || data.scannedAt || Date.now();
  const scanId = data.scanId || data.id || scanDoc.id;
  if (!scanId) return null;
  return {
    id: scanId,
    scanId,
    timestamp: scannedAt,
    imageUri: data.imageURL || data.imageUri || null,
    predictedClass: data.wasteType || data.predictedClass || "",
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

function mergeScans(primary, secondary = []) {
  const byId = new Map();
  [...primary, ...secondary].forEach((scan) => {
    const normalized = normalizeScan(scan);
    if (normalized && !byId.has(normalized.scanId)) byId.set(normalized.scanId, normalized);
  });
  return [...byId.values()].sort((a, b) => b.timestamp - a.timestamp);
}

export function ScanHistoryProvider({ children }) {
  const [scans, setScans] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const remoteHistoryLoaded = useRef(false);
  const { user } = useAuth();

  useEffect(() => {
    let active = true;
    if (!user?.uid || !db) {
      remoteHistoryLoaded.current = false;
      setScans([]);
      setLoaded(true);
      return undefined;
    }
    remoteHistoryLoaded.current = false;
    const cacheKey = `${STORAGE_KEY}_${user.uid}`;
    AsyncStorage.getItem(cacheKey)
      .then((value) => {
        if (active && value) {
          const cachedScans = JSON.parse(value).scans || [];
          setScans((previous) => remoteHistoryLoaded.current
            ? previous
            : mergeScans(cachedScans, previous));
        }
      })
      .catch((error) => logger.error("ScanHistory", "Could not load local scan history", { error }));

    const unsubscribe = getScanHistory(
      user.uid,
      (snapshot) => {
        if (!active) return;
        remoteHistoryLoaded.current = true;
        const remoteScans = snapshot.docs.map(normalizeScan).filter(Boolean);
        setScans((previous) => mergeScans(
          remoteScans,
          previous.filter((scan) => pendingScanSaves.has(scan.scanId))
        ));
        setLoaded(true);
      },
      (error) => {
        logger.error("ScanHistory", "Could not sync scan history", { error });
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
      .catch((error) => logger.error("ScanHistory", "Could not cache scan history", { error }));
  }, [scans, loaded, user?.uid]);

  async function addScan(scanData, onProgress) {
    const scanId = scanData.scanId || createScanId();
    if (completedScanIds.has(scanId)) return scanId;
    if (pendingScanSaves.has(scanId)) return pendingScanSaves.get(scanId);

    const savePromise = (async () => {
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
        completedScanIds.add(scanId);
        setScans((previous) => mergeScans([
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
        ], previous));
        logger.info("ScanHistory", "Scan saved", { scanId });
        return scanId;
      } catch (error) {
        if (uploaded) {
          await deleteScanImage(uploaded.storagePath).catch((cleanupError) => {
            logger.error("ScanHistory", "Could not clean up failed scan upload", { scanId, error: cleanupError });
          });
        }
        throw error;
      }
    })();

    pendingScanSaves.set(scanId, savePromise);
    try {
      return await savePromise;
    } finally {
      if (pendingScanSaves.get(scanId) === savePromise) pendingScanSaves.delete(scanId);
    }
  }

  async function removeScan(scan) {
    const scanId = scan.scanId || scan.id;
    await deleteScan(user.uid, scanId);
    if (scan.storagePath) await deleteScanImage(scan.storagePath);
    setScans((previous) => previous.filter((item) => item.scanId !== scanId));
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
