// Shared DTO types mirroring the Spring Boot backend contract (see README).

export type Role = 'USER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  targetScore?: number | null;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface DashboardStats {
  estimatedScore: number; // /990
  streakDays: number;
  xp: number;
  level: number;
  dailyDoneMinutes: number;
  dailyGoalMinutes: number;
  nextMilestone: { title: string; description: string };
}

export interface Word {
  id: string;
  word: string;
  ipa?: string | null;
  meaningVi: string;
  meaningEn?: string | null;
  exampleEn?: string | null;
  exampleVi?: string | null;
  topic?: string | null;
  level?: string | null;
  custom?: boolean;
}

export interface CustomWordPayload {
  word: string;
  ipa?: string;
  meaningVi: string;
  meaningEn?: string;
  exampleEn?: string;
  exampleVi?: string;
  topic?: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  totalPages: number;
  total: number;
}

export type SrsRating = 'again' | 'hard' | 'good' | 'easy';

export interface Question {
  id: string;
  part: number; // 1..7
  prompt: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  options: string[];
  correctIndex: number;
  explanation?: string | null;
}

export type TestKind = 'MINI' | 'HALF' | 'FULL';

export interface TestSession {
  testId: string;
  kind: TestKind;
  questions: Question[];
  durationMinutes: number;
}

export interface TestResult {
  testId: string;
  listeningScore: number; // /495
  readingScore: number; // /495
  totalScore: number; // /990
  correctCount: number;
  totalCount: number;
  perPart: { part: number; correct: number; total: number }[];
  mistakes: Question[];
}

export interface PracticeAttemptResult {
  score: number;
  total: number;
  mistakes: Question[];
}

export interface GrammarLesson {
  id: string;
  title: string;
  summary: string;
  level?: string | null;
}

export interface GrammarDetail extends GrammarLesson {
  content: string; // markdown-ish text
  quiz: Question[];
}

export interface Notebook {
  savedWords: Word[];
  bookmarks: Question[];
  mistakes: Question[];
}

export interface SemanticRelation {
  word: string;
  wordId?: string | null;
  relation: 'synonym' | 'antonym' | 'wordFamily' | 'collocation';
  example?: string | null;
}

export interface SemanticGraph {
  center: Word;
  relations: SemanticRelation[];
}

export interface PhotoWordResult {
  englishName: string;
  ipa?: string | null;
  meaningVi: string;
  exampleEn?: string | null;
  imageUrl: string;
}

export interface DocAnalysis {
  id: string;
  fileName: string;
  status: 'PROCESSING' | 'DONE' | 'FAILED';
  progress: number; // 0..100
  createdAt: string;
  vocabAdded?: { word: string; meaningVi: string }[];
  grammarPoints?: string[];
  tips?: string[];
  questions?: Question[];
  error?: string | null;
}

export interface SpeakingSample {
  id: string;
  text: string;
  level?: string | null;
}

export interface SpeakingScores {
  pronunciation: number;
  fluency: number;
  accuracy: number;
  intonation: number;
  overall: number;
}

export interface SpeakingResult {
  scores: SpeakingScores;
  transcript: string;
  weakSounds: string[];
  feedback: string;
}

export interface SpeakingAttempt extends SpeakingResult {
  id: string;
  sampleText: string;
  createdAt: string;
}

export interface HandsfreeItem {
  id: string;
  kind: 'vocab' | 'question';
  prompt: string;
  expectedAnswer?: string | null;
}

export interface HandsfreeSession {
  sessionId: string;
  items: HandsfreeItem[];
}

export interface HandsfreeAnswer {
  transcript: string;
  correct: boolean;
  explanation: string;
}

export interface AiAvailability {
  aiAvailable: boolean;
  ttsAvailable: boolean;
  message?: string | null;
}

export interface PlacementResult {
  estimatedScore: number;
  level: string;
  roadmap: RoadmapStep[];
}

export interface RoadmapStep {
  title: string;
  description: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  unlockedAt?: string | null;
}

export interface AdminOverview {
  totalUsers: number;
  totalQuestions: number;
  totalWords: number;
  totalLessons: number;
  dau: number;
  attemptsToday: number;
}
