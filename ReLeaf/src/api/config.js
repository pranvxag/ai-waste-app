import AsyncStorage from "@react-native-async-storage/async-storage";

// This fallback is used until someone saves a custom URL from the Settings
// screen. API calls should use getApiBaseUrl() rather than importing this
// constant directly.
export const API_BASE_URL = "https://releaf.cloud.run";

const STORAGE_KEY = "api_base_url_v2";

// Resolves the backend URL any API call should actually use: whatever was
// saved from the Settings screen, or API_BASE_URL if nothing is saved yet.
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
