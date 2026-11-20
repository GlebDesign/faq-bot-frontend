import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, readDemo, writeDemo } from './api';
import type { DB, Project } from './types';
import type { User } from './types';
import { isDemoAuth, saveLocalProfile, useSession } from './auth/AuthProvider';
import { agentsApi, projectErrorMessage } from './api/agents';
import type { AgentInput } from './api/contracts';
export const usesProjectsAPI = !isDemoAuth && import.meta.env.VITE_AGENTS_MODE !== 'mock';
type Store = {
  db: DB;
  update: (fn: (draft: DB) => void) => boolean;
  toast: (message: string) => void;
  remoteProjects: boolean;
  projectsStatus: 'loading' | 'ready' | 'error';
  projectsError: string;
  loadProjects: () => Promise<void>;
  loadProject: (id: string) => Promise<Project>;
  saveProject: (input: AgentInput, key: string, project?: Project) => Promise<Project>;
  deleteProject: (id: string, key: string) => Promise<void>;
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
  const remoteProjects = usesProjectsAPI && !!user;
  const session = useSession();
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const [db, setDb] = useState<DB>(() => ({
    ...readDemo(storageKey),
    user,
    ...(remoteProjects ? { projects: [] } : {}),
  }));
  const dbRef = useRef(db);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [projectsStatus, setProjectsStatus] = useState<Store['projectsStatus']>(
    remoteProjects ? 'loading' : 'ready',
  );
  const [projectsError, setProjectsError] = useState('');
  const listRequest = useRef(0);
  const mutationVersion = useRef(0);
  const listController = useRef<AbortController | null>(null);
  const commit = useCallback((next: DB) => {
    dbRef.current = next;
    setDb(next);
  }, []);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    commit({ ...dbRef.current, user });
  }, [user, commit]);
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
    const next = structuredClone(dbRef.current);
    fn(next);
    if (remoteProjects) {
      // The other local demo flows may update setup progress, but server-owned metadata stays authoritative.
      next.projects = dbRef.current.projects.map((project) => ({
        ...project,
        progress:
          next.projects.find((item) => item.id === project.id)?.progress ?? project.progress,
      }));
    }
    try {
      writeDemo(next, storageKey);
    } catch {
      toast('Память браузера заполнена. Уменьшите размер вложений.');
      return false;
    }
    commit(next);
    if (!isDemoAuth && next.user) saveLocalProfile(next.user);
    return true;
  };
  const checkSession = (error: unknown) => {
    if (mounted.current && error instanceof ApiError && error.status === 401)
      sessionRef.current.retry();
  };
  const upsertProject = useCallback(
    (project: Project) => {
      const current = dbRef.current;
      const previous = current.projects.find((item) => item.id === project.id);
      const next = { ...project, progress: Math.max(project.progress, previous?.progress || 0) };
      commit({
        ...current,
        projects: previous
          ? current.projects.map((item) => (item.id === project.id ? next : item))
          : [next, ...current.projects],
      });
    },
    [commit],
  );
  const loadProjects = useCallback(async () => {
    if (!remoteProjects) return;
    const request = ++listRequest.current;
    const version = mutationVersion.current;
    listController.current?.abort();
    const controller = new AbortController();
    listController.current = controller;
    setProjectsStatus('loading');
    setProjectsError('');
    try {
      const projects = await agentsApi.list(controller.signal);
      if (controller.signal.aborted || request !== listRequest.current) return;
      if (version === mutationVersion.current) commit({ ...dbRef.current, projects });
      setProjectsStatus('ready');
    } catch (error) {
      if (controller.signal.aborted || request !== listRequest.current) return;
      if (version !== mutationVersion.current) {
        setProjectsStatus('ready');
        return;
      }
      setProjectsError(projectErrorMessage(error));
      setProjectsStatus('error');
      checkSession(error);
    }
  }, [remoteProjects, commit]);
  useEffect(() => {
    void loadProjects();
    return () => {
      listRequest.current++;
      listController.current?.abort();
    };
  }, [loadProjects]);
  const loadProject = useCallback(
    async (id: string) => {
      if (!remoteProjects) {
        const project = dbRef.current.projects.find((item) => item.id === id);
        if (!project) throw new ApiError(404, 'Проект не найден');
        return project;
      }
      try {
        const project = await agentsApi.get(id);
        upsertProject(project);
        return project;
      } catch (error) {
        if (error instanceof ApiError && error.status === 404)
          commit({
            ...dbRef.current,
            projects: dbRef.current.projects.filter((item) => item.id !== id),
          });
        checkSession(error);
        throw error;
      }
    },
    [remoteProjects, upsertProject, commit],
  );
  const saveProject: Store['saveProject'] = async (input, key, project) => {
    mutationVersion.current++;
    if (remoteProjects) {
      try {
        const result = await agentsApi.save(input, key, project);
        if (!mounted.current)
          throw new ApiError(409, 'Сессия изменилась. Повторите действие в текущем аккаунте.');
        upsertProject(result);
        return result;
      } catch (error) {
        checkSession(error);
        throw error;
      }
    }
    const next: Project = {
      ...project,
      id: project?.id || crypto.randomUUID(),
      name: input.name,
      url: input.website.replace(/^https?:\/\//, ''),
      description: input.description,
      active: project?.active || false,
      progress: project?.progress || 0,
    };
    if (
      !update((draft) => {
        draft.projects = project
          ? draft.projects.map((item) => (item.id === project.id ? next : item))
          : [...draft.projects, next];
      })
    ) {
      throw new ApiError(0, 'Не удалось сохранить проект в браузере.');
    }
    return next;
  };
  const deleteProject: Store['deleteProject'] = async (id, key) => {
    mutationVersion.current++;
    if (remoteProjects) {
      try {
        await agentsApi.remove(id, key);
        if (!mounted.current)
          throw new ApiError(409, 'Сессия изменилась. Повторите действие в текущем аккаунте.');
      } catch (error) {
        checkSession(error);
        throw error;
      }
    }
    const next = structuredClone(dbRef.current);
    next.projects = next.projects.filter((item) => item.id !== id);
    next.documents = next.documents.filter((item) => item.projectId !== id);
    next.conversations = next.conversations.filter((item) => item.projectId !== id);
    delete next.widgets[id];
    if (!remoteProjects) {
      try {
        writeDemo(next, storageKey);
      } catch {
        throw new ApiError(0, 'Не удалось удалить проект из браузера.');
      }
    }
    commit(next);
  };
  return (
    <Context.Provider
      value={{
        db,
        update,
        toast,
        remoteProjects,
        projectsStatus,
        projectsError,
        loadProjects,
        loadProject,
        saveProject,
        deleteProject,
      }}
    >
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
