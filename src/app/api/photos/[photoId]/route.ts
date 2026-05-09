// src/app/api/photos/[photoId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// PATCH — toggle is_visible (trash / restore)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params;
    const body = await request.json();
    const isVisible = body.isVisible;

    if (typeof isVisible !== "boolean") {
      return NextResponse.json(
        { success: false, error: "isVisible must be a boolean" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    const { data: photo, error } = await supabase
      .from("photos")
      .update({ is_visible: isVisible })
      .eq("id", photoId)
      .select("id, is_visible")
      .single();

    if (error) {
      console.error("Photo update error:", error);
      return NextResponse.json(
        { success: false, error: "Failed to update photo" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { id: photo.id, isVisible: photo.is_visible },
    });
  } catch (err) {
    console.error("Photo PATCH error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

// DELETE — permanently remove photo from DB and Storage
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ photoId: string }> }
) {
  try {
    const { photoId } = await params;
    const supabase = createServiceClient();

    // Get photo info first (need storage_path)
    const { data: photo, error: fetchError } = await supabase
      .from("photos")
      .select("id, storage_path")
      .eq("id", photoId)
      .single();

    if (fetchError || !photo) {
      return NextResponse.json(
        { success: false, error: "Photo not found" },
        { status: 404 }
      );
    }

    // Delete from DB first
    const { error: dbError } = await supabase
      .from("photos")
      .delete()
      .eq("id", photoId);

    if (dbError) {
      console.error("Photo delete DB error:", dbError);
      return NextResponse.json(
        { success: false, error: "Failed to delete photo" },
        { status: 500 }
      );
    }

    // Delete from Storage (best-effort)
    const { error: storageError } = await supabase.storage
      .from("photos")
      .remove([photo.storage_path]);

    if (storageError) {
      console.warn("Photo delete Storage error (file may be orphaned):", storageError);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Photo DELETE error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}