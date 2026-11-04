// Production builds alias the bare "tsyringe" import to this file (nitro alias in vite.config.ts).
//
// tsyringe (pulled in by @simplewebauthn/server -> @peculiar/x509) throws at load time when no
// Reflect metadata API exists, and the bundle loads it at Worker startup, so every page of the
// published site returned 500 ("This page didn't load"). This wrapper installs a minimal
// Reflect metadata API first, then re-exports the real tsyringe.
//
// It is deliberately self-contained (no imports from other src files): sharing the shim with
// other modules made the bundler put it in a chunk that loads after @peculiar/x509.

type Key = unknown;
type MetaMap = Map<Key, unknown>;

const store = new WeakMap<object, Map<string | symbol | undefined, MetaMap>>();

function ownMap(target: object, prop: string | symbol | undefined, create: boolean): MetaMap | undefined {
  let byProp = store.get(target);
  if (!byProp) {
    if (!create) return undefined;
    byProp = new Map();
    store.set(target, byProp);
  }
  let map = byProp.get(prop);
  if (!map && create) {
    map = new Map();
    byProp.set(prop, map);
  }
  return map;
}

function chain(target: object): object[] {
  const out: object[] = [];
  let cur: object | null = target;
  while (cur) {
    out.push(cur);
    cur = Object.getPrototypeOf(cur) as object | null;
  }
  return out;
}

function installReflectShim(): void {
  const R = Reflect as unknown as Record<string, unknown>;
  if (typeof R["getMetadata"] === "function") return;

  const api = {
    defineMetadata(key: Key, value: unknown, target: object, prop?: string | symbol) {
      ownMap(target, prop, true)!.set(key, value);
    },
    hasOwnMetadata(key: Key, target: object, prop?: string | symbol) {
      return ownMap(target, prop, false)?.has(key) ?? false;
    },
    hasMetadata(key: Key, target: object, prop?: string | symbol) {
      return chain(target).some((t) => ownMap(t, prop, false)?.has(key));
    },
    getOwnMetadata(key: Key, target: object, prop?: string | symbol) {
      return ownMap(target, prop, false)?.get(key);
    },
    getMetadata(key: Key, target: object, prop?: string | symbol) {
      for (const t of chain(target)) {
        const map = ownMap(t, prop, false);
        if (map?.has(key)) return map.get(key);
      }
      return undefined;
    },
    getOwnMetadataKeys(target: object, prop?: string | symbol) {
      return [...(ownMap(target, prop, false)?.keys() ?? [])];
    },
    getMetadataKeys(target: object, prop?: string | symbol) {
      const keys = new Set<Key>();
      for (const t of chain(target)) for (const k of ownMap(t, prop, false)?.keys() ?? []) keys.add(k);
      return [...keys];
    },
    deleteMetadata(key: Key, target: object, prop?: string | symbol) {
      return ownMap(target, prop, false)?.delete(key) ?? false;
    },
    metadata(key: Key, value: unknown) {
      return (target: object, prop?: string | symbol) => {
        ownMap(target, prop, true)!.set(key, value);
      };
    },
  };
  Object.assign(R, api);
}

installReflectShim();

// @ts-ignore -- deep path has no bundled typings; consumers use tsyringe's own types.
export * from "../../node_modules/tsyringe/dist/esm5/index.js";
