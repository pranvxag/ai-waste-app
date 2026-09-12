import { getApiBaseUrl } from "./config";

/**
 * Sends the photo at `imageUri` to the backend and returns the parsed JSON result:
 * { predicted_class, confidence, category, disposal, reuse_ideas }
 */
export async function identifyItem(imageUri) {
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: "photo.jpg",
    type: "image/jpeg",
  });

  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/predict`, {
    method: "POST",
    body: formData,
    // Do not set Content-Type manually - fetch sets the multipart boundary itself.
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.detail || `Server returned ${response.status}`);
  }

  return response.json();
}

/**
 * Asks the backend's optional AI-enhancement layer for a few extra reuse
 * ideas (each possibly paired with a YouTube tutorial link) for an
 * already-identified item. Returns the ai_ideas array, e.g.:
 * [{ idea: string, video: { title, url, thumbnail } | null }, ...]
 */
export async function getEnhancedIdeas(predictedClass, category) {
  const baseUrl = await getApiBaseUrl();
  const response = await fetch(`${baseUrl}/enhance-reuse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ predicted_class: predictedClass, category }),
  });

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }

  const data = await response.json();
  return data.ai_ideas || [];
}
