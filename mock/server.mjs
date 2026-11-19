import { createServer } from 'node:http';
import {
  createHash,
  createHmac,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// Development-only HTTP substitute for the implemented Go auth and agents routes.
const host = '127.0.0.1';
const port = Number(process.env.MOCK_API_PORT || 8081);
const origin = process.env.MOCK_AUTH_ORIGIN || 'http://127.0.0.1:5173';
const ephemeral = process.env.MOCK_API_EPHEMERAL === '1';
const dataFile = resolve(
  process.env.MOCK_DATA_FILE || fileURLToPath(new URL('../.mock-data/state.json', import.meta.url)),
);
const hash = (value) => createHash('sha256').update(value).digest('hex');
const secret = () => randomBytes(32).toString('hex');
const passwordHash = (password, salt) => scryptSync(password, salt, 32).toString('hex');
function freshState() {
  const salt = secret();
  return {
    version: 1,
    cursorKey: secret(),
    sessions: {},
    agents: [],
    replays: {},
    users: [
      {
        id: randomUUID(),
        accountId: randomUUID(),
        email: 'demo@example.com',
        salt,
        passwordHash: passwordHash('demopassword', salt),
      },
    ],
  };
}
let state =
  ephemeral || !existsSync(dataFile) ? freshState() : JSON.parse(readFileSync(dataFile, 'utf8'));
if (
  state.version !== 1 ||
  !Array.isArray(state.users) ||
  !Array.isArray(state.agents) ||
  !state.sessions ||
  !state.replays
) {
  throw new Error('Unsupported mock data file. Set MOCK_DATA_FILE to a new path.');
}
function persist(next) {
  if (ephemeral) return;
  mkdirSync(dirname(dataFile), { recursive: true, mode: 0o700 });
  const temporary = `${dataFile}.tmp`;
  writeFileSync(temporary, JSON.stringify(next), { mode: 0o600 });
  renameSync(temporary, dataFile);
}
function transaction(change) {
  const next = structuredClone(state);
  const result = change(next);
  persist(next);
  state = next;
  return result;
}
class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
const invalid = () => new HttpError(400, 'invalid_request', 'Некорректный запрос');
const unauthorized = () => new HttpError(401, 'unauthorized', 'Вход не выполнен');
const forbidden = () => new HttpError(403, 'forbidden', 'Запрос запрещён');
const missing = () => new HttpError(404, 'not_found', 'Ресурс не найден');

function readBody(request, limit) {
  return new Promise((resolveBody, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size <= limit) chunks.push(chunk);
    });
    request.on('error', reject);
    request.on('end', () =>
      size > limit ? reject(invalid()) : resolveBody(Buffer.concat(chunks)),
    );
  });
}
async function readJSON(request, fields, limit) {
  if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json')
    throw invalid();
  let value;
  try {
    value = JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(await readBody(request, limit)),
    );
  } catch {
    throw invalid();
  }
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== fields.length ||
    fields.some((field) => typeof value[field] !== 'string' || !value[field].isWellFormed())
  )
    throw invalid();
  return value;
}
function cookieToken(request) {
  return (
    request.headers.cookie
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('faqbot_session='))
      ?.slice('faqbot_session='.length) || ''
  );
}
function sessionFor(request) {
  const session = state.sessions[hash(cookieToken(request))];
  return session && session.expiresAt > Date.now() && session.idleExpiresAt > Date.now()
    ? session
    : null;
}
function setCookie(response, token, seconds) {
  response.setHeader(
    'Set-Cookie',
    `faqbot_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${seconds}`,
  );
}
function newSession(next, user) {
  const token = secret();
  const expiresAt = Date.now() + (user ? 8 * 3600000 : 10 * 60000);
  const session = {
    csrf: secret(),
    expiresAt,
    idleExpiresAt: Math.min(expiresAt, Date.now() + 30 * 60000),
    identity: user
      ? { user_id: user.id, account_id: user.accountId, role: 'owner', audit_read: false }
      : null,
  };
  next.sessions[hash(token)] = session;
  return { token, session };
}
function sessionDTO(session) {
  return {
    identity: session.identity,
    expires_at: new Date(session.expiresAt).toISOString(),
    csrf_token: session.csrf,
  };
}
function checkOrigin(request) {
  const mutation = request.method !== 'GET';
  if (
    request.headers['sec-fetch-site'] === 'cross-site' ||
    (mutation && request.headers.origin !== origin) ||
    (!mutation && request.headers.origin && request.headers.origin !== origin)
  )
    throw forbidden();
}
function checkCSRF(request, session) {
  if (!request.headers['x-csrf-token']) throw forbidden();
  if (!session) throw unauthorized();
  const received = Buffer.from(request.headers['x-csrf-token']);
  const expected = Buffer.from(session.csrf);
  if (received.length !== expected.length || !timingSafeEqual(received, expected))
    throw forbidden();
}
function send(response, status, value) {
  response.statusCode = status;
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Request-ID', randomUUID());
  if (value === undefined) {
    response.end();
    return;
  }
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(value));
}
function method(request, response, allowed) {
  if (allowed.includes(request.method)) return;
  response.setHeader('Allow', allowed.join(', '));
  throw new HttpError(405, 'method_not_allowed', 'Метод не поддерживается');
}

async function auth(request, response, operation) {
  if (!['csrf', 'session', 'login', 'register', 'logout'].includes(operation)) throw missing();
  method(request, response, ['csrf', 'session'].includes(operation) ? ['GET'] : ['POST']);
  checkOrigin(request);
  const session = sessionFor(request);
  if (operation === 'csrf') {
    const result = transaction((next) => {
      if (session) {
        next.sessions[hash(cookieToken(request))].idleExpiresAt = Math.min(
          session.expiresAt,
          Date.now() + 30 * 60000,
        );
        return { token: cookieToken(request), session };
      }
      return newSession(next, null);
    });
    setCookie(
      response,
      result.token,
      Math.max(1, Math.ceil((result.session.expiresAt - Date.now()) / 1000)),
    );
    return send(response, 200, { csrf_token: result.session.csrf });
  }
  if (operation === 'session') {
    if (!session?.identity) throw unauthorized();
    transaction((next) => {
      next.sessions[hash(cookieToken(request))].idleExpiresAt = Math.min(
        session.expiresAt,
        Date.now() + 30 * 60000,
      );
    });
    return send(response, 200, sessionDTO(session));
  }
  checkCSRF(request, session);
  if (operation === 'logout') {
    transaction((next) => {
      delete next.sessions[hash(cookieToken(request))];
    });
    setCookie(response, '', 0);
    return send(response, 204);
  }
  const credentials = await readJSON(request, ['email', 'password'], 4096);
  const { email, password } = credentials;
  if (
    !/^[^\s@]+@[^\s@]+$/.test(email) ||
    Buffer.byteLength(email) > 254 ||
    !password ||
    Buffer.byteLength(password) > 1024
  )
    throw invalid();
  // Recheck after reading the request body: a concurrent logout may have revoked this cookie.
  checkCSRF(request, sessionFor(request));
  const result = transaction((next) => {
    let user = next.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
    if (operation === 'register') {
      if (user) throw unauthorized();
      const salt = secret();
      user = {
        id: randomUUID(),
        accountId: randomUUID(),
        email,
        salt,
        passwordHash: passwordHash(password, salt),
      };
      next.users.push(user);
    } else if (!user || passwordHash(password, user.salt) !== user.passwordHash)
      throw unauthorized();
    delete next.sessions[hash(cookieToken(request))];
    return newSession(next, user);
  });
  setCookie(response, result.token, 8 * 3600);
  return send(response, operation === 'register' ? 201 : 200, sessionDTO(result.session));
}

function encodeCursor(accountId, item) {
  const payload = Buffer.from(
    JSON.stringify({ accountId, createdAt: item.createdAt, id: item.data.id }),
  ).toString('base64url');
  return `${payload}.${createHmac('sha256', state.cursorKey).update(payload).digest('base64url')}`;
}
function decodeCursor(cursor, accountId) {
  try {
    const [payload, signature, extra] = cursor.split('.');
    const expected = createHmac('sha256', state.cursorKey).update(payload).digest('base64url');
    if (extra || signature !== expected) throw invalid();
    const decoded = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (
      decoded.accountId !== accountId ||
      !Number.isFinite(decoded.createdAt) ||
      typeof decoded.id !== 'string'
    )
      throw invalid();
    return decoded;
  } catch {
    throw invalid();
  }
}
function findAgent(next, accountId, id) {
  const item = next.agents.find(
    (item) =>
      item.data.id === id && item.data.account_id === accountId && item.data.status !== 'deleted',
  );
  if (!item) throw missing();
  return item;
}
async function agents(request, response, url, id) {
  method(request, response, id ? ['GET', 'PATCH', 'DELETE'] : ['GET', 'POST']);
  checkOrigin(request);
  const session = sessionFor(request);
  if (!session?.identity) throw unauthorized();
  const identity = session.identity;
  if (!['owner', 'admin'].includes(identity.role)) throw forbidden();
  const mutation = request.method !== 'GET';
  if (mutation) checkCSRF(request, session);
  for (const key of url.searchParams.keys()) {
    if (
      mutation ||
      id ||
      !['limit', 'cursor'].includes(key) ||
      url.searchParams.getAll(key).length !== 1
    )
      throw invalid();
  }
  if (request.method === 'GET') {
    if (id) {
      const agent = findAgent(state, identity.account_id, id).data;
      response.setHeader('ETag', `"${agent.revision}"`);
      return send(response, 200, agent);
    }
    const rawLimit = url.searchParams.get('limit') ?? '20';
    const limit = /^\d+$/.test(rawLimit) ? Number(rawLimit) : NaN;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw invalid();
    const rawCursor = url.searchParams.get('cursor');
    if (rawCursor !== null && (!rawCursor || rawCursor.length > 512)) throw invalid();
    const cursor = rawCursor ? decodeCursor(rawCursor, identity.account_id) : null;
    const all = state.agents
      .filter(
        (item) =>
          item.data.account_id === identity.account_id &&
          item.data.status !== 'deleted' &&
          (!cursor ||
            item.createdAt < cursor.createdAt ||
            (item.createdAt === cursor.createdAt && item.data.id < cursor.id)),
      )
      .sort((a, b) => b.createdAt - a.createdAt || b.data.id.localeCompare(a.data.id));
    const page = all.slice(0, limit);
    return send(response, 200, {
      items: page.map((item) => item.data),
      next_cursor: all.length > limit ? encodeCursor(identity.account_id, page.at(-1)) : null,
    });
  }
  const key = request.headers['idempotency-key'];
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(key)) throw invalid();
  let input = null;
  let revision = null;
  if (request.method === 'DELETE') {
    if ((await readBody(request, 0)).length) throw invalid();
  } else {
    input = await readJSON(request, ['name', 'website', 'description'], 1048576);
    if (
      !input.name.trim() ||
      [...input.name].length > 100 ||
      Object.values(input).some((value) => value.includes('\0'))
    )
      throw invalid();
    // Normalize field order, as Go hashes the decoded struct rather than raw JSON bytes.
    input = { name: input.name, website: input.website, description: input.description };
    if (id) {
      const match = /^"([1-9]\d*)"$/.exec(request.headers['if-match'] || '');
      if (!match || !Number.isSafeInteger(Number(match[1]))) throw invalid();
      revision = Number(match[1]);
    }
  }
  checkCSRF(request, sessionFor(request));
  const replayKey = hash(
    `${identity.account_id}:${identity.user_id}:${request.method}:${id || ''}:${key}`,
  );
  const fingerprint = hash(JSON.stringify({ input, revision }));
  const result = transaction((next) => {
    const replay = next.replays[replayKey];
    if (replay) {
      if (replay.fingerprint !== fingerprint)
        throw new HttpError(409, 'idempotency_conflict', 'Ключ операции уже использован');
      return replay;
    }
    let value;
    let status;
    if (request.method === 'POST') {
      value = {
        id: randomUUID(),
        account_id: identity.account_id,
        public_id: secret(),
        ...input,
        status: 'draft',
        revision: 1,
        knowledge_revision: 0,
        active_knowledge_revision: 0,
        config_revision: 1,
        published_config_revision: 0,
        public_sources_enabled: false,
      };
      next.agents.push({ data: value, createdAt: Date.now() });
      status = 201;
    } else {
      const item = findAgent(next, identity.account_id, id);
      if (request.method === 'PATCH') {
        if (item.data.revision !== revision)
          throw new HttpError(412, 'revision_conflict', 'Версия ресурса изменилась');
        Object.assign(item.data, input, { revision: item.data.revision + 1 });
        value = structuredClone(item.data);
        status = 200;
      } else {
        item.data.status = 'deleted';
        value = { id: randomUUID(), status: 'pending', error_code: null };
        status = 202;
      }
    }
    const entry = { fingerprint, status, value: structuredClone(value) };
    next.replays[replayKey] = entry;
    return entry;
  });
  if (result.value.revision) response.setHeader('ETag', `"${result.value.revision}"`);
  return send(response, result.status, result.value);
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${host}:${port}`);
    if (url.pathname === '/health' && request.method === 'GET')
      return send(response, 200, { status: 'ok', mode: 'mock' });
    if (url.pathname.startsWith('/api/v1/auth/'))
      return await auth(request, response, url.pathname.slice('/api/v1/auth/'.length));
    const agentPath = /^\/api\/v1\/agents(?:\/([^/]+))?$/.exec(url.pathname);
    if (agentPath) return await agents(request, response, url, agentPath[1]);
    throw missing();
  } catch (error) {
    if (!response.destroyed)
      send(response, error instanceof HttpError ? error.status : 500, {
        code: error instanceof HttpError ? error.code : 'internal_error',
        message: error instanceof HttpError ? error.message : 'Ошибка локального mock API',
        request_id: randomUUID(),
      });
  }
});
server.on('error', (error) => {
  console.error(`Mock API failed: ${error.code || 'startup_error'}`);
  process.exitCode = 1;
});
server.listen(port, host, () => {
  persist(state);
  console.log(`Mock API: http://${host}:${server.address().port} (local development only)`);
  process.send?.({ type: 'ready' });
});
function stop() {
  server.close(() => process.exit(0));
  server.closeIdleConnections();
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
