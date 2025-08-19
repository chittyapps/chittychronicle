import { defineConfig } from "drizzle-kit";

let dbUrl = process.env.CHITTYID_NEON_DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error("CHITTYID_NEON_DB_URL or DATABASE_URL must be set. Ensure the database is provisioned");
}

// Clean up any psql command wrapper that Replit might add
if (dbUrl.startsWith("psql '") && dbUrl.endsWith("'")) {
  dbUrl = dbUrl.slice(6, -1);
} else if (dbUrl.startsWith("psql '")) {
  dbUrl = dbUrl.replace(/^psql\s+'/, '');
}

console.log('Using database URL (first 40 chars):', dbUrl.substring(0, 40) + '...');

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
