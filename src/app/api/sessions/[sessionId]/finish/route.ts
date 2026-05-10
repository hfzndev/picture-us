// src/app/api/sessions/[sessionId]/finish/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = createServiceClient();

    // 1. Extract bearer token
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const token = authHeader.slice(7);

    // 2. Verify token and get user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "UNAUTHORIZED" },
        { status: 401 }
      );
    }

    // 3. Get session, verify ownership and status
    const { data: session, error: sessionError } = await supabase
      .from("sessions")
      .select("id, code_id, status, user_id")
      .eq("id", sessionId)
      .single();

    if (sessionError || !session) {
      return NextResponse.json(
        { success: false, error: "SESSION_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (session.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "SESSION_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (session.status !== "active") {
      return NextResponse.json(
        { success: false, error: "SESSION_NOT_ACTIVE" },
        { status: 400 }
      );
    }

    // 4. Update session status to completed
    const now = new Date().toISOString();
    const { error: updateSessionError } = await supabase
      .from("sessions")
      .update({ status: "completed", revoked_at: now })
      .eq("id", sessionId);

    if (updateSessionError) {
      console.error("Session finish — update sessions error:", updateSessionError);
      return NextResponse.json(
        { success: false, error: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    // 5. Mark guest code as consumed
    const { error: updateCodeError } = await supabase
      .from("guest_codes")
      .update({ status: "consumed" })
      .eq("id", session.code_id);

    if (updateCodeError) {
      console.error("Session finish — update guest_codes error:", updateCodeError);
      // Session is already updated; don't fail the request over code status
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Session finish error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}