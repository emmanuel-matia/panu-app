// Production builds alias the bare "tsyringe" import to this file (nitro alias in vite.config.ts).
//
// tsyringe (pulled in by @simplewebauthn/server -> @peculiar/x509) throws at load time when no
// Reflect metadata API exists, and the bundle loads it at Worker startup, so every page of the
// published site returned 500 ("This page didn't load"). This wrapper installs a minimal
// Reflect metadata API first, then re-exports the real tsyringe.
//
// The shim is a separate module imported FIRST: ES module re-exports are evaluated before this
// file's own body, so the shim must be an earlier import. Both files are listed under
// "sideEffects" in package.json, otherwise the bundler drops them.

import "./reflect-shim";

// @ts-ignore -- deep path has no bundled typings; consumers use tsyringe's own types.
export * from "../../node_modules/tsyringe/dist/esm5/index.js";
