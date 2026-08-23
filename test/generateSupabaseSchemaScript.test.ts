import {
  chmodSync,
  existsSync,
  mkdtempSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

const repoRoot = path.resolve(import.meta.dirname, "..");
const generator = path.join(repoRoot, "scripts", "generate-supabase-schema.sh");

function writeFakeSupabase(filePath: string) {
  writeFileSync(
    filePath,
    [
      "#!/usr/bin/env bash",
      "set -euo pipefail",
      'printf \'%s\\n\' "$@" > "${FAKE_ARGS_FILE:?}"',
      "dump_file=",
      "previous=",
      'for argument in "$@"; do',
      '  if [[ "$previous" == "--file" ]]; then',
      '    dump_file="$argument"',
      "  fi",
      '  previous="$argument"',
      "done",
      '[[ -n "$dump_file" ]]',
      'if [[ "${FAKE_FAIL:-0}" == "1" ]]; then',
      "  printf 'partial dump\\n' > \"$dump_file\"",
      "  exit 42",
      "fi",
      "printf '\\n\\nSET statement_timeout = 0;\\n\\nCREATE TABLE example(id integer);\\n\\n\\n' > \"$dump_file\"",
    ].join("\n"),
  );
  chmodSync(filePath, 0o755);
}

describe("generate-supabase-schema.sh", () => {
  it("writes the canonical header and deterministic dump body through the local CLI", () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "supabase-schema-generator-"));

    try {
      const fakeSupabase = path.join(fixtureRoot, "fake-supabase");
      const argsFile = path.join(fixtureRoot, "args.txt");
      const output = path.join(fixtureRoot, "supabase", "schema.sql");
      mkdirSync(path.dirname(output), { recursive: true });
      writeFileSync(output, "existing snapshot\n");
      writeFakeSupabase(fakeSupabase);

      const result = spawnSync("bash", [generator], {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          FAKE_ARGS_FILE: argsFile,
          SUPABASE_BIN: fakeSupabase,
          SUPABASE_SCHEMA_OUTPUT: output,
        },
      });

      expect(result.status, result.stderr).toBe(0);
      expect(readFileSync(output, "utf8")).toBe(
        [
          "-- GENERATED SNAPSHOT — DO NOT EDIT OR APPLY MANUALLY.",
          "-- Source of truth: supabase/migrations.",
          "-- Regenerate from a local database rebuilt from the active migrations with:",
          "-- scripts/generate-supabase-schema.sh",
          "",
          "SET statement_timeout = 0;",
          "",
          "CREATE TABLE example(id integer);",
          "",
        ].join("\n"),
      );

      const args = readFileSync(argsFile, "utf8").trimEnd().split("\n");
      expect(args.slice(0, 4)).toEqual(["db", "dump", "--schema", "public"]);
      expect(args[4]).toBe("--file");
      expect(path.dirname(path.dirname(args[5]))).toBe(path.dirname(output));
      expect(path.basename(path.dirname(args[5]))).toMatch(/^\.schema-generate\./);
      expect(args[6]).toBe("--local");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("passes a database URL without evaluation and preserves the snapshot when the dump fails", () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "supabase-schema-generator-"));

    try {
      const fakeSupabase = path.join(fixtureRoot, "fake-supabase");
      const argsFile = path.join(fixtureRoot, "args.txt");
      const output = path.join(fixtureRoot, "supabase", "schema.sql");
      const injectedFile = path.join(fixtureRoot, "must-not-exist");
      const connectionUrl =
        `postgresql://user:secret-token-123@127.0.0.1/db?sslmode=disable; touch "${injectedFile}"`;
      mkdirSync(path.dirname(output), { recursive: true });
      writeFileSync(output, "trusted existing snapshot\n");
      writeFakeSupabase(fakeSupabase);

      const result = spawnSync("bash", [generator, "--db-url", connectionUrl], {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          FAKE_ARGS_FILE: argsFile,
          FAKE_FAIL: "1",
          SUPABASE_BIN: fakeSupabase,
          SUPABASE_SCHEMA_OUTPUT: output,
        },
      });

      expect(result.status).toBe(42);
      expect(readFileSync(output, "utf8")).toBe("trusted existing snapshot\n");
      expect(result.stdout).not.toContain("secret-token-123");
      expect(result.stderr).not.toContain("secret-token-123");
      expect(existsSync(injectedFile)).toBe(false);
      expect(readdirSync(path.dirname(output))).toEqual(["schema.sql"]);

      const args = readFileSync(argsFile, "utf8").trimEnd().split("\n");
      expect(args).toContain("--db-url");
      expect(args).toContain(connectionUrl);
      expect(args).not.toContain("--local");
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("keeps local mode when passing options that do not select a database", () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "supabase-schema-generator-"));

    try {
      const fakeSupabase = path.join(fixtureRoot, "fake-supabase");
      const argsFile = path.join(fixtureRoot, "args.txt");
      const output = path.join(fixtureRoot, "supabase", "schema.sql");
      mkdirSync(path.dirname(output), { recursive: true });
      writeFakeSupabase(fakeSupabase);

      const result = spawnSync("bash", [generator, "--workdir", fixtureRoot], {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          FAKE_ARGS_FILE: argsFile,
          SUPABASE_BIN: fakeSupabase,
          SUPABASE_SCHEMA_OUTPUT: output,
        },
      });

      expect(result.status, result.stderr).toBe(0);
      const args = readFileSync(argsFile, "utf8").trimEnd().split("\n");
      expect(args.slice(-3)).toEqual(["--workdir", fixtureRoot, "--local"]);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });

  it("rejects options that bypass deterministic local schema generation", () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "supabase-schema-generator-"));

    try {
      const fakeSupabase = path.join(fixtureRoot, "fake-supabase");
      writeFakeSupabase(fakeSupabase);
      const cases = [
        ["--linked"],
        ["--file", path.join(fixtureRoot, "caller.sql")],
        ["--schema", "auth"],
        ["--keep-comments"],
        ["--local", "--db-url", "postgresql://user:secret-conflict@127.0.0.1/db"],
        ["--db-url"],
      ];

      for (const [index, args] of cases.entries()) {
        const caseRoot = path.join(fixtureRoot, `case-${index}`);
        const output = path.join(caseRoot, "schema.sql");
        const argsFile = path.join(caseRoot, "args.txt");
        mkdirSync(caseRoot, { recursive: true });
        writeFileSync(output, "trusted existing snapshot\n");

        const result = spawnSync("bash", [generator, ...args], {
          cwd: repoRoot,
          encoding: "utf8",
          env: {
            ...process.env,
            FAKE_ARGS_FILE: argsFile,
            SUPABASE_BIN: fakeSupabase,
            SUPABASE_SCHEMA_OUTPUT: output,
          },
        });

        expect(result.status, `args: ${args.join(" ")}\n${result.stderr}`).toBe(64);
        expect(readFileSync(output, "utf8")).toBe("trusted existing snapshot\n");
        expect(existsSync(argsFile)).toBe(false);
        expect(result.stdout).not.toContain("secret-conflict");
        expect(result.stderr).not.toContain("secret-conflict");
      }
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
