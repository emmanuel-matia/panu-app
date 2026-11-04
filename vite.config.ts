// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  nitro: {
    // tsyringe (via @simplewebauthn/server -> @peculiar/x509) throws at load time without a
    // Reflect metadata API, and the production bundle loads it at Worker startup, which made
    // every page of the published site return 500. Point it at a wrapper that installs the
    // shim first (src/lib/tsyringe-entry.ts). The extra `alias` key is forwarded to nitro.
    alias: { tsyringe: fileURLToPath(new URL("./src/lib/tsyringe-entry.ts", import.meta.url)) },
  } as Record<string, unknown>,
});
