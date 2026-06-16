import type { ProcessDemoSpec } from "@/types/content";

// ============================================================================
// プロセスデモのデータ。
// 文章だけでは理解しづらいテーマ（DNS / SQL / 認証・認可）を、
// 「利用者目線の操作 → 裏側の処理ステップ → 用語対応 → 試験ポイント」まで
// 1ページ内で完結させる。トピックからは id でひもづける（visualLearning と同方針）。
//
// 描画は components/learn/ProcessDemoSection が担う（構造化データ＋レンダラ）。
// ============================================================================

// ---------------------------------------------------------------------------
// DNS / ドメイン名 / IPアドレス  → トピック: tech-network-address
// ---------------------------------------------------------------------------
const dnsDemo: ProcessDemoSpec = {
  title: "ドメイン名を入力すると、なぜページが開くのか",
  lead: "ブラウザに study-pass.jp と入力してから画面が表示されるまで、裏側で何が起きているのかを1つずつ見ていきます。",
  userScenario:
    "ブラウザに study-pass.jp と入力すると、なぜWebページが開くのでしょう？ ボタンを押して、裏側の動きを追ってみましょう。",
  screen: {
    kind: "browserBar",
    url: "https://study-pass.jp",
    buttonLabel: "Webサイトを開く",
  },
  actors: [
    { id: "browser", label: "ブラウザ", emoji: "🌐" },
    { id: "dns", label: "DNSサーバー", emoji: "📒" },
    { id: "web", label: "Webサーバー", emoji: "🖥️" },
  ],
  scenarios: [
    {
      id: "open-site",
      label: "Webサイトを開く",
      outcomeLabel: "ページが表示される",
      outcomeTone: "ok",
      takeaway:
        "ドメイン名のままでは通信できないので、まずDNSでIPアドレスに変換し、その番号でWebサーバーへつなぎます。",
      steps: [
        {
          id: "s1",
          actorId: "browser",
          title: "ブラウザに study-pass.jp が入力される",
          action: "アクセスしたいドメイン名を受け取る",
          output: "study-pass.jp",
          toActorId: "browser",
        },
        {
          id: "s2",
          actorId: "browser",
          title: "ドメイン名だけでは通信先が分からない",
          action: "通信に必要なIPアドレスを知らないことに気づく",
        },
        {
          id: "s3",
          actorId: "browser",
          title: "DNSサーバーへ問い合わせる",
          action: "「study-pass.jp の住所を教えて」とたずねる",
          output: "study-pass.jp",
          toActorId: "dns",
          term: "DNS",
        },
        {
          id: "s4",
          actorId: "dns",
          title: "DNSサーバーがIPアドレスを返す",
          input: "study-pass.jp",
          action: "ドメイン名に対応するIPアドレスを調べて返す",
          output: "203.0.113.10",
          toActorId: "browser",
          term: "名前解決",
          highlight: true,
        },
        {
          id: "s5",
          actorId: "browser",
          title: "WebサーバーへリクエストをIPアドレスで送る",
          input: "203.0.113.10",
          action: "受け取ったIPアドレス宛にページを要求する",
          output: "ページください（リクエスト）",
          toActorId: "web",
          term: "リクエスト",
        },
        {
          id: "s6",
          actorId: "web",
          title: "Webサーバーがページデータを返す",
          input: "リクエスト",
          action: "要求されたページのデータを用意して返す",
          output: "ページデータ（レスポンス）",
          toActorId: "browser",
          term: "レスポンス",
        },
        {
          id: "s7",
          actorId: "browser",
          title: "ブラウザがページを表示する",
          input: "ページデータ",
          action: "受け取ったデータを画面に描画する",
        },
      ],
    },
  ],
  termMappings: [
    {
      term: "ドメイン名",
      meaning: "人間が覚えやすい住所",
      inThisDemo: "study-pass.jp",
    },
    {
      term: "IPアドレス",
      meaning: "コンピュータが通信に使う住所",
      inThisDemo: "203.0.113.10",
    },
    {
      term: "DNS",
      meaning: "ドメイン名をIPアドレスに変換する仕組み",
      inThisDemo: "study-pass.jp → 203.0.113.10 の変換",
    },
    {
      term: "リクエスト",
      meaning: "ブラウザからサーバーへの依頼",
      inThisDemo: "「ページください」とWebサーバーへ送る",
    },
    {
      term: "レスポンス",
      meaning: "サーバーからブラウザへの返事",
      inThisDemo: "Webサーバーが返すページデータ",
    },
  ],
  examPoints: [
    "DNSは「ドメイン名 → IPアドレス」の変換役。逆ではない点に注意。",
    "通信の前には必ず名前解決（DNS）が行われ、そのあとIPアドレスで接続する。",
    "DNSが返すのはIPアドレスであって、ページのHTMLそのものではない。",
  ],
  miniCheck: {
    question: "DNSサーバーがブラウザに返すものはどれ？",
    choices: ["WebページのHTML", "IPアドレス", "SQL", "パスワード"],
    correctIndex: 1,
    explanation:
      "DNSは「ドメイン名→IPアドレス」の変換役です。返すのはIPアドレス。HTML（ページの中身）を返すのはWebサーバーです。",
  },
};

// ---------------------------------------------------------------------------
// SQL / データベース検索  → トピック: tech-database-sql
// ---------------------------------------------------------------------------
const sqlDemo: ProcessDemoSpec = {
  title: "検索画面の操作が、裏側でSQLになるまで",
  lead: "検索フォームで条件を選んで検索すると、その条件がどのようにSQLへ変換され、DBから結果が返るのかを見ていきます。",
  userScenario:
    "検索画面で「部署：営業部」「売上：100以上」を選んで検索すると、裏側では何が起きているのでしょう？",
  screen: {
    kind: "searchForm",
    fields: [
      { label: "部署", value: "営業部" },
      { label: "売上", value: "100以上" },
    ],
    buttonLabel: "検索する",
  },
  actors: [
    { id: "user", label: "検索画面", emoji: "🔎" },
    { id: "app", label: "アプリ", emoji: "📱" },
    { id: "db", label: "データベース", emoji: "🗄️" },
  ],
  scenarios: [
    {
      id: "search",
      label: "検索する",
      outcomeLabel: "条件に合う行だけが表示される",
      outcomeTone: "ok",
      takeaway:
        "画面で選んだ条件が WHERE句 に変換されてDBに送られ、条件に合う行だけが結果として返ります。SQLを自分で書く必要はありません。",
      steps: [
        {
          id: "s1",
          actorId: "user",
          title: "ユーザーが検索条件を選ぶ",
          action: "「部署：営業部」「売上：100以上」を指定する",
          output: "部署=営業部 / 売上≥100",
          toActorId: "app",
        },
        {
          id: "s2",
          actorId: "app",
          title: "アプリが検索条件を受け取る",
          input: "部署=営業部 / 売上≥100",
          action: "画面の入力値を読み取る",
        },
        {
          id: "s3",
          actorId: "app",
          title: "検索条件からWHERE句が作られる",
          action: "「部署：営業部」→ WHERE department = '営業部'、「売上：100以上」→ AND sales >= 100",
          output: "WHERE department = '営業部' AND sales >= 100",
          toActorId: "app",
          term: "WHERE",
          highlight: true,
        },
        {
          id: "s4",
          actorId: "app",
          title: "SQLがDBに送られる",
          input: "WHERE句を組み込んだSQL",
          action: "SELECT文をデータベースへ渡す",
          output: "SELECT * FROM employees WHERE …",
          toActorId: "db",
          term: "SQL",
        },
        {
          id: "s5",
          actorId: "db",
          title: "DBが条件に合う行を探す",
          input: "SELECT文",
          action: "テーブルの各行を条件に照らし合わせる",
          term: "テーブル",
        },
        {
          id: "s6",
          actorId: "db",
          title: "条件に合う行だけが結果として返る",
          action: "営業部かつ売上100以上の行だけを返す",
          output: "佐藤(営業部/120) ・ 山田(営業部/150)",
          toActorId: "app",
          term: "レコード",
        },
        {
          id: "s7",
          actorId: "user",
          title: "画面に検索結果が表示される",
          input: "条件に合った行",
          action: "アプリが受け取った結果を一覧表示する",
        },
      ],
    },
  ],
  termMappings: [
    { term: "テーブル", meaning: "データを表の形で保存したもの", inThisDemo: "employees（社員の表）" },
    { term: "レコード", meaning: "表の横1行", inThisDemo: "佐藤さん1人分のデータ" },
    { term: "カラム", meaning: "表の縦1列", inThisDemo: "department / sales の列" },
    { term: "SELECT", meaning: "取り出す", inThisDemo: "社員の行を取り出す" },
    { term: "WHERE", meaning: "条件で絞る", inThisDemo: "department = '営業部'" },
    { term: "AND", meaning: "両方の条件を満たす", inThisDemo: "営業部 かつ 売上100以上" },
  ],
  examPoints: [
    "画面の検索条件が WHERE句 に変換される、という対応関係が問われる。",
    "SELECTは取り出す、WHEREは絞り込む、ANDは両方を満たす、という役割を区別する。",
    "結果は「条件に合う行（レコード）だけ」が返る。表全体が返るわけではない。",
  ],
  miniCheck: {
    question: "検索フォームの「部署：営業部」は、SQLのどの部分に変換される？",
    choices: [
      "SELECT * の部分",
      "WHERE department = '営業部' の部分",
      "FROM employees の部分",
      "ORDER BY の部分",
    ],
    correctIndex: 1,
    explanation:
      "検索条件（絞り込み）は WHERE句 になります。department = '営業部' のように、画面の条件がそのまま条件式へ変換されます。",
  },
};

// ---------------------------------------------------------------------------
// 認証・認可  → トピック: tech-auth-authz-mfa
// ---------------------------------------------------------------------------
const authDemo: ProcessDemoSpec = {
  title: "ログイン済みなのに、管理画面に入れないのはなぜか",
  lead: "状態と操作を選ぶと、サーバーが「誰か（認証）」と「何をしてよいか（認可）」をどう確認し、どこで止まるのかが分かります。",
  userScenario:
    "ログイン済みなのに、なぜ管理画面には入れないのでしょう？ 状態と操作を選んで、裏側の判定を追ってみましょう。",
  screen: {
    kind: "rolePicker",
    groups: [
      {
        id: "state",
        label: "現在の状態",
        options: [
          { id: "guest", label: "未ログイン" },
          { id: "user", label: "一般ユーザーでログイン中" },
          { id: "admin", label: "管理者でログイン中" },
        ],
      },
      {
        id: "action",
        label: "操作",
        options: [
          { id: "mypage", label: "マイページを見る" },
          { id: "admin", label: "管理画面を見る" },
        ],
      },
    ],
    buttonLabel: "アクセスする",
  },
  actors: [
    { id: "browser", label: "ブラウザ", emoji: "🌐" },
    { id: "server", label: "サーバー", emoji: "🖥️" },
    { id: "perm", label: "権限テーブル", emoji: "📋" },
  ],
  scenarios: [
    {
      id: "guest-mypage",
      label: "未ログイン × マイページ",
      selection: { state: "guest", action: "mypage" },
      outcomeLabel: "ログイン画面へ（認証で停止）",
      outcomeTone: "blocked",
      takeaway:
        "これは認証の問題。誰なのか確認できないため、先にログインが必要です。",
      steps: [
        { id: "s1", actorId: "browser", title: "「マイページを開きたい」とリクエストを送る", output: "リクエスト", toActorId: "server" },
        { id: "s2", actorId: "server", title: "セッション / トークンを確認する", input: "リクエスト", action: "ログイン情報があるか調べる", term: "認証" },
        { id: "s3", actorId: "server", title: "ログイン情報が見つからない", action: "誰なのかを特定できない", highlight: true, term: "認証" },
        { id: "s4", actorId: "server", title: "認証できないため、ログイン画面へ移動する", output: "ログイン画面", toActorId: "browser" },
      ],
    },
    {
      id: "guest-admin",
      label: "未ログイン × 管理画面",
      selection: { state: "guest", action: "admin" },
      outcomeLabel: "ログイン画面へ（認証で停止）",
      outcomeTone: "blocked",
      takeaway:
        "管理画面でも、未ログインならまず認証で止まります。権限を見る前の段階です。",
      steps: [
        { id: "s1", actorId: "browser", title: "「管理画面を開きたい」とリクエストを送る", output: "リクエスト", toActorId: "server" },
        { id: "s2", actorId: "server", title: "セッション / トークンを確認する", input: "リクエスト", action: "ログイン情報があるか調べる", term: "認証" },
        { id: "s3", actorId: "server", title: "ログイン情報が見つからない", action: "誰なのかを特定できない", highlight: true, term: "認証" },
        { id: "s4", actorId: "server", title: "認証できないため、ログイン画面へ移動する", output: "ログイン画面", toActorId: "browser" },
      ],
    },
    {
      id: "user-mypage",
      label: "一般ユーザー × マイページ",
      selection: { state: "user", action: "mypage" },
      outcomeLabel: "マイページを表示",
      outcomeTone: "ok",
      takeaway:
        "本人確認（認証）に成功し、マイページは本人に許された操作なので認可も通ります。",
      steps: [
        { id: "s1", actorId: "browser", title: "「マイページを開きたい」とリクエストを送る", output: "リクエスト", toActorId: "server" },
        { id: "s2", actorId: "server", title: "セッション / トークンを確認する", input: "リクエスト", action: "user_001 として認証する", output: "user_001", term: "認証" },
        { id: "s3", actorId: "server", title: "マイページの利用権限を確認する", input: "user_001", action: "本人のページかどうかを調べる", toActorId: "perm", term: "認可" },
        { id: "s4", actorId: "perm", title: "自分のページなので認可される", output: "許可", toActorId: "server", term: "認可" },
        { id: "s5", actorId: "server", title: "マイページを表示する", output: "マイページ", toActorId: "browser" },
      ],
    },
    {
      id: "user-admin",
      label: "一般ユーザー × 管理画面",
      selection: { state: "user", action: "admin" },
      outcomeLabel: "アクセスを拒否（認可で停止）",
      outcomeTone: "blocked",
      takeaway:
        "ログイン済みなので認証は成功している。しかし管理者権限がないため、認可で止まっています。",
      steps: [
        { id: "s1", actorId: "browser", title: "「管理画面を開きたい」とリクエストを送る", output: "リクエスト", toActorId: "server" },
        { id: "s2", actorId: "server", title: "セッション / トークンを確認する", input: "リクエスト", action: "user_001 として認証する（認証は成功）", output: "user_001", term: "認証" },
        { id: "s3", actorId: "server", title: "管理画面に必要な権限を確認する", input: "user_001", action: "必要権限：管理者", toActorId: "perm", term: "認可" },
        { id: "s4", actorId: "perm", title: "現在の権限：一般ユーザー", action: "必要権限（管理者）を満たさない", output: "不許可", toActorId: "server", term: "認可", highlight: true },
        { id: "s5", actorId: "server", title: "認証は成功しているが、認可に失敗してアクセスを拒否する", output: "拒否", toActorId: "browser", highlight: true },
      ],
    },
    {
      id: "admin-mypage",
      label: "管理者 × マイページ",
      selection: { state: "admin", action: "mypage" },
      outcomeLabel: "マイページを表示",
      outcomeTone: "ok",
      takeaway: "認証に成功し、マイページは誰でも自分の分は見られるので認可も通ります。",
      steps: [
        { id: "s1", actorId: "browser", title: "「マイページを開きたい」とリクエストを送る", output: "リクエスト", toActorId: "server" },
        { id: "s2", actorId: "server", title: "セッション / トークンを確認する", input: "リクエスト", action: "admin_001 として認証する", output: "admin_001", term: "認証" },
        { id: "s3", actorId: "server", title: "マイページの利用権限を確認する", input: "admin_001", action: "本人のページかどうかを調べる", toActorId: "perm", term: "認可" },
        { id: "s4", actorId: "perm", title: "自分のページなので認可される", output: "許可", toActorId: "server", term: "認可" },
        { id: "s5", actorId: "server", title: "マイページを表示する", output: "マイページ", toActorId: "browser" },
      ],
    },
    {
      id: "admin-admin",
      label: "管理者 × 管理画面",
      selection: { state: "admin", action: "admin" },
      outcomeLabel: "管理画面を表示",
      outcomeTone: "ok",
      takeaway:
        "認証に成功し、必要権限（管理者）も満たしているため、認可にも成功して管理画面が開きます。",
      steps: [
        { id: "s1", actorId: "browser", title: "「管理画面を開きたい」とリクエストを送る", output: "リクエスト", toActorId: "server" },
        { id: "s2", actorId: "server", title: "セッション / トークンを確認する", input: "リクエスト", action: "admin_001 として認証する", output: "admin_001", term: "認証" },
        { id: "s3", actorId: "server", title: "管理画面に必要な権限を確認する", input: "admin_001", action: "必要権限：管理者", toActorId: "perm", term: "認可" },
        { id: "s4", actorId: "perm", title: "現在の権限：管理者（必要権限を満たす）", output: "許可", toActorId: "server", term: "認可", highlight: true },
        { id: "s5", actorId: "server", title: "認可に成功し、管理画面を表示する", output: "管理画面", toActorId: "browser" },
      ],
    },
  ],
  termMappings: [
    { term: "認証", meaning: "あなたが誰かを確認すること", inThisDemo: "セッション / トークンから user_001・admin_001 を特定する" },
    { term: "認可", meaning: "その人が何をしてよいかを確認すること", inThisDemo: "管理画面に必要な権限を持っているか判定する" },
    { term: "セッション / トークン", meaning: "ログイン状態を表す引き換え札", inThisDemo: "サーバーが「誰か」を思い出す手がかり" },
    { term: "権限", meaning: "実行を許される操作の範囲", inThisDemo: "一般ユーザー / 管理者という区別" },
  ],
  examPoints: [
    "認証＝本人確認、認可＝権限確認。「誰か」と「何をしてよいか」を区別する。",
    "「認証は成功したが認可で失敗」という状態がある（ログイン済みでも管理画面に入れない）。",
    "未ログインで止まるのは認証の段階、権限不足で止まるのは認可の段階。",
  ],
  miniCheck: {
    question: "一般ユーザーで管理画面を開こうとした場合、どこで止まった？",
    choices: ["認証で失敗した", "認可で失敗した", "DNSで失敗した", "SQLで失敗した"],
    correctIndex: 1,
    explanation:
      "ログイン済みなので本人確認（認証）はできています。しかし管理者権限がないため、認可で失敗しています。",
  },
};

/** トピック id → プロセスデモ。topics/index.ts でトピックに付与する。 */
export const topicProcessDemo: Record<string, ProcessDemoSpec> = {
  "tech-network-address": dnsDemo,
  "tech-database-sql": sqlDemo,
  "tech-auth-authz-mfa": authDemo,
};
