import type { Topic } from "@/types/content";

// ============================================================================
// マネジメント系トピック
// ============================================================================

export const managementTopics: Topic[] = [
  {
    id: "mgmt-pm-qcd",
    field: "management",
    category: "プロジェクトマネジメント",
    title: "プロジェクトとQCD",
    summary:
      "「期限のある特別な仕事＝プロジェクト」と、その出来を見る3つの観点QCDを学びます。",
    estimatedMinutes: 7,
    difficulty: 2,
    importance: 2,
    tags: ["プロジェクトマネジメント", "QCD"],
    prerequisites: [],

    conceptCard: {
      heading: "プロジェクトは「期限のある特別な仕事」",
      body: "毎日くり返す通常業務とちがい、はじまりと終わりが決まっていて、一度きりの目標に向かう仕事をプロジェクトと呼びます。その進め方を管理するのがプロジェクトマネジメントです。出来ばえを見るときは、品質(Quality)・費用(Cost)・納期(Delivery)の3つ、頭文字でQCDのバランスを意識します。",
      analogy:
        "学園祭の出し物づくりに近いです。良い内容にしたい（品質）、お金はかけられる範囲で（費用）、本番の日には間に合わせる（納期）。この3つを同時に考えるのがQCDです。",
      diagram: {
        type: "cards",
        title: "QCD ― 3つの観点",
        items: [
          { emoji: "⭐", title: "Quality（品質）", body: "求められる出来ばえを満たしているか" },
          { emoji: "💰", title: "Cost（費用）", body: "決めた予算の中におさまっているか" },
          { emoji: "📅", title: "Delivery（納期）", body: "決めた期限までに仕上がるか" },
        ],
      },
    },

    checkQuestions: [
      {
        id: "mgmt-pm-qcd-q1",
        prompt: "「プロジェクト」の説明として最も適切なものはどれでしょう？",
        choices: [
          { key: "A", text: "はじまりと終わりが決まった、一度きりの目標に向かう仕事" },
          { key: "B", text: "毎日同じ手順でくり返す通常業務" },
          { key: "C", text: "終わりを決めずに続ける日常作業" },
          { key: "D", text: "個人の趣味で行う活動" },
        ],
        correctChoice: "A",
        explanation:
          "プロジェクトは期限と目標がある一度きりの取り組みです。くり返しの通常業務とは区別されます。",
        difficulty: 1,
      },
      {
        id: "mgmt-pm-qcd-q2",
        prompt: "QCDが表す3つの観点の組み合わせはどれでしょう？",
        choices: [
          { key: "A", text: "品質・費用・納期" },
          { key: "B", text: "品質・顧客・需要" },
          { key: "C", text: "計画・実行・評価" },
          { key: "D", text: "数量・色・距離" },
        ],
        correctChoice: "A",
        explanation:
          "QCD は Quality(品質)・Cost(費用)・Delivery(納期) の頭文字です。",
        difficulty: 2,
      },
    ],

    explanation: {
      body: "QCDは互いに関係し合います。たとえば納期を急ぐと品質が下がりやすく、品質を上げようとすると費用や時間が増えがちです。どれか1つだけを優先するのではなく、3つのバランスをとりながら計画・調整していくのがプロジェクトマネジメントの基本です。",
      keyPoints: [
        "プロジェクト = 期限と目標がある一度きりの仕事",
        "QCD = 品質・費用・納期",
        "3つは互いに影響し合うのでバランスが大切",
      ],
    },

    reviewPrompt: {
      question: "QCD の3文字はそれぞれ何を表す？　なぜ「バランス」が大切？",
      answer:
        "品質(Q)・費用(C)・納期(D)。どれかを優先すると他が犠牲になりやすいため、3つの釣り合いをとる必要がある。",
    },

    referenceHints: [
      {
        keywords: ["プロジェクトマネジメント", "QCD", "品質 費用 納期"],
        note: "「プロジェクトとは」「QCD」の節を探し、通常業務との違いも合わせて確認する。",
      },
    ],

    kakomonFields: [
      { label: "マネジメント系 > プロジェクトマネジメント", note: "プロジェクトの定義・QCDの基本" },
    ],
  },
];
