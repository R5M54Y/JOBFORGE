// JOBFORGE - Portable Database Configuration Layer
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

/**
 * Validate that database configuration is available.
 * Useful for early validation during application startup.
 *
 * @returns true if a valid database URL is configured
 */
export function isDatabaseConfigured(): boolean {
  try {
    getDatabaseConfig();
    return true;
  } catch {
    return false;
  }
}
