import { apiRequest } from '@/src/services/api.client';
import type {
  CustomWordPayload,
  Notebook,
  Page,
  SemanticGraph,
  SrsRating,
  Word,
} from '@/src/types';

export const vocabService = {
  topics() {
    return apiRequest<string[]>('/api/vocab/topics');
  },

  list(params: { search?: string; topic?: string; page?: number; size?: number } = {}) {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.topic) query.set('topic', params.topic);
    query.set('page', String(params.page ?? 0));
    query.set('size', String(params.size ?? 20));
    return apiRequest<Page<Word>>(`/api/vocab?${query.toString()}`);
  },

  detail(id: string, custom = false) {
    const path = custom ? `/api/vocab/custom/${id}` : `/api/vocab/${id}`;
    return apiRequest<Word>(path);
  },

  semantic(wordId: string, custom = false) {
    const path = custom ? `/api/vocab/custom/${wordId}/semantic` : `/api/vocab/${wordId}/semantic`;
    return apiRequest<SemanticGraph>(path);
  },

  addCustom(payload: CustomWordPayload) {
    return apiRequest<Word>('/api/vocab/custom', { method: 'POST', body: payload });
  },

  updateCustom(id: string, payload: CustomWordPayload) {
    return apiRequest<Word>(`/api/vocab/custom/${id}`, { method: 'PUT', body: payload });
  },

  deleteCustom(id: string) {
    return apiRequest<void>(`/api/vocab/custom/${id}`, { method: 'DELETE' });
  },

  dueFlashcards(limit = 20) {
    return apiRequest<Word[]>(`/api/flashcards/due?limit=${limit}`);
  },

  review(payload: { wordId?: string; customWordId?: string; rating: SrsRating }) {
    return apiRequest<{ nextReviewAt: string }>('/api/flashcards/review', {
      method: 'POST',
      body: payload,
    });
  },

  notebook() {
    return apiRequest<Notebook>('/api/notebook');
  },

  saveWord(wordId: string, custom = false) {
    return apiRequest<void>('/api/notebook/saved-words', {
      method: 'POST',
      body: { wordId, custom },
    });
  },

  unsaveWord(wordId: string, custom = false) {
    const query = new URLSearchParams({ wordId, custom: String(custom) });
    return apiRequest<void>(`/api/notebook/saved-words?${query.toString()}`, { method: 'DELETE' });
  },

  submitPlacement(answers: { questionId: string; selected: number }[]) {
    return apiRequest<import('@/src/types').PlacementResult>('/api/placement/submit', {
      method: 'POST',
      body: { answers },
    });
  },
};
