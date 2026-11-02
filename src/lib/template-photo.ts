import { supabase } from "@/integrations/supabase/client";

export const TEMPLATE_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const TEMPLATE_PHOTO_PICK_MAX = 15 * 1024 * 1024;
const MAX_SIDE = 1536;

/** Réduit la photo (1536 px max) et la convertit en JPEG pour l'envoyer rapidement et en toute légèreté. */
export async function prepareTemplatePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossible de préparer la photo.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.88));
  if (!blob) throw new Error("Impossible de préparer la photo.");
  return blob;
}

/** Envoie la photo dans l'espace privé de l'utilisateur ; le serveur la supprime après la création. */
export async function uploadTemplatePhoto(userId: string, file: File): Promise<string> {
  const blob = await prepareTemplatePhoto(file);
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  const path = `${userId}/input-${Date.now()}-${rand}.jpg`;
  const { error } = await supabase.storage.from("ai-images").upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) {
    console.error(error);
    throw new Error("L'envoi de la photo a échoué. Réessayez.");
  }
  return path;
}
