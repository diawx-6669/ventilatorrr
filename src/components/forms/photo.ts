"use client";
import { PHOTO_MAX_BYTES } from "@/lib/schemas";

/**
 * Re-encodes the photo through a canvas: shrinks it to a sane size and, as a side
 * effect, drops EXIF (GPS, phone model, time). For anonymous news that matters.
 */
export async function preparePhoto(file: File): Promise<File | "type" | "size"> {
  if (!file.type.startsWith("image/")) return "type";
  if (file.size > 25 * 1024 * 1024) return "size";
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return "type";
  }
  const max = 1600;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "type";
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.85));
  if (!blob) return "type";
  if (blob.size > PHOTO_MAX_BYTES) return "size";
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}
