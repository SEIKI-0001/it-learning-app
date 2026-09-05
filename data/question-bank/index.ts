import type { QuestionBankFile } from "@/types/questionBank";
import examLevel from "./original/exam-level.json";
import themeExam from "./original/theme-exam.json";
import ipaItPassport2022 from "./official/ipa/it-passport-2022.json";
import ipaItPassport2023 from "./official/ipa/it-passport-2023.json";
import ipaItPassport2024 from "./official/ipa/it-passport-2024.json";
import ipaItPassport2025 from "./official/ipa/it-passport-2025.json";
import ipaItPassport2026 from "./official/ipa/it-passport-2026.json";

// ============================================================================
// 問題バンクのファイル束ね。ここに JSON を1行足すだけで問題が増える構成にする。
// ----------------------------------------------------------------------------
// - original/ : アプリ独自問題（origin: "app_original"）
// - official/ : 公式公開の過去問（origin: "official_past" / "modified_official"）
//               例: official/ipa/it-passport-2023.json
// - manifests/: 生成時の件数・ID一覧。移行や再生成でのドリフト検知に使う。
//
// JSON からの読み込みは型が広がる（"A" ではなく string になる）ため、
// data/wordlist と同じく読み込み地点で1度だけキャストする。
// 中身の正しさは lib/questionBank/validate.ts が検証する。
// ============================================================================

export const questionBankFiles: QuestionBankFile[] = [
  examLevel as unknown as QuestionBankFile,
  themeExam as unknown as QuestionBankFile,
  ipaItPassport2022 as unknown as QuestionBankFile,
  ipaItPassport2023 as unknown as QuestionBankFile,
  ipaItPassport2024 as unknown as QuestionBankFile,
  ipaItPassport2025 as unknown as QuestionBankFile,
  ipaItPassport2026 as unknown as QuestionBankFile,
];
