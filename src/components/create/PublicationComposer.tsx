import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Save, Trash2 } from "lucide-react";
import { ActionButton } from "@/components/common/ActionButton";
import { AudioImport, type PersonalAudio } from "./AudioImport";
import { useAuth } from "@/hooks/useAuth";
import { useSettings } from "@/hooks/useSettings";
import { supabase } from "@/integrations/supabase/client";
import { validateImageFile, mediaStoragePath } from "@/lib/media-rules";
import { compressImage } from "@/lib/image-compress";
import { listDrafts, saveDraft, deleteDraft } from "@/lib/create-drafts";
import { renderMusicClip } from "@/lib/music-clip";
import { useDataMode } from "@/hooks/useDataMode";
import { heavyUploadBlocked, uploadImageTarget } from "@/lib/data-saver-rules";

const field = "mt-1 w-full rounded-lg border border-border bg-surface p-3 text-sm text-foreground";
function silentAudio(seconds: number): Blob {
  const count = Math.ceil(seconds * 8000);
  const bytes = new ArrayBuffer(44 + count * 2); const view = new DataView(bytes);
  const write = (at: number, text: string) => [...text].forEach((char, i) => view.setUint8(at + i, char.charCodeAt(0)));
  write(0, "RIFF"); view.setUint32(4, bytes.byteLength - 8, true); write(8, "WAVE"); write(12, "fmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, "data"); view.setUint32(40, count * 2, true);
  return new Blob([bytes], { type: "audio/wav" });
}
async function textImage(text: string): Promise<Blob> {
  const canvas = document.createElement("canvas"); canvas.width = 720; canvas.height = 960;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Création textuelle indisponible sur cet appareil.");
  const theme = getComputedStyle(document.documentElement);
  ctx.fillStyle = theme.getPropertyValue("--background").trim(); ctx.fillRect(0, 0, 720, 960);
  ctx.fillStyle = theme.getPropertyValue("--foreground").trim(); ctx.font = "600 32px system-ui";
  let y = 100;
  for (const paragraph of text.split("\n")) {
    let line = "";
    for (const char of paragraph) { if (ctx.measureText(line + char).width > 600) { ctx.fillText(line, 60, y); y += 44; line = ""; } line += char; }
    ctx.fillText(line, 60, y); y += 44;
  }
  return new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Création impossible.")), "image/png"));
}
export function PublicationComposer({ kind, draftId }: { kind: "photos" | "texte"; draftId?: string }) {
  const { user } = useAuth(); const { settings } = useSettings(); const dataMode = useDataMode(); const query = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]); const [urls, setUrls] = useState<string[]>([]);
  const [title, setTitle] = useState(""); const [text, setText] = useState("");
  const [audio, setAudio] = useState<PersonalAudio | null>(null); const [seconds, setSeconds] = useState(10);
  const [result, setResult] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null); const [done, setDone] = useState(false);
  const id = useRef(draftId ?? crypto.randomUUID());
  useEffect(() => {
    if (!draftId || !user) return;
    void listDrafts(user.id).then((rows) => { const draft = rows.find((row) => row.id === draftId); if (draft) { setFiles(draft.files); setTitle(draft.title); setText(draft.text); } }).catch((e: unknown) => setMessage(e instanceof Error ? e.message : "Brouillon illisible."));
  }, [draftId, user?.id]);
  useEffect(() => { const next = files.map((file) => URL.createObjectURL(file)); setUrls(next); return () => next.forEach(URL.revokeObjectURL); }, [files]);
  useEffect(() => { setResult(null); }, [files, audio, seconds, title]);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);
  async function montage() {
    setBusy(true); setMessage(null);
    try { const output = await renderMusicClip({ audio: audio?.file ?? silentAudio(seconds), media: files.map((file) => ({ file, kind: "image" })), duration: seconds, ...(audio ? { audioSelection: audio.selection } : {}), title, onProgress: (_, label) => setMessage(label) }); setResult({ blob: output.blob, url: URL.createObjectURL(output.blob) }); setMessage(null); }
    catch (e) { setMessage(e instanceof Error ? e.message : "Montage impossible."); } finally { setBusy(false); }
  }
  async function publish() {
    if (!user || !title.trim() || (kind === "texte" ? !text.trim() : !files.length)) return;
    if (kind === "photos" && (files.length > 1 || audio) && !result) { setMessage("Préparez le montage avant de publier."); return; }
    setBusy(true); setMessage(null);
    let path: string | null = null;
    try {
      const first = files[0];
      const blob = kind === "texte" ? await textImage(text) : result?.blob ?? (first ? await compressImage(first, uploadImageTarget(dataMode.mode)) : null);
      if (!blob) throw new Error("Ajoutez une photo.");
      const isVideo = blob.type.startsWith("video/");
      if (isVideo && heavyUploadBlocked(dataMode.heavyWifiOnly, dataMode.connection)) throw new Error("Envoi de vidéo réservé au Wi-Fi.");
      path = mediaStoragePath(user.id, "images", blob.type, Date.now());
      const upload = await supabase.storage.from("videos").upload(path, blob, { contentType: blob.type, upsert: false });
      if (upload.error) throw new Error("Envoi impossible. Réessayez.");
      const insert = await supabase.from("posts").insert({ author_id: user.id, kind: isVideo ? "video" : "image", source: "upload", title: title.trim(), caption: text.trim() || null, video_path: path, media_duration: isVideo ? seconds : null, visibility: settings.prefs.default_post_visibility, allow_comments: settings.prefs.default_allow_comments });
      if (insert.error) throw new Error("Publication non enregistrée. Réessayez.");
      path = null; await query.invalidateQueries({ queryKey: ["posts"] });
      await deleteDraft(user.id, id.current).catch(() => undefined); setDone(true);
    } catch (e) { if (path) await supabase.storage.from("videos").remove([path]); setMessage(e instanceof Error ? e.message : "Publication impossible."); } finally { setBusy(false); }
  }
  if (done) return <p role="status" className="px-4 py-10 text-center text-accent">Votre publication est en ligne.</p>;
  return <div className="space-y-4 px-4 py-5">
    {kind === "photos" ? <>
      <ActionButton variant="outline" onClick={() => input.current?.click()} className="w-full gap-2"><ImagePlus className="size-5" /> Importer une ou plusieurs photos</ActionButton>
      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="hidden" onChange={(event) => {
        const next = Array.from(event.target.files ?? []); event.target.value = "";
        const error = next.map((file) => validateImageFile(file)).find(Boolean); if (error) { setMessage(error); return; }
        if (next.length + files.length > 10) { setMessage("Le montage accepte jusqu’à 10 photos."); return; } setFiles([...files, ...next]); setMessage(null);
      }} />
      <div className="grid grid-cols-3 gap-2">{urls.map((url, i) => <div key={url} className="relative aspect-square overflow-hidden rounded-lg"><img src={url} alt={`Photo ${i + 1}`} className="size-full object-cover" /><ActionButton aria-label={`Supprimer la photo ${i + 1}`} variant="outline" className="absolute right-1 top-1 size-8 p-0" onClick={() => setFiles(files.filter((_, index) => index !== i))}><Trash2 className="size-4" /></ActionButton></div>)}</div>
    </> : null}
    <label className="block text-sm">Titre<input className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} /></label>
    <label className="block text-sm">{kind === "texte" ? "Votre publication" : "Légende"}<textarea rows={5} className={field} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} /></label>
    {kind === "texte" ? <p className="text-xs text-muted-foreground">Votre texte sera publié sous forme de visuel, avec le texte complet en légende.</p> : <>
      <AudioImport value={audio} onChange={setAudio} />
      {files.length > 1 || audio ? <>
        <label className="block text-sm">Durée du montage : {seconds} s<input type="range" min="3" max="60" value={seconds} onChange={(e) => setSeconds(Number(e.target.value))} className="mt-2 w-full accent-primary" /></label>
        <ActionButton disabled={busy || !files.length || Boolean(audio && audio.selection.end <= audio.selection.start)} onClick={() => void montage()} className="w-full">Préparer le montage photo</ActionButton>
        {result ? <video src={result.url} controls playsInline className="max-h-[55dvh] w-full rounded-lg bg-background" /> : null}
      </> : null}
    </>}
    {message ? <p role="status" className="text-sm text-muted-foreground">{message}</p> : null}
    <div className="flex flex-wrap gap-2">
      <ActionButton disabled={busy || !title.trim() || (kind === "texte" ? !text.trim() : !files.length)} onClick={() => void publish()} className="flex-1">{busy ? "Traitement…" : "Publier"}</ActionButton>
      <ActionButton variant="outline" disabled={busy} className="gap-2" onClick={() => { if (!user) return; void saveDraft({ id: id.current, userId: user.id, kind, title, text, files, updatedAt: Date.now() }).then(() => setMessage("Brouillon enregistré sur cet appareil. La piste audio devra être réimportée." )).catch((e: unknown) => setMessage(e instanceof Error ? e.message : "Brouillon non enregistré.")); }}><Save className="size-4" /> Brouillon</ActionButton>
    </div>
  </div>;
}