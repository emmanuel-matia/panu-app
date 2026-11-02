import { supabase } from "@/integrations/supabase/client";

import { mediaStoragePath } from "./media-rules";

/**
 * Publie sur PANU une création IA déjà enregistrée (image ou audio) :
 * le fichier est copié dans l'espace des publications puis la publication est créée.
 */
export async function publishAiCreation(input: {
  userId: string;
  url: string;
  mime: string;
  kind: "image" | "audio";
  title: string;
  caption?: string | null;
}): Promise<string> {
  const title = input.title.trim().slice(0, 100) || "Création PANU IA";
  const file = await fetch(input.url);
  if (!file.ok) throw new Error("Création introuvable. Générez-la à nouveau.");
  const blob = await file.blob();
  const path = mediaStoragePath(input.userId, input.kind === "image" ? "images" : "audio", input.mime, Date.now());
  const upload = await supabase.storage.from("videos").upload(path, blob, { contentType: input.mime, upsert: false });
  if (upload.error) throw new Error("L'envoi de la création a échoué. Réessayez.");
  const { data, error } = await supabase
    .from("posts")
    .insert({
      author_id: input.userId,
      kind: input.kind,
      source: "ai",
      title,
      caption: input.caption?.trim() || null,
      video_path: path,
    })
    .select("id")
    .single();
  if (error || !data) {
    await supabase.storage.from("videos").remove([path]);
    throw new Error("La publication n'a pas pu être créée. Réessayez.");
  }
  return data.id;
}
