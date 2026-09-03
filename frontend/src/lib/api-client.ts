import axios, { AxiosError } from 'axios';
import type { ApiErrorBody } from '@/types';
import { clearSession, getToken } from './auth-storage';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

api.interceptors.request.use((config) => {
  const token = getToken();

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;

    if (status === 401 && typeof window !== 'undefined') {
      const alreadyOnAuthPage = /^\/(login|register)/.test(
        window.location.pathname,
      );

      clearSession();

      if (!alreadyOnAuthPage) {
        const next = encodeURIComponent(
          window.location.pathname + window.location.search,
        );
        window.location.assign(`/login?next=${next}`);
      }
    }

    return Promise.reject(error);
  },
);

export function getErrorMessage(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    if (error.code === 'ECONNABORTED') {
      return 'The request timed out. Is the API running?';
    }

    if (!error.response) {
      return 'Cannot reach the API. Check that the backend is running.';
    }

    const message = error.response.data?.message;

    if (Array.isArray(message)) {
      return message.join('. ');
    }

    if (typeof message === 'string' && message.length > 0) {
      return message;
    }

    return error.response.statusText || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}
