import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signInWithCredential, signOut } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "../firebase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const signInWithGoogleToken = useCallback(async (idToken) => {
    if (!auth) throw new Error("Firebase is not configured.");
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    await setDoc(doc(db, "users", result.user.uid), {
      displayName: result.user.displayName || "",
      email: result.user.email || "",
      photoURL: result.user.photoURL || "",
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return result;
  }, []);

  const logOut = useCallback(async () => {
    if (auth) await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, configured: firebaseConfigured, signInWithGoogleToken, logOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
