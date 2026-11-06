import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "../firebase";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

function getImageType(blob) {
  const type = (blob.type || "image/jpeg").toLowerCase();
  return IMAGE_TYPES.has(type) ? (type === "image/jpg" ? "image/jpeg" : type) : null;
}

export async function uploadScanImage(imageUri, uid, scanId, onProgress) {
  if (!storage) throw new Error("Firebase Storage is not configured.");
  if (!imageUri) throw new Error("The scan image is unavailable.");

  const response = await fetch(imageUri);
  if (!response.ok) throw new Error("Could not read the scan image.");
  const blob = await response.blob();
  if (blob.size > MAX_IMAGE_BYTES) throw new Error("Images must be 10 MB or smaller.");

  const contentType = getImageType(blob);
  if (!contentType) throw new Error("Only JPEG, PNG, and WebP images are supported.");

  const extension = contentType.split("/")[1];
  const storagePath = `users/${uid}/scans/${scanId}.${extension}`;
  const upload = uploadBytesResumable(ref(storage, storagePath), blob, { contentType });

  await new Promise((resolve, reject) => {
    upload.on(
      "state_changed",
      (snapshot) => onProgress?.(snapshot.bytesTransferred / snapshot.totalBytes),
      reject,
      resolve
    );
  });

  return { downloadURL: await getDownloadURL(upload.snapshot.ref), storagePath };
}

export async function deleteScanImage(storagePath) {
  if (!storage || !storagePath) return;
  await deleteObject(ref(storage, storagePath));
}
