import type { LearningDiagram, TopicField } from "@/types/content";
import { technologyDiagrams } from "./technology";
import { managementDiagrams } from "./management";
import { strategyDiagrams } from "./strategy";

// ============================================================================
// 図解レジストリの集約点。
// 図解は id で一意に管理し、トピックからは diagramIds（id 参照）で呼び出す。
// 取得ヘルパーは lib/content.ts 側に置く（このファイルはデータの集約のみ）。
// 後で Supabase 等へ移すときは、この配列を行レコードに移し替えるだけで済む構造。
// ============================================================================

/** すべての図解（分野順に連結） */
export const diagrams: LearningDiagram[] = [
  ...technologyDiagrams,
  ...managementDiagrams,
  ...strategyDiagrams,
];

export { technologyDiagrams, managementDiagrams, strategyDiagrams };

/** id → 図解 の索引（高速参照用）。重複 id があれば開発時に気づけるよう警告する。 */
export const diagramRegistry: Record<string, LearningDiagram> = (() => {
  const map: Record<string, LearningDiagram> = {};
  for (const d of diagrams) {
    if (map[d.id] && process.env.NODE_ENV !== "production") {
      console.warn(`[diagramRegistry] 図解 id が重複しています: ${d.id}`);
    }
    map[d.id] = d;
  }
  return map;
})();

/** 分野ごとの図解一覧（表示順は diagrams の並びを保つ） */
export function diagramsByField(field: TopicField): LearningDiagram[] {
  return diagrams.filter((d) => d.field === field);
}
