// 統一問題バンクの型定義。
//
// 設計方針:
//   - アプリが出題する問題を「どこから来たか（origin）」で区別できる単一の型にまとめる。
//     公式過去問 / アプリ独自問題 / AI生成問題 / 公式改変問題を同じ器で扱う。
//   - 問題本文は Git 管理（data/question-bank 配下の JSON）。
//     回答履歴・実測難易度は将来 Supabase 側で持つ（この型には含めない）。
//   - 公式過去問の「原文」は official.original に保持し、
//     表示用に正規化したテキスト（prompt / choices）で上書きしない。
//   - status で公開可否を管理する。published にはレビュー情報と contentHash が必須。
//
// 注意: この型は「問題データの正」の形。画面が受け取る形（CheckQuestion）へは
//       lib/questionBank/adapter.ts で変換する。UI から JSON を直接読まない。

import type { ChoiceKey } from "@/types";
import type { Difficulty, TopicField } from "@/types/content";

// ---------------------------------------------------------------------------
// 分類軸
// ---------------------------------------------------------------------------

/** 問題の出所。回答履歴の分析や、公式問題との類似度検査の起点になる。 */
export type QuestionOrigin =
  | "official_past" // IPA 等が公開した過去問の原文出題
  | "app_original" // アプリ独自に作成した問題
  | "ai_generated" // AI が生成した問題（レビュー必須）
  | "modified_official"; // 公式過去問をもとに改変した問題

/**
 * 公開状態。draft → 内容確認 → 解説確認 → published の順に上げる。
 *
 * 重要: status は「品質の監査がどこまで進んだか」を表すもので、
 * 出題可否のスイッチではない。確認パックは問題IDを明示的に参照して出題するため、
 * draft の問題も従来どおり出題される（移行した既存146問がこの状態）。
 * status で絞りたいときは getPublishedQuestions() を使う。
 */
export type QuestionStatus =
  | "draft" // 未監査。移行しただけの問題を含む（出題されないという意味ではない）
  | "content_verified" // 問題文・選択肢・正答を監査済み
  | "explanation_verified" // 解説の妥当性まで監査済み
  | "published" // 公開可（contentHash とレビュー情報が必須）
  | "retired"; // 出題停止（履歴保持のため削除はしない）

/** 出題形式。実測難易度の補正や、模擬試験の構成比を組むときに使う。 */
export type QuestionPattern =
  | "knowledge" // 用語・知識をそのまま問う
  | "application" // 場面判断・比較・適用を問う
  | "calculation" // 計算を伴う
  | "diagram" // 図表の読み取りを伴う
  | "ordering"; // 手順・順序を問う

// ---------------------------------------------------------------------------
// 構成要素
// ---------------------------------------------------------------------------

export type QuestionChoice = {
  key: ChoiceKey;
  text: string;
};

/**
 * シラバス上の位置。問題の「内容」から見て IPA シラバスのどこに属するかを持たせ、
 * 年度別演習・分野別集計に使う。
 *
 * 重要: これは official.examField（公式問題冊子上の出題区分）とは別物で、
 * 一致しないことがある。詳しくは QuestionRecord のコメントを参照。
 */
export type QuestionSyllabusNode = {
  /** data/ipaSyllabus.ts の IpaSyllabusItem.id（例: "ipa-01"）。 */
  itemId?: string;
  /**
   * 内容から見た分野（ストラテジ / マネジメント / テクノロジ）。
   * primaryTopicId から引く。公式出題区分（official.examField）で上書きしないこと。
   */
  field?: string;
  majorCategory?: string;
  middleCategory?: string;
};

/** 図表。今回は表示 UI を作らないが、公式過去問が図を持つため型だけ用意する。 */
export type QuestionFigure = {
  id: string;
  kind: "image" | "table" | "ascii";
  /** kind: "image" のときの public 配下パス。 */
  src?: string;
  /** kind: "table" / "ascii" のときの本文。 */
  body?: string;
  /** 読み上げ・代替テキスト（必須運用にする）。 */
  alt: string;
  caption?: string;
};

// ---------------------------------------------------------------------------
// 公式問題の出典
// ---------------------------------------------------------------------------

export type QuestionProvider = "ipa";

export type OfficialExamType =
  | "it_passport" // ITパスポート試験
  | "information_security_management"
  | "fundamental_information_technology";

/**
 * 公式公開時点の原文。表示用の正規化（記号の統一・改行整形など）を行っても
 * ここは書き換えない。出典表示の正確性と、改変有無の検証のために保持する。
 */
export type OfficialQuestionOriginal = {
  prompt: string;
  choices: QuestionChoice[];
  correctChoice: ChoiceKey;
  /**
   * 公式問題が本文中で参照している図表のID。QuestionRecord.figures[].id と対応する。
   * 並び順は問題文が参照する順（1つ目に出てくる図表が先頭）。
   * 図表なしの問題では省略する（空配列は置かない）。
   */
  figureIds?: string[];
};

export type OfficialQuestionSource = {
  provider: QuestionProvider;
  examType: OfficialExamType;
  /** 実施年（西暦）。 */
  year: number;
  /** 問番号（公式の「問 n」）。 */
  questionNumber: number;
  /**
   * 公式問題冊子上の出題区分。「その問がどの区分の問として出題されたか」という
   * 出典側の事実であって、問題内容の分類ではない。
   *
   * syllabusNode.field（内容分類）と一致しないことがあり、一致させてはいけない。
   * 例）令和8年度 問16: examField "strategy" / syllabusNode.field "technology"
   *     令和8年度 問52: examField "management" / syllabusNode.field "strategy"
   *
   * 公式問題（official_past / modified_official）では必須（validate で検査）。
   * 出典側の値なので contentHash の対象外（本文が変わらない限りハッシュは動かない）。
   */
  examField: TopicField;
  /** 問題冊子・公開ページの URL。 */
  sourceUrl: string;
  /** 解答表の URL。 */
  answerSourceUrl: string;
  /** 画面に出す出典表記（例: "IPA 独立行政法人情報処理推進機構"）。 */
  attribution: string;
  /** 原文から改変しているか。origin と必ず整合させる（validate で検査）。 */
  isModified: boolean;
  /** 実施回（例: "2023-spring" / "R5"）。年度内に複数回ある試験向け。 */
  examSession?: string;
  /** 公式公開時点の原文。取り込み時に必ず保存する。 */
  original?: OfficialQuestionOriginal;
  /** 取得日（ISO8601）。出典 URL の版を追えるようにする。 */
  retrievedAt?: string;
};

// ---------------------------------------------------------------------------
// 問題レコード
// ---------------------------------------------------------------------------

/**
 * 問題1件。
 *
 * 分類は3軸あり、混同すると集計も復習導線も壊れる。必ず別物として扱うこと。
 *
 *   official.examField … 公式問題冊子上の出題区分（出典側の事実）
 *                        「公式ではこの区分の問だった」。年度別・区分別の再現に使う。
 *   syllabusNode.field … 問題内容から見た IPA シラバス分類（アプリ側の解釈）
 *                        「何を問うている問題か」。弱点分析・分野別集計に使う。
 *   primaryTopicId     … アプリ内の復習先トピック（導線）
 *                        「間違えたらどこへ戻すか」。分類ラベルではない。
 *
 * 3つは一致しないことがある。例）令和8年度 問16 は公式区分ストラテジだが
 * 内容はテクノロジ。どれかで他を上書きしてはいけない。
 */
export type QuestionRecord = {
  /** 問題ID。回答履歴（question_attempts）のキーになるため変更禁止。 */
  id: string;
  /** 内容を変更したら +1 する。履歴とどの版に答えたかを突き合わせるために使う。 */
  version: number;
  origin: QuestionOrigin;
  status: QuestionStatus;
  /**
   * アプリ内トピックID（data/topics の Topic.id）。復習導線の主キー。
   * 「間違えたらどこへ戻すか」を決める値で、分類ラベルではない。
   * 存在しないIDを置かないこと（テストで data/topics との完全一致を検査する）。
   */
  primaryTopicId: string;
  syllabusNode?: QuestionSyllabusNode;
  questionPattern: QuestionPattern;

  /** 表示用の問題文。公式問題では正規化後のテキストが入りうる。 */
  prompt: string;
  /** 4択。key は A〜D で重複しないこと（validate で検査）。 */
  choices: QuestionChoice[];
  correctChoice: ChoiceKey;

  /** アプリ独自の解説（公式解答の転載ではない）。 */
  explanation: string;
  /** 選択肢別の解説。誤答復習で「なぜ違うか」を返すのに使う。 */
  choiceExplanations?: Partial<Record<ChoiceKey, string>>;

  /** 作問時点の推定難易度。ユーザーの実測値による補正は将来 DB 側で持つ。 */
  estimatedDifficulty: Difficulty;
  /** 誤答分析・直前復習用のタグ。 */
  tags: string[];
  figures?: QuestionFigure[];

  /**
   * 公式問題の出典。origin との対応は validate で強制する。
   *   official_past      … 必須 / isModified: false
   *   modified_official  … 必須 / isModified: true（改変でも出典は必要）
   *   app_original       … 持たない
   *   ai_generated       … 持たない
   *
   * 注意: AI生成問題が「どの公式問題を参考にしたか」を持たせたくなっても、
   * このフィールドを流用しない。出典表示に使う値なので、参照しただけの問題を
   * 入れると出典表記が事実と食い違う。将来 referenceQuestionIds 等を別に足す。
   */
  official?: OfficialQuestionSource;

  /**
   * 問題本文のハッシュ。計算対象は lib/questionBank/contentHash.ts を参照
   * （prompt / choices / correctChoice / explanation のみ。メタ情報は含めない）。
   */
  contentHash: string;
  /** レビュー完了日時（ISO8601）。未レビューは null。 */
  reviewedAt: string | null;
  /** レビュー者の識別子。未レビューは null。 */
  reviewedBy: string | null;
};

// ---------------------------------------------------------------------------
// 保存ファイルの形
// ---------------------------------------------------------------------------

/** data/question-bank 配下の JSON 1ファイルぶん。 */
export type QuestionBankFile = {
  /** ファイル形式の版。読み込み側の互換判定に使う。 */
  schemaVersion: 1;
  /** このファイルが何の束か（例: "original/exam-level"）。 */
  source: string;
  questions: QuestionRecord[];
};

/**
 * 移行・生成の結果を記録するマニフェスト（件数・ID のドリフト検知用）。
 * 実行時刻は持たない（再生成で無意味な差分が出るのを避ける。日時は git 履歴で追う）。
 */
export type QuestionBankManifest = {
  file: string;
  generatedFrom: string;
  questionCount: number;
  /** 生成時点の全ID。ID の消失・改名を検知する。 */
  questionIds: string[];
};
