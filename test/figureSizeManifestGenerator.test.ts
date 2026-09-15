import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "..");
const generator = path.join(root, "scripts/cloudflare/generate-figure-size-manifest.mjs");
const truncatedFixture = path.join(root, "test/fixtures/truncated-png-ihdr.hex");

describe("figure-size manifest generator", () => {
  it("rejects a PNG truncated before the complete IHDR chunk", () => {
    const fixtureRoot = mkdtempSync(path.join(tmpdir(), "figure-size-manifest-"));
    const fixtureGenerator = path.join(
      fixtureRoot,
      "scripts/cloudflare/generate-figure-size-manifest.mjs",
    );
    const output = path.join(fixtureRoot, "lib/pastExam/figureSizeManifest.generated.ts");

    try {
      mkdirSync(path.dirname(fixtureGenerator), { recursive: true });
      mkdirSync(path.join(fixtureRoot, "public/question-bank"), { recursive: true });
      mkdirSync(path.dirname(output), { recursive: true });
      copyFileSync(generator, fixtureGenerator);
      writeFileSync(
        path.join(fixtureRoot, "public/question-bank/truncated.png"),
        Buffer.from(readFileSync(truncatedFixture, "utf8").trim(), "hex"),
      );

      const result = spawnSync(process.execPath, [fixtureGenerator], {
        cwd: fixtureRoot,
        encoding: "utf8",
      });

      expect(result.status).not.toBe(0);
      expect(`${result.stderr}${result.stdout}`).toContain("Invalid PNG IHDR");
      expect(existsSync(output)).toBe(false);
    } finally {
      rmSync(fixtureRoot, { recursive: true, force: true });
    }
  });
});
