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

function requireAuthenticatedUid(uid) {
  const currentUid = auth?.currentUser?.uid;
  console.info("[Firestore] request", {
    project: firebaseProjectId || "(missing)",
    database: firestoreDatabaseId,
    authenticatedUid: currentUid || null,
    requestedUid: uid,
  });
  if (!currentUid || currentUid !== uid) {
    throw new Error("Firestore request requires the currently authenticated user.");
  }
  if (!db) throw new Error("Firestore is not configured.");
}

export async function getUserProfile(uid) {
  requireAuthenticatedUid(uid);
  const path = `users/${uid}`;
  console.info("[Firestore] get document", path);
  return getDoc(doc(db, "users", uid));
}

export async function createUserProfile(uid, profile) {
  requireAuthenticatedUid(uid);
  const path = `users/${uid}`;
  console.info("[Firestore] set document", path);
  return setDoc(doc(db, "users", uid), profile, { merge: true });
}

export function getScanHistory(uid, onData, onError) {
  requireAuthenticatedUid(uid);
  const path = `users/${uid}/scans`;
  console.info("[Firestore] listen collection", path);
  const scansQuery = query(
    collection(db, "users", uid, "scans"),
    orderBy("scannedAt", "desc")
  );
  return onSnapshot(scansQuery, onData, onError);
}

export async function saveScan(uid, scanId, scan) {
  requireAuthenticatedUid(uid);
  const path = `users/${uid}/scans/${scanId}`;
  console.info("[Firestore] set document", path);
  return setDoc(doc(db, "users", uid, "scans", scanId), {
    scanId,
    ...scan,
    scannedAt: serverTimestamp(),
  });
}

export async function deleteScan(uid, scanId) {
  requireAuthenticatedUid(uid);
  const path = `users/${uid}/scans/${scanId}`;
  console.info("[Firestore] delete document", path);
  return deleteDoc(doc(db, "users", uid, "scans", scanId));
}
