// 「この仕組みを3D模型で解説して」（/explain）の型。
// 答え方は2通り：
//   - existing … 既に作り込んだ模型（Blender 製の 3D・部品で組んだジオラマ）のあるテーマなら、その解説を開く
//   - generated … 無ければ、AI が決まった部品と動きだけを JSON で指定し、共通の再生部品で組み立てる
// AI に座標・色・自由な HTML は書かせない。置き方とカメラはアプリ側で決める。
// 組んだ場面は、WebGL が使える端末では Blender 製の部品キット（public/models/explain-kit.glb）で、
// 使えない端末では CSS の部品（DioramaParts）で描く。

export const EXPLAIN3D_LIMITS = {
  questionMaxLength: 120,
  titleMaxLength: 24,
  summaryMaxLength: 90,
  actorNameMaxLength: 12,
  captionMaxLength: 44,
  stepTitleMaxLength: 18,
  tagMaxLength: 12,
  bodyMaxLength: 20,
  actorsMin: 2,
  actorsMax: 6,
  stepsMin: 2,
  stepsMax: 8,
  placesMax: 4,
  screenTextMaxLength: 16,
} as const;

/** 模型に置ける物。部品キットの Kit_<kind>（と DioramaParts の部品）に対応する */
export const ACTOR_KINDS = [
  "pc",
  "laptop",
  "phone",
  "server",
  "database",
  "router",
  "switch",
  "firewall",
  "wifi",
  "person",
  "attacker",
  "office",
  "house",
  "store",
  "bank",
  "factory",
  "datacenter",
  "safe",
  "truck",
] as const;
export type ActorKind = (typeof ACTOR_KINDS)[number];

/** 動く物 */
export const ITEM_KINDS = ["parcel", "envelope", "paper", "key", "coin"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

/** 物を置く場所。部品キットの Zone_<place> に対応する */
export const PLACES = ["home", "office", "datacenter", "internet", "town", "outside"] as const;
export type Place = (typeof PLACES)[number];

/** 画面に文字を出せる物 */
export const SCREEN_KINDS = ["pc", "laptop", "phone", "attacker"] as const satisfies readonly ActorKind[];

/** 場所の指定が無い・使えないときの置き場所（現実にいちばんありそうな場所） */
export const DEFAULT_PLACE: Record<ActorKind, Place> = {
  pc: "home",
  laptop: "home",
  phone: "home",
  person: "home",
  wifi: "home",
  server: "datacenter",
  database: "datacenter",
  safe: "datacenter",
  router: "internet",
  switch: "office",
  firewall: "office",
  attacker: "outside",
  office: "town",
  house: "town",
  store: "town",
  bank: "town",
  factory: "town",
  datacenter: "town",
  truck: "town",
};

export const STEP_TONES = ["info", "ok", "danger"] as const;
export type StepTone = (typeof STEP_TONES)[number];

export type SceneActor = {
  id: string;
  kind: ActorKind;
  name: string;
  place: Place;
};

/** そのコマで画面に出す文字（例：「ログイン画面」「支払い完了」） */
export type SceneScreen = { actor: string; text: string };

export type SceneMove = {
  from: string;
  to: string;
  item: ItemKind;
  /** 運ぶ物の札（例：「HTTPリクエスト」） */
  tag: string;
  /** 札の中身（例：「GET /index.html」）。無くてもよい */
  body?: string;
  /** 鍵がかかっている（暗号化されている）か */
  locked?: boolean;
};

export type SceneStep = {
  title: string;
  /** 模型の中に出す一言 */
  caption: string;
  tone: StepTone;
  /** この場面で光らせる物 */
  active: string[];
  /** この場面で赤くする物（攻撃を受けた・拒否した など） */
  alert: string[];
  move: SceneMove | null;
  screen: SceneScreen | null;
};

export type GeneratedScene = {
  title: string;
  summary: string;
  actors: SceneActor[];
  steps: SceneStep[];
};

export type ExplainResult =
  | {
      kind: "existing";
      topicId: string;
      topicTitle: string;
      lessonHref: string;
      /** なぜこの模型か（画面に一言出す） */
      reason: string;
    }
  | {
      kind: "generated";
      scene: GeneratedScene;
      /** 内容の近いテーマ（確かめる先として案内する）。無ければ null */
      relatedTopicId: string | null;
      relatedTopicTitle: string | null;
      relatedLessonHref: string | null;
    };

export type ExplainRequest = {
  question: string;
  userId?: string | null;
  localDate?: string;
  timezoneOffsetMinutes?: number;
};

export type ExplainFailure = "login_required" | "rate_limited" | "invalid" | "off_topic" | "failed";

export type ExplainResponse =
  | { ok: true; result: ExplainResult; model: string }
  | { ok: false; reason: ExplainFailure; error: string };
