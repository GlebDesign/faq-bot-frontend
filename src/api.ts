import { seed } from './data';
import type { DB } from './types';
const key = 'faq-demo-v1';
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function readDemo(): DB {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : structuredClone(seed);
  } catch {
    return structuredClone(seed);
  }
}
export function writeDemo(db: DB) {
  localStorage.setItem(key, JSON.stringify(db));
}
/** Typed transport. Mock routes stay behind the same REST boundary as the future Go API. */
export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const env = (import.meta as ImportMeta & { env: Record<string, string> }).env;
  if (env.VITE_API_MODE !== 'real') {
    await new Promise((resolve) => setTimeout(resolve, 180));
    const db = readDemo();
    if (path === '/state' && (!options.method || options.method === 'GET')) return db as T;
    if (path === '/state' && options.method === 'PUT') {
      const next = JSON.parse(String(options.body));
      writeDemo(next);
      return next as T;
    }
    if (path === '/session' && options.method === 'DELETE') {
      db.user = null;
      writeDemo(db);
      return undefined as T;
    }
    throw new ApiError(404, 'Демонстрационный маршрут не найден');
  }
  const response = await fetch(`${env.VITE_API_URL || '/api'}${path}`, {
    ...options,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new ApiError(response.status, error?.message || 'Не удалось выполнить запрос');
  }
  return response.status === 204 ? (undefined as T) : response.json();
}
export const api = {
  load: () => request<DB>('/state'),
  save: (db: DB) => request<DB>('/state', { method: 'PUT', body: JSON.stringify(db) }),
};
