# Supabase migration baseline

The active Supabase migration history starts with `20260813071636_production_baseline.sql`. It was generated from the linked production project's `public` schema with:

```bash
supabase db dump --linked --schema public --file <temporary-file>
```

The dump is schema-only. It contains no table data, connection URL, password, project ref, auth schema, or storage schema.

## Source of truth

- `supabase/migrations` is the only hand-maintained source of schema changes.
- Active filenames use a unique UTC `YYYYMMDDHHMMSS` version.
- `supabase/schema.sql` is a generated inspection/test snapshot. Do not edit or apply it manually.
- `supabase/legacy_migrations` contains immutable historical records and is not replayed by the CLI.

Regenerate the snapshot only after rebuilding a disposable local Supabase database from active migrations:

```bash
supabase db reset --local --no-seed
supabase db dump --local --schema public --file supabase/schema.sql
```

Restore the generated warning header after the dump.

## Catalog verification

Run `supabase/tests/public_catalog_snapshot.sql` read-only against production and against the disposable local database. Extract the returned `jsonb_pretty` values, then compare them with:

```bash
jq -n \
  --slurpfile production <production-catalog.json> \
  --slurpfile local <local-catalog.json> \
  -f supabase/tests/compare_public_catalog.jq
```

Every category must have empty `missing_local`, `extra_local`, and `changed` arrays. The scalar schema ACL/comment entries must report `changed: false`.

## Production history initialization

The baseline describes schema that already exists in production. After this baseline PR is reviewed and merged, initialize remote migration history by recording this single baseline version as already applied. Do not run its DDL against production. That history-only operation requires a separate explicit approval and verification; it is intentionally not performed by this PR.
