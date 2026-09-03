import Cookies from 'js-cookie';
import type { User } from '@/types';
import { TOKEN_COOKIE } from './constants';


export { TOKEN_COOKIE };
const USER_STORAGE_KEY = 'kanban_user';

const COOKIE_MAX_AGE_DAYS = 7;

export function getToken(): string | undefined {
  return Cookies.get(TOKEN_COOKIE);
}

export function setToken(token: string): void {
  Cookies.set(TOKEN_COOKIE, token, {
    expires: COOKIE_MAX_AGE_DAYS,
    sameSite: 'lax',
    path: '/',
    
    secure: typeof window !== 'undefined' && window.location.protocol === 'https:',
  });
}

export function clearToken(): void {
  Cookies.remove(TOKEN_COOKIE, { path: '/' });
}


export function getCachedUser(): User | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export function setCachedUser(user: User | null): void {
  if (typeof window === 'undefined') return;

  if (user) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  } else {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  }
}

export function clearSession(): void {
  clearToken();
  setCachedUser(null);
}
