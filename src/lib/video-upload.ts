import { supabase } from "@/integrations/supabase/client";

/**
 * Envoie un fichier dans le stockage « videos » en suivant la progression.
 * (Le client standard ne fournit pas la progression, d'où l'envoi direct.)
 */
export async function uploadVideoWithProgress(
  path: string,
  file: Blob,
  contentType: string,
  onProgress: (percent: number) => void,
): Promise<void> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Session expirée : reconnectez-vous pour publier.");

  const baseUrl = import.meta.env["VITE_SUPABASE_URL"] as string;
  const apiKey = (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ??
    import.meta.env["VITE_SUPABASE_ANON_KEY"]) as string;
  if (!baseUrl || !apiKey) throw new Error("Configuration Supabase incomplète pour l'envoi vidéo.");
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${baseUrl}/storage/v1/object/videos/${encodedPath}`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.setRequestHeader("apikey", apiKey);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.setRequestHeader("cache-control", "3600");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(100);
        resolve();
        return;
      }
      let message = "L'envoi de la vidéo a échoué.";
      try {
        const body = JSON.parse(xhr.responseText) as { message?: string; statusCode?: string };
        if (body.statusCode === "413" || /size/i.test(body.message ?? "")) {
          message = "Vidéo trop lourde pour le stockage : 50 Mo maximum.";
        }
      } catch {
        // réponse non JSON : on garde le message générique
      }
      reject(new Error(message));
    };
    xhr.onerror = () => reject(new Error("Connexion interrompue pendant l'envoi. Réessayez."));
    xhr.send(file);
  });
}
