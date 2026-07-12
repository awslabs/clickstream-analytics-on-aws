-- Amazon Redshift no longer supports creating plpythonu UDFs (Patch 198, 2025-10-30),
-- which broke new-app schema initialization (see issue #1609). This function is used ONLY by
-- the one-time v1->v2 migration procedures (sp_migrate_*_to_v2) and is NOT used by new v2 apps.
-- It is replaced with a native SQL stub so schema init succeeds without plpythonu.
-- TODO(#1609): reimplement as a Lambda UDF (external function) before running any v1->v2 migration.
-- Original (plpythonu) behavior: remove the comma-separated props in props_list from json object o.
create or replace function {{schema}}.rm_object_props(o varchar(65535), props_list varchar(65535))
  returns varchar(65535)
stable
as $$
  select null::varchar(65535)
$$ language sql;
