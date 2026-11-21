import "server-only";
import { PHOTO_MAX_BYTES, PHOTO_TYPES } from "./schemas";

/** Checks the real file signature, not just the declared type. */
export async function readPhoto(file: File): Promise<{ bytes: Uint8Array; type: string } | "type" | "size"> {
  if (file.size > PHOTO_MAX_BYTES) return "size";
  if (!(PHOTO_TYPES as readonly string[]).includes(file.type)) return "type";
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sig = (...b: number[]) => b.every((v, i) => bytes[i] === v);
  const isJpeg = sig(0xff, 0xd8, 0xff);
  const isPng = sig(0x89, 0x50, 0x4e, 0x47);
  const isWebp = sig(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  const ok = (file.type === "image/jpeg" && isJpeg) || (file.type === "image/png" && isPng) || (file.type === "image/webp" && isWebp);
  return ok ? { bytes, type: file.type } : "type";
}
