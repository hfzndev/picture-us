// src/app/api/export/photos/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import JSZip from "jszip";

export async function GET(request: NextRequest) {
  try {
    const eventId = request.nextUrl.searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json(
        { success: false, error: "Missing eventId parameter" },
        { status: 400 }
      );
    }

    const supabase = createServiceClient();

    // Get event name for the zip filename
    const { data: event } = await supabase
      .from("events")
      .select("name")
      .eq("id", eventId)
      .single();

    const eventName = event?.name || "event";

    // Get all photos
    const { data: photos, error: photosError } = await supabase
      .from("photos")
      .select("storage_path, taken_at")
      .eq("event_id", eventId)
      .eq("is_visible", true)
      .order("taken_at", { ascending: true });

    if (photosError) {
      return NextResponse.json(
        { success: false, error: "Failed to load photos" },
        { status: 500 }
      );
    }

    if (!photos || photos.length === 0) {
      return NextResponse.json(
        { success: false, error: "No photos to export" },
        { status: 404 }
      );
    }

    // Download each photo from Storage and add to zip
    const zip = new JSZip();
    const photoFolder = zip.folder(eventName);

    if (!photoFolder) {
      return NextResponse.json(
        { success: false, error: "Failed to create zip folder" },
        { status: 500 }
      );
    }

    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      try {
        const { data: fileData, error: downloadError } = await supabase.storage
          .from("photos")
          .download(photo.storage_path);

        if (downloadError || !fileData) {
          console.warn(`Failed to download ${photo.storage_path}:`, downloadError);
          continue;
        }

        const buffer = await fileData.arrayBuffer();
        const ext = photo.storage_path.split(".").pop() || "jpg";
        const filename = `photo_${String(i + 1).padStart(3, "0")}.${ext}`;
        photoFolder.file(filename, buffer);
      } catch (err) {
        console.warn(`Skipping photo ${photo.storage_path}:`, err);
        continue;
      }
    }

    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    // Sanitize filename for Content-Disposition
    const safeName = eventName.replace(/[^a-zA-Z0-9_-]/g, "_");

    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${safeName}-photos.zip"`,
        "Content-Length": zipBuffer.length.toString(),
      },
    });
  } catch (err) {
    console.error("Photo export error:", err);
    return NextResponse.json(
      { success: false, error: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}