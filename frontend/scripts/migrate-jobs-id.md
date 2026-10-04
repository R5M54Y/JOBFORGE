```typescript
import { Pool } from 'pg';
import { getDatabaseConfig } from '../lib/database-config';

interface JobRow {
  id: string;
  old_id: string | null;
  source: string;
  source_job_id: string;
  target_id: string;
}

interface ColumnInfo {
  data_type: string;
  udt_name: string;
  column_default: string | null;
}

async function migrateJobsId(): Promise<void> {
  let pool: Pool | null = null;

  try {
    console.log('JOBFORGE - Jobs ID Migration');
    console.log('================================');

    const dbConfig = getDatabaseConfig();

    pool = new Pool({
      connectionString: dbConfig.connectionString,
      max: 1,
    });

    await pool.query('SELECT 1');

    console.log('Database connection: PASS');

    // -------------------------------------------------------------------------
    // 1. Verify jobs table
    // -------------------------------------------------------------------------

    const tableResult = await pool.query(`
      SELECT to_regclass('public.jobs') AS table_name
    `);

    if (!tableResult.rows[0]?.table_name) {
      console.log('jobs table does not exist.');
      console.log('Migration not required.');
      return;
    }

    // -------------------------------------------------------------------------
    // 2. Inspect jobs columns
    // -------------------------------------------------------------------------

    const columnsResult = await pool.query(`
      SELECT
        column_name,
        data_type,
        udt_name,
        column_default
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'jobs'
      ORDER BY ordinal_position
    `);

    const columns = new Map<string, ColumnInfo>();

    for (const row of columnsResult.rows) {
      columns.set(row.column_name, {
        data_type: row.data_type,
        udt_name: row.udt_name,
        column_default: row.column_default,
      });
    }

    const idColumn = columns.get('id');
    const hasOldId = columns.has('old_id');
    const hasSource = columns.has('source');
    const hasSourceJobId = columns.has('source_job_id');

    if (!idColumn || !hasSource || !hasSourceJobId) {
      throw new Error(
        'jobs table is missing one or more required columns: id, source, source_job_id.'
      );
    }

    console.log(
      `Current jobs.id type: ${idColumn.data_type} (${idColumn.udt_name})`
    );

    if (!hasOldId) {
      console.log('No old_id column detected.');
      console.log('Legacy ID migration is not required.');

      if (idColumn.data_type !== 'text') {
        console.log(
          'WARNING: jobs.id is not TEXT even though old_id is absent.'
        );
      }

      return;
    }

    // -------------------------------------------------------------------------
    // 3. Refuse ambiguous/incomplete migration state
    // -------------------------------------------------------------------------

    if (columns.has('composite_id')) {
      throw new Error(
        'Temporary column composite_id already exists. ' +
        'A previous migration may have been interrupted. ' +
        'No changes were made.'
      );
    }

    // -------------------------------------------------------------------------
    // 4. Check database-level foreign keys referencing jobs.id
    // -------------------------------------------------------------------------

    const foreignKeysResult = await pool.query(`
      SELECT
        tc.constraint_schema,
        tc.constraint_name,
        tc.table_schema,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
       AND tc.constraint_schema = kcu.constraint_schema
      JOIN information_schema.constraint_column_usage AS ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.constraint_schema = ccu.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'jobs'
        AND ccu.column_name = 'id'
    `);

    if (foreignKeysResult.rows.length > 0) {
      const details = foreignKeysResult.rows
        .map(
          (row) =>
            `${row.table_schema}.${row.table_name}.${row.column_name} ` +
            `-> public.jobs.id ` +
            `(constraint: ${row.constraint_schema}.${row.constraint_name})`
        )
        .join('\n');

      throw new Error(
        'Foreign keys reference jobs.id. Migration aborted before any changes.\n' +
        details
      );
    }

    console.log('Foreign-key dependency check: PASS');

    // -------------------------------------------------------------------------
    // 5. Read ALL jobs and calculate canonical IDs
    // -------------------------------------------------------------------------

    const jobsResult = await pool.query(`
      SELECT
        id::text AS id,
        NULLIF(BTRIM(old_id::text), '') AS old_id,
        source::text AS source,
        source_job_id::text AS source_job_id
      FROM public.jobs
      ORDER BY id::text
    `);

    if (jobsResult.rows.length === 0) {
      console.log('jobs table is empty.');
      console.log('Migration not required.');
      return;
    }

    const jobs: JobRow[] = [];

    for (const row of jobsResult.rows) {
      const source = String(row.source ?? '').trim();
      const sourceJobId = String(row.source_job_id ?? '').trim();

      const oldId =
        row.old_id === null || row.old_id === undefined
          ? null
          : String(row.old_id).trim();

      if (!source || !sourceJobId) {
        throw new Error(
          `Cannot determine canonical ID for current id="${row.id}". ` +
          'source and source_job_id must not be empty.'
        );
      }

      const derivedId = `${source}-${sourceJobId}`;

      /*
       * Legacy old_id is expected to represent the same canonical identity
       * generated from source + source_job_id.
       */
      if (oldId !== null && oldId !== derivedId) {
        throw new Error(
          `Identity mismatch for current id="${row.id}": ` +
          `old_id="${oldId}" but expected "${derivedId}".`
        );
      }

      jobs.push({
        id: String(row.id),
        old_id: oldId,
        source,
        source_job_id: sourceJobId,
        target_id: oldId ?? derivedId,
      });
    }

    console.log(`Jobs inspected: ${jobs.length}`);

    // -------------------------------------------------------------------------
    // 6. Detect duplicate target IDs in memory
    // -------------------------------------------------------------------------

    const targetMap = new Map<string, string[]>();

    for (const job of jobs) {
      const ids = targetMap.get(job.target_id) ?? [];
      ids.push(job.id);
      targetMap.set(job.target_id, ids);
    }

    const duplicateTargets = Array.from(targetMap.entries()).filter(
      ([, ids]) => ids.length > 1
    );

    if (duplicateTargets.length > 0) {
      const details = duplicateTargets
        .map(
          ([targetId, ids]) =>
            `${targetId} <- current IDs: ${ids.join(', ')}`
        )
        .join('\n');

      throw new Error(
        'Duplicate target IDs detected. Migration aborted.\n' +
        details
      );
    }

    console.log('Target ID uniqueness check: PASS');

    // -------------------------------------------------------------------------
    // 7. Begin transaction
    // -------------------------------------------------------------------------

    await pool.query('BEGIN');

    try {
      // -----------------------------------------------------------------------
      // Step 1: Add temporary target ID column
      // -----------------------------------------------------------------------

      console.log('Step 1/9: Adding temporary composite_id column...');

      await pool.query(`
        ALTER TABLE public.jobs
        ADD COLUMN composite_id TEXT
      `);

      // -----------------------------------------------------------------------
      // Step 2: Populate target IDs
      // -----------------------------------------------------------------------

      console.log('Step 2/9: Populating canonical IDs...');

      await pool.query(`
        UPDATE public.jobs
        SET composite_id =
          CASE
            WHEN old_id IS NOT NULL
              AND BTRIM(old_id::text) <> ''
            THEN BTRIM(old_id::text)
            ELSE source::text || '-' || source_job_id::text
          END
      `);

      // -----------------------------------------------------------------------
      // Step 3: Database-level validation
      // -----------------------------------------------------------------------

      console.log('Step 3/9: Validating canonical IDs...');

      const nullTargetResult = await pool.query(`
        SELECT COUNT(*)::int AS count
        FROM public.jobs
        WHERE composite_id IS NULL
           OR BTRIM(composite_id) = ''
      `);

      if (nullTargetResult.rows[0].count !== 0) {
        throw new Error(
          `Validation failed: ${nullTargetResult.rows[0].count} ` +
          'rows have NULL/empty composite_id.'
        );
      }

      const duplicateTargetResult = await pool.query(`
        SELECT composite_id, COUNT(*)::int AS count
        FROM public.jobs
        GROUP BY composite_id
        HAVING COUNT(*) > 1
      `);

      if (duplicateTargetResult.rows.length > 0) {
        const details = duplicateTargetResult.rows
          .map(
            (row) => `${row.composite_id} (${row.count} rows)`
          )
          .join('\n');

        throw new Error(
          'Database duplicate validation failed:\n' + details
        );
      }

      console.log('Database canonical ID validation: PASS');

      // -----------------------------------------------------------------------
      // Step 4: Drop old primary key
      // -----------------------------------------------------------------------

      console.log('Step 4/9: Dropping legacy primary key...');

      await pool.query(`
        ALTER TABLE public.jobs
        DROP CONSTRAINT IF EXISTS jobs_pkey
      `);

      // -----------------------------------------------------------------------
      // Step 5: Convert id column to TEXT if required
      // -----------------------------------------------------------------------

      const currentIdColumnResult = await pool.query(`
        SELECT
          data_type,
          udt_name,
          column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'jobs'
          AND column_name = 'id'
      `);

      const currentIdColumn = currentIdColumnResult.rows[0];

      if (!currentIdColumn) {
        throw new Error(
          'jobs.id disappeared during migration.'
        );
      }

      const idIsText =
        currentIdColumn.data_type === 'text' ||
        currentIdColumn.udt_name === 'text';

      if (!idIsText) {
        console.log(
          `Step 5/9: Converting jobs.id from ${currentIdColumn.data_type} to TEXT...`
        );

        /*
         * Legacy numeric IDs may have a serial/bigserial default.
         * The new application generates string IDs, so remove the legacy
         * numeric default before changing the column type.
         */
        if (currentIdColumn.column_default !== null) {
          await pool.query(`
            ALTER TABLE public.jobs
            ALTER COLUMN id DROP DEFAULT
          `);
        }

        await pool.query(`
          ALTER TABLE public.jobs
          ALTER COLUMN id TYPE TEXT
          USING id::text
        `);
      } else {
        console.log(
          'Step 5/9: jobs.id is already TEXT. No type conversion required.'
        );
      }

      // -----------------------------------------------------------------------
      // Step 6: Replace IDs
      // -----------------------------------------------------------------------

      console.log('Step 6/9: Migrating IDs to canonical values...');

      const updateResult = await pool.query(`
        UPDATE public.jobs
        SET id = composite_id
      `);

      console.log(
        `Rows updated: ${updateResult.rowCount ?? 0}`
      );

      if ((updateResult.rowCount ?? 0) !== jobs.length) {
        throw new Error(
          `ID update count mismatch. Expected ${jobs.length}, ` +
          `updated ${updateResult.rowCount ?? 0}.`
        );
      }

      // -----------------------------------------------------------------------
      // Step 7: Recreate primary key
      // -----------------------------------------------------------------------

      console.log('Step 7/9: Creating canonical primary key...');

      await pool.query(`
        ALTER TABLE public.jobs
        ADD CONSTRAINT jobs_pkey PRIMARY KEY (id)
      `);

      // -----------------------------------------------------------------------
      // Step 8: Ensure source/source_job_id uniqueness
      // -----------------------------------------------------------------------

      const uniqueConstraintResult = await pool.query(`
        SELECT
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.constraint_schema = kcu.constraint_schema
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'jobs'
          AND tc.constraint_type = 'UNIQUE'
        GROUP BY
          tc.constraint_name
        HAVING
          ARRAY_AGG(kcu.column_name ORDER BY kcu.ordinal_position)
          = ARRAY['source', 'source_job_id']
      `);

      if (uniqueConstraintResult.rows.length === 0) {
        console.log(
          'Step 8/9: Creating source/source_job_id unique constraint...'
        );

        await pool.query(`
          ALTER TABLE public.jobs
          ADD CONSTRAINT jobs_source_sourcejobid_unique
          UNIQUE (source, source_job_id)
        `);
      } else {
        console.log(
          'Step 8/9: Existing source/source_job_id unique constraint preserved.'
        );
      }

      // -----------------------------------------------------------------------
      // Step 9: Final validation, then remove legacy columns
      // -----------------------------------------------------------------------

      console.log('Step 9/9: Final validation...');

      const finalMismatchResult = await pool.query(`
        SELECT COUNT(*)::int AS count
        FROM public.jobs
        WHERE id <> source::text || '-' || source_job_id::text
      `);

      if (finalMismatchResult.rows[0].count !== 0) {
        throw new Error(
          `Final ID validation failed: ` +
          `${finalMismatchResult.rows[0].count} rows do not match ` +
          'source-source_job_id.'
        );
      }

      const finalDuplicateResult = await pool.query(`
        SELECT id, COUNT(*)::int AS count
        FROM public.jobs
        GROUP BY id
        HAVING COUNT(*) > 1
      `);

      if (finalDuplicateResult.rows.length > 0) {
        throw new Error(
          'Final validation failed: duplicate IDs detected.'
        );
      }

      const finalIdTypeResult = await pool.query(`
        SELECT data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'jobs'
          AND column_name = 'id'
      `);

      const finalIdType = finalIdTypeResult.rows[0];

      if (
        !finalIdType ||
        (finalIdType.data_type !== 'text' &&
          finalIdType.udt_name !== 'text')
      ) {
        throw new Error(
          'Final validation failed: jobs.id is not TEXT.'
        );
      }

      /*
       * Only now is it safe to remove legacy columns.
       */
      await pool.query(`
        ALTER TABLE public.jobs
        DROP COLUMN old_id
      `);

      await pool.query(`
        ALTER TABLE public.jobs
        DROP COLUMN composite_id
      `);

      const finalCountResult = await pool.query(`
        SELECT COUNT(*)::int AS count
        FROM public.jobs
      `);

      if (finalCountResult.rows[0].count !== jobs.length) {
        throw new Error(
          `Final row count mismatch. Expected ${jobs.length}, ` +
          `found ${finalCountResult.rows[0].count}.`
        );
      }

      // -----------------------------------------------------------------------
      // Commit
      // -----------------------------------------------------------------------

      await pool.query('COMMIT');

      console.log('');
      console.log('================================');
      console.log('MIGRATION COMPLETED SUCCESSFULLY');
      console.log('================================');
      console.log(`Jobs migrated: ${updateResult.rowCount ?? 0}`);
      console.log(
        `Final row count: ${finalCountResult.rows[0].count}`
      );
      console.log('jobs.id type: TEXT');
      console.log('jobs.id primary key: PASS');
      console.log('old_id removed: PASS');
      console.log('composite_id removed: PASS');
      console.log('Canonical ID validation: PASS');
      console.log('');
    } catch (error) {
      console.error('Migration failed. Rolling back...');

      try {
        await pool.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('ROLLBACK failed:', rollbackError);
      }

      throw error;
    }
  } catch (error) {
    console.error('');
    console.error('================================');
    console.error('MIGRATION FAILED');
    console.error('================================');
    console.error(
      error instanceof Error
        ? error.message
        : error
    );

    process.exitCode = 1;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

void migrateJobsId();

export { migrateJobsId };
```
