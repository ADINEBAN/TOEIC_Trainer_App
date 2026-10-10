import { apiRequest } from '@/src/services/api.client';
import type { AuthResponse, User } from '@/src/types';

export const authService = {
  login(email: string, password: string) {
    return apiRequest<AuthResponse>('/api/auth/login', {
      method: 'POST',
      noAuth: true,
      body: { email: email.trim(), password },
    });
  },

  register(name: string, email: string, password: string) {
    return apiRequest<AuthResponse>('/api/auth/register', {
      method: 'POST',
      noAuth: true,
      body: { name: name.trim(), email: email.trim(), password },
    });
  },

  forgotPassword(email: string) {
    return apiRequest<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      noAuth: true,
      body: { email: email.trim() },
    });
  },

  me() {
    return apiRequest<User>('/api/users/me');
  },

  updateMe(payload: { name?: string; targetScore?: number | null }) {
    return apiRequest<User>('/api/users/me', { method: 'PATCH', body: payload });
  },

  dashboard() {
    return apiRequest<import('@/src/types').DashboardStats>('/api/dashboard');
  },

  completeOnboarding(payload: {
    targetScore: number;
    minutesPerDay: number;
    studyDays: number[];
  }) {
    return apiRequest<import('@/src/types').PlacementResult>('/api/onboarding/complete', {
      method: 'POST',
      body: payload,
    });
  },
};
