import { resolveTheme, type Prefs } from "./prefs";

export const APPEARANCE_KEY = "panu-appearance";

export type Appearance = Pick<Prefs, "theme" | "text_size" | "high_contrast" | "reduce_motion">;

/** Applique l'apparence à la page (thème, taille du texte, contraste, animations). */
export function applyAppearance(a: Appearance) {
  const root = document.documentElement;
  const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset["theme"] = resolveTheme(a.theme, dark);
  root.dataset["text"] = a.text_size;
  root.dataset["contrast"] = a.high_contrast ? "high" : "normal";
  root.dataset["motion"] = a.reduce_motion ? "reduce" : "normal";
}

export function saveAppearance(a: Appearance) {
  try {
    window.localStorage.setItem(APPEARANCE_KEY, JSON.stringify(a));
  } catch {
    // Stockage indisponible : l'apparence reste appliquée pour cette visite.
  }
}

/** Script exécuté avant l'affichage pour éviter un flash de mauvais thème. */
export const APPEARANCE_BOOT_SCRIPT = `try{var a=JSON.parse(localStorage.getItem("${APPEARANCE_KEY}")||"null");if(a){var r=document.documentElement;var t=a.theme==="system"?(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"):a.theme;r.dataset.theme=t==="light"?"light":"dark";r.dataset.text=a.text_size||"normal";r.dataset.contrast=a.high_contrast?"high":"normal";r.dataset.motion=a.reduce_motion?"reduce":"normal"}}catch(e){}`;
