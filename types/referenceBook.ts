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
};

/** 参考書の章。 */
export type ReferenceChapter = {
  id: string;
  title: string;
  note?: string; // メモ
  keywords?: string[]; // 関連キーワード
  topicIds?: string[]; // 紐づくアプリ内トピック id
  sections?: ReferenceSection[]; // 節
  done?: boolean; // 読み終えたか（1周の進捗に使う）
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
  done: number;
  total: number;
  ratio: number; // 0〜1
};
