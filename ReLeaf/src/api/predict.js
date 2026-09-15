import { Platform } from "react-native";
import { File, UploadType } from "expo-file-system";
import { getApiBaseUrl } from "./config";

// Skips ngrok's free-tier "you're about to visit an ngrok site" browser
// warning interstitial, which otherwise intercepts requests that look like
// they're coming from a browser and returns an HTML page with no CORS
// headers instead of the real API response (breaks every fetch() call with
// a CORS error, even though the backend's own CORS setup is fine). Harmless
// to send this against a non-ngrok backend URL - it's just ignored.
const NGROK_HEADERS = { "ngrok-skip-browser-warning": "true" };

/**
 * Sends the photo at `imageUri` to the backend and returns the parsed JSON result:
 * { predicted_class, confidence, category, disposal }
 * Reuse ideas aren't included here - fetch them separately with getEnhancedIdeas().
 */
export async function identifyItem(imageUri) {
  const baseUrl = await getApiBaseUrl();

  if (Platform.OS === "web") {
    // React Native's { uri, name, type } shorthand only works with RN's own
    // FormData polyfill (iOS/Android). On web, FormData is the browser's
    // real implementation, which needs an actual Blob - passing a plain
    // object gets silently stringified into garbage, and the backend
    // rejects it with a 422 (looks fine in the UI, fails only on submit).
    const blob = await (await fetch(imageUri)).blob();
    const formData = new FormData();
    formData.append("file", blob, "photo.jpg");

    const response = await fetch(`${baseUrl}/predict`, {
      method: "POST",
      body: formData,
      // Do not set Content-Type manually - fetch sets the multipart boundary itself.
      headers: NGROK_HEADERS,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.detail || `Server returned ${response.status}`);
    }

    return response.json();
  }

  // On native, uploading via fetch()'s FormData with the classic
  // { uri, name, type } shorthand throws "Unsupported FormDataPart
  // implementation" under React Native's New Architecture (the JS FormData
  // part object doesn't survive the bridge to the native multipart
  // builder). expo-file-system's File.upload() hands the file straight to
  // native upload code by path, sidestepping that bridge entirely.
  const result = await new File(imageUri).upload(`${baseUrl}/predict`, {
    uploadType: UploadType.MULTIPART,
    fieldName: "file",
    mimeType: "image/jpeg",
    headers: NGROK_HEADERS,
  });

  let body;
  try {
    body = JSON.parse(result.body);
  } catch {
    body = {};
  }

  if (result.status < 200 || result.status >= 300) {
    throw new Error(body.detail || `Server returned ${result.status}`);
  }

  return body;
}

/**
 * Asks the backend for AI-generated reuse ideas for an already-identified
 * item - this is the ONLY source of reuse ideas in the app, used for both
 * the initial "Reuse ideas" batch and each "More ideas" request. Each
 * optionally carries a real YouTube tutorial link. Returns the ai_ideas
 * array, e.g.:
 * [{ idea: string, video: { video_id, title, url, thumbnail_url } | null }, ...]
 *
 * `exclude` is the list of idea strings already shown for this item - pass
 * everything currently displayed (both sections) when asking for more, so
 * the backend/model avoids repeating them.
 */
export async function getEnhancedIdeas(predictedClass, category, exclude = []) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/enhance-reuse`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...NGROK_HEADERS },
    body: JSON.stringify({ predicted_class: predictedClass, category, exclude }),
  });

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }

  const data = await response.json();
  return data.ai_ideas || [];
}

/**
 * Looks up category + disposal info for an already-known material class - no
 * photo needed. Used by the "Try scanning these" example objects, so
 * clicking one returns the exact same backend data (via get_waste_info())
 * that a real scan of that material would produce. Reuse ideas for the
 * result are fetched separately via getEnhancedIdeas(), same as any real scan.
 * Returns { predicted_class, category, disposal }.
 */
export async function getWasteInfo(predictedClass) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/waste-info/${encodeURIComponent(predictedClass)}`, {
    headers: NGROK_HEADERS,
  });

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }

  return response.json();
}
