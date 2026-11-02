/** Outils partagés pour appeler les fournisseurs IA externes avec les clés du projet (serveur uniquement). */

/**
 * Lit une clé de fournisseur (premier nom renseigné parmi `names`) ;
 * message clair si aucune n'est enregistrée.
 */
export function requireProviderKey(names: string | string[], service: string): string {
  const list = Array.isArray(names) ? names : [names];
  for (const name of list) {
    const key = process.env[name]?.trim();
    if (key) return key;
  }
  throw new Error(`${service} n'est pas configuré : la clé ${list[0]} n'est pas encore enregistrée.`);
}

/** Clé facultative : `null` si elle n'est pas enregistrée (le fournisseur est alors ignoré). */
export function optionalKey(...names: string[]): string | null {
  for (const name of names) {
    const key = process.env[name]?.trim();
    if (key) return key;
  }
  return null;
}

/** Noms acceptés pour la clé Fal.ai (FAL_KEY est le nom officiel du fournisseur). */
export const FAL_KEY_NAMES = ["FAL_KEY", "FAL_API_KEY"];

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
      errors?: { message?: string }[] | string[];
    };
    if (typeof body.error === "string") detail = body.error;
    else if (body.error?.message) detail = body.error.message;
    else if (typeof body.detail === "string") detail = body.detail;
    else if (Array.isArray(body.detail)) detail = body.detail[0]?.msg ?? body.detail[0]?.message ?? "";
    else if (body.detail && "message" in body.detail) detail = body.detail.message ?? "";
    else if (body.message) detail = body.message;
    else if (Array.isArray(body.errors)) {
      const first = body.errors[0];
      detail = typeof first === "string" ? first : (first?.message ?? "");
    }
  } catch {
    detail = raw.slice(0, 200);
  }
  detail = detail.trim().slice(0, 200);

  switch (response.status) {
    case 401:
      return new Error(`Clé ${provider} refusée : vérifiez la clé enregistrée. ${detail}`.trim());
    case 402:
    case 403:
      return new Error(
        `${provider} a refusé la demande (solde ou droits de votre compte ${provider}). ${detail}`.trim(),
      );
    case 429:
      return new Error(`${provider} : quota atteint ou trop de demandes. ${detail}`.trim());
    case 400:
    case 422:
      return new Error(`Demande refusée par ${provider}. ${detail}`.trim());
    default:
      return new Error(`${provider} est momentanément indisponible (erreur ${response.status}).`);
  }
}

/**
 * Essaie les fournisseurs dans l'ordre et renvoie le premier résultat réussi.
 * Si tous échouent, l'erreur liste la raison de chacun.
 */
export async function firstSuccessful<T>(
  attempts: { provider: string; run: () => Promise<T> }[],
  service: string,
): Promise<{ provider: string; result: T }> {
  if (attempts.length === 0) throw new Error(`${service} : aucun fournisseur n'est configuré.`);
  const reasons: string[] = [];
  for (const attempt of attempts) {
    try {
      return { provider: attempt.provider, result: await attempt.run() };
    } catch (e) {
      const message =
        e instanceof Error
          ? e.name === "TimeoutError" || e.name === "AbortError"
            ? `${attempt.provider} n'a pas répondu à temps.`
            : e.message
          : String(e);
      console.error(`[${service}] ${attempt.provider} : ${message}`);
      reasons.push(message);
    }
  }
  throw new Error(`${service} indisponible pour le moment. ${reasons.join(" · ")}`);
}

let cloudflareAccount: string | null = null;

/** Appelle un modèle Cloudflare Workers AI avec CLOUDFLARE_API_TOKEN. */
export async function cloudflareRun(token: string, model: string, body: unknown): Promise<Response> {
  if (!cloudflareAccount) {
    cloudflareAccount = optionalKey("CLOUDFLARE_ACCOUNT_ID");
  }
  if (!cloudflareAccount) {
    const res = await fetch("https://api.cloudflare.com/client/v4/accounts", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw await providerError("Cloudflare", res);
    const json = (await res.json()) as { result?: { id?: string }[] };
    cloudflareAccount = json.result?.[0]?.id ?? null;
    if (!cloudflareAccount) throw new Error("Cloudflare : aucun compte accessible avec ce jeton.");
  }
  return fetch(`https://api.cloudflare.com/client/v4/accounts/${cloudflareAccount}/ai/run/${model}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(90_000),
  });
}

/** Décode du base64 en octets (images renvoyées en JSON par certains fournisseurs). */
export function base64ToBytes(b64: string): ArrayBuffer {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
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
