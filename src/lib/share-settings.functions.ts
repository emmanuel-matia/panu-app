import { createServerFn } from "@tanstack/react-start";

import { readShareSettings, type ShareSettings } from "./share-settings.server";

export type { ShareSettings };

/** Paramètres de partage publics (aucune donnée privée). */
export const getShareSettings = createServerFn({ method: "GET" }).handler(
  async (): Promise<ShareSettings> => readShareSettings(),
);
