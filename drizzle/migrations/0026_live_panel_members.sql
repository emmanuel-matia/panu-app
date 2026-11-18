CREATE TABLE public.live_panel_members (
 stream_id uuid NOT NULL REFERENCES public.live_streams(id) ON DELETE CASCADE,
 user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
 role text NOT NULL DEFAULT 'guest' CHECK (role IN ('host','guest')),
 status text NOT NULL CHECK (status IN ('requested','invited','accepted','connected','rejected','removed','left')),
 muted_by_host boolean NOT NULL DEFAULT false,
 cf_session_id text,
 video_track text,
 audio_track text,
 updated_at timestamptz NOT NULL DEFAULT now(),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (stream_id, user_id)
);
GRANT ALL ON public.live_panel_members TO service_role;
ALTER TABLE public.live_panel_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_streams ADD COLUMN IF NOT EXISTS panel_layout text NOT NULL DEFAULT 'grid' CHECK (panel_layout IN ('grid','panel'));
ALTER TABLE public.live_streams ADD COLUMN IF NOT EXISTS panel_open boolean NOT NULL DEFAULT true;