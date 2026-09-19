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

/** ユーザーごとの参考書アウトライン。 */
export type ReferenceBook = {
  title: string; // 参考書名
  publisher?: string; // 出版社
  edition?: string; // 版
  active: boolean; // 現在使用中か
  note?: string; // 全体メモ
  chapters: ReferenceChapter[]; // 章構成
  updatedAt: string; // 更新日時(ISO)
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
