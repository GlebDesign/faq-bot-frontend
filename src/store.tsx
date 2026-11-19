import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { readDemo, writeDemo } from './api';
import type { DB } from './types';
import type { User } from './types';
import { isDemoAuth, saveLocalProfile, useSession } from './auth/AuthProvider';
type Store = {
  db: DB;
  update: (fn: (draft: DB) => void) => boolean;
  toast: (message: string) => void;
};
const Context = createContext<Store>(null!);
export const useStore = () => useContext(Context);
export function StoreProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const scope = isDemoAuth
    ? `demo-${Boolean(user)}`
    : `${user?.id || 'guest'}:${user?.accountId || ''}`;
  const storageKey =
    isDemoAuth || !user?.accountId ? 'faq-demo-v1' : `faq-workspace-${user.accountId}`;
  return (
    <WorkspaceStore key={scope} user={user} storageKey={storageKey}>
      {children}
    </WorkspaceStore>
  );
}
function WorkspaceStore({
  children,
  user,
  storageKey,
}: {
  children: ReactNode;
  user: User | null;
  storageKey: string;
}) {
  const [db, setDb] = useState<DB>(() => ({ ...readDemo(storageKey), user }));
  const [notice, setNotice] = useState('');
  useEffect(() => {
    setDb((current) => ({ ...current, user }));
  }, [user]);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    return () => clearTimeout(timer.current);
  }, []);
  const toast = (message: string) => {
    setNotice(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setNotice(''), 4500);
  };
  const update: Store['update'] = (fn) => {
    const next = structuredClone(db);
    fn(next);
    try {
      writeDemo(next, storageKey);
    } catch {
      toast('Память браузера заполнена. Уменьшите размер вложений.');
      return false;
    }
    setDb(next);
    if (!isDemoAuth && next.user) saveLocalProfile(next.user);
    return true;
  };
  return (
    <Context.Provider value={{ db, update, toast }}>
      {children}
      {notice && (
        <div className="toast" role="status">
          {notice}
          <button aria-label="Закрыть уведомление" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}
    </Context.Provider>
  );
}
