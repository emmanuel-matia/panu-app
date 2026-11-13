import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { SwitchCamera, Zap, ZapOff, Mic, MicOff, Settings, X, Pencil, Globe, ImagePlus, Radio, Square, Eye, Sparkles, Gift, Share2, MoreHorizontal, Pause, Play, RefreshCw, Smile, Send, Ban } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { startLive, liveHeartbeat, endLive, liveComments } from '@/lib/live.functions';
import { waitIce, localSdp } from '@/lib/live-peer';
import { composeLiveCard, loadImage } from '@/lib/live-card';
import { shareLink } from '@/lib/share-link';
import { LIVE_COMMENT_MAX } from '@/lib/live-rules';
import { createRenderer, DEFAULT_LOOK, EFFECT_OPTIONS, CATEGORY_LABELS, canvasFilter, type EffectCategory, type LiveLook } from '@/lib/live-effects';
const panuLogo = '/favicon.png';

const OUT_W = 720, OUT_H = 1280;
type Facing = 'user' | 'environment';

/** Ouvre une caméra précise ; l'ancienne est fermée avant (beaucoup d'Android refusent deux caméras ouvertes). */
async function openCamera(facing: Facing, audio: boolean) {
  const base = { width: { ideal: 1280 }, height: { ideal: 720 } };
  try { return await navigator.mediaDevices.getUserMedia({ video: { ...base, facingMode: { exact: facing } }, audio }); }
  catch { return await navigator.mediaDevices.getUserMedia({ video: { ...base, facingMode: { ideal: facing } }, audio }); }
}

export function LiveStudio() {
  const { user, profile } = useAuth(); const navigate = useNavigate();
  const canvas = useRef<HTMLCanvasElement>(null); const cam = useRef<HTMLVideoElement>(null); const source = useRef<HTMLVideoElement>(null);
  const camStream = useRef<MediaStream | null>(null); const out = useRef<MediaStream | null>(null);
  const peer = useRef<RTCPeerConnection | null>(null); const id = useRef<string | null>(null);
  const look = useRef<LiveLook>(DEFAULT_LOOK); const paused = useRef(false); const busy = useRef(false); const disposed = useRef(false);
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null); const reconnect = useRef<() => void>(() => {});
  const coverPath = useRef<string | undefined>(undefined);

  const [title, setTitle] = useState(''); const [facing, setFacing] = useState<Facing>('user'); const [mic, setMic] = useState(true);
  const [torch, setTorch] = useState(false); const [torchOk, setTorchOk] = useState(false);
  const [state, setState] = useState('idle'); const [error, setError] = useState(''); const [count, setCount] = useState(0);
  const [streamId, setStreamId] = useState<string | null>(null); const [cover, setCover] = useState<File | null>(null); const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [cat, setCat] = useState<EffectCategory>('effets'); const [lk, setLk] = useState<LiveLook>(DEFAULT_LOOK);
  const [sheet, setSheet] = useState<'' | 'settings' | 'effects' | 'gifts' | 'more' | 'audience'>('');
  const [mode, setMode] = useState<'camera' | 'prerecorded'>('camera'); const [fileUrl, setFileUrl] = useState<string | null>(null); const [rights, setRights] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; e: string }[]>([]);

  look.current = lk;
  // Boucle de rendu : la vidéo de la caméra passe par le canvas, donc les effets sont dans le flux diffusé.
  useEffect(() => {
    disposed.current = false; const c = canvas.current!; c.width = OUT_W; c.height = OUT_H;
    const draw = createRenderer(c); let raf = 0;
    const loop = () => { const v = mode === 'camera' ? cam.current : source.current; if (v && !paused.current) draw(v, look.current); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mode]);
  useEffect(() => { if (mode === 'camera') void camera('user'); return () => { disposed.current = true; }; }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { if (retry.current) clearTimeout(retry.current); peer.current?.close(); camStream.current?.getTracks().forEach(t => t.stop()); if (id.current) void endLive({ data: { streamId: id.current } }).catch(() => undefined); }, []);
  useEffect(() => { if (!cover) { setCoverUrl(null); return; } const u = URL.createObjectURL(cover); setCoverUrl(u); return () => URL.revokeObjectURL(u); }, [cover]);

  function outputStream() {
    if (!out.current) out.current = canvas.current!.captureStream(30);
    return out.current;
  }
  async function attachAudio(track: MediaStreamTrack | undefined) {
    const o = outputStream(); o.getAudioTracks().forEach(t => o.removeTrack(t));
    if (track) { track.enabled = mic && !paused.current; o.addTrack(track); }
    const sender = peer.current?.getSenders().find(s => s.track?.kind === 'audio' || (!s.track && s !== peer.current?.getSenders()[0]));
    if (sender && track) await sender.replaceTrack(track);
  }
  async function camera(next: Facing = facing) {
    setError('');
    camStream.current?.getTracks().forEach(t => t.stop()); camStream.current = null;
    try {
      const m = await openCamera(next, true); camStream.current = m;
      if (cam.current) { cam.current.srcObject = m; await cam.current.play().catch(() => undefined); }
      const vt = m.getVideoTracks()[0]; const caps = (vt?.getCapabilities?.() ?? {}) as { torch?: boolean };
      setTorchOk(Boolean(caps.torch)); setTorch(false);
      await attachAudio(m.getAudioTracks()[0]); setFacing(next);
    } catch { setError('Autorisez la caméra et le microphone pour PANU dans les réglages du téléphone.'); }
  }
  async function toggleTorch() {
    const vt = camStream.current?.getVideoTracks()[0]; if (!vt) return;
    try { await vt.applyConstraints({ advanced: [{ torch: !torch } as MediaTrackConstraintSet] }); setTorch(!torch); } catch { setError('Le flash n’est pas disponible sur cette caméra.'); }
  }
  function toggleMic() { const n = !mic; setMic(n); outputStream().getAudioTracks().forEach(t => t.enabled = n && !paused.current); }

  async function prepareCover() {
    if (!user || coverPath.current) return;
    if (cover && (cover.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(cover.type))) throw new Error('Miniature JPG, PNG ou WebP : 5 Mo maximum.');
    const src: CanvasImageSource | null = cover ? await loadImage(cover).catch(() => null) : canvas.current;
    const blob = src ? await composeLiveCard(src as unknown as HTMLVideoElement, { hostName: profile?.display_name || profile?.username || 'Créateur PANU', title: title.trim() }).catch(() => null) : null;
    if (!blob) return;
    const path = `${user.id}/live-${crypto.randomUUID()}.jpg`;
    const { error: e } = await supabase.storage.from('videos').upload(path, blob, { contentType: 'image/jpeg' });
    if (e) throw new Error('Miniature non enregistrée.'); coverPath.current = path;
  }
  async function publish(isRetry = false) {
    if (busy.current) return; busy.current = true; setError(''); setState(isRetry ? 'reconnecting' : 'connecting');
    try {
      if (mode === 'prerecorded' && !isRetry) { if (!fileUrl || !rights) throw new Error('Sélectionnez une vidéo autorisée et confirmez vos droits.'); await source.current?.play(); await attachAudio(undefined); }
      if (mode === 'camera' && !camStream.current) await camera();
      if (!isRetry) await prepareCover();
      const m = outputStream(); if (!m.getVideoTracks().length) throw new Error('Aucune source vidéo disponible.');
      peer.current?.close(); const pc = new RTCPeerConnection({ bundlePolicy: 'max-bundle' }); peer.current = pc;
      m.getTracks().forEach(t => pc.addTransceiver(t, { direction: 'sendonly', streams: [m] }));
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') setState(paused.current ? 'paused' : 'live');
        if (['failed', 'disconnected'].includes(pc.connectionState) && !disposed.current) { setState('reconnecting'); if (!retry.current) retry.current = setTimeout(() => { retry.current = null; reconnect.current(); }, 5000); }
      };
      await pc.setLocalDescription(await pc.createOffer()); await waitIce(pc);
      const tracks = pc.getTransceivers().flatMap(t => t.mid && t.sender.track ? [{ mid: t.mid, kind: t.sender.track.kind as 'video' | 'audio' }] : []);
      const r = await startLive({ data: { title: title.trim(), offer: localSdp(pc), tracks, coverPath: coverPath.current, sourceKind: mode, ...(id.current ? { streamId: id.current } : {}) } });
      id.current = r.streamId; setStreamId(r.streamId); await pc.setRemoteDescription(r.answer); setState(paused.current ? 'paused' : 'live');
    } catch (e) { setError(e instanceof Error ? e.message : 'Diffusion impossible.'); setState(id.current ? 'reconnecting' : 'idle'); }
    finally { busy.current = false; }
  }
  reconnect.current = () => { void publish(true); };

  useEffect(() => {
    if (!streamId) return; let running = false;
    const beat = async () => { if (running) return; running = true; try { const r = await liveHeartbeat({ data: { streamId, status: paused.current ? 'paused' : 'live' } }); setCount(r.viewersCount); } catch (e) { setError(e instanceof Error ? e.message : 'Connexion interrompue.'); } finally { running = false; } };
    void beat(); const t = setInterval(() => void beat(), 10000); return () => clearInterval(t);
  }, [streamId]);

  async function pause() {
    if (!streamId) return; const n = !paused.current;
    try { await liveHeartbeat({ data: { streamId, status: n ? 'paused' : 'live' } }); paused.current = n; outputStream().getTracks().forEach(t => t.enabled = !n && (t.kind !== 'audio' || mic)); if (source.current) { if (n) source.current.pause(); else await source.current.play(); } setState(n ? 'paused' : 'live'); setSheet(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Statut non enregistré.'); }
  }
  async function stop() {
    if (!streamId || !window.confirm('Terminer ce direct pour tous les spectateurs ?')) return;
    try { await endLive({ data: { streamId } }); id.current = null; setStreamId(null); peer.current?.close(); camStream.current?.getTracks().forEach(t => t.stop()); camStream.current = null; source.current?.pause(); setState('ended'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Arrêt impossible.'); }
  }
  // Le partage ouvre la feuille native : la page reste montée, la connexion n'est jamais fermée.
  async function share() {
    if (!streamId) return;
    await shareLink({ url: `https://panu.site/live/${streamId}`, title: `${title.trim()} — PANU EN DIRECT` }).catch(() => undefined);
  }
  function heart(e = '💜') { const h = { id: Date.now() + Math.random(), x: Math.random() * 30, e }; setHearts(l => [...l.slice(-14), h]); setTimeout(() => setHearts(l => l.filter(x => x.id !== h.id)), 2200); }

  if (!user) return <div className="p-4"><Link className="text-primary underline" to="/connexion">Se connecter pour diffuser</Link></div>;
  const live = Boolean(streamId); const mirror = mode === 'camera' && facing === 'user';
  const pill = 'flex flex-col items-center gap-1 rounded-2xl bg-media-scrim px-3 py-2 text-[11px] font-medium text-on-media backdrop-blur-md';

  return (
    <div className="fixed inset-0 z-[60] overflow-hidden bg-background text-on-media">
      <video ref={cam} muted playsInline className="hidden" />
      <video ref={source} src={fileUrl ?? undefined} loop playsInline className="hidden" />
      <canvas ref={canvas} aria-label="Aperçu de la caméra" className="absolute inset-0 h-full w-full object-cover" style={{ transform: mirror ? 'scaleX(-1)' : undefined }} />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-media-scrim to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-media-scrim via-media-scrim/60 to-transparent" />

      {!live ? (
        <>
          <header className="absolute inset-x-0 top-0 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)]">
            <div className="flex items-center gap-2"><img src={panuLogo} alt="" className="size-9 rounded-lg" /><div className="leading-tight"><p className="font-display text-lg font-bold">PANU</p><p className="text-xs">Studio Live</p></div></div>
            <button aria-label="Fermer" onClick={() => void navigate({ to: '/live' })} className="rounded-full bg-media-scrim p-2"><X className="size-6" /></button>
          </header>
          <div className="absolute inset-x-0 top-[calc(max(env(safe-area-inset-top),12px)+56px)] grid grid-cols-4 gap-2 px-4">
            <button className={pill} disabled={mode !== 'camera'} onClick={() => void camera(facing === 'user' ? 'environment' : 'user')}><SwitchCamera className="size-5" />Retourner</button>
            <button className={pill + (torchOk ? '' : ' opacity-50')} onClick={() => torchOk ? void toggleTorch() : setError('Flash indisponible sur cette caméra (souvent seulement sur la caméra arrière).')}>{torch ? <Zap className="size-5" /> : <ZapOff className="size-5" />}Flash</button>
            <button className={pill} onClick={toggleMic}>{mic ? <Mic className="size-5" /> : <MicOff className="size-5" />}Micro</button>
            <button className={pill} onClick={() => setSheet('settings')}><Settings className="size-5" />Paramètres</button>
          </div>
          <div className="absolute inset-x-0 bottom-0 space-y-3 px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
            <label className="flex items-center gap-3 rounded-2xl border border-on-media/15 bg-media-scrim p-3 backdrop-blur-md">
              <Pencil className="size-5 shrink-0" />
              <span className="min-w-0 flex-1"><span className="block text-xs opacity-80">Titre du live</span>
                <input value={title} maxLength={100} onChange={e => setTitle(e.target.value)} placeholder="De quoi parle votre direct ?" className="w-full bg-transparent text-base font-medium text-on-media outline-none placeholder:text-on-media/50" /></span>
              <span className="shrink-0 text-xs opacity-70">{title.length}/100</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setSheet('audience')} className="flex items-center gap-2 rounded-2xl border border-on-media/15 bg-media-scrim p-3 text-left backdrop-blur-md"><Globe className="size-6 shrink-0" /><span className="text-sm leading-tight">Qui peut voir ?<br /><b>Tout le monde ›</b></span></button>
              <label className="flex cursor-pointer items-center gap-2 rounded-2xl border border-on-media/15 bg-media-scrim p-2 backdrop-blur-md">
                {coverUrl ? <img src={coverUrl} alt="Miniature choisie" className="h-11 w-16 shrink-0 rounded-lg object-cover" /> : <span className="grid h-11 w-16 shrink-0 place-items-center rounded-lg bg-on-media/10"><ImagePlus className="size-5" /></span>}
                <span className="text-sm leading-tight">Miniature<br /><span className="opacity-70">(optionnel)</span></span>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e => { coverPath.current = undefined; setCover(e.target.files?.[0] ?? null); }} />
              </label>
            </div>
            <EffectsPanel cat={cat} setCat={setCat} look={lk} setLook={setLk} />
            {error ? <p role="alert" className="rounded-xl bg-destructive/90 px-3 py-2 text-sm text-destructive-foreground">{error}</p> : null}
            <button disabled={!title.trim() || state === 'connecting'} onClick={() => void publish()} className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-primary text-lg font-bold text-primary-foreground shadow-lg disabled:opacity-60">
              <Radio className="size-6" />{state === 'connecting' ? 'CONNEXION…' : 'DÉMARRER LE LIVE'}
            </button>
            {state === 'ended' ? <p className="text-center text-sm">Direct terminé. Vous pouvez en lancer un nouveau.</p> : null}
          </div>
        </>
      ) : (
        <>
          <header className="absolute inset-x-0 top-0 px-4 pt-[max(env(safe-area-inset-top),12px)]">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
              <div className="flex min-w-0 items-center gap-3">
                {profile?.avatar_url && /^https?:/.test(profile.avatar_url) ? <img src={profile.avatar_url} alt="" className="size-12 shrink-0 rounded-full border-2 border-on-media object-cover" /> : <span className="grid size-12 shrink-0 place-items-center rounded-full border-2 border-on-media bg-primary font-bold">{(profile?.display_name ?? 'P')[0]}</span>}
                <div className="min-w-0"><p className="truncate font-semibold">{profile?.display_name ?? profile?.username}</p><p className="flex items-center gap-1 text-sm"><Eye className="size-4" />{count} spectateur{count > 1 ? 's' : ''}</p></div>
              </div>
              <button onClick={() => void stop()} className="flex items-center gap-1 rounded-full bg-media-scrim px-3 py-2 text-sm"><X className="size-4" />Quitter</button>
            </div>
            <span className={'mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ' + (state === 'live' ? 'bg-live-red' : 'bg-media-scrim')}>
              <span className="size-2 animate-pulse rounded-full bg-on-media" />{state === 'live' ? 'EN DIRECT' : state === 'paused' ? 'EN PAUSE' : 'RECONNEXION…'}
            </span>
          </header>
          <div className="pointer-events-none absolute bottom-48 right-3 h-64 w-16">
            {hearts.map(h => <span key={h.id} className="absolute bottom-0 animate-[live-float_2.2s_ease-out_forwards] text-3xl" style={{ right: h.x }}>{h.e}</span>)}
          </div>
          <div className="absolute inset-x-0 bottom-0 space-y-3 px-4 pb-[max(env(safe-area-inset-bottom),16px)]">
            <OverlayChat streamId={streamId!} onHeart={() => heart()} />
            {error ? <p role="alert" className="rounded-xl bg-destructive/90 px-3 py-2 text-sm text-destructive-foreground">{error}</p> : null}
            {state === 'reconnecting' ? <button onClick={() => void publish(true)} className="flex w-full items-center justify-center gap-2 rounded-full bg-media-scrim py-2 text-sm"><RefreshCw className="size-4" />Reconnecter</button> : null}
            <div className="grid grid-cols-5 gap-1">
              <button className="flex flex-col items-center gap-1 text-xs" onClick={() => setSheet('effects')}><span className="grid size-11 place-items-center rounded-full bg-media-scrim"><Sparkles className="size-5" /></span>Effets</button>
              <button className="flex flex-col items-center gap-1 text-xs" onClick={() => heart('🌹')}><span className="grid size-11 place-items-center rounded-full bg-media-scrim text-xl">🌹</span>Rose</button>
              <button className="flex flex-col items-center gap-1 text-xs" onClick={() => setSheet('gifts')}><span className="grid size-11 place-items-center rounded-full bg-media-scrim"><Gift className="size-5" /></span>Cadeau</button>
              <button className="flex flex-col items-center gap-1 text-xs" onClick={() => void share()}><span className="grid size-11 place-items-center rounded-full bg-media-scrim"><Share2 className="size-5" /></span>Partager</button>
              <button className="flex flex-col items-center gap-1 text-xs" onClick={() => setSheet('more')}><span className="grid size-11 place-items-center rounded-full bg-media-scrim"><MoreHorizontal className="size-5" /></span>Plus</button>
            </div>
            <button onClick={() => void stop()} className="flex h-14 w-full items-center justify-center gap-3 rounded-full bg-live-red text-lg font-bold"><Square className="size-5" />TERMINER LE LIVE</button>
          </div>
        </>
      )}

      {sheet ? (
        <div className="absolute inset-0 z-10 flex items-end bg-media-scrim" onClick={() => setSheet('')}>
          <div className="w-full space-y-3 rounded-t-3xl bg-card p-5 pb-[max(env(safe-area-inset-bottom),20px)] text-card-foreground" onClick={e => e.stopPropagation()}>
            {sheet === 'effects' ? <EffectsPanel cat={cat} setCat={setCat} look={lk} setLook={setLk} /> : null}
            {sheet === 'audience' ? <><h2 className="font-semibold">Qui peut voir ?</h2><p className="text-sm text-muted-foreground">Les directs PANU sont actuellement publics : tout le monde peut les regarder. Les audiences restreintes (abonnés, amis) arriveront plus tard.</p></> : null}
            {sheet === 'gifts' ? <><h2 className="font-semibold">Cadeaux</h2><p className="text-sm text-muted-foreground">Les cadeaux virtuels seront disponibles quand la monétisation PANU sera activée. Aucun paiement ni revenu n’est simulé aujourd’hui.</p></> : null}
            {sheet === 'more' ? <><h2 className="font-semibold">Plus</h2>
              <button onClick={() => void pause()} className="flex w-full items-center gap-3 rounded-xl bg-muted p-3">{state === 'paused' ? <Play /> : <Pause />}{state === 'paused' ? 'Reprendre le direct' : 'Mettre en pause'}</button>
              <button disabled={mode !== 'camera'} onClick={() => void camera(facing === 'user' ? 'environment' : 'user')} className="flex w-full items-center gap-3 rounded-xl bg-muted p-3"><SwitchCamera />Retourner la caméra</button>
              <button onClick={toggleMic} className="flex w-full items-center gap-3 rounded-xl bg-muted p-3">{mic ? <MicOff /> : <Mic />}{mic ? 'Couper le micro' : 'Activer le micro'}</button>
              {torchOk ? <button onClick={() => void toggleTorch()} className="flex w-full items-center gap-3 rounded-xl bg-muted p-3"><Zap />{torch ? 'Éteindre le flash' : 'Allumer le flash'}</button> : null}</> : null}
            {sheet === 'settings' ? <><h2 className="font-semibold">Paramètres du direct</h2>
              <div className="flex gap-2">
                <button className={'flex-1 rounded-xl p-3 ' + (mode === 'camera' ? 'bg-primary text-primary-foreground' : 'bg-muted')} onClick={() => { setMode('camera'); void camera(facing); }}>Caméra</button>
                <button className={'flex-1 rounded-xl p-3 ' + (mode === 'prerecorded' ? 'bg-primary text-primary-foreground' : 'bg-muted')} onClick={() => { camStream.current?.getTracks().forEach(t => t.stop()); camStream.current = null; setMode('prerecorded'); }}>Vidéo préenregistrée</button>
              </div>
              {mode === 'prerecorded' ? <><input type="file" accept="video/*" className="block w-full text-sm" onChange={e => { const f = e.target.files?.[0]; if (f) setFileUrl(URL.createObjectURL(f)); }} />
                <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={rights} onChange={e => setRights(e.target.checked)} />Je possède les droits de diffusion de cette vidéo.</label>
                <button className="text-sm text-primary underline" onClick={() => void navigate({ to: '/creer/video', search: { mode: 'ai' } })}>Ouvrir le Studio IA</button></> : null}
              <p className="text-xs text-muted-foreground">Image diffusée : 720×1280 (9:16). Effet actif : {canvasFilter(lk) === 'none' ? 'aucun' : 'oui'}.</p></> : null}
            <button onClick={() => setSheet('')} className="w-full rounded-xl bg-muted p-3 font-medium">Fermer</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function EffectsPanel({ cat, setCat, look, setLook }: { cat: EffectCategory; setCat: (c: EffectCategory) => void; look: LiveLook; setLook: (l: LiveLook) => void }) {
  const key = ({ effets: 'effet', filtres: 'filtre', beaute: 'beaute', fond: 'fond' } as const)[cat];
  return (
    <div className="rounded-2xl border border-on-media/15 bg-media-scrim p-3 text-on-media backdrop-blur-md">
      <div role="tablist" className="mb-3 grid grid-cols-4 text-sm">
        {(Object.keys(CATEGORY_LABELS) as EffectCategory[]).map(c => <button key={c} role="tab" aria-selected={c === cat} onClick={() => setCat(c)} className={'border-b-2 pb-2 font-semibold ' + (c === cat ? 'border-primary' : 'border-transparent opacity-70')}>{CATEGORY_LABELS[c]}</button>)}
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {EFFECT_OPTIONS[cat].map(o => {
          const on = look[key] === o.id;
          return <button key={o.id} aria-pressed={on} onClick={() => setLook({ ...look, [key]: o.id })} className="flex w-16 shrink-0 flex-col items-center gap-1 text-xs">
            <span className={'grid size-16 place-items-center rounded-xl bg-on-media/10 text-2xl ' + (on ? 'ring-2 ring-primary' : '')}>{o.id === 'aucun' || o.id === 'normal' ? <Ban className="size-7" /> : ({ flou: '🌫️', cinema: '🎬', coeurs: '💖', etoiles: '✨', chaud: '🌅', froid: '❄️', vif: '🌈', nb: '⚫', sepia: '📜', doux: '🌸', eclat: '💡', vignette: '🔲', halo: '💜' } as Record<string, string>)[o.id]}</span>{o.label}
          </button>;
        })}
      </div>
    </div>
  );
}

function OverlayChat({ streamId, onHeart }: { streamId: string; onHeart: () => void }) {
  const { user } = useAuth(); const qc = useQueryClient(); const [body, setBody] = useState(''); const [err, setErr] = useState('');
  const key = ['live-comments', streamId];
  const q = useQuery({ queryKey: key, queryFn: () => liveComments({ data: { streamId } }), refetchInterval: 15000 });
  useEffect(() => { const ch = supabase.channel(`live-studio-${streamId}-${crypto.randomUUID()}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'live_comments', filter: `stream_id=eq.${streamId}` }, () => { void qc.invalidateQueries({ queryKey: key }); }).subscribe(); return () => { void supabase.removeChannel(ch); }; }, [streamId]); // eslint-disable-line react-hooks/exhaustive-deps
  async function send() { if (!user || !body.trim()) return; setErr(''); const { error } = await supabase.from('live_comments').insert({ stream_id: streamId, author_id: user.id, body: body.trim() }); if (error) { setErr(error.message); return; } setBody(''); void qc.invalidateQueries({ queryKey: key }); }
  const rows = (q.data ?? []).slice(-5);
  return <>
    <div aria-live="polite" className="max-h-56 w-4/5 space-y-2 overflow-hidden">
      {rows.length === 0 ? <p className="text-sm opacity-80">Aucun commentaire pour le moment.</p> : rows.map(c => <div key={c.id} className="flex items-start gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold">{(c.display_name ?? '?')[0]}</span><p className="min-w-0 break-words text-sm leading-snug [text-shadow:0_1px_2px_rgb(0_0_0/0.6)]"><span className="block font-semibold opacity-90">{c.display_name}</span>{c.body}</p></div>)}
    </div>
    <form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); void send(); }}>
      <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full border border-on-media/15 bg-media-scrim px-4 py-2 backdrop-blur-md">
        <input aria-label="Écrire un commentaire" maxLength={LIVE_COMMENT_MAX} value={body} onChange={e => setBody(e.target.value)} placeholder="Écrire un commentaire…" className="min-w-0 flex-1 bg-transparent text-on-media outline-none placeholder:text-on-media/60" />
        {body.trim() ? <button aria-label="Envoyer"><Send className="size-5" /></button> : <Smile className="size-5 opacity-80" />}
      </div>
      <button type="button" aria-label="Envoyer un cœur" onClick={onHeart} className="grid size-11 shrink-0 place-items-center rounded-full bg-media-scrim text-xl">💜</button>
    </form>
    {err ? <p role="alert" className="text-sm text-destructive">{err}</p> : null}
  </>;
}
