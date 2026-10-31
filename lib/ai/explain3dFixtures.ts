// 開発用（GEMINI_API_KEY が無いとき）の固定の場面。画面と模型の見え方・テストの確認に使う。
// 本番では使わない（lib/ai/explain3d.ts がキーの無い開発環境でだけ返す）。

const step = (title: string, caption: string, extra: Record<string, unknown> = {}) => ({
  title,
  caption,
  tone: "info",
  active: [] as string[],
  alert: [] as string[],
  move: null as Record<string, unknown> | null,
  screen: null as Record<string, unknown> | null,
  ...extra,
});

export const FIXTURE_WEB = {
  mode: "generated",
  relatedTopicId: "tech-http-https",
  scene: {
    title: "（開発用）Webページが表示される仕組み",
    summary: "GEMINI_API_KEY が未設定なので、AI の代わりに固定の場面を表示しています。",
    actors: [
      { id: "user", kind: "person", name: "あなた", place: "home" },
      { id: "pc", kind: "laptop", name: "ノートPC", place: "home" },
      { id: "wifi", kind: "wifi", name: "Wi-Fiルータ", place: "home" },
      { id: "isp", kind: "router", name: "プロバイダ", place: "internet" },
      { id: "web", kind: "server", name: "Webサーバ", place: "datacenter" },
    ],
    steps: [
      step("URLを入力", "ブラウザにURLを入れて開く", { active: ["user", "pc"], screen: { actor: "pc", text: "example.com" } }),
      step("Wi-Fiへ", "PCがページの要求をWi-Fiルータへ送る", { active: ["pc"], move: { from: "pc", to: "wifi", item: "parcel", tag: "リクエスト", body: "GET /index.html" } }),
      step("インターネットへ", "プロバイダを通ってインターネットへ出る", { active: ["isp"], move: { from: "wifi", to: "isp", item: "parcel", tag: "リクエスト", body: "GET /index.html" } }),
      step("Webサーバへ", "要求がWebサーバに届く", { active: ["web"], move: { from: "isp", to: "web", item: "parcel", tag: "リクエスト", body: "GET /index.html" } }),
      step("レスポンス", "Webサーバがページのデータを返す", { tone: "ok", active: ["web"], move: { from: "web", to: "pc", item: "paper", tag: "レスポンス", body: "HTML" } }),
      step("表示", "受け取ったHTMLをブラウザが表示する", { tone: "ok", active: ["pc", "user"], screen: { actor: "pc", text: "ページ表示" } }),
    ],
  },
} as const;

export const FIXTURE_SSO = {
  mode: "generated",
  relatedTopicId: "tech-auth-authz-mfa",
  scene: {
    title: "（開発用）シングルサインオンの仕組み",
    summary: "1回のログインで、認証サーバが出した証明を使い、複数のサービスにパスワード無しで入れる。",
    actors: [
      { id: "user", kind: "person", name: "社員", place: "office" },
      { id: "pc", kind: "pc", name: "社員のPC", place: "office" },
      { id: "net", kind: "router", name: "インターネット", place: "internet" },
      { id: "idp", kind: "server", name: "認証サーバ", place: "datacenter" },
      { id: "kintai", kind: "server", name: "勤怠システム", place: "datacenter" },
      { id: "mail", kind: "server", name: "メール", place: "datacenter" },
    ],
    steps: [
      step("1回だけログイン", "朝、PCでIDとパスワードを1回入れる", { active: ["user", "pc"], screen: { actor: "pc", text: "ログイン" } }),
      step("認証サーバへ", "IDとパスワードを認証サーバへ送る", { active: ["pc", "net"], move: { from: "pc", to: "idp", item: "paper", tag: "ID・パスワード", locked: true } }),
      step("本人確認", "認証サーバが本人と確かめ、ログイン済みの証明を出す", { tone: "ok", active: ["idp"] }),
      step("証明が届く", "ログイン済みの証明（チケット）がPCに届く", { tone: "ok", move: { from: "idp", to: "pc", item: "key", tag: "認証の証明" } }),
      step("勤怠システム", "勤怠システムは証明を確かめるだけ。パスワードは要らない", { tone: "ok", active: ["kintai"], move: { from: "pc", to: "kintai", item: "key", tag: "認証の証明" }, screen: { actor: "pc", text: "勤怠 入力画面" } }),
      step("メール", "メールにも同じ証明で入れる。ログインは1回だけ", { tone: "ok", active: ["mail"], move: { from: "pc", to: "mail", item: "key", tag: "認証の証明" }, screen: { actor: "pc", text: "メール 受信箱" } }),
    ],
  },
} as const;

export const FIXTURE_QR = {
  mode: "generated",
  relatedTopicId: "strat-ebusiness",
  scene: {
    title: "（開発用）QRコード決済の仕組み",
    summary: "スマホでお店のQRを読み、決済サーバが残高から支払う。売上は後日お店の口座へ入る。",
    actors: [
      { id: "phone", kind: "phone", name: "お客さん", place: "town" },
      { id: "shop", kind: "store", name: "お店", place: "town" },
      { id: "pay", kind: "server", name: "決済サーバ", place: "datacenter" },
      { id: "bank", kind: "bank", name: "お店の銀行", place: "town" },
    ],
    steps: [
      step("QRを読む", "お店のQRコードをスマホのアプリで読み取る", { active: ["phone", "shop"], screen: { actor: "phone", text: "QR読み取り" } }),
      step("支払いを依頼", "金額とお店の情報を決済サーバへ送る", { active: ["phone"], move: { from: "phone", to: "pay", item: "paper", tag: "支払い依頼", body: "1,200円", locked: true }, screen: { actor: "phone", text: "1,200円 支払う" } }),
      step("残高を確認", "決済サーバが残高を確かめて、支払いを確定する", { tone: "ok", active: ["pay"] }),
      step("お店へ通知", "お店の端末に「支払い完了」が届く", { tone: "ok", active: ["shop"], move: { from: "pay", to: "shop", item: "paper", tag: "支払い完了", body: "1,200円" } }),
      step("売上の入金", "売上は後日まとめて、お店の銀行口座へ入る", { active: ["bank"], move: { from: "pay", to: "bank", item: "coin", tag: "売上", body: "後日まとめて" } }),
      step("支払い完了", "現金もカードも出さずに支払いが終わる", { tone: "ok", active: ["phone", "shop"], screen: { actor: "phone", text: "支払い完了" } }),
    ],
  },
} as const;

/** 質問の言葉で開発用の場面を選ぶ（合わなければ Web の場面） */
export function pickFixture(question: string) {
  if (/シングルサインオン|SSO/i.test(question)) return FIXTURE_SSO;
  if (/QR|決済/.test(question)) return FIXTURE_QR;
  return FIXTURE_WEB;
}
