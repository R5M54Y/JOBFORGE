// JOBFORGE Frontend - Database Connection
import { Pool } from 'pg';
import { getDatabaseConfig } from './database-config';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const dbConfig = getDatabaseConfig();
    pool = new Pool({ connectionString: dbConfig.connectionString, max: 10 });
  }
  return pool;
}
