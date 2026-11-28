/** Device-only drafts. Files stay in IndexedDB, scoped to the signed-in account. */
export type CreationDraft = { id: string; userId: string; kind: "photos" | "texte" | "video"; title: string; text: string; files: File[]; updatedAt: number };
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("panu-creation-drafts", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("drafts", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Brouillons indisponibles sur cet appareil."));
  });
}
export function ownedDrafts(rows: CreationDraft[], userId: string): CreationDraft[] {
  return rows.filter((row) => row.userId === userId).sort((a, b) => b.updatedAt - a.updatedAt);
}
export async function listDrafts(userId: string): Promise<CreationDraft[]> {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const request = db.transaction("drafts").objectStore("drafts").getAll();
    request.onsuccess = () => resolve(ownedDrafts(request.result as CreationDraft[], userId));
    request.onerror = () => reject(new Error("Lecture des brouillons impossible."));
  }); } finally { db.close(); }
}
export async function saveDraft(draft: CreationDraft): Promise<void> {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("drafts", "readwrite");
    transaction.objectStore("drafts").put(draft);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("Espace insuffisant : brouillon non enregistré."));
    transaction.onabort = () => reject(new Error("Brouillon non enregistré."));
  }); } finally { db.close(); }
}
export async function deleteDraft(userId: string, id: string): Promise<void> {
  const drafts = await listDrafts(userId);
  if (!drafts.some((draft) => draft.id === id)) return;
  const db = await database();
  try { await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction("drafts", "readwrite");
    transaction.objectStore("drafts").delete(id);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error("Suppression impossible."));
  }); } finally { db.close(); }
}