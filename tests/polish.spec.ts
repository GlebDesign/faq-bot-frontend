import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/login');
  await page.getByLabel('Электронная почта').fill('demo@example.com');
  await page.getByLabel('Пароль', { exact: true }).fill('demopassword');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/#\/app$/);
});

test('стилизованный период: мышь, клавиатура, Escape и мобильное меню', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/#/app/statistics');
  const period = page.getByRole('combobox', { name: 'Период статистики' });
  await expect(period).toHaveCSS('background-image', 'none');
  const initialScroll = await page.evaluate(() => scrollY);
  await period.click();
  await expect(page.getByRole('option', { name: 'Последние 30 дней' })).toBeVisible();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(initialScroll);
  await page.screenshot({
    path: 'artifacts/statistics-select-desktop.png',
    animations: 'disabled',
  });
  await page.getByRole('option', { name: 'Последние 7 дней' }).click();
  await expect(period).toContainText('Последние 7 дней');
  await expect(page.locator('.metrics')).toContainText('812');
  await period.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('option', { name: 'Последние 7 дней' })).toBeFocused();
  await page.keyboard.press('Home');
  await expect(page.getByRole('option', { name: 'Последние 30 дней' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(period).toContainText('Последние 30 дней');
  await period.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('listbox')).toBeHidden();
  await expect(period).toBeFocused();
  await page.setViewportSize({ width: 360, height: 800 });
  await period.click();
  const box = await page.getByRole('listbox').boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(360);
  await page.screenshot({ path: 'artifacts/statistics-select-mobile.png', animations: 'disabled' });
  await page.getByRole('option', { name: 'Последние 7 дней' }).click();
  await expect(period).toContainText('Последние 7 дней');
});

test('списки внутри модального окна видны и передают значения в заявку', async ({ page }) => {
  await page.goto('/#/app/support');
  await page.getByRole('button', { name: 'Создать заявку', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Тема заявки').fill('Проверка выбора');
  await dialog.getByRole('combobox', { name: 'Категория', exact: true }).click();
  await page.getByRole('option', { name: 'Партнёрское подключение', exact: true }).click();
  await dialog
    .getByLabel('Описание проблемы')
    .fill('Проверяем корректное сохранение категории и проекта.');
  await dialog.getByRole('combobox', { name: 'Проект (необязательно)', exact: true }).click();
  await page.getByRole('option', { name: 'North Studio', exact: true }).click();
  await dialog.getByRole('button', { name: 'Отправить заявку', exact: true }).click();
  await expect(page.locator('.support__details')).toContainText('Партнёрское подключение');
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('faq-demo-v1')!).tickets[0],
  );
  expect(saved.projectId).toBe('north');
  await page.getByRole('button', { name: 'Создать заявку', exact: true }).click();
  await dialog.getByLabel('Тема заявки').fill('Без проекта');
  await dialog.getByLabel('Описание проблемы').fill('Проверяем значение пустого проекта.');
  await dialog.getByRole('button', { name: 'Отправить заявку', exact: true }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('faq-demo-v1')!).tickets[0].projectId,
    ),
  ).toBe('');
});

test('оформление виджета сохраняется через новые списки', async ({ page }) => {
  await page.goto('/#/app/projects/acme/widget');
  await page.getByRole('combobox', { name: 'Шрифт', exact: true }).click();
  await page.getByRole('option', { name: 'Arial', exact: true }).click();
  await page.getByRole('combobox', { name: 'Положение', exact: true }).click();
  await page.getByRole('option', { name: 'Слева снизу', exact: true }).click();
  await page.getByRole('button', { name: 'Завершить настройку' }).click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: 'Шрифт', exact: true })).toHaveText('Arial');
  await expect(page.getByRole('combobox', { name: 'Положение', exact: true })).toHaveText(
    'Слева снизу',
  );
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('.page-heading')).toHaveCSS('animation-duration', '1e-05s');
});
