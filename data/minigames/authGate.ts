import type { MiniGame } from "@/types/minigame";

// 認証・認可ゲート: 「人」と「行動」を見て許可/拒否を判定する。
// テーマ: 認証 / 認可 / ログイン / 権限 / アクセス制御。
export const authGateGame: MiniGame = {
  id: "auth-authorization",
  title: "認証・認可ゲート",
  field: "technology",
  themes: ["認証", "認可", "ログイン", "権限", "アクセス制御"],
  difficulty: 2,
  estimatedMinutes: 2,
  description:
    "「この人がこの操作をしてよいか」を許可／拒否で答えるゲームです。本人確認（認証）と権限確認（認可）の違いを見分けます。",
  examPoints: [
    "認証＝「あなたは誰か」を確認すること",
    "認可＝「何をしてよいか」を確認すること",
    "ログインできても、何でもできるわけではない（認証と認可は別）",
  ],
  relatedTopicId: "tech-auth-authz-mfa",
  content: {
    kind: "auth-authorization",
    cases: [
      {
        id: "auth-c1",
        person: "Cさん",
        personDesc: "未ログイン",
        action: "マイページを見る",
        allowed: false,
        reason: "authentication",
        explanation:
          "そもそもログインしていない＝本人確認ができていません。これは認証の問題。誰かが分からない相手には、自分のページも見せられません。",
      },
      {
        id: "auth-c2",
        person: "Aさん",
        personDesc: "ログイン済み・一般ユーザー",
        action: "自分のマイページを見る",
        allowed: true,
        reason: "ok",
        explanation:
          "本人確認(認証)が済んでいて、自分のページを見るのは一般ユーザーに許された行動(認可OK)。認証も認可も通るので許可です。",
      },
      {
        id: "auth-c3",
        person: "Aさん",
        personDesc: "ログイン済み・一般ユーザー",
        action: "管理画面を見る",
        allowed: false,
        reason: "authorization",
        explanation:
          "ログイン済みなので本人確認(認証)はOK。でも管理画面は管理者だけの権限。一般ユーザーには許可されていません＝これは認可の問題です。",
      },
      {
        id: "auth-c4",
        person: "Bさん",
        personDesc: "ログイン済み・管理者",
        action: "管理画面を見る",
        allowed: true,
        reason: "ok",
        explanation:
          "本人確認(認証)が済み、管理者という権限(認可)もある。両方そろっているので許可されます。",
      },
      {
        id: "auth-c5",
        person: "Aさん",
        personDesc: "ログイン済み・一般ユーザー",
        action: "他人のデータを削除する",
        allowed: false,
        reason: "authorization",
        explanation:
          "ログインはしていても、他人のデータを消す権限は一般ユーザーにありません。認証は通っても認可で止まる典型例です。",
      },
      {
        id: "auth-c6",
        person: "Cさん",
        personDesc: "未ログイン",
        action: "パスワードを変更する",
        allowed: false,
        reason: "authentication",
        explanation:
          "誰のパスワードかを決めるには、まず本人確認(認証)が必要。ログインしていない時点で拒否、という認証の問題です。",
      },
    ],
  },
};
