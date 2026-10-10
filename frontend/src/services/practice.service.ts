import { apiRequest } from '@/src/services/api.client';
import type {
  GrammarDetail,
  GrammarLesson,
  PracticeAttemptResult,
  Question,
  TestKind,
  TestResult,
  TestSession,
} from '@/src/types';

export const practiceService = {
  questions(params: { part?: number; limit?: number } = {}) {
    const query = new URLSearchParams();
    if (params.part) query.set('part', String(params.part));
    query.set('limit', String(params.limit ?? 20));
    return apiRequest<Question[]>(`/api/practice/questions?${query.toString()}`);
  },

  submitAttempt(payload: {
    part?: number;
    testId?: string;
    answers: { questionId: string; selected: number | null }[];
  }) {
    return apiRequest<PracticeAttemptResult>('/api/practice/attempts', {
      method: 'POST',
      body: payload,
    });
  },

  mistakes() {
    return apiRequest<Question[]>('/api/practice/mistakes');
  },

  bookmark(questionId: string) {
    return apiRequest<void>('/api/notebook/bookmarks', { method: 'POST', body: { questionId } });
  },

  unbookmark(questionId: string) {
    return apiRequest<void>(`/api/notebook/bookmarks?questionId=${encodeURIComponent(questionId)}`, {
      method: 'DELETE',
    });
  },

  startTest(kind: TestKind) {
    return apiRequest<TestSession>('/api/tests/start', { method: 'POST', body: { kind } });
  },

  testQuestions(testId: string) {
    return apiRequest<TestSession>(`/api/tests/${testId}/questions`);
  },

  submitTest(
    testId: string,
    payload: {
      answers: { questionId: string; selected: number | null }[];
      flagged: string[];
      durationSeconds: number;
    }
  ) {
    return apiRequest<TestResult>(`/api/tests/${testId}/submit`, { method: 'POST', body: payload });
  },

  testResult(testId: string) {
    return apiRequest<TestResult>(`/api/tests/${testId}/result`);
  },

  grammarLessons() {
    return apiRequest<GrammarLesson[]>('/api/grammar');
  },

  grammarDetail(id: string) {
    return apiRequest<GrammarDetail>(`/api/grammar/${id}`);
  },

  submitGrammarQuiz(lessonId: string, answers: { questionId: string; selected: number | null }[]) {
    return apiRequest<{ score: number; total: number }>(`/api/grammar/${lessonId}/quiz`, {
      method: 'POST',
      body: { answers },
    });
  },
};
