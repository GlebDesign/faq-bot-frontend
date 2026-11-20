import { test, expect } from '@playwright/test';
test('регистрация, новый проект, знания, проверка и публикация', async ({ page }) => {
  await page.goto('/#/register');
  await page.getByLabel('Имя и фамилия').fill('Глеб Тестов');
  await page.getByLabel('Электронная почта').fill('gleb@example.com');
  await page.getByLabel('Пароль', { exact: true }).fill('test-password');
  await page.getByLabel('Повторите пароль').fill('wrong');
  await page.getByLabel('Я принимаю условия использования').check();
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('alert')).toContainText('не совпадают');
  await page.getByLabel('Повторите пароль').fill('test-password');
  await page.getByRole('button', { name: 'Создать аккаунт' }).click();
  await expect(page.getByRole('heading', { name: 'Добрый день, Глеб' })).toBeVisible();
  await page.getByRole('button', { name: 'Создать проект', exact: true }).click();
  await page.getByLabel('Название проекта').fill('Тестовый проект');
  await page.getByLabel('Адрес сайта (необязательно)').fill('https://example.com');
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Создать проект', exact: true })
    .click();
  await page.getByRole('button', { name: /Добавить текст/ }).click();
  await page.getByLabel('Название материала').fill('Условия возврата');
  await page.getByLabel('Содержание').fill('Товар можно вернуть в течение 14 дней.');
  await page.getByRole('button', { name: 'Загрузить', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Материалы обработаны' })).toBeVisible();
  await page.getByRole('link', { name: 'Перейти к проверке', exact: true }).click();
  await page.getByRole('textbox', { name: 'Тестовый вопрос' }).fill('Какие сроки доставки?');
  await page.getByRole('button', { name: 'Отправить', exact: true }).click();
  await expect(
    page.getByText('Доставка по России занимает от 3 до 7 рабочих дней.', { exact: false }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Автопроверка', exact: true }).click();
  await page.getByRole('button', { name: 'Запустить проверку' }).click();
  await expect(page.getByRole('heading', { name: '8,4 / 10' })).toBeVisible();
  await page.getByRole('link', { name: 'Перейти к виджету', exact: true }).click();
  await page.getByLabel('Название бота').fill('Помощник Глеба');
  await expect(page.locator('.widget__header')).toContainText('Помощник Глеба');
  await page.getByRole('button', { name: 'Завершить настройку' }).click();
  await page.reload();
  await expect(page.getByLabel('Название бота')).toHaveValue('Помощник Глеба');
});
test('ответ в выбранном диалоге сохраняется после перезагрузки', async ({ page }) => {
  await page.goto('/#/login');
  await page.getByLabel('Электронная почта').fill('demo@example.com');
  await page.getByLabel('Пароль', { exact: true }).fill('demopassword');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/#\/app$/);
  await page.goto('/#/app/inbox');
  await page
    .getByRole('textbox', { name: 'Ответ пользователю' })
    .fill('Мы свяжемся с вами сегодня.');
  await page.getByRole('button', { name: 'Отправить', exact: true }).click();
  await expect(page.locator('.conversation--inbox')).toContainText('Мы свяжемся с вами сегодня.');
  await expect(page.locator('.inbox__header')).toContainText('Отвечено');
  await page.waitForTimeout(300);
  await page.reload();
  await page.getByRole('button', { name: 'Все', exact: true }).click();
  await page.locator('.inbox__dialog').first().click();
  await expect(page.locator('.conversation--inbox')).toContainText('Мы свяжемся с вами сегодня.');
});
test('все экраны без ошибок и горизонтального переполнения на desktop и mobile', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/#/login');
  await page.getByLabel('Электронная почта').fill('demo@example.com');
  await page.getByLabel('Пароль', { exact: true }).fill('demopassword');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/#\/app$/);
  const routes = [
    '/app',
    '/app/projects/acme',
    '/app/projects/acme/materials',
    '/app/projects/acme/sources',
    '/app/projects/acme/test',
    '/app/projects/acme/auto-check',
    '/app/projects/acme/widget',
    '/app/projects/acme/analytics',
    '/app/statistics',
    '/app/inbox',
    '/app/tokens',
    '/app/support',
    '/app/settings',
    '/app/partner',
    '/app/audit',
  ];
  for (const width of [1440, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of routes) {
      await page.goto('/#' + route);
      await expect(page.locator('h1')).toBeVisible();
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), {
          message: `overflow ${width} ${route}`,
        })
        .toBe(true);
    }
  }
  await expect(errors).toEqual([]);
});
test('мобильный выбор диалога, возврат к списку и меню', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/login');
  await page.getByLabel('Электронная почта').fill('demo@example.com');
  await page.getByLabel('Пароль', { exact: true }).fill('demopassword');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/#\/app$/);
  await page.getByRole('button', { name: 'Открыть меню' }).click();
  await page.getByRole('link', { name: 'Общая статистика', exact: true }).click();
  await expect(page.locator('h1')).toHaveText('Общая статистика');
  await page.goto('/#/app/inbox');
  await page.locator('.inbox__dialog').first().click();
  await expect(page.getByRole('textbox', { name: 'Ответ пользователю' })).toBeVisible();
  await page.getByRole('button', { name: 'Назад к диалогам' }).click();
  await expect(page.getByRole('heading', { name: 'Диалоги' })).toBeVisible();
});
