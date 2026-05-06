// src/lib/supabase/service.ts
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client for server-side admin operations.
 * Bypasses RLS — use only in API routes, never in client components.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}