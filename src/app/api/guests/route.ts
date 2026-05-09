// src/app/api/guests/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Missing eventId parameter" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get all sessions for this event with their code info
    const { data: sessions, error: sessionError } = await supabase
      .from("sessions")
      .select(
        `
        id,
        status,
        photos_taken,
        activated_at,
        revoked_at,
        last_photo_at,
        guest_codes!inner (
          code,
          event_id
        ),
        messages (
          id
        )
      `
      )
      .eq("event_id", eventId)
      .order("activated_at", { ascending: true });

    if (sessionError) {
      console.error("Guest list query error:", sessionError);
      return NextResponse.json(
        { success: false, error: "Failed to load guests" },
        { status: 500 }
      );
    }

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

    // Get event photo limit
    const { data: event } = await supabase
      .from("events")
      .select("photo_limit")
      .eq("id", eventId)
      .single();

    const photoLimit = event?.photo_limit || 8;

    // Map to guest list items
    const guests = sessions.map((session, index) => ({
      sessionId: session.id,
      guestLabel: `Guest #${index + 1}`,
      status: session.status,
      photosTaken: session.photos_taken,
      photoLimit,
      activatedAt: session.activated_at,
      revokedAt: session.revoked_at,
      lastPhotoAt: session.last_photo_at,
      hasMessage: Array.isArray(session.messages) && session.messages.length > 0,
    }));

    return NextResponse.json({
      success: true,
      data: guests,
    });
  } catch (err) {
    console.error("Guest list error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}