import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

test.use({ baseURL: 'http://127.0.0.1:5176' });

// Implements the five routes from faq-bot-backend dev c69690b, including cookie rotation and CSRF.
async function authServer(page: Page) {
  const state = {
    signedIn: false,
    loginStatus: 200,
    logoutStatus: 204,
    sessionStatus: 200,
    userId: '00000000-0000-0000-0000-000000000001',
    accountId: '00000000-0000-0000-0000-000000000002',
    calls: [] as { path: string; body: unknown; csrf: string }[],
  };
  const session = () => ({
    identity: {
      user_id: state.userId,
      account_id: state.accountId,
      role: 'owner',
      audit_read: false,
    },
    expires_at: new Date(Date.now() + 8 * 3600000).toISOString(),
    csrf_token: 'authenticated-csrf',
  });
  await page.route('**/api/v1/auth/*', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.split('/').pop()!;
    const headers = request.headers();
    const csrf = headers['x-csrf-token'] || '';
    state.calls.push({ path, body: request.postDataJSON(), csrf });
    const reply = (status: number, body?: unknown, cookie?: string) =>
      route.fulfill({
        status,
        contentType: 'application/json',
        headers: cookie ? { 'Set-Cookie': cookie } : {},
        body: body === undefined ? undefined : JSON.stringify(body),
      });
    if (path === 'session') {
      if (state.sessionStatus !== 200)
        return reply(state.sessionStatus, { code: 'internal_error', message: 'Временная ошибка' });
      if (!state.signedIn || !headers.cookie?.includes('faqbot_session=authenticated'))
        return reply(401, { code: 'unauthorized', message: 'Сессия отсутствует' });
      return reply(200, session());
    }
    if (path === 'csrf')
      return reply(
        200,
        { csrf_token: state.signedIn ? 'authenticated-csrf' : 'pre-csrf' },
        `faqbot_session=${state.signedIn ? 'authenticated' : 'pre'}; Path=/; HttpOnly; SameSite=Lax`,
      );
    if (
      csrf !== (state.signedIn ? 'authenticated-csrf' : 'pre-csrf') ||
      !headers.cookie?.includes('faqbot_session=')
    )
      return reply(403, { code: 'forbidden', message: 'Некорректный CSRF' });
    if (path === 'logout') {
      if (state.logoutStatus !== 204)
        return reply(state.logoutStatus, { code: 'internal_error', message: 'Выход недоступен' });
      state.signedIn = false;
      return reply(204, undefined, 'faqbot_session=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax');
    }
    if (state.loginStatus !== 200)
      return reply(state.loginStatus, { code: 'unauthorized', message: 'Ошибка входа' });
    expect(Object.keys(request.postDataJSON()).sort()).toEqual(['email', 'password']);
    expect(headers.origin).toBe('http://127.0.0.1:5176');
    state.signedIn = true;
    return reply(
      path === 'register' ? 201 : 200,
      session(),
      'faqbot_session=authenticated; Path=/; HttpOnly; SameSite=Lax',
    );
  });
  return state;
}

async function login(page: Page) {
  await page.getByLabel('Электронная почта', { exact: true }).fill('real@example.com');
  await page.getByLabel('Пароль', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
}

test('cookie-вход, восстановление сессии, защищённый переход и выход', async ({
  page,
  context,
}) => {
  const api = await authServer(page);
  await page.goto('/#/app/inbox?project=north');
  await expect(page).toHaveURL(/#\/login$/);
  // A cached demo user cannot unlock the real cabinet.
  await page.evaluate(() =>
    localStorage.setItem(
      'faq-demo-v1',
      JSON.stringify({ user: { name: 'Fake', email: 'fake@example.com' } }),
    ),
  );
  await page.reload();
  await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeVisible();
  await login(page);
  await expect(page).toHaveURL(/#\/app\/inbox\?project=north$/);
  expect(api.calls.find((c) => c.path === 'login')?.csrf).toBe('pre-csrf');
  expect((await context.cookies()).find((c) => c.name === 'faqbot_session')?.httpOnly).toBe(true);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Вопросы без ответа' })).toBeVisible();
  const saved = await page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }));
  expect(saved).not.toContain('password123');
  expect(saved).not.toContain('authenticated-csrf');
  expect(saved).not.toContain('faqbot_session');
  await page.locator('.sidebar__profile').click();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/);
  expect(api.calls.find((c) => c.path === 'logout')?.csrf).toBe('authenticated-csrf');
  await page.goto('/#/app');
  await expect(page).toHaveURL(/#\/login$/);
});

test('ошибка credentials и rate limit остаются на форме, повтор работает', async ({ page }) => {
  const api = await authServer(page);
  api.loginStatus = 401;
  await page.goto('/#/login');
  await login(page);
  await expect(page.getByRole('alert')).toContainText('Проверьте почту и пароль');
  await expect(page.getByRole('button', { name: 'Войти', exact: true })).toBeEnabled();
  api.loginStatus = 429;
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Подождите минуту');
  api.loginStatus = 200;
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/#\/app$/);
});

test('регистрация отправляет только credentials и сохраняет имя локально', async ({ page }) => {
  const api = await authServer(page);
  await page.goto('/#/register');
  await page.getByLabel('Имя и фамилия').fill('Глеб Тестов');
  await page.getByLabel('Электронная почта', { exact: true }).fill('new@example.com');
  await page.getByLabel('Пароль', { exact: true }).fill('password123');
  await page.getByLabel('Повторите пароль').fill('different');
  await page.getByLabel('Я принимаю условия использования').check();
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('alert')).toContainText('не совпадают');
  expect(api.calls.filter((c) => c.path === 'register')).toHaveLength(0);
  await page.getByLabel('Повторите пароль').fill('password123');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Добрый день, Глеб' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Добрый день, Глеб' })).toBeVisible();
  expect(api.calls.filter((c) => c.path === 'register')).toHaveLength(1);
});

test('серверная ошибка при проверке сессии и выходе допускает повтор', async ({ page }) => {
  const api = await authServer(page);
  api.sessionStatus = 503;
  await page.goto('/#/app');
  await expect(page.getByRole('heading', { name: 'Не удалось проверить вход' })).toBeVisible();
  api.sessionStatus = 200;
  await page.getByRole('button', { name: 'Повторить', exact: true }).click();
  await login(page);
  await expect(page).toHaveURL(/#\/app$/);
  api.logoutStatus = 503;
  await page.locator('.sidebar__profile').click();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('временно недоступен');
  await expect(page).toHaveURL(/#\/app$/);
  api.logoutStatus = 204;
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/);
});

test('истёкшая сессия проверяется при возврате на вкладку и переходе между экранами', async ({
  page,
}) => {
  const api = await authServer(page);
  await page.goto('/#/login');
  await login(page);
  await expect(page).toHaveURL(/#\/app$/);
  api.signedIn = false;
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page).toHaveURL(/#\/login$/);
  await login(page);
  await expect(page).toHaveURL(/#\/app$/);
  api.signedIn = false;
  await page.goto('/#/app/statistics');
  await expect(page).toHaveURL(/#\/login$/);
});

test('локальные данные кабинетов разделены по компании, повреждённый кеш профиля не блокирует вход', async ({
  page,
}) => {
  const api = await authServer(page);
  await page.goto('/#/login');
  await page.evaluate(() =>
    localStorage.setItem('faq-profile-00000000-0000-0000-0000-000000000001', 'null'),
  );
  await login(page);
  await expect(page).toHaveURL(/#\/app$/);
  await page.getByRole('button', { name: 'Создать проект', exact: true }).click();
  await page.getByLabel('Название проекта').fill('Проект первой компании');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Создать проект', exact: true })
    .click();
  await page.goto('/#/app');
  await expect(page.getByText('Проект первой компании', { exact: true })).toBeVisible();
  await page.locator('.sidebar__profile').click();
  await page.getByRole('button', { name: 'Выйти', exact: true }).click();
  await expect(page).toHaveURL(/#\/login$/);
  api.userId = '00000000-0000-0000-0000-000000000003';
  api.accountId = '00000000-0000-0000-0000-000000000004';
  await login(page);
  await expect(page).toHaveURL(/#\/app$/);
  await expect(page.getByText('Проект первой компании', { exact: true })).toHaveCount(0);
});
