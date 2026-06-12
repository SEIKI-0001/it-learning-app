export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ContentBlock {
  type: 'intro' | 'concept' | 'analogy' | 'keyterms' | 'career-tip';
  title?: string;
  body: string;
  emoji?: string;
  items?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  emoji: string;
  duration: string;
  content: ContentBlock[];
  quiz: QuizQuestion[];
}

export interface Module {
  id: string;
  title: string;
  tagline: string;
  description: string;
  emoji: string;
  gradient: string;
  badgeName: string;
  badgeEmoji: string;
  lessons: Lesson[];
}
