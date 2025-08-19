import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let dbUrl = process.env.CHITTYID_NEON_DB_URL || process.env.DATABASE_URL;

if (!dbUrl) {
  throw new Error(
    "CHITTYID_NEON_DB_URL or DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Decode URL-encoded database URL if needed
if (dbUrl.includes('%20')) {
  dbUrl = decodeURIComponent(dbUrl);
}

// Clean up any psql command wrapper
if (dbUrl.startsWith("psql '") && dbUrl.endsWith("'")) {
  dbUrl = dbUrl.slice(6, -1);
}

console.log('Database URL (first 30 chars):', dbUrl.substring(0, 30));
export const pool = new Pool({ connectionString: dbUrl });
export const db = drizzle({ client: pool, schema });

// Test database connection on startup
db.select().from(schema.users).limit(1).then(() => {
  console.log('✅ Database connection verified');
}).catch((error) => {
  console.error('❌ Database connection failed:', error.message);
});