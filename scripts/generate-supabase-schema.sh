#!/usr/bin/env bash

set -euo pipefail

script_dir=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)
repo_root=$(cd "${script_dir}/.." && pwd -P)
snapshot_path=${SUPABASE_SCHEMA_OUTPUT:-"${repo_root}/supabase/schema.sql"}
snapshot_dir=$(dirname "${snapshot_path}")
supabase_bin=${SUPABASE_BIN:-supabase}

dump_options=()
database_selector=

usage_error() {
  printf '%s\n' \
    'Use --local (default) or --db-url; linked, output, schema, and non-schema dump overrides are not allowed.' >&2
  exit 64
}

if (( $# > 0 )); then
  dump_options=("$@")
  option_index=0
  while (( option_index < ${#dump_options[@]} )); do
    option=${dump_options[${option_index}]}
    case "${option}" in
      --local)
        [[ -z "${database_selector}" ]] || usage_error
        database_selector=local
        ;;
      --db-url)
        [[ -z "${database_selector}" ]] || usage_error
        database_selector=db-url
        option_index=$((option_index + 1))
        (( option_index < ${#dump_options[@]} )) || usage_error
        [[ -n "${dump_options[${option_index}]}" ]] || usage_error
        ;;
      --db-url=*)
        [[ -z "${database_selector}" ]] || usage_error
        [[ -n "${option#--db-url=}" ]] || usage_error
        database_selector=db-url
        ;;
      --linked|--file|-f|--file=*|-f?*|--schema|-s|--schema=*|-s?*|\
      --data-only|--role-only|--keep-comments|--dry-run|--use-copy|\
      --project-ref|--project-ref=*|--password|-p|--password=*|-p?*|--debug|--)
        usage_error
        ;;
    esac
    option_index=$((option_index + 1))
  done
fi
if [[ -z "${database_selector}" ]]; then
  dump_options+=(--local)
fi

if [[ ! -d "${snapshot_dir}" ]]; then
  printf 'Schema output directory does not exist: %s\n' "${snapshot_dir}" >&2
  exit 64
fi

temp_dir=$(mktemp -d "${snapshot_dir}/.schema-generate.XXXXXX")
raw_dump="${temp_dir}/schema.raw.sql"
generated_snapshot="${temp_dir}/schema.sql"

cleanup() {
  if [[ -n "${temp_dir:-}" && -d "${temp_dir}" ]]; then
    rm -rf -- "${temp_dir}"
  fi
}
trap cleanup EXIT INT TERM

"${supabase_bin}" db dump \
  --schema public \
  --file "${raw_dump}" \
  "${dump_options[@]}"

{
  printf '%s\n' \
    '-- GENERATED SNAPSHOT — DO NOT EDIT OR APPLY MANUALLY.' \
    '-- Source of truth: supabase/migrations.' \
    '-- Regenerate from a local database rebuilt from the active migrations with:' \
    '-- scripts/generate-supabase-schema.sh'
  printf '\n'
  awk '
    BEGIN { started = 0; blank_lines = 0 }
    {
      if (!started) {
        if ($0 == "") next
        started = 1
      }
      if ($0 == "") {
        blank_lines += 1
        next
      }
      while (blank_lines > 0) {
        print ""
        blank_lines -= 1
      }
      print
    }
    END {
      if (!started) exit 65
    }
  ' "${raw_dump}"
} > "${generated_snapshot}"

mv -f -- "${generated_snapshot}" "${snapshot_path}"
