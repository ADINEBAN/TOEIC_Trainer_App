import { apiRequest } from '@/src/services/api.client';
import type {
  AdminOverview,
  AuthResponse,
  GrammarLesson,
  Page,
  Question,
  Word,
} from '@/src/types';

export const adminService = {
  login(email: string, password: string) {
    return apiRequest<AuthResponse>('/api/admin/login', {
      method: 'POST',
      noAuth: true,
      body: { email: email.trim(), password },
    });
  },

  overview() {
    return apiRequest<AdminOverview>('/api/admin/overview', { admin: true });
  },

  // --- Questions CRUD ---
  listQuestions(page = 0, size = 20) {
    return apiRequest<Page<Question>>(`/api/admin/questions?page=${page}&size=${size}`, {
      admin: true,
    });
  },

  upsertQuestion(question: Partial<Question> & { id?: string }) {
    const isNew = !question.id;
    return apiRequest<Question>('/api/admin/questions', {
      method: isNew ? 'POST' : 'PUT',
      admin: true,
      body: question,
    });
  },

  deleteQuestion(id: string) {
    return apiRequest<void>(`/api/admin/questions/${id}`, { method: 'DELETE', admin: true });
  },

  // --- Vocabulary CRUD ---
  listWords(page = 0, size = 20, search = '') {
    const query = new URLSearchParams({ page: String(page), size: String(size), search });
    return apiRequest<Page<Word>>(`/api/admin/vocabulary?${query.toString()}`, { admin: true });
  },

  upsertWord(word: Partial<Word> & { id?: string }) {
    const isNew = !word.id;
    return apiRequest<Word>('/api/admin/vocabulary', {
      method: isNew ? 'POST' : 'PUT',
      admin: true,
      body: word,
    });
  },

  deleteWord(id: string) {
    return apiRequest<void>(`/api/admin/vocabulary/${id}`, { method: 'DELETE', admin: true });
  },

  // --- Grammar CRUD ---
  listLessons() {
    return apiRequest<GrammarLesson[]>('/api/admin/grammar', { admin: true });
  },

  upsertLesson(lesson: Partial<GrammarLesson> & { id?: string; content?: string }) {
    const isNew = !lesson.id;
    return apiRequest<GrammarLesson>('/api/admin/grammar', {
      method: isNew ? 'POST' : 'PUT',
      admin: true,
      body: lesson,
    });
  },

  deleteLesson(id: string) {
    return apiRequest<void>(`/api/admin/grammar/${id}`, { method: 'DELETE', admin: true });
  },
};
