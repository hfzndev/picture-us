// src/app/api/events/[eventId]/toggle/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    const { eventId } = await params;
    const supabase = createServiceClient();

    // Get current state
    const { data: event, error: fetchError } = await supabase
      .from("events")
      .select("id, is_active")
      .eq("id", eventId)
      .single();

    if (fetchError || !event) {
      return NextResponse.json(
        { success: false, error: "Event not found" },
        { status: 404 }
      );
    }

    const newState = !event.is_active;

    const { error: updateError } = await supabase
      .from("events")
      .update({ is_active: newState })
      .eq("id", eventId);

    if (updateError) {
      console.error("Event toggle error:", updateError);
      return NextResponse.json(
        { success: false, error: "Failed to update event" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: event.id, isActive: newState },
    });
  } catch (err) {
    console.error("Event toggle error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}