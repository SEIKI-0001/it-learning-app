export type StudyDomain = "strategy" | "management" | "technology";

export type Difficulty = "intro" | "standard" | "exam";

export type Topic = {
  id: string;
  domain: StudyDomain;
  title: string;
  summary: string;
  beginnerExplanation: string;
  analogy: string;
  diagramText: string;
  keyTerms: string[];
  commonTraps: string[];
  relatedPastExamThemes: string[];
  reviewPriority: number;
  recommendedMinutes: number;
  bookReferenceNotes: Record<string, string>;
  minigameId?: string;
};

export type QuestionChoice = {
  id: "a" | "b" | "c" | "d";
  text: string;
};

export type Question = {
  id: string;
  topicId: string;
  domain: StudyDomain;
  prompt: string;
  choices: QuestionChoice[];
  correctChoiceId: QuestionChoice["id"];
  explanation: string;
  trap?: string;
  difficulty: Difficulty;
  relatedPastExamTheme: string;
};

export type Book = {
  id: string;
  title: string;
  notes: string;
};

export type MiniGameDefinition = {
  id: string;
  topicId: string;
  title: string;
  objective: string;
  estimatedMinutes: number;
};
