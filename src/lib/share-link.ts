/** Partage d'un lien : menu natif (Android/navigateur) puis copie du lien en secours. */
export type ShareOutcome = "native" | "copied" | "cancelled" | "failed";

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Copie refusée (page non sécurisée, permission) : on tente l'ancienne méthode.
  }
  try {
    const area = document.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

export async function shareLink({ url, title }: { url: string; title: string }): Promise<ShareOutcome> {
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      // Lien seul (avec titre) : une seule carte d'aperçu propre dans WhatsApp/Messenger.
      await navigator.share({ title, url });
      return "native";
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return "cancelled";
      // Partage natif refusé (NotAllowedError, contexte non sécurisé…) : copie du lien.
    }
  }
  return (await copyText(url)) ? "copied" : "failed";
}
