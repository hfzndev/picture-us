// src/app/api/codes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get("eventId");

  if (!eventId) {
    return NextResponse.json({ success: false, error: "MISSING_EVENT_ID" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify authenticated + owns event
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("host_id", user.id)
    .single();

  if (!event) {
    return NextResponse.json({ success: false, error: "EVENT_NOT_FOUND" }, { status: 404 });
  }

  // Fetch codes + associated session guest_name
  const { data: codes, error } = await supabase
    .from("guest_codes")
    .select(`
      id,
      code,
      status,
      created_at,
      activated_at,
      expires_at,
      sessions (
        id,
        guest_name,
        photos_taken,
        status
      )
    `)
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ success: false, error: "DB_ERROR" }, { status: 500 });
  }

  // Format: add displayFormat (ABC-DEF)
  const formatted = (codes ?? []).map((c) => ({
    id: c.id,
    code: c.code,
    displayFormat: c.code.slice(0, 3) + "-" + c.code.slice(3),
    status: c.status,
    createdAt: c.created_at,
    activatedAt: c.activated_at,
    expiresAt: c.expires_at,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    guestName: (c.sessions as any)?.guest_name ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    photosTaken: (c.sessions as any)?.photos_taken ?? null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sessionStatus: (c.sessions as any)?.status ?? null,
  }));

  return NextResponse.json({ success: true, data: formatted });
}
