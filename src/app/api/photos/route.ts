// src/app/api/photos/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { validateSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Validate session
    const session = await validateSession(request);
    if (!session.valid) {
      return NextResponse.json(
        { success: false, error: session.error },
        { status: session.status }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const rawSessionId = formData.get("sessionId") as string;
    const caption = (formData.get("caption") as string) || null;

    if (!file || !rawSessionId) {
      return NextResponse.json(
        { success: false, error: "Missing file or sessionId" },
        { status: 400 }
      );
    }

    if (rawSessionId !== session.sessionId) {
      return NextResponse.json(
        { success: false, error: "SESSION_INVALID" },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Check if event is still active
    const { data: eventCheck } = await supabase
      .from("events")
      .select("is_active")
      .eq("id", session.eventId)
      .single();

    if (eventCheck && !eventCheck.is_active) {
      return NextResponse.json(
        { success: false, error: "EVENT_ENDED" },
        { status: 403 }
      );
    }

    // Check quota
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

    if (sessionData.photos_taken >= photoLimit) {
      return NextResponse.json(
        { success: false, error: "QUOTA_EXCEEDED" },
        { status: 403 }
      );
    }

    // Create DB record to get photo ID
    const { data: photo, error: photoError } = await supabase
      .from("photos")
      .insert({
        session_id: session.sessionId,
        event_id: session.eventId,
        storage_path: "", // placeholder
        caption,
      })
      .select("id")
      .single();

    if (photoError || !photo) {
      return NextResponse.json(
        { success: false, error: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    // Upload to Supabase Storage
    const storagePath = `${session.eventId}/${session.sessionId}/${photo.id}.jpg`;
    const fileBuffer = await file.arrayBuffer();

    const { error: uploadError } = await supabase.storage
      .from("photos")
      .upload(storagePath, fileBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      // Clean up the DB record
      await supabase.from("photos").delete().eq("id", photo.id);
      return NextResponse.json(
        { success: false, error: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    // Update storage path
    await supabase
      .from("photos")
      .update({ storage_path: storagePath })
      .eq("id", photo.id);

    // Increment photos_taken
    const { data: updatedSession } = await supabase
      .from("sessions")
      .update({
        photos_taken: sessionData.photos_taken + 1,
        last_photo_at: new Date().toISOString(),
      })
      .eq("id", session.sessionId)
      .select("photos_taken")
      .single();

    const photosTaken = updatedSession?.photos_taken ?? sessionData.photos_taken + 1;
    const photosLeft = Math.max(0, photoLimit - photosTaken);

    return NextResponse.json({
      success: true,
      data: {
        photoId: photo.id,
        photosLeft,
      },
    });
  } catch (err) {
    console.error("Photo upload error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}