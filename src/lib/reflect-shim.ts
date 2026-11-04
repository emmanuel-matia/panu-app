// Minimal Reflect metadata API (the subset of `reflect-metadata` that
// tsyringe — pulled in by @simplewebauthn/server → @peculiar/x509 — needs).
//
// Why not `import "reflect-metadata"`: the production bundler places that
// package in a shared library chunk that loads @peculiar/x509 *before* the
// polyfill runs, so the Worker crashed at startup and every page returned 500.
// This shim has no imports, and `installReflectShim()` is called right before
// the WebAuthn library is dynamically imported, so the order is guaranteed.

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

export function installReflectShim(): void {
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
