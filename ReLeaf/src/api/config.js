import AsyncStorage from "@react-native-async-storage/async-storage";

// Backend URL. Using the permanent ngrok static domain (works from any
// network, not just home WiFi) - start the tunnel with:
//   ngrok http --url=constant-attribute-showplace.ngrok-free.dev 8000
// (backend must also be running: uvicorn main:app --host 0.0.0.0 --port 8000)
// Other options if you ever need them:
// - Same WiFi, no tunnel: "http://<your-laptop-local-ip>:8000" (find it with
//   `ipconfig`, under your Wi-Fi adapter's "IPv4 Address")
// - Deployed backend: your host's URL
// This is only the fallback used until someone saves a custom URL from the
// Settings screen - see getApiBaseUrl()/setApiBaseUrl() below. Prefer those
// over importing this constant directly anywhere a request is actually made.
export const API_BASE_URL = "https://constant-attribute-showplace.ngrok-free.dev";

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
