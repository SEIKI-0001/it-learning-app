// 基本情報クエスト (FE Quest) — 共通型定義

export type ChoiceKey = "A" | "B" | "C" | "D";

export type Question = {
  id: string;
  dayNo: number;
  theme: string;
  stageName: string;
  questionText: string;
  choices: {
    key: ChoiceKey;
    text: string;
  }[];
  correctChoice: ChoiceKey;
  explanation: string;
  tag: string;
  difficulty: 1 | 2 | 3;
};

export type UserProfile = {
  itExperience: string;
  dailyMinutes: string;
  examPlan: string;
  confidence: number;
};

export type UserProgress = {
  level: number;
  exp: number;
  currentDay: number;
  completedDays: number[];
  streakCount: number;
  weakTags: string[];
  lastPlayedAt?: string;
};

export type UserAnswer = {
  questionId: string;
  selectedChoice: ChoiceKey;
  isCorrect: boolean;
  answeredAt: string;
  tag: string;
};

export type AppState = {
  profile?: UserProfile;
  progress: UserProgress;
  answers: UserAnswer[];
};

// クエスト完了時に /result へ受け渡す結果サマリー
export type QuestResult = {
  dayNo: number;
  stageName: string;
  correctCount: number;
  totalCount: number;
  expGained: number;
  level: number;
  levelName: string;
  leveledUp: boolean;
  weakTagsThisRound: string[];
  isBoss: boolean;
  allDaysCleared: boolean;
};
