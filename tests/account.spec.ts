import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/#/login');
  await page.getByLabel('Электронная почта').fill('demo@example.com');
  await page.getByLabel('Пароль', { exact: true }).fill('demopassword');
  await page.getByRole('button', { name: 'Войти', exact: true }).click();
  await expect(page).toHaveURL(/#\/app$/);
});

test('профиль: фото, отмена, сохранение, уведомления и запрос смены пароля', async ({ page }) => {
  await page.getByRole('link', { name: 'Настройки аккаунта', exact: true }).click();
  const originalEmail = await page.getByLabel('Электронная почта', { exact: true }).inputValue();
  await page.getByLabel('Имя и фамилия').fill('Не сохранять');
  await page.getByRole('switch', { name: 'Ответы поддержки' }).click();
  await page.getByRole('button', { name: 'Отмена', exact: true }).click();
  await expect(page.getByLabel('Имя и фамилия')).toHaveValue('Алексей Петров');
  await expect(page.getByRole('switch', { name: 'Ответы поддержки' })).not.toBeChecked();
  await page
    .getByLabel('Фото профиля')
    .setInputFiles({ name: 'wrong.txt', mimeType: 'text/plain', buffer: Buffer.from('text') });
  await expect(page.getByRole('alert')).toContainText('JPG или PNG');
  await page.getByLabel('Фото профиля').setInputFiles({
    name: 'avatar.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/f9sAAAAASUVORK5CYII=',
      'base64',
    ),
  });
  await expect(page.locator('.profile__photo img')).toHaveAttribute('src', /^data:image\/png/);
  await page.getByLabel('Имя и фамилия').fill('Глеб Тестов');
  await page.getByLabel('Электронная почта', { exact: true }).fill('updated@example.com');
  await page.getByRole('switch', { name: 'Ответы поддержки' }).click();
  await page.getByRole('switch', { name: 'Вопросы без ответа' }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('button', { name: 'Сохранить изменения' }).click();
  await expect(page.getByRole('status')).toContainText('Настройки сохранены');
  await page.reload();
  await expect(page.getByLabel('Имя и фамилия')).toHaveValue('Глеб Тестов');
  await expect(page.getByLabel('Электронная почта', { exact: true })).toHaveValue(
    'updated@example.com',
  );
  await expect(page.getByRole('switch', { name: 'Ответы поддержки' })).toBeChecked();
  await expect(page.getByRole('switch', { name: 'Вопросы без ответа' })).not.toBeChecked();
  await expect(page.locator('.topbar__avatar img')).toHaveAttribute('src', /^data:image\/png/);
  await page.getByRole('button', { name: 'Сменить пароль', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('updated@example.com');
  await expect(dialog).not.toContainText(originalEmail);
  await expect(dialog.locator('input[type=password]')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'Запросить письмо' }).click();
  await expect(page.getByRole('status')).toContainText('Письмо не отправлено');
});

test('пакеты и оплата: клавиатура, отмена и единый баланс после демо-пополнения', async ({
  page,
}) => {
  await page.goto('/#/app/tokens');
  const packages = page.getByRole('radiogroup', { name: 'Пакет токенов' });
  await expect(packages.getByRole('radio').nth(1)).toBeChecked();
  await packages.getByRole('radio').nth(1).focus();
  await page.keyboard.press('ArrowRight');
  await expect(packages.getByRole('radio').nth(2)).toBeChecked();
  await expect(page.locator('.payment__summary')).toContainText('Для команды');
  await expect(page.locator('.payment__total')).toContainText('2 490');
  await page.getByRole('radio', { name: 'СБП', exact: true }).click();
  await page.getByRole('button', { name: 'Перейти к оплате' }).click();
  await expect(page.getByRole('dialog')).toContainText('Реальный платёж не производится');
  await page.getByRole('dialog').getByRole('button', { name: 'Отмена' }).click();
  await expect(page.getByRole('link', { name: 'Баланс токенов' })).toContainText('24 800');
  await page.getByRole('button', { name: 'Перейти к оплате' }).click();
  await page.getByRole('button', { name: 'Начислить тестовые токены' }).click();
  await expect(page.getByRole('link', { name: 'Баланс токенов' })).toContainText('124 800');
  await expect(page.locator('.payment-history__table tbody tr').first()).toContainText(
    'Для команды',
  );
  await expect(page.locator('.payment-history__table tbody tr').first()).toContainText('Демо');
  await page.reload();
  await expect(page.locator('.tokens__balance-value')).toContainText('124 800');
  await expect(page.locator('.payment-history__table tbody tr')).toHaveCount(3);
});

test('поддержка: поиск, фильтры, история, новая заявка и возврат на мобильном', async ({
  page,
}) => {
  await page.goto('/#/app/support');
  await expect(page.locator('.support__details')).toContainText('Ответ поддержки');
  await page.getByRole('button', { name: 'Закрытые', exact: true }).click();
  await expect(page.locator('.support__ticket')).toHaveCount(1);
  await expect(page.locator('.support__details')).toContainText('Заявка решена');
  await page.getByRole('button', { name: 'Все', exact: true }).click();
  await page.getByRole('textbox', { name: 'Поиск по заявкам' }).fill('North Studio');
  await expect(page.locator('.support__ticket')).toHaveCount(1);
  await expect(page.locator('.support__details h2')).toHaveText('Вопрос по API');
  await page.getByRole('textbox', { name: 'Поиск по заявкам' }).fill('ничего-не-найдено');
  await expect(page.getByRole('heading', { name: 'Ничего не найдено' })).toBeVisible();
  await expect(page.locator('.support__details')).not.toContainText('Вопрос по API');
  await page.getByRole('button', { name: 'Создать заявку', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Тема заявки').fill('Новая интеграция');
  await dialog.getByLabel('Описание проблемы').fill('Нужна помощь с установкой на сайте.');
  await dialog.getByRole('combobox', { name: 'Категория', exact: true }).click();
  await page.getByRole('option', { name: 'Партнёрское подключение', exact: true }).click();
  await dialog.getByRole('combobox', { name: 'Проект (необязательно)', exact: true }).click();
  await page.getByRole('option', { name: 'North Studio', exact: true }).click();
  await dialog
    .getByLabel('Вложение (до 25 МБ)')
    .setInputFiles({ name: 'details.txt', mimeType: 'text/plain', buffer: Buffer.from('Details') });
  await dialog.getByRole('button', { name: 'Отправить заявку' }).click();
  await expect(page.locator('.support__details')).toContainText('Новая интеграция');
  await expect(page.locator('.support__details')).toContainText('Партнёрское подключение');
  await expect(page.locator('.support__details')).toContainText('details.txt');
  await expect(page.locator('.support__details .ticket-status')).toHaveText('Новая');
  await page.reload();
  await expect(page.locator('.support__details')).toContainText('Новая интеграция');
  await page.setViewportSize({ width: 360, height: 800 });
  await expect(page.locator('.support__list')).toBeVisible();
  await page.locator('.support__ticket').first().click();
  await expect(page.locator('.support__list')).toBeHidden();
  await expect(page.locator('.support__details')).toBeVisible();
  await page.getByRole('button', { name: 'К заявкам' }).click();
  await expect(page.locator('.support__list')).toBeVisible();
});

test('новые экраны: desktop, tablet, mobile, изображения и отсутствие переполнения', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  for (const width of [1440, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['settings', 'tokens', 'support']) {
      await page.goto(`/#/app/${route}`);
      await expect(page.locator('h1')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await page.mouse.move(0, 0);
      if (route === 'support') {
        const search = await page.getByRole('textbox', { name: 'Поиск по заявкам' }).boundingBox();
        expect(search!.height).toBeLessThanOrEqual(48);
      }
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), {
          message: `${route} at ${width}px`,
        })
        .toBe(true);
      if (width === 1440 || width === 390) {
        await page.screenshot({
          path: `artifacts/${route}-${width}.png`,
          fullPage: true,
          animations: 'disabled',
        });
      }
    }
  }
  await page.goto('/#/app/settings');
  await expect
    .poll(() =>
      page
        .locator('.profile__photo img')
        .evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0),
    )
    .toBe(true);
  await expect(page.locator('.profile__photo img')).toHaveCSS('object-fit', 'cover');
  expect(errors).toEqual([]);
});

test('сохранённые до обновления профиль, заявки и баланс остаются доступны', async ({ page }) => {
  await page.evaluate(() => {
    const db = JSON.parse(localStorage.getItem('faq-demo-v1')!);
    delete db.accountScreensVersion;
    db.balance = 777;
    db.user = { name: 'Старый профиль', email: 'legacy@example.com' };
    db.tickets = [
      {
        id: 'old-ticket',
        title: 'Старое обращение',
        category: 'Другой вопрос',
        description: 'Сохранённое описание',
        projectId: '',
        status: 'Закрыта',
        created: '01.10.2026',
      },
    ];
    db.transactions = [
      { id: 'old-transaction', text: 'Старое пополнение', amount: 100, date: '01.10.2026' },
    ];
    localStorage.setItem('faq-demo-v1', JSON.stringify(db));
  });
  await page.goto('/#/app/support');
  await page.reload();
  await expect(page.locator('.support__ticket')).toHaveCount(1);
  await expect(page.locator('.support__details')).toContainText('Старое обращение');
  await expect(page.locator('.ticket-timeline')).toContainText('Заявка создана');
  await page.goto('/#/app/tokens');
  await expect(page.locator('.tokens__balance-value')).toContainText('777');
  await expect(page.locator('.payment-history__table')).toContainText('Старое пополнение');
  await page.goto('/#/app/settings');
  await expect(page.getByLabel('Имя и фамилия')).toHaveValue('Старый профиль');
});
