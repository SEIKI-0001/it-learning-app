// サイトマップの lastmod が「本体が実際に変わったページだけ」を指すことを守るテスト。
//
// ページごとに本体の指紋を作り、data/seo/page-lastmod.json の記録と照らす。
// - 普段: 指紋が記録とずれていたら落ちる（本体を変えたのに日付を更新していない）。
// - `npm run seo:lastmod`（SEO_LASTMOD_UPDATE=1）: 指紋が変わったページだけ今日の日付にして書き戻す。
//   指紋が未記録（hash が空）の行は日付を変えずに指紋だけ埋める（初期値の取り込み用）。
//
// 指紋に入れるもの（共通の枠＝CTA・ナビ・パンくず・構造化データ・title の書式は入れない）:
// - 過去問: 問題・選択肢・正解・解説・図表・論点タグ
// - 英略語: 用語データ1件
// - 解説: トピックのデータと、そのトピック専用の解説コンポーネント（components/experiences 配下で、
//   他の解説から使われていないファイルだけ）のソース
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getTopic } from "@/lib/content";
import { getAllKakomonQuestions } from "@/lib/publicPages/kakomon";
import { getKaisetsuTopics, kaisetsuPath } from "@/lib/publicPages/kaisetsu";
import { wordPath } from "@/lib/publicPages/words";
import type { PageLastmodManifest } from "@/lib/seo/pageLastmod";
import { getAllWords } from "@/lib/wordlist";

const ROOT = path.resolve(__dirname, "..");
const MANIFEST_PATH = path.join(ROOT, "data/seo/page-lastmod.json");
const EXPERIENCES_DIR = path.join(ROOT, "components/experiences");
const UPDATE = process.env.SEO_LASTMOD_UPDATE === "1";

const sha = (s: string) => createHash("sha256").update(s).digest("hex").slice(0, 16);

/** 日本時間の今日（YYYY-MM-DD）。 */
function todayJst(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
}

// ---- 解説コンポーネントのソース（トピック専用のファイルだけ） ----

function resolveImport(fromFile: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith("@/components/experiences/")) {
    base = path.join(EXPERIENCES_DIR, spec.slice("@/components/experiences/".length));
  } else if (spec.startsWith(".")) {
    base = path.resolve(path.dirname(fromFile), spec);
  } else {
    return null;
  }
  if (!base.startsWith(EXPERIENCES_DIR)) return null;
  for (const c of [base, `${base}.tsx`, `${base}.ts`, path.join(base, "index.tsx"), path.join(base, "index.ts")]) {
    if (existsSync(c) && /\.(tsx?|css)$/.test(c)) return c;
  }
  return null;
}

function importClosure(entry: string): Set<string> {
  const seen = new Set<string>();
  const stack = [entry];
  while (stack.length) {
    const file = stack.pop()!;
    if (seen.has(file)) continue;
    seen.add(file);
    if (!file.endsWith(".ts") && !file.endsWith(".tsx")) continue;
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
      const resolved = resolveImport(file, m[1]);
      if (resolved && !seen.has(resolved)) stack.push(resolved);
    }
  }
  return seen;
}

/** トピック id → そのトピック専用の解説ソース（連結した文字列）。 */
function experienceSourcesByTopic(): Map<string, string> {
  const registryFile = ["registry.tsx", "registry.ts"]
    .map((f) => path.join(EXPERIENCES_DIR, f))
    .find((f) => existsSync(f))!;
  const registry = readFileSync(registryFile, "utf8");
  const componentFile = new Map<string, string>();
  for (const m of registry.matchAll(/import\s+(\w+)\s+from\s+["']([^"']+)["']/g)) {
    const resolved = resolveImport(registryFile, m[2]);
    if (resolved) componentFile.set(m[1], resolved);
  }
  const block = registry.slice(registry.indexOf("TOPIC_EXPERIENCES"));
  const topicComponent = new Map<string, string>();
  for (const m of block.matchAll(/["']([a-z0-9-]+)["']\s*:\s*(\w+)/g)) topicComponent.set(m[1], m[2]);

  // 複数の解説コンポーネントから使われるファイル（共通部品）は除く。共通部品を直しても全解説の日付が動かないように。
  const closures = new Map<string, Set<string>>();
  for (const name of new Set(topicComponent.values())) {
    const file = componentFile.get(name);
    if (file) closures.set(name, importClosure(file));
  }
  const usedBy = new Map<string, number>();
  for (const files of closures.values()) for (const f of files) usedBy.set(f, (usedBy.get(f) ?? 0) + 1);

  const out = new Map<string, string>();
  for (const [topicId, name] of topicComponent) {
    const files = [...(closures.get(name) ?? [])].filter((f) => usedBy.get(f) === 1).sort();
    out.set(topicId, files.map((f) => `${path.relative(ROOT, f)}\n${readFileSync(f, "utf8")}`).join("\n"));
  }
  return out;
}

// ---- ページごとの指紋 ----

function currentFingerprints(): Map<string, string> {
  const fp = new Map<string, string>();
  for (const q of getAllKakomonQuestions()) {
    fp.set(q.path, sha(JSON.stringify({ view: q.view, topicLabel: q.topicLabel, tags: q.tags })));
  }
  for (const w of getAllWords()) fp.set(wordPath(w.id), sha(JSON.stringify(w)));
  const sources = experienceSourcesByTopic();
  for (const t of getKaisetsuTopics()) {
    fp.set(kaisetsuPath(t.id), sha(JSON.stringify(getTopic(t.id)) + "\n" + (sources.get(t.id) ?? "")));
  }
  return fp;
}

function readManifest(): PageLastmodManifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as PageLastmodManifest;
}

describe("sitemap lastmod (data/seo/page-lastmod.json)", () => {
  const fingerprints = currentFingerprints();

  if (UPDATE) {
    it("updates the date only for pages whose content changed", () => {
      const before = readManifest();
      const today = todayJst();
      const next: PageLastmodManifest = {};
      const changed: string[] = [];
      for (const [p, hash] of [...fingerprints].sort(([a], [b]) => a.localeCompare(b))) {
        const prev = before[p];
        if (prev && (prev.hash === hash || prev.hash === "")) {
          next[p] = { date: prev.date, hash };
        } else {
          next[p] = { date: today, hash };
          changed.push(p);
        }
      }
      writeFileSync(MANIFEST_PATH, `${JSON.stringify(next, null, 2)}\n`);
      console.log(`page-lastmod: ${changed.length} page(s) set to ${today}`, changed.slice(0, 20));
    });
    return;
  }

  it("has a recorded fingerprint for every content page, matching the current content", () => {
    const manifest = readManifest();
    const stale = [...fingerprints].filter(([p, hash]) => manifest[p]?.hash !== hash).map(([p]) => p);
    // 落ちたら `npm run seo:lastmod` を実行して data/seo/page-lastmod.json をコミットする。
    expect(stale, "本体が変わったページの更新日が未記録です。npm run seo:lastmod を実行してください").toEqual([]);
  });

  it("records only pages that exist, with real, non-future dates", () => {
    const manifest = readManifest();
    const today = todayJst();
    for (const [p, e] of Object.entries(manifest)) {
      expect(fingerprints.has(p), `${p} は公開ページにありません`).toBe(true);
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(e.date <= today).toBe(true);
    }
  });
});
