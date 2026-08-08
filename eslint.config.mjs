import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // git worktree（git worktree add の作業ツリー）。
    // リポジトリの別ブランチをまるごと展開したものなので、中身は同じコードの別版。
    // lint 対象に入れると、いま編集していないブランチの指摘まで出てくるうえ、
    // 各 worktree の .next/ まで走査して実行時間も膨らむ。
    // 対象にしたいときは、その worktree 側で lint を実行すること。
    ".worktrees/**",
  ]),
]);

export default eslintConfig;
