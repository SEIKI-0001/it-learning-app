($production[0]) as $production |
($local[0]) as $local |
def keyed($key): map({key: ($key | tostring), value: .}) | from_entries;
def compare_array($name; $key):
  (($production[$name] // []) | keyed($key)) as $p |
  (($local[$name] // []) | keyed($key)) as $l |
  {
    category: $name,
    missing_local: (($p | keys) - ($l | keys)),
    extra_local: (($l | keys) - ($p | keys)),
    changed: [($p | keys[]) as $k | select(($l[$k] != null) and ($p[$k] != $l[$k])) | $k]
  };
[
  compare_array("tables"; .table_name),
  compare_array("columns"; (.table_name + "." + (.ordinal_position|tostring) + "." + .column_name)),
  compare_array("indexes"; .index_name),
  compare_array("constraints"; (.table_name + "." + .constraint_name)),
  compare_array("functions"; (.function_name + "(" + .identity_args + ")")),
  compare_array("rls"; .table_name),
  compare_array("policies"; (.table_name + "." + .policy_name)),
  compare_array("views"; .view_name),
  compare_array("triggers"; (.table_name + "." + .trigger_name)),
  compare_array("table_acl"; .object_name),
  compare_array("default_acl"; (.role_name + "." + .object_type)),
  compare_array("comments"; (.object_type + "." + .object_name))
] + [
  {category:"schema_acl", changed: ($production.schema_acl != $local.schema_acl)},
  {category:"schema_comment", changed: ($production.schema_comment != $local.schema_comment)}
]
