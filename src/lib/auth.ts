// src/lib/auth.ts
import { createServiceClient } from "@/lib/supabase/service";

interface SessionInfo {
  userId: string;
  sessionId: string;
  eventId: string;
}

/**
 * Decode the session token from the Authorization header and validate it.
 */
export async function validateSession(
  request: Request
): Promise<{ valid: false; error: string; status: number } | { valid: true; sessionId: string; userId: string; eventId: string }> {
  const authHeader = request.headers.get("Authorization");
  const deviceFp = request.headers.get("X-Device-FP");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { valid: false, error: "UNAUTHORIZED", status: 401 };
  }

  if (!deviceFp) {
    return { valid: false, error: "DEVICE_MISMATCH", status: 409 };
  }

  const token = authHeader.slice(7);

  // Decode the session token
  let sessionInfo: SessionInfo;
  try {
    sessionInfo = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
  } catch {
    return { valid: false, error: "SESSION_INVALID", status: 401 };
  }

  const { sessionId, userId, eventId } = sessionInfo;

  if (!sessionId || !userId || !eventId) {
    return { valid: false, error: "SESSION_INVALID", status: 401 };
  }

  // Validate against database
  const supabase = createServiceClient();

  const { data: session } = await supabase
    .from("sessions")
    .select("id, status, device_fp, photos_taken, event_id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .single();

  if (!session) {
    return { valid: false, error: "SESSION_INVALID", status: 401 };
  }

  if (session.status !== "active") {
    return { valid: false, error: "SESSION_INVALID", status: 401 };
  }

  if (session.device_fp !== deviceFp) {
    return { valid: false, error: "DEVICE_MISMATCH", status: 409 };
  }

  return {
    valid: true,
    sessionId: session.id,
    userId,
    eventId: session.event_id,
  };
}