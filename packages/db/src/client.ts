import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.ts';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required. Add it to your environment before using the database.');
}

const queryClient = postgres(databaseUrl, {
  max: 10,
});

export const db = drizzle(queryClient, { schema });
export { queryClient };
