-- supabase/migrations/00001_schema.sql
-- Picture Us — Core Schema

-- 1. events
CREATE TABLE public.events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  event_date        DATE NOT NULL,
  photo_limit       INTEGER NOT NULL DEFAULT 8 CHECK (photo_limit BETWEEN 1 AND 50),
  theme_color       TEXT NOT NULL DEFAULT 'amber',
  receptionist_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_events_host_id ON public.events(host_id);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hosts can manage own events"
  ON public.events FOR ALL TO authenticated
  USING (auth.uid() = host_id)
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Anyone can read active events"
  ON public.events FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- 2. guest_codes
CREATE TABLE public.guest_codes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  code              TEXT NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'unused'
                    CHECK (status IN ('unused', 'active', 'consumed')),
  device_fp         TEXT,
  activated_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_guest_codes_event_status ON public.guest_codes(event_id, status);
CREATE INDEX idx_guest_codes_code ON public.guest_codes(code);

ALTER TABLE public.guest_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read unused codes"
  ON public.guest_codes FOR SELECT TO anon
  USING (status = 'unused');

CREATE POLICY "Hosts can read codes for their events"
  ON public.guest_codes FOR SELECT TO authenticated
  USING (
    event_id IN (
      SELECT id FROM public.events WHERE host_id = auth.uid()
    )
  );

-- 3. sessions
CREATE TABLE public.sessions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id           UUID NOT NULL UNIQUE REFERENCES public.guest_codes(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL,
  device_fp         TEXT NOT NULL,
  photos_taken      INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'completed', 'revoked')),
  activated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at        TIMESTAMPTZ,
  last_photo_at     TIMESTAMPTZ
);

CREATE INDEX idx_sessions_event_id ON public.sessions(event_id);
CREATE INDEX idx_sessions_user_id ON public.sessions(user_id);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can read own session"
  ON public.sessions FOR SELECT TO anon
  USING (user_id = auth.uid());

CREATE POLICY "Hosts can read sessions for their events"
  ON public.sessions FOR SELECT TO authenticated
  USING (
    event_id IN (
      SELECT id FROM public.events WHERE host_id = auth.uid()
    )
  );

CREATE POLICY "Anon can update own session"
  ON public.sessions FOR UPDATE TO anon
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND status = 'active');

-- 4. photos
CREATE TABLE public.photos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  storage_path      TEXT NOT NULL,
  caption           TEXT,
  taken_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_photos_event_id ON public.photos(event_id);
CREATE INDEX idx_photos_session_id ON public.photos(session_id);
CREATE INDEX idx_photos_taken_at ON public.photos(event_id, taken_at DESC);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert photos for own session"
  ON public.photos FOR INSERT TO anon
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Anon can read own photos"
  ON public.photos FOR SELECT TO anon
  USING (
    session_id IN (
      SELECT id FROM public.sessions WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can read photos for their events"
  ON public.photos FOR SELECT TO authenticated
  USING (
    event_id IN (
      SELECT id FROM public.events WHERE host_id = auth.uid()
    )
  );

-- 5. messages
CREATE TABLE public.messages (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
  event_id          UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  body              TEXT NOT NULL CHECK (char_length(body) <= 300),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_messages_event_id ON public.messages(event_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anon can insert message for own session"
  ON public.messages FOR INSERT TO anon
  WITH CHECK (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Hosts can read messages for their events"
  ON public.messages FOR SELECT TO authenticated
  USING (
    event_id IN (
      SELECT id FROM public.events WHERE host_id = auth.uid()
    )
  );

-- Enable Realtime for photos and messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.photos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;