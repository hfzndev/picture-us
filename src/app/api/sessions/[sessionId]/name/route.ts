// src/app/api/sessions/[sessionId]/name/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { sessionId } = await params;
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const deviceFp = req.headers.get("X-Device-FP");

  if (!token || !deviceFp) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const guestName = typeof body.guestName === "string" ? body.guestName.trim().slice(0, 80) : "";

  const supabase = createServiceClient();

  // Validate session ownership via device fingerprint
  // The bearer token is a base64-encoded JSON with sessionId embedded
  let tokenSessionId: string | null = null;
  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    tokenSessionId = decoded.sessionId ?? null;
  } catch {
    // token is not base64 JSON — treat as invalid
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("id, device_fp, status")
    .eq("id", sessionId)
    .single();

  if (!session) {
    return NextResponse.json({ success: false, error: "SESSION_NOT_FOUND" }, { status: 404 });
  }

  // Verify token references this session AND device fingerprint matches
  if (tokenSessionId !== sessionId || session.device_fp !== deviceFp) {
    return NextResponse.json({ success: false, error: "UNAUTHORIZED" }, { status: 403 });
  }

  if (session.status !== "active") {
    return NextResponse.json({ success: false, error: "SESSION_NOT_ACTIVE" }, { status: 409 });
  }

  // Update guest_name (allow empty string to clear)
  const { error } = await supabase
    .from("sessions")
    .update({ guest_name: guestName || null })
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json({ success: false, error: "DB_ERROR" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
