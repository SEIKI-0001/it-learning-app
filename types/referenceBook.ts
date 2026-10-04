// ITパスポート学習コーチ — 参考書アウトラインの型定義
//
// 方針:
//   - 参考書の章構成は固定データにしない。書籍・年度・版で違うため、ユーザーごとに
//     編集できる「アウトライン」として持つ。
//   - 章番号に依存しない既存の Topic.referenceHints はフォールバックとして残す。
//   - localStorage を主とし、ログイン時は Supabase(API Route経由)へも保存する。

/** 参考書の節（章の下位）。アプリ内トピックと紐づけできる。 */
export type ReferenceSection = {
  id: string;
  title: string;
  keywords?: string[]; // 関連キーワード
  topicIds?: string[]; // 紐づくアプリ内トピック id
  // --- 読了状態（参考書の構造上の読了。日次の自己申告 daily_progress_reports とは別概念） ---
  done?: boolean; // 読み終えたか。/today の「全部」で自動的に true になる
  completedAt?: string; // 読了にした日時(ISO)
  startedAt?: string; // 「少し」「半分」以上で最初に読み始めた日時(ISO)。部分読了の印
};

/** 参考書の章。 */
export type ReferenceChapter = {
  id: string;
  title: string;
  note?: string; // メモ
  keywords?: string[]; // 関連キーワード
  topicIds?: string[]; // 紐づくアプリ内トピック id
  sections?: ReferenceSection[]; // 節
  // 読み終えたか。節がある章では「全節が読了」で自動的に true になる（旧データの手動チェックも尊重）。
  done?: boolean;
  completedAt?: string; // 読了にした日時(ISO)
};

/** 本をどこから作ったか（照合・カタログ利用回数に使う）。手入力・目次読み取りは無し。 */
export type ReferenceBookSource = {
  kind: "preset" | "catalog";
  id: string;
  /**
   * 作成元プリセットの構造の版（itpass_reference_book.json の structureVersion）。
   * 旧い版で作った本は、読み込み時に新しい章立てへ移行する（読了状態は可能な範囲で引き継ぐ）。
   */
  version?: number;
};

/** ユーザーごとの参考書アウトライン。 */
export type ReferenceBook = {
  /**
   * 本そのものの永続 id（uuid）。書名や版が同じでも別の本なら別 id。
   * 旧データには無い（DB 同期で DB 側の id を受け取る）。構造変化の検知には使わない。
   */
  id?: string;
  source?: ReferenceBookSource;
  title: string; // 参考書名
  publisher?: string; // 出版社
  edition?: string; // 版
  active: boolean; // 現在使用中か
  note?: string; // 全体メモ
  chapters: ReferenceChapter[]; // 章構成
  updatedAt: string; // 更新日時(ISO)
};

/**
 * 参考書順の計画（予定日のスナップショット）。順番そのものは本から毎回導出し、
 * 「先行／遅れ」の基準になる予定日だけを保存する。章構成とは別に更新される。
 */
export type ReferenceStudyPlan = {
  bookId: string;
  /** 計画を作ったときのユニット構成（lib/bookStudyOrder の structureHash） */
  structureHash: string;
  /** 予定日を引き直すたびに増える */
  revision: number;
  revisedAt: string; // ISO
  startDate: string; // YYYY-MM-DD
  /** 新規学習（インプット）を終える予定日。以後は過去問・総復習 */
  inputEndDate: string; // YYYY-MM-DD
  /** 計画を作ったときの試験日・1日平均の学習時間（変わったら引き直す） */
  examDate?: string;
  dailyMinutes?: number;
  units: { unitId: string; plannedDate: string }[];
};

/** 切り替え前の本（読了状態・計画ごと保存し、同じ本へ戻したら復元する）。 */
export type ReferenceBookArchiveEntry = ReferenceBook & {
  studyPlan?: ReferenceStudyPlan | null;
};

/** /today で「今日の参考書」を出すための解決結果。 */
export type ReferenceLocation = {
  chapter: ReferenceChapter;
  section?: ReferenceSection;
};

/** 参考書1周の進捗。 */
export type ReferenceBookProgress = {
  /** 読了した単位数（節のある章は節、節のない章は章を1単位として数える） */
  done: number;
  /** 全単位数 */
  total: number;
  ratio: number; // 0〜1
  /** 読了した章の数（節がある章は全節読了で1章） */
  doneChapters: number;
  totalChapters: number;
};

/** その日の対象トピックから特定した、読了の対象（topicIds の紐づけで確定したものだけ）。 */
export type ReferenceReadTarget = {
  chapterId: string;
  sectionId?: string;
};

/**
 * トピックに対する参考書の案内（フォールバック順）。
 *   1. mapped   … topicIds の紐づけで確定した章・節
 *   2. candidate … 章・節の keywords と Topic.referenceHints が一致した候補（断定しない・保存しない）
 *   3. keywords … 参考書で探すキーワード（Topic.referenceHints）
 *   4. index    … 索引でトピック名を探す
 */
export type ReferenceGuide =
  | { kind: "mapped"; location: ReferenceLocation }
  | { kind: "candidate"; location: ReferenceLocation; keywords: string[] }
  | { kind: "keywords"; keywords: string[] }
  | { kind: "index"; term: string };
