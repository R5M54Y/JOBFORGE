// JOBFORGE Frontend - Portable Database Configuration
// Provider-agnostic PostgreSQL configuration with support for multiple deployment environments

interface DatabaseConfig {
  connectionString: string;
}

/**
 * Get normalized database configuration from environment variables.
 *
 * Resolution order:
 * 1. DATABASE_URL (standard, portable variable)
 * 2. REMOTEJOBSDB_POSTGRES_URL (Neon/Vercel compatibility fallback)
 *
 * @throws Error if no supported database URL is configured
 * @returns Normalized database configuration
 */
export function getDatabaseConfig(): DatabaseConfig {
  // Primary: Standard DATABASE_URL (works everywhere)
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return { connectionString: databaseUrl };
  }

  // Fallback: Neon/Vercel integration variable (compatibility only)
  const neonUrl = process.env.REMOTEJOBSDB_POSTGRES_URL;
  if (neonUrl) {
    return { connectionString: neonUrl };
  }

  // Neither configured: fail with a clear, safe error
  throw new Error(
    'DATABASE_URL environment variable is not configured. ' +
    'Please set DATABASE_URL to your PostgreSQL connection string.'
  );
}
