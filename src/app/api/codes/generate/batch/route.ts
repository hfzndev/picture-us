// src/app/api/codes/generate/batch/route.ts
import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { generateGuestCode, formatCode } from "@/lib/utils";

export async function POST(request: Request) {
  try {
    const { eventId, count } = await request.json();

    if (!eventId || !count || count < 1 || count > 500) {
      return NextResponse.json(
        { success: false, error: "INVALID_PARAMS" },
        { status: 400 }
      );
    }

    // Validate receptionist token from cookie
    const token = request.headers
      .get("cookie")
      ?.match(/receptionist_token=([^;]+)/)?.[1];

    if (!token) {
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

    // Generate unique codes
    const codes: { code: string; displayFormat: string }[] = [];
    const seenCodes = new Set<string>();

    for (let i = 0; i < count; i++) {
      let code = generateGuestCode();
      let attempts = 0;

      while (seenCodes.has(code) && attempts < 20) {
        code = generateGuestCode();
        attempts++;
      }

      if (attempts >= 20) {
        return NextResponse.json(
          { success: false, error: "GENERATION_FAILED" },
          { status: 500 }
        );
      }

      seenCodes.add(code);
      codes.push({ code, displayFormat: formatCode(code) });
    }

    // Check for existing codes in DB (rare collision)
    const allCodes = codes.map((c) => c.code);
    const { data: existingCodes } = await supabase
      .from("guest_codes")
      .select("code")
      .in("code", allCodes);

    if (existingCodes && existingCodes.length > 0) {
      const existingSet = new Set(existingCodes.map((c) => c.code));
      // Replace duplicates with new unique codes
      for (let i = 0; i < codes.length; i++) {
        if (existingSet.has(codes[i].code)) {
          let newCode = generateGuestCode();
          let retries = 0;
          while (
            (seenCodes.has(newCode) || existingSet.has(newCode)) &&
            retries < 20
          ) {
            newCode = generateGuestCode();
            retries++;
          }
          seenCodes.add(newCode);
          codes[i] = { code: newCode, displayFormat: formatCode(newCode) };
        }
      }
    }

    // Bulk insert
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 1);

    const inserts = codes.map((c) => ({
      event_id: eventId,
      code: c.code,
      status: "unused",
      expires_at: expiresAt.toISOString(),
    }));

    const { error: insertError } = await supabase
      .from("guest_codes")
      .insert(inserts);

    if (insertError) {
      return NextResponse.json(
        { success: false, error: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        codes: codes.map((c) => ({
          code: c.code,
          displayFormat: c.displayFormat,
        })),
        eventName: event.name,
      },
    });
  } catch (err) {
    console.error("Batch code generation error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}