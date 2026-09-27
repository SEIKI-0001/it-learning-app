// モチット AI 相談の共有型（クライアント/サーバー両方から import する。DB・React 非依存）。
//
// 役割分担:
//   計算・判定・事実 = アプリ（Learning Context 層が既存ロジックの結果を集めて渡す）
//   説明・会話・理解支援 = LLM
// ここにある型は「アプリ → LLM に渡してよい形」を決める境界でもある。

/** モチットを開いたページの種類。候補（クイックアクション）の出し分けに使う。 */
export type MochitPageKind = "today" | "learn" | "progress" | "question" | "general";

/** 相談の意図。Learning Context のどの材料を集めるかを決める。 */
export type MochitIntent =
  | "status" // 今の実力・苦手・伸び
  | "today" // 今日やること
  | "plan" // 試験まで間に合うか・進め方
  | "question" // 表示中の問題
  | "learn" // 表示中の学習内容
  | "reflection" // 1日の振り返り
  | "general";

/** 画面に表示中の問題（回答後のものだけ）。選択肢は画面に出ている順・記号のまま渡す。 */
export type MochitQuestionContext = {
  questionId: string;
  topicId?: string;
  prompt: string;
  choices: { label: string; text: string }[];
  correctLabel: string;
  /** 未回答（時間切れ・見直し）なら null。 */
  selectedLabel: string | null;
  explanation?: string;
  /** 選んだ誤答が違う理由（既存データにある場合だけ）。 */
  selectedChoiceExplanation?: string;
  /** 出典など、問題の見出し（例: "令和6年度 公開問題 問12"）。 */
  sourceLabel?: string;
};

/** 表示中の学習内容（トピック/節）。 */
export type MochitLearnContext = {
  topicId: string;
};

/** Today 画面が既存ロジックで決めた「今日のルート」のスナップショット。 */
export type MochitTodaySnapshot = {
  date: string;
  tasks: { title: string; kind: "new" | "review" | "vocab" | "exam"; minutes: number; state: "done" | "now" | "next" }[];
  /** 今日の最優先（Primary）の見出しと理由。無ければ undefined。 */
  primary?: { title: string; reason: string };
};

export type MochitChatRole = "user" | "mochit";

export type MochitChatMessage = {
  role: MochitChatRole;
  text: string;
};

/** クイックアクション（初期候補）。 */
export type MochitQuickAction = {
  id: string;
  label: string;
  intent: MochitIntent;
  /** 送信するユーザー発話（画面にもこの文で表示する）。 */
  message: string;
};

export type MochitChatRequest = {
  /** 今回の発話。 */
  message: string;
  /** 直前までの会話（新しい順ではなく時系列。サーバー側でも件数・長さを切り詰める）。 */
  history?: MochitChatMessage[];
  page: MochitPageKind;
  /** クイックアクション経由なら、その意図（自由入力なら省略＝サーバーが推定）。 */
  intent?: MochitIntent;
  source: "quick_action" | "free_input" | "reflection";
  question?: MochitQuestionContext | null;
  learn?: MochitLearnContext | null;
  today?: MochitTodaySnapshot | null;
  /** クライアントのローカル日付（YYYY-MM-DD）と UTC からのずれ（分・Date#getTimezoneOffset）。 */
  localDate?: string;
  timezoneOffsetMinutes?: number;
  /** ユーザーが付けたモチットの呼び名（端末の AppState にある）。 */
  displayName?: string;
  userId?: string | null;
};

export type MochitChatFailure = "login_required" | "rate_limited" | "invalid" | "failed";

export type MochitChatResponse =
  | { ok: true; reply: string; intent: MochitIntent }
  | { ok: false; reason: MochitChatFailure; error: string };

/** 計測イベント名（会話本文は送らない）。 */
export type MochitAnalyticsEvent =
  | "mochit_open"
  | "mochit_message_sent"
  | "mochit_quick_action_clicked"
  | "mochit_question_help_opened"
  | "mochit_reflection_started"
  | "mochit_reflection_completed"
  | "mochit_reflection_dismissed"
  | "mochit_return_to_learning"
  | "mochit_error";

export const MOCHIT_CHAT_LIMITS = {
  /** 1回の発話の最大文字数。 */
  messageMaxLength: 400,
  /** サーバーへ送る直近の会話の件数。 */
  historyMaxMessages: 6,
  /** 履歴1件あたりの最大文字数（モチットの長い説明も丸めて送る）。 */
  historyMessageMaxLength: 600,
  /** 問題文・解説などの最大文字数。 */
  questionTextMaxLength: 1200,
  choiceTextMaxLength: 300,
  todayTasksMax: 12,
} as const;
