import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, 
  idleTimeoutMillis: 30000, 
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);