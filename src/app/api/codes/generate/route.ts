// src/app/api/codes/generate/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateGuestCode, formatCode } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { eventId } = await request.json();

    // Validate receptionist token from cookie
    const token = request.headers.get("cookie")?.match(/receptionist_token=([^;]+)/)?.[1];

    if (!token || !eventId) {
      return NextResponse.json(
        { success: false, error: "INVALID_RECEPTIONIST_TOKEN" },
        { status: 401 }
      );
    }

    const supabase = createServiceClient();

    // Validate token against event
    const { data: event } = await supabase
      .from("events")
      .select("id, name, receptionist_token, is_active")
      .eq("id", eventId)
      .eq("receptionist_token", token)
      .single();

    if (!event || !event.is_active) {
      return NextResponse.json(
        { success: false, error: "INVALID_RECEPTIONIST_TOKEN" },
        { status: 401 }
      );
    }

    // Generate unique code
    let code = generateGuestCode();
    let attempts = 0;

    while (attempts < 10) {
      const { data: existing } = await supabase
        .from("guest_codes")
        .select("id")
        .eq("code", code)
        .single();

      if (!existing) break;

      code = generateGuestCode();
      attempts++;
    }

    if (attempts >= 10) {
      return NextResponse.json(
        { success: false, error: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    // Insert code
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1); // 1 day expiry

    const { error: insertError } = await supabase.from("guest_codes").insert({
      event_id: eventId,
      code,
      status: "unused",
      expires_at: expiresAt.toISOString(),
    });

    if (insertError) {
      return NextResponse.json(
        { success: false, error: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        code,
        displayFormat: formatCode(code),
        eventName: event.name,
      },
    });
  } catch (err) {
    console.error("Code generation error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}