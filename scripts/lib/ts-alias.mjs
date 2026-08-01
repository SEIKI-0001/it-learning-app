// ============================================================================
// スクリプトから TypeScript の lib/ を直接 import するための解決フック。
// ----------------------------------------------------------------------------
// Node の型ストリップ（.ts をそのまま実行できる機能）は、tsconfig の paths を見ない。
// そのため lib/ の中で使っている "@/..." が解決できず、
// import type だけの薄いモジュールしかスクリプトから読めなかった。
//
// ここでは "@/" をリポジトリルートに読み替え、拡張子も補う。
// バンドラは介さないので、ビルド成果物には一切影響しない（スクリプト実行時のみ）。
//
// 使い方:
//   import { registerTsAlias } from "../lib/ts-alias.mjs";
//   registerTsAlias(ROOT);
//   const { buildQualityReport } = await import("../../lib/questionQuality/report.ts");
//
// 注意: register は import 文より先に呼ぶ必要があるため、対象モジュールは
//       静的 import ではなく await import() で読むこと。
// ============================================================================

import { statSync } from "node:fs";
import module from "node:module";
import { pathToFileURL } from "node:url";

// "@/data/question-bank" のように、同名のディレクトリが存在する指定がある。
// 拡張子なしをそのまま採用するとディレクトリを import してしまうため、
// 「ファイルであること」を条件にして index.ts まで探す。
const CANDIDATE_SUFFIXES = ["", ".ts", ".tsx", ".json", "/index.ts", "/index.tsx"];

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function resolveAliasPath(root, specifier) {
  const base = `${root}/${specifier.slice(2)}`;
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = `${base}${suffix}`;
    if (isFile(candidate)) return candidate;
  }
  return base;
}

/**
 * "@/" エイリアスを解決するフックを登録する。
 * Node 22.15+ / 23.5+ の同期版 registerHooks を優先し、無ければ register にフォールバックする。
 */
/**
 * JSON を import する箇所に type: "json" を補う。
 *
 * data/ 配下は `import questions from "./exam-level.json"` の形で JSON を読んでいる。
 * バンドラはこれを解釈するが、Node の ESM は import attribute を要求して落ちる。
 * ソース側に `with { type: "json" }` を足すとバンドラ・型定義側の扱いが変わるので、
 * スクリプト実行時にだけここで補う。
 */
function withJsonAttribute(result) {
  if (result?.url?.endsWith(".json")) {
    return { ...result, importAttributes: { ...result.importAttributes, type: "json" } };
  }
  return result;
}

export function registerTsAlias(root) {
  const hook = {
    resolve(specifier, context, nextResolve) {
      const target = specifier.startsWith("@/")
        ? pathToFileURL(resolveAliasPath(root, specifier)).href
        : specifier;
      return withJsonAttribute(nextResolve(target, context));
    },
  };

  if (typeof module.registerHooks === "function") {
    module.registerHooks(hook);
    return;
  }

  // 旧 Node 向け。フックは別スレッドで動くので root は環境変数で渡す。
  process.env.QUESTION_BANK_TS_ALIAS_ROOT = root;
  module.register(
    new URL("./ts-alias-worker.mjs", import.meta.url).href,
    pathToFileURL(`${root}/`),
  );
}
