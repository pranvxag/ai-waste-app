import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "impact_stats_v1";

const ImpactContext = createContext(null);

export function ImpactProvider({ children }) {
  const [itemsScanned, setItemsScanned] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      if (value) setItemsScanned(JSON.parse(value).itemsScanned || 0);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (!loaded) return; // avoid overwriting stored value before it's loaded
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ itemsScanned }));
  }, [itemsScanned, loaded]);

  function recordScan() {
    setItemsScanned((n) => n + 1);
  }

  return (
    <ImpactContext.Provider value={{ itemsScanned, recordScan }}>
      {children}
    </ImpactContext.Provider>
  );
}

export function useImpact() {
  const ctx = useContext(ImpactContext);
  if (!ctx) throw new Error("useImpact must be used within an ImpactProvider");
  return ctx;
}
