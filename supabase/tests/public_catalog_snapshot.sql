WITH snapshot AS (
  SELECT jsonb_build_object(
    'tables', (SELECT jsonb_agg(to_jsonb(x) ORDER BY table_name) FROM (
      SELECT c.relname AS table_name
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
    ) x),
    'columns', (SELECT jsonb_agg(to_jsonb(x) ORDER BY table_name, ordinal_position) FROM (
      SELECT c.relname AS table_name, a.attnum AS ordinal_position, a.attname AS column_name,
             pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type,
             a.attnotnull AS not_null, pg_get_expr(d.adbin, d.adrelid) AS default_expr,
             a.attidentity::text AS identity_kind, a.attgenerated::text AS generated_kind,
             col_description(c.oid, a.attnum) AS comment
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE n.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND NOT a.attisdropped
    ) x),
    'indexes', (SELECT jsonb_agg(to_jsonb(x) ORDER BY index_name) FROM (
      SELECT i.relname AS index_name, t.relname AS table_name, pg_get_indexdef(i.oid) AS definition
      FROM pg_class i JOIN pg_index ix ON ix.indexrelid = i.oid
      JOIN pg_class t ON t.oid = ix.indrelid JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
    ) x),
    'constraints', (SELECT jsonb_agg(to_jsonb(x) ORDER BY table_name, constraint_name) FROM (
      SELECT c.relname AS table_name, con.conname AS constraint_name, con.contype::text AS constraint_type,
             pg_get_constraintdef(con.oid, true) AS definition
      FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public'
    ) x),
    'functions', (SELECT jsonb_agg(to_jsonb(x) ORDER BY function_name, identity_args) FROM (
      SELECT p.proname AS function_name, pg_get_function_identity_arguments(p.oid) AS identity_args,
             pg_get_functiondef(p.oid) AS definition, p.prosecdef AS security_definer,
             p.proconfig AS config, p.proacl::text AS acl
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public'
    ) x),
    'rls', (SELECT jsonb_agg(to_jsonb(x) ORDER BY table_name) FROM (
      SELECT c.relname AS table_name, c.relrowsecurity AS enabled, c.relforcerowsecurity AS forced
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
    ) x),
    'policies', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY table_name, policy_name), '[]'::jsonb) FROM (
      SELECT tablename AS table_name, policyname AS policy_name, permissive, roles, cmd, qual, with_check
      FROM pg_policies WHERE schemaname = 'public'
    ) x),
    'views', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY view_name), '[]'::jsonb) FROM (
      SELECT c.relname AS view_name, pg_get_viewdef(c.oid, true) AS definition
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('v','m')
    ) x),
    'triggers', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY table_name, trigger_name), '[]'::jsonb) FROM (
      SELECT c.relname AS table_name, t.tgname AS trigger_name, pg_get_triggerdef(t.oid, true) AS definition
      FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND NOT t.tgisinternal
    ) x),
    'schema_acl', (SELECT n.nspacl::text FROM pg_namespace n WHERE n.nspname = 'public'),
    'schema_comment', (SELECT obj_description(n.oid, 'pg_namespace') FROM pg_namespace n WHERE n.nspname = 'public'),
    'table_acl', (SELECT jsonb_agg(to_jsonb(x) ORDER BY object_name) FROM (
      SELECT c.relname AS object_name, c.relacl::text AS acl
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r','v','m','S')
    ) x),
    'default_acl', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY role_name, object_type), '[]'::jsonb) FROM (
      SELECT r.rolname AS role_name, d.defaclobjtype::text AS object_type, d.defaclacl::text AS acl
      FROM pg_default_acl d JOIN pg_roles r ON r.oid = d.defaclrole
      JOIN pg_namespace n ON n.oid = d.defaclnamespace WHERE n.nspname = 'public'
    ) x),
    'comments', (SELECT COALESCE(jsonb_agg(to_jsonb(x) ORDER BY object_type, object_name), '[]'::jsonb) FROM (
      SELECT 'table'::text AS object_type, c.relname AS object_name, obj_description(c.oid, 'pg_class') AS comment
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind IN ('r','v','m') AND obj_description(c.oid, 'pg_class') IS NOT NULL
      UNION ALL
      SELECT 'function', p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', obj_description(p.oid, 'pg_proc')
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND obj_description(p.oid, 'pg_proc') IS NOT NULL
    ) x)
  ) AS catalog
)
SELECT jsonb_pretty(catalog) FROM snapshot;
