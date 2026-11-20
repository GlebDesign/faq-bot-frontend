import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { mkdir, writeFile, unlink } from 'node:fs/promises';

const origin = 'http://127.0.0.1:5177';
test.use({ baseURL: origin });
test.beforeEach(async ({ page }) => {
  await page.goto('/#/register');
  await page.getByLabel('Имя и фамилия').fill('Глеб API');
  await page
    .getByLabel('Электронная почта', { exact: true })
    .fill(`api-${crypto.randomUUID()}@example.com`);
  await page.getByLabel('Пароль', { exact: true }).fill('test-password');
  await page.getByLabel('Повторите пароль').fill('test-password');
  await page.getByLabel('Я принимаю условия использования').check();
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Добрый день, Глеб' })).toBeVisible();
});

async function openCreate(page: Page) {
  await expect(page.locator('.topbar__create-project')).toBeEnabled();
  await page.locator('.topbar__create-project').click();
  return page.getByRole('dialog');
}
async function createProject(page: Page, name: string) {
  const dialog = await openCreate(page);
  await dialog.getByLabel('Название проекта').fill(name);
  await dialog.getByLabel('Адрес сайта (необязательно)').fill('https://client.example.com');
  await dialog.getByRole('button', { name: 'Создать проект', exact: true }).click();
  await expect(page).toHaveURL(/\/projects\/[^/]+\/sources$/);
  return new URL(page.url()).hash.split('/')[3];
}
async function mutate(
  page: Page,
  method: 'POST' | 'PATCH' | 'DELETE',
  path: string,
  data?: unknown,
  key = crypto.randomUUID(),
  revision?: number,
) {
  const csrf = await (await page.request.get('/api/v1/auth/csrf')).json();
  return page.request.fetch(`/api/v1${path}`, {
    method,
    data,
    headers: {
      Origin: origin,
      'X-CSRF-Token': csrf.csrf_token,
      'Idempotency-Key': key,
      ...(revision ? { 'If-Match': `"${revision}"` } : {}),
    },
  });
}

test('HTTP-проекты: создание, перезагрузка, прямой переход, редактирование и удаление', async ({
  page,
}) => {
  const id = await createProject(page, 'Сайт клиента');
  await page.goto('/#/app');
  await expect(
    page.locator('.project-list').getByRole('heading', { name: 'Сайт клиента', exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.locator('.project-list').getByRole('heading', { name: 'Сайт клиента', exact: true }),
  ).toBeVisible();
  await page.goto(`/#/app/projects/${id}`);
  await expect(page.getByRole('heading', { name: 'Обзор проекта' })).toBeVisible();
  await page.goto('/#/app');
  await page.getByRole('button', { name: 'Действия Сайт клиента', exact: true }).click();
  await page.getByRole('button', { name: 'Изменить', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название проекта').fill('Обновлённый сайт');
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(
    page.locator('.project-list').getByRole('heading', { name: 'Обновлённый сайт', exact: true }),
  ).toBeVisible();
  const saved = await (await page.request.get(`/api/v1/agents/${id}`)).json();
  expect(saved.website).toBe('https://client.example.com');
  expect(saved.revision).toBe(2);
  await page.getByRole('button', { name: 'Действия Обновлённый сайт', exact: true }).click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Создайте первый проект' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Очистка данных запрошена');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Создайте первый проект' })).toBeVisible();
  expect((await page.request.get(`/api/v1/agents/${id}`)).status()).toBe(404);
});

test('потерянный ответ POST повторяется с тем же ключом и создаёт ровно один проект', async ({
  page,
}) => {
  let drop = true;
  const keys: string[] = [];
  await page.route('**/api/v1/agents', async (route) => {
    if (route.request().method() !== 'POST') return route.continue();
    keys.push(route.request().headers()['idempotency-key']);
    if (drop) {
      drop = false;
      await route.fetch();
      await route.abort('failed');
    } else await route.continue();
  });
  const dialog = await openCreate(page);
  await dialog.getByLabel('Название проекта').fill('Повтор без дубликатов');
  await dialog.getByRole('button', { name: 'Создать проект', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Не удалось связаться с сервером');
  await expect(dialog.getByLabel('Название проекта')).toHaveValue('Повтор без дубликатов');
  await dialog.getByRole('button', { name: 'Создать проект', exact: true }).click();
  await expect(page).toHaveURL(/\/sources$/);
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
  const list = await (await page.request.get('/api/v1/agents')).json();
  expect(list.items).toHaveLength(1);
});

test('412 сохраняет черновик формы и требует загрузить свежую версию', async ({ page }) => {
  const id = await createProject(page, 'Исходное название');
  await page.goto('/#/app');
  await page.getByRole('button', { name: 'Действия Исходное название', exact: true }).click();
  await page.getByRole('button', { name: 'Изменить', exact: true }).click();
  const external = await mutate(
    page,
    'PATCH',
    `/agents/${id}`,
    { name: 'Из другого окна', website: '', description: 'Описание с сервера' },
    undefined,
    1,
  );
  expect(external.status()).toBe(200);
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Название проекта').fill('Мой черновик');
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Проект изменён в другом окне');
  await expect(dialog.getByLabel('Название проекта')).toHaveValue('Мой черновик');
  await expect(dialog.getByRole('button', { name: 'Сохранить', exact: true })).toBeDisabled();
  await dialog.getByRole('button', { name: 'Загрузить свежие данные' }).click();
  await expect(dialog.getByLabel('Название проекта')).toHaveValue('Из другого окна');
  await dialog.getByLabel('Название проекта').fill('Согласованное название');
  await dialog.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(dialog).toBeHidden();
  const saved = await (await page.request.get(`/api/v1/agents/${id}`)).json();
  expect(saved.revision).toBe(3);
  expect(saved.description).toBe('Описание с сервера');
});

test('ошибка списка показывает повтор, ошибка DELETE оставляет проект доступным', async ({
  page,
}) => {
  const id = await createProject(page, 'Надёжное удаление');
  let failList = true;
  await page.route('**/api/v1/agents?*', async (route) => {
    if (failList)
      await route.fulfill({
        status: 500,
        json: { code: 'internal_error', message: 'Временная ошибка списка' },
      });
    else await route.continue();
  });
  await page.goto('/#/app');
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Не удалось загрузить проекты' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Создайте первый проект' })).toHaveCount(0);
  failList = false;
  await page.getByRole('button', { name: 'Повторить загрузку' }).click();
  await page.getByRole('button', { name: 'Действия Надёжное удаление', exact: true }).click();
  await page.getByRole('button', { name: 'Удалить', exact: true }).click();
  let failDelete = true;
  const keys: string[] = [];
  await page.route(`**/api/v1/agents/${id}`, async (route) => {
    if (route.request().method() !== 'DELETE') return route.continue();
    keys.push(route.request().headers()['idempotency-key']);
    if (failDelete)
      await route.fulfill({
        status: 500,
        json: { code: 'internal_error', message: 'Временная ошибка удаления' },
      });
    else await route.continue();
  });
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(dialog.getByRole('alert')).toContainText('Временная ошибка удаления');
  expect((await page.request.get(`/api/v1/agents/${id}`)).status()).toBe(200);
  failDelete = false;
  await dialog.getByRole('button', { name: 'Удалить', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect(keys).toHaveLength(2);
  expect(keys[0]).toBe(keys[1]);
});

test('mock HTTP соблюдает scope, CSRF, revisions, cursor и idempotency replay', async ({
  page,
  playwright,
}) => {
  const input = { name: 'Контракт', website: '', description: '' };
  const key = crypto.randomUUID();
  const created = await mutate(page, 'POST', '/agents', input, key);
  expect(created.status()).toBe(201);
  const agent = await created.json();
  expect(created.headers().etag).toBe('"1"');
  const replay = await mutate(page, 'POST', '/agents', input, key);
  expect((await replay.json()).id).toBe(agent.id);
  expect(
    (await mutate(page, 'POST', '/agents', { ...input, name: 'Другой payload' }, key)).status(),
  ).toBe(409);
  const noCSRF = await page.request.post('/api/v1/agents', {
    data: input,
    headers: { Origin: origin, 'Idempotency-Key': crypto.randomUUID() },
  });
  expect(noCSRF.status()).toBe(403);
  expect((await mutate(page, 'PATCH', `/agents/${agent.id}`, input, undefined, 2)).status()).toBe(
    412,
  );
  expect(
    (await mutate(page, 'POST', '/agents', { ...input, account_id: 'foreign' })).status(),
  ).toBe(400);
  await mutate(page, 'POST', '/agents', { ...input, name: 'Второй' });
  const first = await (await page.request.get('/api/v1/agents?limit=1')).json();
  const second = await (
    await page.request.get(`/api/v1/agents?limit=1&cursor=${encodeURIComponent(first.next_cursor)}`)
  ).json();
  expect(first.items).toHaveLength(1);
  expect(second.items).toHaveLength(1);
  expect(first.items[0].id).not.toBe(second.items[0].id);
  expect(second.next_cursor).toBeNull();
  const other = await playwright.request.newContext({ baseURL: origin });
  try {
    const csrf = await (await other.get('/api/v1/auth/csrf')).json();
    const registration = await other.post('/api/v1/auth/register', {
      data: { email: `other-${crypto.randomUUID()}@example.com`, password: 'test-password' },
      headers: { Origin: origin, 'X-CSRF-Token': csrf.csrf_token },
    });
    expect(registration.status()).toBe(201);
    expect((await other.get(`/api/v1/agents/${agent.id}`)).status()).toBe(404);
    expect((await (await other.get('/api/v1/agents')).json()).items).toEqual([]);
  } finally {
    await other.dispose();
  }
  const deleteKey = crypto.randomUUID();
  const deletion = await mutate(page, 'DELETE', `/agents/${agent.id}`, undefined, deleteKey);
  expect(deletion.status()).toBe(202);
  const job = await deletion.json();
  expect(job.status).toBe('pending');
  expect(
    (await (await mutate(page, 'DELETE', `/agents/${agent.id}`, undefined, deleteKey)).json()).id,
  ).toBe(job.id);
  expect((await page.request.get(`/api/v1/agents/${agent.id}`)).status()).toBe(404);
  // A replay returns the historic response and does not restore the deleted agent.
  expect((await (await mutate(page, 'POST', '/agents', input, key)).json()).id).toBe(agent.id);
  expect((await page.request.get(`/api/v1/agents/${agent.id}`)).status()).toBe(404);
});

test('создание и редактирование проекта на телефоне', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await createProject(page, 'Мобильный проект');
  await page.goto('/#/app');
  await page.getByRole('button', { name: 'Действия Мобильный проект', exact: true }).click();
  await page.getByRole('button', { name: 'Изменить', exact: true }).click();
  await page.getByLabel('Название проекта').fill('Мобильная версия');
  await page.getByRole('button', { name: 'Сохранить', exact: true }).click();
  await expect(
    page.locator('.project-list').getByRole('heading', { name: 'Мобильная версия', exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Vite не раздаёт файлы состояния mock API', async ({ page }) => {
  const name = `test-private-${crypto.randomUUID()}.json`;
  const path = `.mock-data/${name}`;
  const marker = `private-${crypto.randomUUID()}`;
  await mkdir('.mock-data', { recursive: true });
  await writeFile(path, JSON.stringify({ marker }));
  try {
    const response = await page.request.get(`/${path}`);
    expect([403, 404]).toContain(response.status());
    expect(await response.text()).not.toContain(marker);
  } finally {
    await unlink(path);
  }
});
