import { ApiError, httpRequest } from '../api';
import { getCSRF } from '../auth/api';
import type { Project } from '../types';
import type { Agent, AgentCleanup, AgentInput, AgentPage } from './contracts';

function validateAgent(agent: Agent): Agent {
  if (
    !agent ||
    typeof agent.id !== 'string' ||
    !agent.id ||
    typeof agent.name !== 'string' ||
    typeof agent.website !== 'string' ||
    typeof agent.description !== 'string' ||
    !Number.isSafeInteger(agent.revision) ||
    agent.revision < 1 ||
    !['draft', 'published', 'deleted'].includes(agent.status)
  ) {
    throw new ApiError(502, 'Сервер вернул некорректные данные проекта.');
  }
  return agent;
}

export function projectFromAgent(agent: Agent): Project {
  validateAgent(agent);
  return {
    id: agent.id,
    name: agent.name,
    url: agent.website,
    description: agent.description,
    revision: agent.revision,
    status: agent.status,
    publicId: agent.public_id,
    active: agent.status === 'published',
    progress: agent.status === 'published' ? 100 : agent.knowledge_revision > 0 ? 60 : 0,
  };
}

export const agentsApi = {
  async list(signal?: AbortSignal): Promise<Project[]> {
    const items = new Map<string, Project>();
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const query = new URLSearchParams({ limit: '100' });
      if (cursor) query.set('cursor', cursor);
      const page = await httpRequest<AgentPage>(`/v1/agents?${query}`, { signal });
      if (
        !page ||
        !Array.isArray(page.items) ||
        (page.next_cursor !== null && typeof page.next_cursor !== 'string')
      ) {
        throw new ApiError(502, 'Сервер вернул некорректный список проектов.');
      }
      for (const item of page.items) {
        const project = projectFromAgent(item);
        if (project.status !== 'deleted') items.set(project.id, project);
      }
      cursor = page.next_cursor;
      if (cursor !== null) {
        if (!cursor || seen.has(cursor))
          throw new ApiError(502, 'Не удалось загрузить следующие проекты. Повторите запрос.');
        seen.add(cursor);
      }
    } while (cursor !== null);
    return [...items.values()];
  },
  async get(id: string): Promise<Project> {
    return projectFromAgent(await httpRequest<Agent>(`/v1/agents/${encodeURIComponent(id)}`));
  },
  async save(input: AgentInput, key: string, project?: Project): Promise<Project> {
    if (project && !project.revision)
      throw new ApiError(412, 'Обновите данные проекта перед сохранением.');
    const csrf = await getCSRF();
    const headers: Record<string, string> = { 'X-CSRF-Token': csrf, 'Idempotency-Key': key };
    if (project) headers['If-Match'] = `"${project.revision}"`;
    const result = validateAgent(
      await httpRequest<Agent>(
        project ? `/v1/agents/${encodeURIComponent(project.id)}` : '/v1/agents',
        {
          method: project ? 'PATCH' : 'POST',
          headers,
          body: JSON.stringify(input),
        },
      ),
    );
    // An idempotency replay may contain an older snapshot. Read the current resource before showing it.
    return this.get(result.id);
  },
  async remove(id: string, key: string): Promise<AgentCleanup> {
    const csrf = await getCSRF();
    const job = await httpRequest<AgentCleanup>(`/v1/agents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': csrf, 'Idempotency-Key': key },
    });
    if (!job?.id || job.status !== 'pending')
      throw new ApiError(502, 'Сервер вернул некорректный статус удаления.');
    return job;
  },
};

export function projectErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Не удалось выполнить действие. Попробуйте ещё раз.';
  switch (error.status) {
    case 400:
      return 'Проверьте название и адрес сайта.';
    case 401:
      return 'Сессия истекла. Войдите снова.';
    case 403:
      return 'Недостаточно прав для работы с проектами или защищённая сессия недоступна.';
    case 404:
      return 'Проект удалён или недоступен.';
    case 409:
      return 'Данные запроса изменились. Обновите проект и повторите действие.';
    case 412:
      return 'Проект изменён в другом окне. Загрузите свежие данные перед сохранением.';
    default:
      return error.message;
  }
}
