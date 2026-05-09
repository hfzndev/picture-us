-- supabase/migrations/00002_recycle_bin.sql
-- Picture Us — Add is_visible column + RLS for update/delete

ALTER TABLE public.photos ADD COLUMN is_visible BOOLEAN NOT NULL DEFAULT true;

-- Host can update photos for their events (soft-delete to recycle bin / restore)
CREATE POLICY "Hosts can update photos for their events"
  ON public.photos FOR UPDATE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE host_id = auth.uid()))
  WITH CHECK (event_id IN (SELECT id FROM public.events WHERE host_id = auth.uid()));

-- Host can delete photos for their events (permanent delete from recycle bin)
CREATE POLICY "Hosts can delete photos for their events"
  ON public.photos FOR DELETE TO authenticated
  USING (event_id IN (SELECT id FROM public.events WHERE host_id = auth.uid()));