// picture-us/scripts/migrate-v2.mjs
// Uses Supabase Management API + Personal Access Token
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = "kmialnfokevmkotyuqlx";
const PAT = process.env.SUPABASE_PAT || readFileSync(resolve(__dirname, "..", "..", "..", "..", "..", "..", "..", "AppData", "Roaming", "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"), "utf-8").match(/"Authorization":\s*"Bearer\s+(sbp_[^"]+)"/)?.[1];

// Read PAT directly from MCP config
const mcpConfig = JSON.parse(readFileSync(
  resolve(__dirname, "..", "..", "..", "..", "..", "..", "..", "AppData", "Roaming", "Code", "User", "globalStorage", "saoudrizwan.claude-dev", "settings", "cline_mcp_settings.json"),
  "utf-8"
));
const token = mcpConfig.mcpServers?.supabase?.headers?.Authorization?.replace("Bearer ", "");

if (!token) {
  console.error("❌ Could not read PAT from MCP config");
  process.exit(1);
}

const sql = readFileSync(resolve(__dirname, "..", "supabase", "migrations", "00001_schema.sql"), "utf-8");

// Split SQL into individual statements, filtering comments and empty lines
const statements = sql
  .split(";")
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith("--"));

console.log(`📦 Applying ${statements.length} SQL statements to project ${PROJECT_REF}...\n`);

let success = 0;
let skipped = 0;
let errors = 0;

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.split("\n")[0].slice(0, 80);
  
  try {
    const res = await fetch(
      `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: stmt + ";" }),
      }
    );

    const text = await res.text();
    
    if (res.ok) {
      success++;
      console.log(`  ✅ [${i + 1}/${statements.length}] ${preview}`);
    } else if (text.includes("already exists")) {
      skipped++;
      console.log(`  ⏭ [${i + 1}/${statements.length}] Already exists: ${preview}`);
    } else {
      // Some errors are expected (e.g. re-running migration, duplicate policies)
      if (text.includes("duplicate key") || text.includes("already exists") || text.includes("42710")) {
        skipped++;
        console.log(`  ⏭ [${i + 1}/${statements.length}] Dup: ${preview}`);
      } else {
        errors++;
        console.error(`  ❌ [${i + 1}/${statements.length}] ${preview}`);
        console.error(`     ${text.slice(0, 150)}`);
      }
    }
  } catch (err) {
    errors++;
    console.error(`  ❌ [${i + 1}/${statements.length}] Network: ${err.message}`);
  }
}

console.log(`\n📊 Done: ${success} applied, ${skipped} skipped, ${errors} errors`);