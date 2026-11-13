import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Flag, LogOut, Radio, ShieldAlert, Users, Volume2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FollowButton } from "@/components/profile/FollowButton";
import { ShareMenu } from "@/components/share/ShareMenu";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { joinLive, liveAnswer, publicLives, stopReportedLive, viewerPresence, type LiveSummary } from "@/lib/live.functions";
import { liveShareTitle } from "@/lib/live-rules";
import { waitIce } from "@/lib/live-peer";
import { LiveChat } from "./LiveChat";

type PlayState = "idle" | "connecting" | "playing" | "error";

/** Lecteur spectateur : reçoit le flux Cloudflare du créateur (WebRTC, réception seule). */
export function LiveViewer({ initial }: { initial: LiveSummary }) {
  const id = initial.id;
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const watchToken = useRef<string | null>(null);
  const busy = useRef(false);
  const [play, setPlay] = useState<PlayState>("idle");
  const [error, setError] = useState("");
  const [muted, setMuted] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");

  const liveQuery = useQuery({
    queryKey: ["live", id],
    queryFn: async () => (await publicLives({ data: { streamId: id } }))[0] ?? null,
    initialData: initial,
    refetchInterval: 2_000,
  });
  const live = liveQuery.data ?? { ...initial, status: "ended" as const };
  const active = live.status !== "ended";
  const isHost = user?.id === live.hostId;

  const staffQuery = useQuery({
    queryKey: ["my-staff-role", user?.id],
    enabled: Boolean(user),
    queryFn: async () => (await supabase.rpc("my_staff_role")).data ?? null,
  });

  function disconnect() {
    const token = watchToken.current;
    watchToken.current = null;
    if(token) void viewerPresence({data:{watchToken:token,leave:true}}).catch(()=>undefined);
    pc.current?.close();
    pc.current = null;
    if (video.current) video.current.srcObject = null;
  }

  async function watch() {
    if(busy.current) return;
    busy.current = true;
    setError("");
    setPlay("connecting");
    try {
      disconnect();
      const joined = await joinLive({ data: { streamId: id } });
      watchToken.current = joined.watchToken;
      const peer = new RTCPeerConnection({ bundlePolicy: "max-bundle" });
      pc.current = peer;
      const stream = new MediaStream();
      peer.ontrack = (event) => {
        stream.addTrack(event.track);
        if (video.current && video.current.srcObject !== stream) {
          video.current.srcObject = stream;
          void video.current.play().catch(() => undefined);
        }
      };
      peer.onconnectionstatechange = () => {
        if (["failed", "disconnected"].includes(peer.connectionState)) {
          setPlay("error");
        }
        if (peer.connectionState === "failed") {
          setPlay("error");
          setError("Connexion au direct perdue. Touchez « Regarder » pour réessayer.");
        }
      };
      await peer.setRemoteDescription(joined.offer);
      await peer.setLocalDescription(await peer.createAnswer());
      await waitIce(peer);
      const local = peer.localDescription;
      if (!local) throw new Error("Connexion vidéo non prête.");
      await liveAnswer({ data: { watchToken: joined.watchToken, answer: { type: "answer", sdp: local.sdp } } });
    } catch (e) {
      disconnect();
      setPlay("error");
      setError(e instanceof Error ? e.message : "Lecture impossible.");
    } finally {
      busy.current = false;
    }
  }

  // Public playback: authentication is only required for participation.
  useEffect(() => {
    if (loading || isHost || initial.status === "ended") return;
    void watch();
    return () => {
      disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user?.id, id]);

  // Count only decoded video playback; leave immediately on pause/network loss.
  useEffect(() => {
    if (play !== "playing") return;
    const beat = () => {
      const token = watchToken.current;
      if(token && video.current && !video.current.paused && pc.current?.connectionState === 'connected')
        void viewerPresence({data:{watchToken:token,leave:false}}).catch(()=>undefined);
    };
    beat(); const timer = setInterval(beat, 4_000);
    return () => { clearInterval(timer); const token=watchToken.current; if(token) void viewerPresence({data:{watchToken:token,leave:true}}).catch(()=>undefined); };
  }, [play, id]);

  useEffect(() => {
    const exit = () => { const token=watchToken.current; if(token) navigator.sendBeacon('/api/public/live-leave',token); };
    const online = () => { if(active && !isHost && !busy.current) void watch(); };
    window.addEventListener('pagehide',exit); window.addEventListener('online',online);
    return () => {window.removeEventListener('pagehide',exit);window.removeEventListener('online',online);};
  }, [active,isHost]);

  // Le créateur a terminé : on coupe la lecture.
  useEffect(() => {
    if (!active && pc.current) {
      disconnect();
      setPlay("idle");
    }
  }, [active]);

  async function leave() {
    disconnect();
    void navigate({ to: "/live" });
  }

  async function report() {
    if (!user || !reason.trim()) return;
    const { error: e } = await supabase
      .from("live_reports")
      .insert({ stream_id: id, reporter_id: user.id, reason: reason.trim().slice(0, 500) });
    if (e) {
      toast.error(e.code === "23505" ? "Vous avez déjà signalé ce direct." : "Signalement impossible.");
      return;
    }
    toast.success("Signalement envoyé à l'équipe PANU.");
    setReportOpen(false);
    setReason("");
  }

  async function staffStop() {
    if (!window.confirm("Arrêter ce direct pour tous les spectateurs ?")) return;
    try {
      await stopReportedLive({ data: { streamId: id } });
      toast.success("Direct arrêté.");
      void liveQuery.refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Arrêt impossible.");
    }
  }

  const badge = live.status === "live" ? "EN DIRECT" : live.status === "paused" ? "EN PAUSE" : "DIRECT TERMINÉ";
  const shareUrl = typeof window === "undefined" ? `https://panu.site/live/${id}` : `${window.location.origin}/live/${id}`;

  return (
    <>
      <section className="space-y-4 p-4">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
          <video
            ref={video}
            autoPlay
            playsInline
            muted={muted}
            onPlaying={() => setPlay("playing")}
            onPause={() => setPlay("idle")}
            onWaiting={() => setPlay("connecting")}
            poster={live.coverUrl ?? undefined}
            className="h-full w-full bg-background object-contain"
          />
          <span
            className={`absolute left-3 top-3 rounded-md px-2 py-1 text-xs font-bold ${
              live.status === "live" ? "bg-destructive text-destructive-foreground" : "bg-background/80"
            }`}
          >
            {badge}
            {live.sourceKind === "prerecorded" ? " · PRÉENREGISTRÉ" : ""}
          </span>
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-md bg-background/80 px-2 py-1 text-xs font-semibold">
            <Users className="size-3.5" />
            {live.viewersCount}
          </span>
          {play === "playing" && muted ? (
            <Button size="sm" className="absolute bottom-3 right-3" onClick={() => setMuted(false)}>
              <Volume2 />
              Activer le son
            </Button>
          ) : null}
          {active && play !== "playing" ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/40">
              {isHost ? (
                <Button asChild>
                  <Link to="/studio-live">Retour au studio</Link>
                </Button>
              ) : (
                <Button onClick={() => void watch()} disabled={play === "connecting"}>
                  <Radio />
                  {play === "connecting" ? "Connexion…" : "Regarder"}
                </Button>
              )}
            </div>
          ) : null}
        </div>
        {error ? (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <Link to="/@{$username}" params={{ username: live.hostUsername }} className="flex min-w-0 flex-1 items-center gap-3">
            {live.hostAvatarUrl ? (
              <img src={live.hostAvatarUrl} alt="" className="size-11 rounded-full object-cover" />
            ) : (
              <span className="flex size-11 items-center justify-center rounded-full bg-muted font-semibold">
                {live.hostDisplayName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="min-w-0">
              <span className="block truncate font-semibold">{live.hostDisplayName}</span>
              <span className="block truncate text-sm text-muted-foreground">{live.title}</span>
            </span>
          </Link>
          {!isHost ? <FollowButton profileId={live.hostId} username={live.hostUsername} compact /> : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <ShareMenu
            url={shareUrl}
            title={liveShareTitle({ status: live.status, hostDisplayName: live.hostDisplayName, title: live.title })}
          />
          {user && !isHost && active ? (
            <Button variant="outline" onClick={() => setReportOpen(true)}>
              <Flag />
              Signaler
            </Button>
          ) : null}
          {staffQuery.data && active && !isHost ? (
            <Button variant="destructive" onClick={() => void staffStop()}>
              <ShieldAlert />
              Arrêter (modération)
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => void leave()}>
            <LogOut />
            Quitter
          </Button>
        </div>
        {!active ? <p className="text-sm text-muted-foreground">Ce direct est terminé.</p> : null}
      </section>
      {user && active ? <LiveChat streamId={id} /> : null}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Signaler ce direct</DialogTitle>
          </DialogHeader>
          <textarea
            aria-label="Motif du signalement"
            placeholder="Expliquez le problème (contenu choquant, arnaque, droits d'auteur…)"
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="min-h-28 w-full rounded-md border border-input bg-background p-3 text-sm"
          />
          <Button onClick={() => void report()} disabled={!reason.trim()}>
            Envoyer le signalement
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
