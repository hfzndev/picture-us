// src/app/api/messages/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await validateSession(request);
    if (!session.valid) {
      return NextResponse.json(
        { success: false, error: session.error },
        { status: session.status }
      );
    }

    const { sessionId, body } = await request.json();

    if (!sessionId || !body?.trim()) {
      return NextResponse.json(
        { success: false, error: "Message body required" },
        { status: 400 }
      );
    }

    if (sessionId !== session.sessionId) {
      return NextResponse.json(
        { success: false, error: "SESSION_INVALID" },
        { status: 401 }
      );
    }

    if (body.length > 300) {
      return NextResponse.json(
        { success: false, error: "MESSAGE_TOO_LONG", data: { maxLength: 300 } },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Check that session has used all photos
    const { data: sessionData } = await supabase
      .from("sessions")
      .select("photos_taken, event_id")
      .eq("id", session.sessionId)
      .single();

    if (!sessionData) {
      return NextResponse.json(
        { success: false, error: "SESSION_INVALID" },
        { status: 401 }
      );
    }

    const { data: event } = await supabase
      .from("events")
      .select("photo_limit")
      .eq("id", sessionData.event_id)
      .single();

    const photoLimit = event?.photo_limit || 8;

    if (sessionData.photos_taken < photoLimit) {
      return NextResponse.json(
        { success: false, error: "QUOTA_NOT_REACHED" },
        { status: 403 }
      );
    }

    // Insert message
    const { data: message, error: msgError } = await supabase
      .from("messages")
      .insert({
        session_id: session.sessionId,
        event_id: session.eventId,
        body: body.trim(),
      })
      .select("id")
      .single();

    if (msgError) {
      return NextResponse.json(
        { success: false, error: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    // Revoke the session
    await supabase
      .from("sessions")
      .update({
        status: "completed",
        revoked_at: new Date().toISOString(),
      })
      .eq("id", session.sessionId);

    return NextResponse.json({
      success: true,
      data: {
        messageId: message.id,
        sessionEnded: true,
      },
    });
  } catch (err) {
    console.error("Message submit error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}