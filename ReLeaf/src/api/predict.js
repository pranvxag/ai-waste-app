import { API_BASE_URL } from "./config";

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

  const response = await fetch(`${API_BASE_URL}/predict`, {
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
