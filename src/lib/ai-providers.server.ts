/** Outils partagés pour appeler les fournisseurs IA externes avec les clés du projet (serveur uniquement). */

/** Lit une clé de fournisseur ; message clair si elle n'est pas encore enregistrée. */
export function requireProviderKey(name: string, service: string): string {
  const key = process.env[name];
  if (!key) {
    throw new Error(`${service} n'est pas configuré : la clé ${name} n'est pas encore enregistrée.`);
  }
  return key;
}

/** Traduit une réponse d'erreur d'un fournisseur en message compréhensible, avec le détail renvoyé. */
export async function providerError(provider: string, response: Response): Promise<Error> {
  const raw = await response.text().catch(() => "");
  console.error(`[${provider}] ${response.status}: ${raw.slice(0, 800)}`);
  let detail = "";
  try {
    const body = JSON.parse(raw) as {
      error?: { message?: string } | string;
      detail?: string | { message?: string; msg?: string }[] | { message?: string };
      message?: string;
    };
    if (typeof body.error === "string") detail = body.error;
    else if (body.error?.message) detail = body.error.message;
    else if (typeof body.detail === "string") detail = body.detail;
    else if (Array.isArray(body.detail)) detail = body.detail[0]?.msg ?? body.detail[0]?.message ?? "";
    else if (body.detail && "message" in body.detail) detail = body.detail.message ?? "";
    else if (body.message) detail = body.message;
  } catch {
    detail = raw.slice(0, 200);
  }
  detail = detail.trim();

  switch (response.status) {
    case 401:
      return new Error(`Clé ${provider} refusée : vérifiez la clé enregistrée. ${detail}`.trim());
    case 402:
    case 403:
      return new Error(
        `${provider} a refusé la demande (solde ou droits de votre compte ${provider}). ${detail}`.trim(),
      );
    case 429:
      return new Error(`Trop de demandes envoyées à ${provider}. Patientez quelques secondes puis réessayez.`);
    case 400:
    case 422:
      return new Error(`Demande refusée par ${provider}. ${detail}`.trim());
    default:
      return new Error(`${provider} est momentanément indisponible (erreur ${response.status}). Réessayez plus tard.`);
  }
}

/** Encode des octets en base64 sans dépasser la pile (fichiers audio de plusieurs Mo). */
export function bytesToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
