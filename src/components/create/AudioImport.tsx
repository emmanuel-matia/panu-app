import { useEffect, useRef, useState } from "react";
import { Music2, Trash2, Upload } from "lucide-react";
import { ActionButton } from "@/components/common/ActionButton";
import { validateAudioFile } from "@/lib/media-rules";
import { audioSelection, type AudioSelection } from "@/lib/create-audio-rules";

export type PersonalAudio = { file: File; selection: AudioSelection };
export function AudioImport({ value, onChange }: { value: PersonalAudio | null; onChange: (value: PersonalAudio | null) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const player = useRef<HTMLAudioElement>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"personal" | "library">("personal");
  useEffect(() => {
    if (!value) { setUrl(null); return; }
    const next = URL.createObjectURL(value.file); setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [value?.file]);
  function update(patch: Partial<AudioSelection>) {
    if (!value) return;
    const selection = audioSelection(duration, patch.start ?? value.selection.start, patch.end ?? value.selection.end, patch.at ?? value.selection.at, patch.volume ?? value.selection.volume);
    onChange({ ...value, selection });
    if (player.current) { player.current.volume = selection.volume; player.current.currentTime = selection.start; }
  }
  return <section className="space-y-3 border-y border-border py-4">
    <h2 className="flex items-center gap-2 font-semibold"><Music2 className="size-5 text-accent" /> Ajouter un son</h2>
    <div className="flex gap-2">
      <ActionButton variant={tab === "personal" ? "brand" : "ghost"} onClick={() => setTab("personal")}>Mes fichiers</ActionButton>
      <ActionButton variant={tab === "library" ? "brand" : "ghost"} onClick={() => setTab("library")}>Bibliothèque PANU</ActionButton>
    </div>
    {tab === "library" ? <p role="status" className="text-sm text-muted-foreground">Le catalogue musical PANU sera intégré après vérification des droits. Importez votre fichier personnel.</p> : <>
      <ActionButton variant="outline" onClick={() => input.current?.click()} className="gap-2"><Upload className="size-4" /> {value ? "Remplacer le son" : "Importer une chanson"}</ActionButton>
      <p className="text-xs text-muted-foreground">MP3, M4A, AAC, WAV, OGG · Utilisez uniquement les fichiers dont vous détenez les droits.</p>
      {value && url ? <>
        <div className="flex items-center justify-between gap-2"><span className="min-w-0 truncate text-sm">{value.file.name}</span><ActionButton variant="ghost" aria-label="Supprimer la piste audio" onClick={() => onChange(null)}><Trash2 className="size-4" /></ActionButton></div>
        <audio ref={player} src={url} controls className="w-full" onLoadedMetadata={(event) => {
          const d = event.currentTarget.duration;
          if (!Number.isFinite(d)) { setError("Durée audio illisible. Essayez un fichier MP3 ou M4A."); return; }
          setDuration(d); onChange({ ...value, selection: audioSelection(d, 0, Math.min(d, 60), 0, 1) });
        }} onError={() => { setError("Ce fichier audio ne peut pas être lu sur cet appareil."); onChange(null); }} onTimeUpdate={(event) => {
          if (event.currentTarget.currentTime >= value.selection.end) { event.currentTarget.pause(); event.currentTarget.currentTime = value.selection.start; }
        }} onPlay={(event) => { if (event.currentTarget.currentTime < value.selection.start) event.currentTarget.currentTime = value.selection.start; }} />
        <div className="grid grid-cols-2 gap-3">
          {([['start', 'Début du passage (s)'], ['end', 'Fin du passage (s)'], ['at', 'Décalage dans la vidéo (s)']] as const).map(([key, label]) => <label key={key} className="text-xs text-muted-foreground">{label}<input type="number" min="0" step="0.1" max={key === "at" ? 60 : duration} value={value.selection[key]} onChange={(e) => update({ [key]: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-border bg-surface p-2 text-foreground" /></label>)}
          <label className="text-xs text-muted-foreground">Volume musique : {Math.round(value.selection.volume * 100)} %<input type="range" min="0" max="1" step="0.05" value={value.selection.volume} onChange={(e) => update({ volume: Number(e.target.value) })} className="mt-3 w-full accent-primary" /></label>
        </div>
      </> : null}
    </>}
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    <input ref={input} type="file" accept="audio/*,.mp3,.m4a,.aac,.wav,.ogg" className="hidden" onChange={(e) => {
      const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
      const problem = validateAudioFile(file); setError(problem);
      if (!problem) onChange({ file, selection: { start: 0, end: 0, at: 0, volume: 1 } });
    }} />
  </section>;
}