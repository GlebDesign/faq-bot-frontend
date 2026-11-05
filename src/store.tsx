import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { readDemo, writeDemo } from './api';
import type { DB } from './types';
type Store = {
  db: DB;
  update: (fn: (draft: DB) => void) => boolean;
  toast: (message: string) => void;
};
const Context = createContext<Store>(null!);
export const useStore = () => useContext(Context);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(readDemo);
  const [notice, setNotice] = useState('');
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
      writeDemo(next);
    } catch {
      toast('Память браузера заполнена. Уменьшите размер вложений.');
      return false;
    }
    setDb(next);
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
