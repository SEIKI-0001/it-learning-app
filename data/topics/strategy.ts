import type { Topic } from "@/types/content";

// ============================================================================
// ストラテジ系トピック
// ============================================================================

export const strategyTopics: Topic[] = [
  {
    id: "strat-swot",
    field: "strategy",
    category: "経営戦略",
    title: "SWOT分析",
    summary:
      "自社の「強み・弱み」と、外の世界の「機会・脅威」を整理して戦略を考える方法を学びます。",
    estimatedMinutes: 7,
    difficulty: 2,
    tags: ["経営戦略", "SWOT分析"],
    prerequisites: [],

    conceptCard: {
      heading: "自分の内側と、外の世界を分けて見る",
      body: "会社が戦略を立てるとき、まず現状を整理します。そのための定番がSWOT分析です。自社の内側を「強み(Strength)・弱み(Weakness)」、外の世界（市場や競合など自分では変えられない環境）を「機会(Opportunity)・脅威(Threat)」に分けて書き出します。内と外、プラスとマイナスの4つのマスで状況を見える化する考え方です。",
      analogy:
        "部活の試合前の作戦会議に似ています。自分たちの得意・不得意（内側）と、相手チームや天候など自分では変えられない条件（外側）を分けて整理してから作戦を決める、という流れです。",
      diagram: {
        type: "cards",
        title: "SWOT ― 4つの視点",
        items: [
          { emoji: "💪", title: "Strength（強み）", body: "自社の内側のプラス要素" },
          { emoji: "⚠️", title: "Weakness（弱み）", body: "自社の内側のマイナス要素" },
          { emoji: "🌱", title: "Opportunity（機会）", body: "外部環境のプラス要素（追い風）" },
          { emoji: "🌪️", title: "Threat（脅威）", body: "外部環境のマイナス要素（向かい風）" },
        ],
      },
    },

    checkQuestions: [
      {
        id: "strat-swot-q1",
        prompt: "SWOT分析の4つの視点の組み合わせとして正しいものはどれでしょう？",
        choices: [
          { key: "A", text: "強み・弱み・機会・脅威" },
          { key: "B", text: "品質・費用・納期・人材" },
          { key: "C", text: "計画・実行・評価・改善" },
          { key: "D", text: "売上・利益・資産・負債" },
        ],
        correctChoice: "A",
        explanation:
          "SWOT は Strength(強み)・Weakness(弱み)・Opportunity(機会)・Threat(脅威) の頭文字です。",
        difficulty: 1,
      },
      {
        id: "strat-swot-q2",
        prompt: "SWOT分析で「機会(Opportunity)」と「脅威(Threat)」が表すのはどちらの要素でしょう？",
        choices: [
          { key: "A", text: "自社では変えにくい、外部環境の要素" },
          { key: "B", text: "自社の内側にある要素" },
          { key: "C", text: "過去の売上の記録" },
          { key: "D", text: "社員個人の性格" },
        ],
        correctChoice: "A",
        explanation:
          "機会と脅威は、市場や競合など外部環境の要素です。内側の要素は強み・弱みで表します。",
        difficulty: 2,
      },
    ],

    explanation: {
      body: "SWOTのポイントは「内と外」を混同しないことです。強み・弱みは自社の内側（自分たちで変えられる）、機会・脅威は外の環境（自分たちでは変えにくい）。この4つを整理すると、強みを活かして機会をつかむ、弱みを補って脅威に備える、といった戦略を考えやすくなります。",
      keyPoints: [
        "強み・弱み = 内部環境（自社）",
        "機会・脅威 = 外部環境（市場・競合など）",
        "整理したうえで「強み×機会」などの戦略につなげる",
      ],
    },

    reviewPrompt: {
      question: "SWOTの4要素は？　そのうち「外部環境」にあたるのはどれ？",
      answer:
        "強み・弱み・機会・脅威。外部環境にあたるのは機会(O)と脅威(T)。",
    },

    referenceHints: [
      {
        keywords: ["SWOT分析", "強み 弱み 機会 脅威", "経営戦略 分析手法"],
        note: "「SWOT分析」の節を探し、内部要素（強み・弱み）と外部要素（機会・脅威）の切り分けに注目する。",
      },
    ],

    kakomonFields: [
      { label: "ストラテジ系 > 経営戦略マネジメント", note: "経営戦略の分析手法（SWOT など）" },
    ],
  },
];
