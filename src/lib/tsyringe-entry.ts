// Production builds alias the bare "tsyringe" import to this file (see vite.config.ts).
// tsyringe throws at load time when no Reflect metadata API exists, and the
// bundler loads it at Worker startup (shared chunk with @peculiar/x509), which made
// every page of the published site return 500. Installing the shim first fixes that.
import "./reflect-shim-install";

// @ts-ignore -- deep path has no bundled typings; consumers use tsyringe's own types.
export * from "tsyringe/dist/esm5/index.js";
