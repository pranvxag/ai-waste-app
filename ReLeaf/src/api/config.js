import AsyncStorage from "@react-native-async-storage/async-storage";

// UPDATE THIS to wherever your backend is reachable from your phone:
// - Same WiFi: "http://<your-laptop-local-ip>:8000"
// - ngrok tunnel: "https://xxxx.ngrok-free.app"
// - Deployed backend: your host's URL
// This is only the fallback used until someone saves a custom URL from the
// Settings screen - see getApiBaseUrl()/setApiBaseUrl() below. Prefer those
// over importing this constant directly anywhere a request is actually made.
export const API_BASE_URL = "http://192.168.1.5:8000";

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
