import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";
import { serverTimestamp } from "firebase/firestore";
import { auth, db, firebaseConfigured } from "../firebase";
import { createUserProfile, getUserProfile } from "../services/firestore";
import { logger } from "../utils/logging";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(firebaseConfigured);

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      try {
        if (!nextUser || !db) {
          setProfile(null);
          return;
        }

        const existing = await getUserProfile(nextUser.uid).catch((error) => {
          if (error.code !== "permission-denied" && error.code !== "not-found") throw error;
          return null;
        });
        const profileData = {
          uid: nextUser.uid,
          name: nextUser.displayName || nextUser.email?.split("@")[0] || "ReLeaf user",
          email: nextUser.email || "",
          photoURL: nextUser.photoURL || "",
          totalScans: existing?.exists() ? existing.data().totalScans || 0 : 0,
          totalPoints: existing?.exists() ? existing.data().totalPoints || 0 : 0,
          updatedAt: serverTimestamp(),
        };
        await createUserProfile(nextUser.uid, profileData);
        const refreshed = await getUserProfile(nextUser.uid);
        setProfile({ ...(refreshed.data() || {}), ...profileData });
      } catch (error) {
        logger.error("Auth", "Could not load Firebase user profile", { error });
      } finally {
        setLoading(false);
      }
    });
  }, []);

  const signInWithGoogleToken = useCallback(async (idToken) => {
    if (!auth) throw new Error("Firebase is not configured.");
    const credential = GoogleAuthProvider.credential(idToken);
    const result = await signInWithCredential(auth, credential);
    return result;
  }, []);

  const signInWithEmail = useCallback(async (email, password) => {
    if (!auth) throw new Error("Firebase is not configured.");
    return signInWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const registerWithEmail = useCallback(async (email, password) => {
    if (!auth) throw new Error("Firebase is not configured.");
    return createUserWithEmailAndPassword(auth, email.trim(), password);
  }, []);

  const logOut = useCallback(async () => {
    if (auth) await signOut(auth);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        configured: firebaseConfigured,
        signInWithGoogleToken,
        signInWithEmail,
        registerWithEmail,
        logOut,
      }}
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
