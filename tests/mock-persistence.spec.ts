import { test, expect } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

async function startServer(dataFile: string) {
  const child = spawn(process.execPath, ['mock/server.mjs'], {
    env: {
      ...process.env,
      MOCK_API_PORT: '0',
      MOCK_AUTH_ORIGIN: 'http://127.0.0.1:5177',
      MOCK_DATA_FILE: dataFile,
      MOCK_API_EPHEMERAL: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  const url = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error('Mock API did not start'));
    }, 10000);
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`Mock API exited before readiness: ${code}`));
    });
    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
      const match = /Mock API: (http:\/\/[^\s]+)/.exec(output);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
  });
  return {
    url,
    stop: () =>
      new Promise<void>((resolve) => {
        if (child.exitCode !== null) {
          resolve();
          return;
        }
        child.once('exit', () => resolve());
        child.kill('SIGTERM');
      }),
  };
}

test('mock API сохраняет сессию, проекты, cursor и replay после перезапуска', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'faq-mock-persistence-'));
  const file = join(directory, 'state.json');
  let server: Awaited<ReturnType<typeof startServer>> | undefined;
  try {
    server = await startServer(file);
    const csrfResponse = await fetch(`${server.url}/api/v1/auth/csrf`);
    const preliminaryCookie = csrfResponse.headers.getSetCookie()[0].split(';')[0];
    const preliminary = await csrfResponse.json();
    const password = 'persistence-password-unique';
    const signup = await fetch(`${server.url}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        Origin: 'http://127.0.0.1:5177',
        Cookie: preliminaryCookie,
        'X-CSRF-Token': preliminary.csrf_token,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'persistence@example.com', password }),
    });
    expect(signup.status).toBe(201);
    const cookie = signup.headers.getSetCookie()[0].split(';')[0];
    const session = await signup.json();
    const headers = {
      Origin: 'http://127.0.0.1:5177',
      Cookie: cookie,
      'X-CSRF-Token': session.csrf_token,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'persistence-key',
    };
    const payload = JSON.stringify({ name: 'Сохранённый проект', website: '', description: '' });
    const created = await fetch(`${server.url}/api/v1/agents`, {
      method: 'POST',
      headers,
      body: payload,
    });
    expect(created.status).toBe(201);
    const project = await created.json();
    const second = await fetch(`${server.url}/api/v1/agents`, {
      method: 'POST',
      headers: { ...headers, 'Idempotency-Key': 'another-key' },
      body: payload,
    });
    expect(second.status).toBe(201);
    const firstPage = await (
      await fetch(`${server.url}/api/v1/agents?limit=1`, { headers: { Cookie: cookie } })
    ).json();
    await server.stop();
    server = undefined;
    expect(await readFile(file, 'utf8')).not.toContain(password);
    server = await startServer(file);
    const restored = await fetch(`${server.url}/api/v1/auth/session`, {
      headers: { Cookie: cookie },
    });
    expect(restored.status).toBe(200);
    expect((await restored.json()).identity).toEqual(session.identity);
    const list = await (
      await fetch(`${server.url}/api/v1/agents`, { headers: { Cookie: cookie } })
    ).json();
    expect(list.items).toHaveLength(2);
    expect(list.items.some((item: { id: string }) => item.id === project.id)).toBe(true);
    const next = await fetch(
      `${server.url}/api/v1/agents?limit=1&cursor=${encodeURIComponent(firstPage.next_cursor)}`,
      { headers: { Cookie: cookie } },
    );
    expect(next.status).toBe(200);
    expect((await next.json()).items[0].id).not.toBe(firstPage.items[0].id);
    const replay = await fetch(`${server.url}/api/v1/agents`, {
      method: 'POST',
      headers,
      body: payload,
    });
    expect(replay.status).toBe(201);
    expect((await replay.json()).id).toBe(project.id);
    const finalList = await (
      await fetch(`${server.url}/api/v1/agents`, { headers: { Cookie: cookie } })
    ).json();
    expect(finalList.items).toHaveLength(2);
  } finally {
    await server?.stop();
    await rm(directory, { recursive: true, force: true });
  }
});
