import type { ChoiceKey } from "@/types";
import type {
  BeginnerTrapLevel,
  CheckQuestion,
  DiagramSpec,
  Difficulty,
  ExamFrequency,
  HeroDiagramSpec,
  Importance,
  ReviewPriority,
  Topic,
  TopicField,
  VisualLearningSpec,
} from "@/types/content";

const CHOICE_KEYS: ChoiceKey[] = ["A", "B", "C", "D"];

type CompactQuestion = {
  prompt: string;
  correct: string;
  distractors: [string, string, string];
  explanation: string;
  wrongExplanations?: [string, string, string];
  difficulty?: Difficulty;
  relatedTopicIds?: string[];
  reviewTags?: string[];
};

export type CompactTopic = {
  id: string;
  field: TopicField;
  category: string;
  title: string;
  summary: string;
  hookQuestion?: string;
  body: string;
  analogy: string;
  keyPoints: [string, string, string] | string[];
  examPoint: string;
  commonMistakes: string[];
  relatedTerms: string[];
  reviewKeywords: string[];
  tags: string[];
  estimatedMinutes: number;
  difficulty: Difficulty;
  importance?: Importance;
  prerequisites?: string[];
  nextTopicIds?: string[];
  examFrequency?: ExamFrequency;
  reviewPriority?: ReviewPriority;
  beginnerTrapLevel?: BeginnerTrapLevel;
  heroDiagram?: HeroDiagramSpec;
  visualLearning?: VisualLearningSpec;
  diagram?: DiagramSpec;
  reviewQuestion?: string;
  reviewAnswer?: string;
  referenceKeywords?: string[];
  referenceNote?: string;
  kakomonLabel: string;
  kakomonNote?: string;
  questions: CompactQuestion[];
};

function trimSentenceEnd(text: string): string {
  return text.replace(/[。.!！?？]+$/u, "");
}

function normalizeExamPoint(text: string): string {
  return trimSentenceEnd(text)
    .replace(/が問われ(?:る|やすい)$/u, "")
    .replace(/を問われ(?:る|やすい)$/u, "");
}

function buildSummaryExplanation(topic: CompactTopic, keyPoints: string[]): string {
  const mainPoint = trimSentenceEnd(keyPoints[0] ?? topic.summary);
  const examPoint = normalizeExamPoint(topic.examPoint);

  return `${topic.title}は、まず「${mainPoint}」を押さえるのが近道です。試験では、${examPoint}に注目します。`;
}

function buildQuestion(
  topic: CompactTopic,
  question: CompactQuestion,
  index: number,
): CheckQuestion {
  const texts = [question.correct, ...question.distractors];
  const choices = texts.map((text, i) => ({
    key: CHOICE_KEYS[i],
    text,
  }));
  const wrong = question.wrongExplanations ?? [
    "この選択肢は、用語の役割が違います。",
    "この選択肢は、似ていますが試験で問われる中心ではありません。",
    "この選択肢は、今回の場面を説明する言葉ではありません。",
  ];

  return {
    id: `${topic.id}-q${index + 1}`,
    prompt: question.prompt,
    choices,
    correctChoice: "A",
    explanation: question.explanation,
    difficulty: question.difficulty ?? topic.difficulty,
    choiceExplanations: {
      A: question.explanation,
      B: wrong[0],
      C: wrong[1],
      D: wrong[2],
    },
    relatedTopicIds: question.relatedTopicIds ?? topic.nextTopicIds,
    reviewTags: question.reviewTags ?? topic.reviewKeywords,
  };
}

export function createCompactTopic(topic: CompactTopic): Topic {
  const keyPoints = [...topic.keyPoints];
  const importance =
    topic.importance ?? (topic.examFrequency === "high" ? 3 : topic.difficulty === 1 ? 2 : 2);
  return {
    id: topic.id,
    field: topic.field,
    category: topic.category,
    title: topic.title,
    summary: topic.summary,
    hookQuestion: topic.hookQuestion,
    estimatedMinutes: topic.estimatedMinutes,
    difficulty: topic.difficulty,
    importance,
    tags: topic.tags,
    prerequisites: topic.prerequisites ?? [],
    nextTopicIds: topic.nextTopicIds,
    relatedTerms: topic.relatedTerms,
    commonMistakes: topic.commonMistakes,
    examPoint: topic.examPoint,
    reviewKeywords: topic.reviewKeywords,
    lineSummary: `${topic.title}: ${topic.summary} 試験では「${topic.examPoint}」が狙われます。`,
    examFrequency: topic.examFrequency ?? "medium",
    reviewPriority: topic.reviewPriority ?? "medium",
    beginnerTrapLevel: topic.beginnerTrapLevel ?? "medium",
    heroDiagram: topic.heroDiagram ?? topic.visualLearning?.heroDiagram,
    visualLearning: topic.visualLearning,
    conceptCard: {
      heading: `${topic.title}をイメージでつかむ`,
      body: topic.body,
      analogy: topic.analogy,
      diagram:
        topic.diagram ??
        {
          type: "cards",
          title: `${topic.title}の押さえどころ`,
          items: keyPoints.map((point) => ({ title: point, body: "試験前に一言で思い出せるようにしておく。" })),
        },
    },
    checkQuestions: topic.questions.map((q, i) => buildQuestion(topic, q, i)),
    explanation: {
      body: buildSummaryExplanation(topic, keyPoints),
      keyPoints,
    },
    reviewPrompt: {
      question:
        topic.reviewQuestion ?? `${topic.title}で、試験直前に思い出したいポイントは？`,
      answer: topic.reviewAnswer ?? keyPoints.join(" / "),
    },
    referenceHints: [
      {
        keywords: topic.referenceKeywords ?? [
          topic.title,
          ...topic.relatedTerms.slice(0, 3),
        ],
        note:
          topic.referenceNote ??
          "索引では用語名だけでなく、関連語も一緒に引くと出題パターンをつかみやすい。",
      },
    ],
    kakomonFields: [
      {
        label: topic.kakomonLabel,
        note: topic.kakomonNote,
      },
    ],
  };
}
