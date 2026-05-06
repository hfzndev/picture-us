// src/lib/utils.ts

/**
 * Generate a 6-character guest code (uppercase, no ambiguous chars).
 */
export function generateGuestCode(): string {
  const CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // 28 chars, no 0/O/I/L/1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return code;
}

/**
 * Format a 6-char code as "XXX-XXX".
 */
export function formatCode(code: string): string {
  const upper = code.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (upper.length >= 3) {
    return `${upper.slice(0, 3)}-${upper.slice(3, 6)}`;
  }
  return upper;
}

/**
 * Generate a simple device fingerprint (not cryptographic — prevents casual token sharing).
 */
export function generateDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    `${screen.width}x${screen.height}`,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.hardwareConcurrency || "unknown",
  ].join("|");

  return btoa(components).slice(0, 32);
}

/**
 * API response envelope.
 */
export type ApiResponse<T = unknown> = {
  success: boolean;
  error?: string;
  data?: T;
};

/**
 * Simple retry with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts) throw err;
      await new Promise((r) => setTimeout(r, baseDelayMs * Math.pow(2, attempt - 1)));
    }
  }
  throw new Error("Unreachable");
}

/**
 * Convert a canvas to a Blob for upload.
 */
export function canvasToBlob(canvas: HTMLCanvasElement, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("Canvas toBlob failed"));
      },
      "image/jpeg",
      quality
    );
  });
}

/**
 * Format a date for the retro date stamp.
 */
export function formatDateStamp(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const h = String(date.getHours()).padStart(2, "0");
  const min = String(date.getMinutes()).padStart(2, "0");
  return `${y}.${m}.${d} ${h}:${min}`;
}

/**
 * Get remaining photos for a session from the token payload.
 */
export function getPhotosRemaining(
  photosTaken: number,
  photoLimit: number
): number {
  return Math.max(0, photoLimit - photosTaken);
}

/**
 * Check if on a mobile device (used for camera-centric UX hints).
 */
export function isMobileDevice(): boolean {
  return /Mobi|Android/i.test(navigator.userAgent);
}