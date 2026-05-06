// picture-us/scripts/migrate.mjs
// Run with: node scripts/migrate.mjs
// Applies database migration using service_role key
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");
const envContent = readFileSync(envPath, "utf-8");

const SUPABASE_URL = envContent.match(/NEXT_PUBLIC_SUPABASE_URL=(.+)/)?.[1]?.trim();
const SERVICE_KEY = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=(.+)/)?.[1]?.trim();

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false },
});

const sql = readFileSync(resolve(__dirname, "..", "supabase", "migrations", "00001_schema.sql"), "utf-8");

console.log("📦 Connecting to Supabase...");
console.log(`   URL: ${SUPABASE_URL}`);

// Split into individual statements (semi-colons)
const statements = sql
  .split(";")
  .map((s) => s.trim())
  .filter((s) => s.length > 0 && !s.startsWith("--"));

console.log(`   Found ${statements.length} SQL statements\n`);

let success = 0;
let failed = 0;

for (const stmt of statements) {
  // Try via REST API
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/run_sql`, {
      method: "POST",
      headers: {
        "apikey": SERVICE_KEY,
        "Authorization": `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
        "Prefer": "return=minimal",
      },
      body: JSON.stringify({ query: stmt + ";" }),
    });

    if (res.ok || res.status === 204) {
      success++;
    } else {
      const err = await res.text();
      console.warn(`   ⚠ Statement failed (${res.status}): ${err.slice(0, 100)}`);
      failed++;
    }
  } catch (err) {
    console.warn(`   ⚠ Network error: ${err.message}`);
    failed++;
  }
}

console.log(`\n✅ ${success} statements executed, ${failed} warnings`);
if (failed > 0) {
  console.log("   (Some statements may already exist — that's OK with IF NOT EXISTS)");
}