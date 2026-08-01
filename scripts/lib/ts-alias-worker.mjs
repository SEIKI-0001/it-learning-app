// ts-alias.mjs のフォールバック用。module.register() で読み込まれ、
// ローダースレッド側で "@/" を解決する（同期版 registerHooks が無い Node 向け）。

import { statSync } from "node:fs";
import { pathToFileURL } from "node:url";

const ROOT = process.env.QUESTION_BANK_TS_ALIAS_ROOT ?? process.cwd();
const CANDIDATE_SUFFIXES = ["", ".ts", ".tsx", ".json", "/index.ts", "/index.tsx"];

function isFile(p) {
  try {
    return statSync(p).isFile();
  } catch {
    return false;
  }
}

function withJsonAttribute(result) {
  if (result?.url?.endsWith(".json")) {
    return { ...result, importAttributes: { ...result.importAttributes, type: "json" } };
  }
  return result;
}

function aliasTarget(specifier) {
  const base = `${ROOT}/${specifier.slice(2)}`;
  for (const suffix of CANDIDATE_SUFFIXES) {
    const candidate = `${base}${suffix}`;
    if (isFile(candidate)) return pathToFileURL(candidate).href;
  }
  return pathToFileURL(base).href;
}

export async function resolve(specifier, context, nextResolve) {
  const target = specifier.startsWith("@/") ? aliasTarget(specifier) : specifier;
  return withJsonAttribute(await nextResolve(target, context));
}
