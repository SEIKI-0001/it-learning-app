import type { Topic } from "@/types/content";

// ============================================================================
// テクノロジ系トピック
// ----------------------------------------------------------------------------
// 解説は IT未経験者が読んでも拒否反応が出ないよう、専門用語を先に出さず、
// 身近なたとえを添える（ITパスポート学習コーチの解説トーン）。
// ここはコンテンツの「作り込み基準」を示す代表トピック。以降の量産テンプレを兼ねる。
// ============================================================================

export const technologyTopics: Topic[] = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "tech-binary-data",
    field: "technology",
    category: "基礎理論（情報の表現）",
    title: "2進数とデータ量の単位",
    summary:
      "コンピュータが「0と1」で情報を表すしくみと、ビット・バイトという量の単位を学びます。",
    estimatedMinutes: 8,
    difficulty: 1,
    importance: 2,
    tags: ["2進数", "基礎理論", "データ量"],
    prerequisites: [],

    conceptCard: {
      heading: "コンピュータは「0と1」だけで動いている",
      body: "コンピュータの中身は、たくさんの小さなスイッチでできています。スイッチは「オフ＝0」「オン＝1」のどちらかしかありません。この0と1だけを使う数の表し方を2進数と呼びます。文字も画像も音も、最終的にはすべて0と1の並びに置きかえられています。",
      analogy:
        "豆電球が並んでいて、消えている＝0・点いている＝1。電球の点き方のパターンで、いろいろな情報を表していると考えるとイメージしやすいです。",
      diagram: {
        type: "comparison",
        title: "情報量の単位",
        headers: ["単位", "大きさ", "イメージ"],
        rows: [
          { label: "1ビット", cells: ["スイッチ1個（0か1）", "情報の最小単位"] },
          { label: "1バイト", cells: ["8ビット", "半角文字 約1文字ぶん"] },
          { label: "1キロバイト(KB)", cells: ["約1,000バイト", "短い文章ぶん"] },
          { label: "1メガバイト(MB)", cells: ["約1,000KB", "写真1枚ぶん"] },
        ],
      },
    },

    checkQuestions: [
      {
        id: "tech-binary-data-q1",
        prompt: "コンピュータが情報を表すのに使う、いちばん基本の数の表し方はどれでしょう？",
        choices: [
          { key: "A", text: "0と1だけを使う（2進数）" },
          { key: "B", text: "0〜9を使う（10進数）" },
          { key: "C", text: "アルファベットを使う" },
          { key: "D", text: "ローマ数字を使う" },
        ],
        correctChoice: "A",
        explanation:
          "コンピュータの中はスイッチのオン・オフで動くので、オフ＝0・オン＝1の2通りで表せる2進数が基本です。",
        difficulty: 1,
      },
      {
        id: "tech-binary-data-q2",
        prompt: "「1バイト」は何ビットが集まったものでしょう？",
        choices: [
          { key: "A", text: "8ビット" },
          { key: "B", text: "2ビット" },
          { key: "C", text: "10ビット" },
          { key: "D", text: "1,000ビット" },
        ],
        correctChoice: "A",
        explanation:
          "1バイト＝8ビットです。スイッチ8個をひとまとめにした単位で、半角文字1つ分を表すときによく使われます。",
        difficulty: 2,
      },
      {
        id: "tech-binary-data-q3",
        prompt: "データ量の単位を小さい順に並べたとき、正しいものはどれでしょう？",
        choices: [
          { key: "A", text: "ビット → バイト → キロバイト → メガバイト" },
          { key: "B", text: "バイト → ビット → メガバイト → キロバイト" },
          { key: "C", text: "メガバイト → キロバイト → バイト → ビット" },
          { key: "D", text: "キロバイト → メガバイト → ビット → バイト" },
        ],
        correctChoice: "A",
        explanation:
          "小さい順に ビット < バイト < キロバイト < メガバイト です。1段上がるごとに約1,000倍ずつ大きくなります。",
        difficulty: 2,
      },
    ],

    explanation: {
      body: "1ビットは0か1の1個分で、これが情報の最小単位です。ビットを8個集めると1バイトになり、ここから KB・MB・GB と約1,000倍ずつ大きな単位になっていきます。ファイルサイズや通信量で見かける「MB」「GB」も、もとをたどればすべてビット（0と1）の集まりです。",
      keyPoints: [
        "ビット = 0か1の最小単位",
        "1バイト = 8ビット",
        "KB → MB → GB は約1,000倍ずつ",
      ],
      diagram: {
        type: "flow",
        title: "単位が大きくなる流れ",
        direction: "horizontal",
        steps: [
          { label: "ビット", description: "0か1" },
          { label: "バイト", description: "8ビット" },
          { label: "KB", description: "約1,000バイト" },
          { label: "MB", description: "約1,000KB" },
        ],
      },
    },

    reviewPrompt: {
      question: "1バイトは何ビット？　また、データ量の単位は1段上がるごとに約何倍になる？",
      answer: "1バイト＝8ビット。単位は1段ごとに約1,000倍（バイト→KB→MB→GB）。",
    },

    referenceHints: [
      {
        keywords: ["2進数", "ビット", "バイト"],
        note: "索引で「ビット」「バイト」を引き、単位の換算（8ビット＝1バイト）を確認する。",
      },
      {
        keywords: ["情報量の単位", "接頭語 K M G"],
        note: "K(キロ)・M(メガ)・G(ギガ)が約1,000倍ずつ大きくなる点に注目する。",
      },
    ],

    kakomonFields: [
      { label: "テクノロジ系 > 基礎理論 > 離散数学", note: "2進数・基数変換の基本問題" },
      { label: "テクノロジ系 > 基礎理論 > 情報に関する理論", note: "データ量・情報量の単位" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "tech-network-address",
    field: "technology",
    category: "技術要素（ネットワーク）",
    title: "IPアドレスとDNS",
    summary:
      "インターネット上の「住所」であるIPアドレスと、文字の住所を変換するDNSのしくみを学びます。",
    estimatedMinutes: 9,
    difficulty: 2,
    importance: 3,
    tags: ["ネットワーク", "IPアドレス", "DNS"],
    prerequisites: [],

    conceptCard: {
      heading: "ネットの「住所」と「電話帳」",
      body: "インターネットにつながった機器には、IPアドレスという番号が割りあてられます。これはデータを正しい相手に届けるための「住所」です。ただし人は番号を覚えにくいので、ふだんは「example.com」のような文字の名前を使います。この文字の名前を、コンピュータ用の番号(IPアドレス)に変換してくれるしくみがDNSです。",
      analogy:
        "DNSはスマホの電話帳のようなもの。名前をタップするだけで正しい番号に発信してくれるのと同じで、文字の住所から正しいIPアドレスを見つけてつないでくれます。",
      diagram: {
        type: "flow",
        title: "名前解決（DNS）の流れ",
        direction: "vertical",
        steps: [
          { label: "①入力", description: "ブラウザに example.com と入力" },
          { label: "②問い合わせ", description: "DNSに「住所(IP)を教えて」と聞く" },
          { label: "③回答", description: "DNSがIPアドレスを返す" },
          { label: "④接続", description: "そのIPアドレスのサーバへアクセス" },
        ],
      },
    },

    checkQuestions: [
      {
        id: "tech-network-address-q1",
        prompt: "インターネット上で機器の「住所」にあたり、データを正しく届けるために使うものはどれでしょう？",
        choices: [
          { key: "A", text: "IPアドレス" },
          { key: "B", text: "パスワード" },
          { key: "C", text: "バッテリー残量" },
          { key: "D", text: "画面の明るさ" },
        ],
        correctChoice: "A",
        explanation:
          "IPアドレスはネット上の住所です。郵便物が住所をたよりに届くように、データもIPアドレスをたよりに相手へ届きます。",
        difficulty: 1,
      },
      {
        id: "tech-network-address-q2",
        prompt: "「example.com」のような文字の名前を、IPアドレスに変換するしくみはどれでしょう？",
        choices: [
          { key: "A", text: "DNS" },
          { key: "B", text: "USB" },
          { key: "C", text: "GPS" },
          { key: "D", text: "PDF" },
        ],
        correctChoice: "A",
        explanation:
          "DNSは電話帳のようなしくみ。文字の名前から正しいIPアドレスを見つけて、目的のサーバへつないでくれます。",
        difficulty: 2,
      },
      {
        id: "tech-network-address-q3",
        prompt: "DNSがうまく働かないと、まず何が起きると考えられるでしょう？",
        choices: [
          { key: "A", text: "ドメイン名でアクセスできない（名前から住所を引けない）" },
          { key: "B", text: "パソコンの電源が入らない" },
          { key: "C", text: "キーボードが反応しなくなる" },
          { key: "D", text: "画面の色が変わる" },
        ],
        correctChoice: "A",
        explanation:
          "DNSは「名前→IPアドレス」の変換役なので、止まると文字の住所から接続先を見つけられず、サイトを開けなくなります。",
        difficulty: 3,
      },
    ],

    explanation: {
      body: "通信の相手を特定するのがIPアドレス（番号の住所）、その番号を人が覚えやすい文字の名前から引けるようにするのがDNSです。ブラウザにドメイン名を入れると、まずDNSに問い合わせてIPアドレスを受け取り、そのうえで相手のサーバへ接続します。順番は「名前 → DNSで変換 → IPアドレス → 接続」です。",
      keyPoints: [
        "IPアドレス = ネット上の住所（番号）",
        "DNS = 文字の名前を IPアドレスに変換する電話帳役",
        "接続の前に必ず名前解決（DNS）が行われる",
      ],
    },

    reviewPrompt: {
      question: "ブラウザにドメイン名を入れてからサーバに接続するまで、DNSはどんな役割を果たす？",
      answer:
        "DNSが文字のドメイン名をIPアドレスに変換する。その番号を使って初めて目的のサーバへ接続できる。",
    },

    referenceHints: [
      {
        keywords: ["IPアドレス", "DNS", "ドメイン名"],
        note: "「DNS＝名前解決」というキーワードで、名前とIPアドレスの対応を説明している箇所を探す。",
      },
    ],

    kakomonFields: [
      { label: "テクノロジ系 > 技術要素 > ネットワーク", note: "IPアドレス・DNS・プロトコルの基本" },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "tech-security-cia",
    field: "technology",
    category: "技術要素（セキュリティ）",
    title: "情報セキュリティの3要素（CIA）",
    summary:
      "情報を守るうえで土台になる「機密性・完全性・可用性」という3つの考え方を学びます。",
    estimatedMinutes: 8,
    difficulty: 2,
    importance: 3,
    tags: ["セキュリティ", "CIA", "情報管理"],
    prerequisites: [],

    conceptCard: {
      heading: "情報を守る3つの柱",
      body: "情報セキュリティは「機密性・完全性・可用性」という3つの考え方を守ることだと言われます。頭文字をとってCIAと呼びます。見てよい人だけが見られること（機密性）、内容が正しく保たれること（完全性）、必要なときに使えること（可用性）。この3つがそろって初めて「安全に情報を扱えている」と言えます。",
      analogy:
        "大事な書類を金庫にしまうイメージ。鍵を持つ人だけが開けられ（機密性）、中身が書きかえられず（完全性）、必要なときにすぐ取り出せる（可用性）――この3つがそろって安心です。",
      diagram: {
        type: "cards",
        title: "情報セキュリティの3要素",
        items: [
          { emoji: "🔒", title: "機密性", body: "許可された人だけが見られる（のぞき見・漏えいを防ぐ）" },
          { emoji: "✅", title: "完全性", body: "内容が正しく保たれ、勝手に書きかえられない" },
          { emoji: "⚡", title: "可用性", body: "使いたいときにきちんと使える（止まらない）" },
        ],
      },
    },

    checkQuestions: [
      {
        id: "tech-security-cia-q1",
        prompt: "情報セキュリティの3要素（CIA）に当てはまらないものはどれでしょう？",
        choices: [
          { key: "A", text: "経済性" },
          { key: "B", text: "機密性" },
          { key: "C", text: "完全性" },
          { key: "D", text: "可用性" },
        ],
        correctChoice: "A",
        explanation:
          "3要素は機密性・完全性・可用性です。経済性は含まれません。",
        difficulty: 1,
      },
      {
        id: "tech-security-cia-q2",
        prompt: "「許可された人だけが情報を見られるようにする」ことを表すのはどれでしょう？",
        choices: [
          { key: "A", text: "機密性" },
          { key: "B", text: "完全性" },
          { key: "C", text: "可用性" },
          { key: "D", text: "再現性" },
        ],
        correctChoice: "A",
        explanation:
          "見てよい人だけが見られる状態を保つのが機密性です。のぞき見や情報漏えいを防ぐ考え方です。",
        difficulty: 2,
      },
      {
        id: "tech-security-cia-q3",
        prompt: "サーバが攻撃で停止し、利用者がサービスを使えなくなりました。主にどの要素が損なわれたでしょう？",
        choices: [
          { key: "A", text: "可用性" },
          { key: "B", text: "機密性" },
          { key: "C", text: "完全性" },
          { key: "D", text: "保守性" },
        ],
        correctChoice: "A",
        explanation:
          "「使いたいときに使える」状態が可用性です。サービスが止まって使えないのは可用性が損なわれた状態です。",
        difficulty: 3,
      },
    ],

    explanation: {
      body: "セキュリティの目的は「秘密を守る」ことだけだと思われがちですが、それは機密性の話で一部にすぎません。情報が正しく保たれること（完全性）、必要なときに使えること（可用性）も同じくらい大切です。たとえばデータが書きかえられたら完全性が、システムが止まったら可用性が損なわれます。3つをセットで考えるのがポイントです。",
      keyPoints: [
        "機密性 = 見てよい人だけが見られる",
        "完全性 = 内容が正しく保たれる",
        "可用性 = 使いたいときに使える",
      ],
      diagram: {
        type: "cards",
        title: "損なわれる例",
        items: [
          { emoji: "🔓", title: "機密性の侵害", body: "情報漏えい・のぞき見" },
          { emoji: "✏️", title: "完全性の侵害", body: "データの改ざん・書きかえ" },
          { emoji: "🛑", title: "可用性の侵害", body: "システム停止・サービス不能" },
        ],
      },
    },

    reviewPrompt: {
      question: "情報セキュリティの3要素は？　それぞれを一言で言うと？",
      answer:
        "機密性（見てよい人だけ見られる）・完全性（内容が正しく保たれる）・可用性（使いたいときに使える）。",
    },

    referenceHints: [
      {
        keywords: ["情報セキュリティ", "機密性 完全性 可用性", "CIA"],
        note: "「情報セキュリティの3要素」の節を探し、3つの定義と侵害例をセットで覚える。",
      },
    ],

    kakomonFields: [
      { label: "テクノロジ系 > 技術要素 > セキュリティ", note: "情報セキュリティの3要素・脅威と対策" },
    ],
  },
];
