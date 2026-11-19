import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { ApiError, readDemo, writeDemo } from '../api';
import type { User } from '../types';
import { authApi, authErrorMessage } from './api';
import type { AuthSession } from './api';

export const isDemoAuth = import.meta.env.VITE_AUTH_MODE === 'mock';
type AuthStatus = 'loading' | 'authenticated' | 'anonymous' | 'error';
type AuthContextValue = {
  user: User | null;
  status: AuthStatus;
  error: string;
  retry: () => void;
  authenticate: (
    operation: 'login' | 'register',
    email: string,
    password: string,
    name?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};
const Context = createContext<AuthContextValue>(null!);
export const useSession = () => useContext(Context);

export function saveLocalProfile(user: User) {
  if (!user.id) return;
  try {
    localStorage.setItem(`faq-profile-${user.id}`, JSON.stringify(user));
  } catch {
    /* Session authentication does not depend on profile storage. */
  }
}
function sessionUser(session: AuthSession, email?: string, name?: string): User {
  let profile: Partial<User> = {};
  try {
    const saved = JSON.parse(
      localStorage.getItem(`faq-profile-${session.identity.user_id}`) || '{}',
    );
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) profile = saved;
  } catch {
    /* Use identity and form values. */
  }
  const user: User = {
    ...profile,
    name:
      name ||
      (typeof profile.name === 'string' && profile.name) ||
      email?.split('@')[0] ||
      'Пользователь',
    email: email || (typeof profile.email === 'string' && profile.email) || '',
    id: session.identity.user_id,
    accountId: session.identity.account_id,
    role: session.identity.role,
    auditRead: session.identity.audit_read,
  };
  saveLocalProfile(user);
  return user;
}

export function AuthProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const { pathname } = useLocation();
  const [user, setUser] = useState<User | null>(() => (isDemoAuth ? readDemo().user : null));
  const [status, setStatus] = useState<AuthStatus>(() =>
    isDemoAuth ? (readDemo().user ? 'authenticated' : 'anonymous') : 'loading',
  );
  const [session, setSession] = useState<AuthSession | null>(null);
  const [error, setError] = useState('');
  const generation = useRef(0);
  const busy = useRef(false);

  const refresh = useCallback(async () => {
    if (isDemoAuth || busy.current) return;
    const request = ++generation.current;
    try {
      const result = await authApi.session();
      if (request !== generation.current) return;
      setSession(result);
      setUser(sessionUser(result));
      setStatus('authenticated');
      setError('');
    } catch (failure) {
      if (request !== generation.current) return;
      setSession(null);
      setUser(null);
      if (failure instanceof ApiError && failure.status === 401) {
        setStatus('anonymous');
        setError('');
      } else {
        setStatus('error');
        setError(authErrorMessage(failure));
      }
    }
  }, []);
  useEffect(() => {
    if (!enabled || isDemoAuth) return;
    void refresh();
    return () => {
      generation.current++;
    };
  }, [enabled, pathname, refresh]);

  useEffect(() => {
    if (isDemoAuth || !enabled || status !== 'authenticated' || !session) return;
    const check = () => {
      if (document.visibilityState === 'visible') void refresh();
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    const timer = window.setTimeout(
      check,
      Math.max(0, Date.parse(session.expires_at) - Date.now()),
    );
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
      clearTimeout(timer);
    };
  }, [enabled, status, session, refresh]);

  const authenticate: AuthContextValue['authenticate'] = async (
    operation,
    email,
    password,
    name,
  ) => {
    if (busy.current) throw new ApiError(409, 'Дождитесь завершения текущего запроса.');
    busy.current = true;
    generation.current++;
    try {
      let nextUser: User;
      if (isDemoAuth) {
        nextUser = { name: name || 'Алексей Петров', email };
        const db = readDemo();
        db.user = nextUser;
        writeDemo(db);
      } else {
        const result = await authApi.authenticate(operation, email, password);
        setSession(result);
        nextUser = sessionUser(result, email, name);
      }
      setUser(nextUser);
      setStatus('authenticated');
      setError('');
    } finally {
      busy.current = false;
    }
  };
  const logout = async () => {
    if (busy.current) throw new ApiError(409, 'Дождитесь завершения текущего запроса.');
    busy.current = true;
    generation.current++;
    try {
      if (isDemoAuth) {
        const db = readDemo();
        db.user = null;
        writeDemo(db);
      } else {
        try {
          await authApi.logout();
        } catch (failure) {
          if (!(failure instanceof ApiError) || failure.status !== 401) throw failure;
        }
      }
      setUser(null);
      setSession(null);
      setStatus('anonymous');
      setError('');
    } finally {
      busy.current = false;
    }
  };

  return (
    <Context.Provider
      value={{
        user,
        status,
        error,
        authenticate,
        logout,
        retry: () => {
          setStatus('loading');
          void refresh();
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
