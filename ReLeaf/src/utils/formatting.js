import { colors } from "../theme/theme";

// Maps each of the 12 model classes to a disposal "bucket" - drives color + icon
// consistently across the app. Keep in sync with backend/waste_data.py categories.
export const CATEGORY_BY_CLASS = {
  battery: "hazardous",
  biological: "compostable",
  "brown-glass": "recyclable",
  "green-glass": "recyclable",
  "white-glass": "recyclable",
  cardboard: "recyclable",
  metal: "recyclable",
  paper: "recyclable",
  plastic: "recyclable",
  clothes: "reuse",
  shoes: "reuse",
  trash: "general",
};

export const BUCKET_META = {
  recyclable: { label: "Recyclable", color: colors.recyclable, icon: "recycle" },
  compostable: { label: "Compostable", color: colors.compostable, icon: "leaf" },
  hazardous: { label: "Hazardous", color: colors.hazardous, icon: "alert-octagon" },
  reuse: { label: "Reuse first", color: colors.reuse, icon: "tshirt-crew" },
  general: { label: "General waste", color: colors.general, icon: "trash-can-outline" },
};

export function getBucketMeta(predictedClass) {
  const bucket = CATEGORY_BY_CLASS[predictedClass] || "general";
  return { bucket, ...BUCKET_META[bucket] };
}

// "brown-glass" -> "Brown glass", "cardboard" -> "Cardboard"
export function formatClassName(predictedClass) {
  if (!predictedClass) return "";
  const words = predictedClass.split("-").join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
