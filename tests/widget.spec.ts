import { test, expect } from '@playwright/test';
import { createServer } from 'node:http';
test('изолированный loader на стороннем origin и заявка посетителя', async ({ page, baseURL }) => {
  const server = createServer((_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(
      `<!doctype html><html lang="ru"><title>Внешний сайт</title><body><h1>Сайт клиента</h1><script src="${baseURL}/loader.js" data-agent="acme" defer></script></body></html>`,
    );
  });
  await new Promise<void>((resolve) => server.listen(5180, '127.0.0.1', resolve));
  try {
    await page.goto('http://127.0.0.1:5180');
    await page.getByRole('button', { name: 'Открыть FAQ-бот' }).click();
    const widget = page.frameLocator('iframe[title="FAQ-бот"]');
    await expect(widget.getByText('Здравствуйте! Чем могу помочь?')).toBeVisible();
    await page.evaluate(() => window.postMessage({ type: 'faq:close', agent: 'acme' }, '*'));
    await expect(page.locator('iframe')).toBeVisible();
    await widget
      .getByRole('textbox', { name: 'Сообщение в виджете' })
      .fill('Как связаться с менеджером?');
    await widget.getByRole('button', { name: 'Отправить сообщение' }).click();
    await widget.getByRole('button', { name: 'Связаться со специалистом' }).click();
    await widget.getByLabel('Ваше имя').fill('Иван');
    await widget.getByLabel('Почта для связи').fill('visitor@example.com');
    await widget.getByRole('button', { name: 'Оставить заявку' }).click();
    await expect(widget.getByText('Заявка передана компании. Мы свяжемся с вами.')).toBeVisible();
    await widget.getByRole('button', { name: 'Закрыть виджет' }).click();
    await expect(page.locator('iframe')).toBeHidden();
  } finally {
    server.close();
  }
});
