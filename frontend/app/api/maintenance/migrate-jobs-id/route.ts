import { NextRequest, NextResponse } from 'next/server';
import { Pool, PoolClient } from 'pg';
import { getDatabaseConfig } from '@/lib/database-config';

const CRON_SECRET = process.env.CRON_SECRET;

type MigrationStats = {
  rowsBefore: number;
  rowsAfter: number;
  rowsUpdated: number;
  idTypeBefore: string;
  idTypeAfter: string;
  legacyColumnPresentBefore: boolean;
  legacyColumnPresentAfter: boolean;
};

async function verifyCronSecret(request: NextRequest): Promise<boolean> {
  const providedSecret =
    request.headers.get('x-cron-secret') ||
    new URL(request.url).searchParams.get('cron_secret');

  return Boolean(CRON_SECRET) && providedSecret === CRON_SECRET;
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function getColumnType(
  client: PoolClient,
  columnName: string
): Promise<string | null> {
  const result = await client.query(
    `
      SELECT data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'jobs'
        AND column_name = $1
    `,
    [columnName]
  );

  return result.rows.length > 0 ? result.rows[0].data_type : null;
}

async function migrateJobsId(): Promise<MigrationStats> {
  const dbConfig = getDatabaseConfig();

  const pool = new Pool({
    connectionString: dbConfig.connectionString,
    max: 1,
  });

  let client: PoolClient | null = null;
  let transactionStarted = false;

  try {
    console.log('Starting jobs.id migration...');

    client = await pool.connect();

    /*
     * Everything below uses the same PoolClient.
     * This guarantees that BEGIN/COMMIT/ROLLBACK apply
     * to the same PostgreSQL session.
     */
    await client.query('BEGIN');
    transactionStarted = true;

    /*
     * ------------------------------------------------------------------
     * PHASE 1: Verify jobs table
     * ------------------------------------------------------------------
     */
    const tableResult = await client.query(
      `
        SELECT to_regclass('public.jobs') AS table_name
      `
    );

    if (!tableResult.rows[0]?.table_name) {
      throw new Error('Migration aborted: public.jobs table does not exist');
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 2: Inspect current schema
     * ------------------------------------------------------------------
     */
    const idColumnResult = await client.query(
      `
        SELECT
          column_name,
          data_type,
          udt_name,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'jobs'
          AND column_name = 'id'
      `
    );

    if (idColumnResult.rows.length === 0) {
      throw new Error('Migration aborted: jobs.id column does not exist');
    }

    const idColumn = idColumnResult.rows[0];

    const idTypeBefore = idColumn.data_type;
    const idUdtBefore = idColumn.udt_name;

    console.log(
      `Current jobs.id type: data_type=${idTypeBefore}, udt_name=${idUdtBefore}`
    );

    const oldIdColumnResult = await client.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'jobs'
          AND column_name = 'old_id'
      `
    );

    const hasOldId = oldIdColumnResult.rows.length > 0;

    console.log(`Legacy old_id present: ${hasOldId}`);

    /*
     * ------------------------------------------------------------------
     * PHASE 3: Determine whether migration is actually needed
     * ------------------------------------------------------------------
     *
     * IMPORTANT:
     * Presence/absence of old_id is NOT used to determine whether
     * jobs.id needs migration.
     */
    if (idTypeBefore === 'text') {
      /*
       * The physical schema is already correct.
       *
       * If old_id still exists, remove it only if it is safe and
       * the migration is explicitly in the expected legacy state.
       *
       * For this one-time migration, we require old_id to be absent
       * before declaring the schema fully complete.
       */
      if (!hasOldId) {
        await client.query('ROLLBACK');
        transactionStarted = false;

        return {
          rowsBefore: 0,
          rowsAfter: 0,
          rowsUpdated: 0,
          idTypeBefore,
          idTypeAfter: idTypeBefore,
          legacyColumnPresentBefore: false,
          legacyColumnPresentAfter: false,
        };
      }

      /*
       * id is already TEXT but old_id remains.
       * We continue through validation/cleanup below rather than
       * assuming migration is unnecessary.
       */
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 4: Capture row count
     * ------------------------------------------------------------------
     */
    const countBeforeResult = await client.query(
      `SELECT COUNT(*)::bigint AS count FROM public.jobs`
    );

    const rowsBefore = Number(countBeforeResult.rows[0].count);

    console.log(`Rows before migration: ${rowsBefore}`);

    /*
     * ------------------------------------------------------------------
     * PHASE 5: Inspect PK
     * ------------------------------------------------------------------
     */
    const primaryKeyResult = await client.query(
      `
        SELECT
          c.conname,
          pg_get_constraintdef(c.oid) AS definition,
          array_agg(a.attname ORDER BY k.ordinality) AS columns
        FROM pg_constraint c
        JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality)
          ON true
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = k.attnum
        WHERE c.conrelid = 'public.jobs'::regclass
          AND c.contype = 'p'
        GROUP BY c.oid, c.conname
      `
    );

    if (primaryKeyResult.rows.length > 1) {
      throw new Error(
        `Migration aborted: jobs has multiple primary key constraints`
      );
    }

    const existingPrimaryKey = primaryKeyResult.rows[0] ?? null;

    if (existingPrimaryKey) {
      console.log(
        `Existing primary key: ${existingPrimaryKey.conname} (${existingPrimaryKey.columns.join(
          ', '
        )})`
      );
    } else {
      console.log('No existing primary key found on jobs');
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 6: Detect external FK dependencies correctly
     * ------------------------------------------------------------------
     *
     * We are specifically looking for:
     *
     * child_table.child_column -> jobs.id
     *
     * These cannot safely survive an arbitrary primary-key replacement.
     *
     * Self-referencing FKs are also reported separately.
     */
    const foreignKeyResult = await client.query(
      `
        SELECT
          c.conname,
          c.conrelid::regclass::text AS referencing_table,
          a.attname AS referencing_column,
          c.confrelid::regclass::text AS referenced_table,
          af.attname AS referenced_column,
          pg_get_constraintdef(c.oid) AS definition
        FROM pg_constraint c
        JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS ck(attnum, ordinality)
          ON true
        JOIN LATERAL unnest(c.confkey) WITH ORDINALITY AS fk(attnum, ordinality)
          ON fk.ordinality = ck.ordinality
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = ck.attnum
        JOIN pg_attribute af
          ON af.attrelid = c.confrelid
         AND af.attnum = fk.attnum
        WHERE c.contype = 'f'
          AND c.confrelid = 'public.jobs'::regclass
          AND af.attname = 'id'
      `
    );

    if (foreignKeyResult.rows.length > 0) {
      const details = foreignKeyResult.rows
        .map(
          (row) =>
            `${row.conname}: ${row.referencing_table}.${row.referencing_column} -> ${row.referenced_table}.${row.referenced_column}`
        )
        .join('; ');

      throw new Error(
        `Migration aborted: external foreign keys reference jobs.id. ` +
          `A coordinated child-table migration is required. Dependencies: ${details}`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 7: Validate source/source_job_id for EVERY row
     * ------------------------------------------------------------------
     *
     * Do not restrict this validation to old_id rows.
     */
    const invalidSourceResult = await client.query(
      `
        SELECT COUNT(*)::bigint AS count
        FROM public.jobs
        WHERE source IS NULL
           OR BTRIM(source) = ''
           OR source_job_id IS NULL
           OR BTRIM(source_job_id) = ''
      `
    );

    const invalidSourceCount = Number(invalidSourceResult.rows[0].count);

    if (invalidSourceCount > 0) {
      throw new Error(
        `Migration aborted: ${invalidSourceCount} jobs have missing/blank source or source_job_id`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 8: Detect duplicate canonical IDs BEFORE modifying id
     * ------------------------------------------------------------------
     */
    const duplicateTargetResult = await client.query(
      `
        SELECT
          BTRIM(source) || '-' || BTRIM(source_job_id) AS target_id,
          COUNT(*)::bigint AS duplicate_count
        FROM public.jobs
        GROUP BY BTRIM(source) || '-' || BTRIM(source_job_id)
        HAVING COUNT(*) > 1
        ORDER BY duplicate_count DESC, target_id
      `
    );

    if (duplicateTargetResult.rows.length > 0) {
      const duplicates = duplicateTargetResult.rows
        .slice(0, 20)
        .map((row) => `${row.target_id} (${row.duplicate_count})`)
        .join(', ');

      throw new Error(
        `Migration aborted: duplicate canonical IDs detected: ${duplicates}`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 9: Validate target IDs
     * ------------------------------------------------------------------
     */
    const invalidTargetResult = await client.query(
      `
        SELECT COUNT(*)::bigint AS count
        FROM public.jobs
        WHERE BTRIM(source) || '-' || BTRIM(source_job_id) IS NULL
           OR BTRIM(source) || '-' || BTRIM(source_job_id) = ''
      `
    );

    const invalidTargetCount = Number(invalidTargetResult.rows[0].count);

    if (invalidTargetCount > 0) {
      throw new Error(
        `Migration aborted: ${invalidTargetCount} jobs produce invalid canonical IDs`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 10: Ensure staging column exists
     * ------------------------------------------------------------------
     *
     * We use a TEXT staging column to construct and validate the
     * complete target identity before replacing the primary-key value.
     */
    const stagingColumnResult = await client.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'jobs'
          AND column_name = 'migration_id'
      `
    );

    const hasMigrationId = stagingColumnResult.rows.length > 0;

    if (hasMigrationId) {
      /*
       * This is a rerun after an interrupted/non-completed migration.
       * Reuse the staging column after clearing it.
       */
      console.log('Existing migration_id staging column found; reusing it');

      await client.query(
        `UPDATE public.jobs SET migration_id = NULL`
      );
    } else {
      await client.query(
        `ALTER TABLE public.jobs ADD COLUMN migration_id TEXT`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 11: Populate staging IDs
     * ------------------------------------------------------------------
     */
    const stagingUpdateResult = await client.query(
      `
        UPDATE public.jobs
        SET migration_id = BTRIM(source) || '-' || BTRIM(source_job_id)
      `
    );

    const stagingUpdated = stagingUpdateResult.rowCount ?? 0;

    if (stagingUpdated !== rowsBefore) {
      throw new Error(
        `Migration aborted: staging update affected ${stagingUpdated} rows, expected ${rowsBefore}`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 12: Validate staging IDs at database level
     * ------------------------------------------------------------------
     */
    const stagingValidation = await client.query(
      `
        SELECT
          COUNT(*)::bigint AS total_rows,
          COUNT(migration_id)::bigint AS populated_ids,
          COUNT(DISTINCT migration_id)::bigint AS unique_ids,
          COUNT(*) FILTER (
            WHERE migration_id IS NULL OR BTRIM(migration_id) = ''
          )::bigint AS invalid_ids
        FROM public.jobs
      `
    );

    const stagingStats = stagingValidation.rows[0];

    const stagingTotal = Number(stagingStats.total_rows);
    const stagingPopulated = Number(stagingStats.populated_ids);
    const stagingUnique = Number(stagingStats.unique_ids);
    const stagingInvalid = Number(stagingStats.invalid_ids);

    if (
      stagingTotal !== rowsBefore ||
      stagingPopulated !== rowsBefore ||
      stagingUnique !== rowsBefore ||
      stagingInvalid !== 0
    ) {
      throw new Error(
        `Migration aborted: staging validation failed. ` +
          `total=${stagingTotal}, populated=${stagingPopulated}, ` +
          `unique=${stagingUnique}, invalid=${stagingInvalid}, expected=${rowsBefore}`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 13: Convert id to TEXT if necessary
     * ------------------------------------------------------------------
     */
    if (idTypeBefore !== 'text') {
      console.log(
        `Converting jobs.id from ${idTypeBefore} to TEXT...`
      );

      /*
       * PostgreSQL can convert BIGINT -> TEXT directly.
       * No USING expression is necessary for this direction.
       */
      await client.query(
        `ALTER TABLE public.jobs ALTER COLUMN id TYPE TEXT`
      );
    }

    /*
     * Immediately verify the physical type after ALTER.
     */
    const idTypeAfterAlter = await getColumnType(client, 'id');

    if (idTypeAfterAlter !== 'text') {
      throw new Error(
        `Migration aborted: jobs.id physical type is '${idTypeAfterAlter}', expected 'text'`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 14: Remove existing PK only when necessary
     * ------------------------------------------------------------------
     *
     * If the existing PK is on id, it can be recreated after updating
     * the values.
     *
     * If the existing PK is on another column, abort rather than
     * destroying an unknown schema contract.
     */
    if (existingPrimaryKey) {
      const pkColumns = existingPrimaryKey.columns as string[];

      if (
        pkColumns.length !== 1 ||
        pkColumns[0] !== 'id'
      ) {
        throw new Error(
          `Migration aborted: existing primary key '${existingPrimaryKey.conname}' ` +
            `does not consist solely of jobs.id`
        );
      }

      await client.query(
        `ALTER TABLE public.jobs DROP CONSTRAINT ${quoteIdentifier(
          existingPrimaryKey.conname
        )}`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 15: Replace id values from staging column
     * ------------------------------------------------------------------
     */
    const idUpdateResult = await client.query(
      `
        UPDATE public.jobs
        SET id = migration_id
      `
    );

    const rowsUpdated = idUpdateResult.rowCount ?? 0;

    if (rowsUpdated !== rowsBefore) {
      throw new Error(
        `Migration aborted: id update affected ${rowsUpdated} rows, expected ${rowsBefore}`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 16: Validate id BEFORE recreating PK
     * ------------------------------------------------------------------
     */
    const prePkValidation = await client.query(
      `
        SELECT
          COUNT(*)::bigint AS total_rows,
          COUNT(id)::bigint AS non_null_ids,
          COUNT(DISTINCT id)::bigint AS unique_ids,
          COUNT(*) FILTER (
            WHERE id IS NULL
               OR BTRIM(id) = ''
               OR id NOT LIKE '%-%'
          )::bigint AS invalid_ids
        FROM public.jobs
      `
    );

    const prePkStats = prePkValidation.rows[0];

    const prePkTotal = Number(prePkStats.total_rows);
    const prePkNonNull = Number(prePkStats.non_null_ids);
    const prePkUnique = Number(prePkStats.unique_ids);
    const prePkInvalid = Number(prePkStats.invalid_ids);

    if (
      prePkTotal !== rowsBefore ||
      prePkNonNull !== rowsBefore ||
      prePkUnique !== rowsBefore ||
      prePkInvalid !== 0
    ) {
      throw new Error(
        `Migration aborted: final ID validation failed before PK recreation. ` +
          `total=${prePkTotal}, nonNull=${prePkNonNull}, ` +
          `unique=${prePkUnique}, invalid=${prePkInvalid}, expected=${rowsBefore}`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 17: Recreate primary key
     * ------------------------------------------------------------------
     */
    await client.query(
      `
        ALTER TABLE public.jobs
        ADD CONSTRAINT jobs_pkey PRIMARY KEY (id)
      `
    );

    /*
     * ------------------------------------------------------------------
     * PHASE 18: Ensure source/source_job_id uniqueness
     * ------------------------------------------------------------------
     *
     * The target canonical ID is derived from these two fields.
     * Duplicate detection above guarantees this constraint should
     * succeed unless the schema contains an unexpected conflicting
     * constraint.
     */
    const uniqueConstraintResult = await client.query(
      `
        SELECT 1
        FROM pg_constraint
        WHERE conrelid = 'public.jobs'::regclass
          AND conname = 'jobs_source_sourcejobid_unique'
      `
    );

    if (uniqueConstraintResult.rows.length === 0) {
      await client.query(
        `
          ALTER TABLE public.jobs
          ADD CONSTRAINT jobs_source_sourcejobid_unique
          UNIQUE (source, source_job_id)
        `
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 19: Final physical schema verification
     * ------------------------------------------------------------------
     */
    const finalIdColumnResult = await client.query(
      `
        SELECT
          data_type,
          udt_name,
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'jobs'
          AND column_name = 'id'
      `
    );

    if (finalIdColumnResult.rows.length !== 1) {
      throw new Error(
        'Migration aborted: unable to verify jobs.id after migration'
      );
    }

    const finalIdColumn = finalIdColumnResult.rows[0];

    if (
      finalIdColumn.data_type !== 'text' ||
      finalIdColumn.udt_name !== 'text'
    ) {
      throw new Error(
        `Migration aborted: jobs.id physical type verification failed. ` +
          `data_type=${finalIdColumn.data_type}, udt_name=${finalIdColumn.udt_name}`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 20: Final data validation
     * ------------------------------------------------------------------
     */
    const finalValidation = await client.query(
      `
        SELECT
          COUNT(*)::bigint AS total_rows,
          COUNT(DISTINCT id)::bigint AS unique_ids,
          COUNT(*) FILTER (WHERE id IS NULL)::bigint AS null_ids,
          COUNT(*) FILTER (
            WHERE id IS NOT NULL
              AND (BTRIM(id) = '' OR id NOT LIKE '%-%')
          )::bigint AS invalid_format_ids
        FROM public.jobs
      `
    );

    const finalStats = finalValidation.rows[0];

    const totalRows = Number(finalStats.total_rows);
    const uniqueIds = Number(finalStats.unique_ids);
    const nullIds = Number(finalStats.null_ids);
    const invalidFormatIds = Number(finalStats.invalid_format_ids);

    if (totalRows !== rowsBefore) {
      throw new Error(
        `Migration aborted: row count changed from ${rowsBefore} to ${totalRows}`
      );
    }

    if (uniqueIds !== totalRows) {
      throw new Error(
        `Migration aborted: IDs are not unique. ` +
          `total=${totalRows}, unique=${uniqueIds}`
      );
    }

    if (nullIds !== 0) {
      throw new Error(
        `Migration aborted: ${nullIds} rows have NULL id`
      );
    }

    if (invalidFormatIds !== 0) {
      throw new Error(
        `Migration aborted: ${invalidFormatIds} rows have invalid ID format`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 21: Verify PK really exists on id
     * ------------------------------------------------------------------
     */
    const finalPkResult = await client.query(
      `
        SELECT
          c.conname,
          array_agg(a.attname ORDER BY k.ordinality) AS columns
        FROM pg_constraint c
        JOIN LATERAL unnest(c.conkey) WITH ORDINALITY AS k(attnum, ordinality)
          ON true
        JOIN pg_attribute a
          ON a.attrelid = c.conrelid
         AND a.attnum = k.attnum
        WHERE c.conrelid = 'public.jobs'::regclass
          AND c.contype = 'p'
        GROUP BY c.oid, c.conname
      `
    );

    if (finalPkResult.rows.length !== 1) {
      throw new Error(
        'Migration aborted: jobs does not have exactly one primary key'
      );
    }

    const finalPkColumns = finalPkResult.rows[0].columns as string[];

    if (
      finalPkColumns.length !== 1 ||
      finalPkColumns[0] !== 'id'
    ) {
      throw new Error(
        `Migration aborted: primary key does not reference jobs.id. ` +
          `Actual columns: ${finalPkColumns.join(', ')}`
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 22: Remove staging / legacy columns
     * ------------------------------------------------------------------
     *
     * These are removed only after all critical validation passes.
     */
    if (hasOldId) {
      await client.query(
        `ALTER TABLE public.jobs DROP COLUMN old_id`
      );
    }

    await client.query(
      `ALTER TABLE public.jobs DROP COLUMN migration_id`
    );

    /*
     * ------------------------------------------------------------------
     * PHASE 23: Verify cleanup and row count one final time
     * ------------------------------------------------------------------
     */
    const cleanupCheck = await client.query(
      `
        SELECT
          COUNT(*)::bigint AS total_rows,
          COUNT(DISTINCT id)::bigint AS unique_ids
        FROM public.jobs
      `
    );

    const cleanupRows = Number(cleanupCheck.rows[0].total_rows);
    const cleanupUnique = Number(cleanupCheck.rows[0].unique_ids);

    if (cleanupRows !== rowsBefore || cleanupUnique !== rowsBefore) {
      throw new Error(
        `Migration aborted: cleanup validation failed. ` +
          `rows=${cleanupRows}, unique=${cleanupUnique}, expected=${rowsBefore}`
      );
    }

    const finalOldIdCheck = await client.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'jobs'
          AND column_name = 'old_id'
      `
    );

    if (finalOldIdCheck.rows.length > 0) {
      throw new Error(
        'Migration aborted: legacy old_id column still exists'
      );
    }

    const finalMigrationIdCheck = await client.query(
      `
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'jobs'
          AND column_name = 'migration_id'
      `
    );

    if (finalMigrationIdCheck.rows.length > 0) {
      throw new Error(
        'Migration aborted: migration_id staging column still exists'
      );
    }

    /*
     * ------------------------------------------------------------------
     * PHASE 24: COMMIT
     * ------------------------------------------------------------------
     */
    await client.query('COMMIT');
    transactionStarted = false;

    console.log('Migration committed successfully');

    return {
      rowsBefore,
      rowsAfter: cleanupRows,
      rowsUpdated,
      idTypeBefore,
      idTypeAfter: 'text',
      legacyColumnPresentBefore: hasOldId,
      legacyColumnPresentAfter: false,
    };
  } catch (error) {
    console.error('Migration failed:', error);

    if (client && transactionStarted) {
      try {
        await client.query('ROLLBACK');
        console.log('Migration transaction rolled back successfully');
      } catch (rollbackError) {
        console.error('ROLLBACK failed:', rollbackError);
      }
    }

    throw error;
  } finally {
    if (client) {
      client.release();
    }

    await pool.end();
  }
}

export async function POST(
  request: NextRequest
): Promise<NextResponse> {
  if (!(await verifyCronSecret(request))) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const result = await migrateJobsId();

    /*
     * If migration was already complete, rowsBefore may be zero because
     * the function exits early. Return an explicit status rather than
     * pretending rows were updated.
     */
    if (
      result.rowsBefore === 0 &&
      result.rowsAfter === 0 &&
      result.rowsUpdated === 0 &&
      result.idTypeBefore === 'text' &&
      !result.legacyColumnPresentBefore
    ) {
      return NextResponse.json({
        success: true,
        status: 'already-migrated',
        rowsBefore: null,
        rowsAfter: null,
        updated: 0,
        idType: 'text',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      status: 'migrated',
      rowsBefore: result.rowsBefore,
      rowsAfter: result.rowsAfter,
      updated: result.rowsUpdated,
      idTypeBefore: result.idTypeBefore,
      idTypeAfter: result.idTypeAfter,
      legacyColumnPresentBefore: result.legacyColumnPresentBefore,
      legacyColumnPresentAfter: result.legacyColumnPresentAfter,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Migration execution failed:', error);

    const message =
      error instanceof Error
        ? error.message
        : 'Unknown migration error';

    return NextResponse.json(
      {
        success: false,
        status: 'failed',
        error: 'Migration failed',
        details: message,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest
): Promise<NextResponse> {
  return NextResponse.json({
    status: 'Migration service ready',
    timestamp: new Date().toISOString(),
    instructions: 'POST to execute migration with x-cron-secret header',
  });
}