// src/app/api/photos/trash/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// DELETE — permanently delete all trashed photos for an event
export async function DELETE(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Missing eventId parameter" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get all trashed photos for this event
    const { data: photos, error: fetchError } = await supabase
      .from("photos")
      .select("id, storage_path")
      .eq("event_id", eventId)
      .eq("is_visible", false);

    if (fetchError) {
      console.error("Fetch trashed photos error:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to load trashed photos" },
        { status: 500 }
      );
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json({
        success: true,
        data: { deleted: 0 },
      });
    }

    const photoIds = photos.map((p) => p.id);
    const storagePaths = photos.map((p) => p.storage_path);

    // Delete from DB
    const { error: dbError } = await supabase
      .from("photos")
      .delete()
      .in("id", photoIds);

    if (dbError) {
      console.error("Bulk delete DB error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to delete photos" },
        { status: 500 }
      );
    }

    // Delete from Storage (best-effort)
    const { error: storageError } = await supabase.storage
      .from("photos")
      .remove(storagePaths);

    if (storageError) {
      console.warn("Bulk delete Storage error (some files may be orphaned):", storageError);
    }

    return NextResponse.json({
      success: true,
      data: { deleted: photoIds.length },
    });
  } catch (err) {
    console.error("Trash bulk delete error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}