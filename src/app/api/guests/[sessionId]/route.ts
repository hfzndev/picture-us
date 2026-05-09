// src/app/api/guests/[sessionId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = createServiceClient();

    // Get session with event info
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select(
        `
        id,
        status,
        photos_taken,
        activated_at,
        revoked_at,
        last_photo_at,
        event_id,
        guest_codes!inner (
          code
        ),
        events!inner (
          photo_limit
        )
      `
      )
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 404 }
      );
    }

    const rawEvent = session.events as unknown as { photo_limit?: number } | null;
    const photoLimit = rawEvent?.photo_limit || 8;

    // Get photos for this session
    const { data: photos } = await supabase
      .from("photos")
      .select("id, storage_path, caption, taken_at")
      .eq("session_id", sessionId)
      .eq("is_visible", true)
      .order("taken_at", { ascending: true });

    // Generate signed URLs
    const photosWithUrls =
      photos && photos.length > 0
        ? await Promise.all(
            photos.map(async (p) => {
              const { data: urlData } = await supabase.storage
                .from("photos")
                .createSignedUrl(p.storage_path, 3600);

              return {
                id: p.id,
                url: urlData?.signedUrl || "",
                caption: p.caption,
                takenAt: p.taken_at,
              };
            })
          )
        : [];

    // Get farewell message
    const { data: message } = await supabase
      .from("messages")
      .select("body, created_at")
      .eq("session_id", sessionId)
      .maybeSingle();

    // Determine guest label (activation order within event)
    const { data: allSessions } = await supabase
      .from("sessions")
      .select("id")
      .eq("event_id", session.event_id)
      .order("activated_at", { ascending: true });

    const guestIndex =
      allSessions?.findIndex((s) => s.id === sessionId) ?? -1;
    const guestLabel =
      guestIndex >= 0 ? `Guest #${guestIndex + 1}` : "Unknown Guest";

    return NextResponse.json({
      success: true,
      data: {
        sessionId: session.id,
        guestLabel,
        status: session.status,
        photosTaken: session.photos_taken,
        photoLimit,
        activatedAt: session.activated_at,
        revokedAt: session.revoked_at,
        lastPhotoAt: session.last_photo_at,
        photos: photosWithUrls,
        message: message
          ? { body: message.body, createdAt: message.created_at }
          : null,
      },
    });
  } catch (err) {
    console.error("Guest detail error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}