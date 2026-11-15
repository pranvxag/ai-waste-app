import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { auth, db, firebaseProjectId, firestoreDatabaseId } from "../firebase";
import { logger } from "../utils/logging";

function requireAuthenticatedUid(uid) {
  const currentUid = auth?.currentUser?.uid;
  logger.debug("Firestore", "Authenticated request", {
    project: firebaseProjectId || "(missing)",
    database: firestoreDatabaseId,
  });
  if (!currentUid || currentUid !== uid) {
    throw new Error("Firestore request requires the currently authenticated user.");
  }
  if (!db) throw new Error("Firestore is not configured.");
}

export async function getUserProfile(uid) {
  requireAuthenticatedUid(uid);
  logger.debug("Firestore", "Get user profile");
  return getDoc(doc(db, "users", uid));
}

export async function createUserProfile(uid, profile) {
  requireAuthenticatedUid(uid);
  logger.debug("Firestore", "Set user profile");
  return setDoc(doc(db, "users", uid), profile, { merge: true });
}

export function getScanHistory(uid, onData, onError) {
  requireAuthenticatedUid(uid);
  logger.info("Firestore", "Listening for scan history");
  const scansQuery = query(
    collection(db, "users", uid, "scans"),
    orderBy("scannedAt", "desc")
  );
  return onSnapshot(scansQuery, onData, onError);
}

export async function saveScan(uid, scanId, scan) {
  requireAuthenticatedUid(uid);
  logger.info("Firestore", "Saving scan", { scanId });
  return setDoc(doc(db, "users", uid, "scans", scanId), {
    scanId,
    ...scan,
    scannedAt: serverTimestamp(),
  });
}

export async function deleteScan(uid, scanId) {
  requireAuthenticatedUid(uid);
  logger.info("Firestore", "Deleting scan", { scanId });
  return deleteDoc(doc(db, "users", uid, "scans", scanId));
}
