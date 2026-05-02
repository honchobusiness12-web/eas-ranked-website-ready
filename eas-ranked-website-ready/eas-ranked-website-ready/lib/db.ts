import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
  console.warn("DATABASE_URL is missing. Add it in Railway Variables.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});
