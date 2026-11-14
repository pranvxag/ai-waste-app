import AsyncStorage from "@react-native-async-storage/async-storage";

// Set EXPO_PUBLIC_API_BASE_URL for an EAS build, or save a URL from Settings.
// The fallback keeps local development explicit instead of silently targeting
// an old tunnel or deployment.
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || "http://localhost:8000";

const STORAGE_KEY = "api_base_url_v1";

// Resolves the backend URL any API call should actually use: whatever was
// saved from the Settings screen, or API_BASE_URL if nothing's saved yet.
// Any future API call (e.g. the /enhance-reuse endpoint) should read the
// base URL through this instead of importing API_BASE_URL directly.
export async function getApiBaseUrl() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    return saved && saved.trim() ? saved.trim() : API_BASE_URL;
  } catch {
    return API_BASE_URL;
  }
}

export async function setApiBaseUrl(url) {
  await AsyncStorage.setItem(STORAGE_KEY, url.trim());
}
