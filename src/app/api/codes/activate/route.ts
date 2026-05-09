// src/app/api/codes/activate/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const { code, eventId, deviceFp } = await request.json();

    if (!code || !eventId || !deviceFp) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Validate code
    const { data: guestCode, error: codeError } = await supabase
      .from("guest_codes")
      .select("id, status, expires_at")
      .eq("code", code.toUpperCase())
      .single();

    if (codeError || !guestCode) {
      return NextResponse.json({ success: false, error: "INVALID_CODE" }, { status: 401 });
    }

    if (guestCode.status !== "unused") {
      return NextResponse.json({ success: false, error: "INVALID_CODE" }, { status: 401 });
    }

    if (new Date(guestCode.expires_at) < new Date()) {
      return NextResponse.json({ success: false, error: "CODE_EXPIRED" }, { status: 410 });
    }

    // Create a guest user via admin API
    const timestamp = Date.now();
    const guestEmail = `guest_${timestamp}_${Math.random().toString(36).slice(2, 8)}@pictureus.local`;
    const guestPassword = `pw_${Math.random().toString(36).slice(2, 16)}`;

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: guestEmail,
      password: guestPassword,
      email_confirm: true,
      user_metadata: { role: "guest" },
    });

    if (authError || !authData.user) {
      return NextResponse.json({ success: false, error: "INTERNAL_ERROR" }, { status: 500 });
    }

    // Get event details
    const { data: event } = await supabase
      .from("events")
      .select("name, photo_limit, is_active")
      .eq("id", eventId)
      .single();

    if (event && !event.is_active) {
      return NextResponse.json(
        { success: false, error: "EVENT_ENDED" },
        { status: 403 }
      );
    }

    const photoLimit = event?.photo_limit || 8;

    // Update code status
    await supabase
      .from("guest_codes")
      .update({ status: "active", device_fp: deviceFp, activated_at: new Date().toISOString() })
      .eq("id", guestCode.id);

    // Create session record
    const { data: session } = await supabase
      .from("sessions")
      .insert({
        code_id: guestCode.id,
        event_id: eventId,
        user_id: authData.user.id,
        device_fp: deviceFp,
        photos_taken: 0,
        status: "active",
      })
      .select("id")
      .single();

    // Generate a session token that encodes the session info
    const sessionToken = Buffer.from(
      JSON.stringify({
        userId: authData.user.id,
        sessionId: session?.id,
        eventId,
      })
    ).toString("base64");

    return NextResponse.json({
      success: true,
      data: {
        sessionToken,
        sessionId: session?.id,
        photosLeft: photoLimit,
        photoLimit,
        eventName: event?.name || "the Event",
      },
    });
  } catch (err) {
    console.error("Code activation error:", err);
    return NextResponse.json({ success: false, error: "INTERNAL_ERROR" }, { status: 500 });
  }
}