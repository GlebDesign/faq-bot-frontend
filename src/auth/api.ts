import { ApiError, httpRequest } from '../api';

export type AuthSession = {
  identity: { user_id: string; account_id: string; role: string; audit_read: boolean };
  expires_at: string;
  csrf_token: string;
};

function validateSession(value: AuthSession): AuthSession {
  if (
    typeof value?.identity?.user_id !== 'string' ||
    !value.identity.user_id ||
    typeof value.identity.account_id !== 'string' ||
    !value.identity.account_id ||
    typeof value.identity.role !== 'string' ||
    typeof value.identity.audit_read !== 'boolean' ||
    typeof value.csrf_token !== 'string' ||
    !value.csrf_token ||
    typeof value.expires_at !== 'string' ||
    !Number.isFinite(Date.parse(value.expires_at))
  ) {
    throw new ApiError(502, 'Сервер вернул некорректную сессию. Попробуйте позже.');
  }
  if (Date.parse(value.expires_at) <= Date.now())
    throw new ApiError(401, 'Сессия истекла. Войдите снова.');
  return value;
}

export async function getCSRF(): Promise<string> {
  const result = await httpRequest<{ csrf_token: string }>('/v1/auth/csrf');
  if (typeof result?.csrf_token !== 'string' || !result.csrf_token)
    throw new ApiError(502, 'Не удалось подготовить защищённый запрос.');
  return result.csrf_token;
}

export const authApi = {
  async session() {
    return validateSession(await httpRequest<AuthSession>('/v1/auth/session'));
  },
  async authenticate(operation: 'login' | 'register', email: string, password: string) {
    const csrf = await getCSRF();
    return validateSession(
      await httpRequest<AuthSession>(`/v1/auth/${operation}`, {
        method: 'POST',
        headers: { 'X-CSRF-Token': csrf },
        // Go rejects unknown fields. The display name stays in the local profile.
        body: JSON.stringify({ email, password }),
      }),
    );
  },
  async logout() {
    const csrf = await getCSRF();
    await httpRequest<void>('/v1/auth/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': csrf },
    });
  },
};

export function authErrorMessage(error: unknown, register = false): string {
  if (!(error instanceof ApiError)) return 'Не удалось выполнить запрос. Попробуйте ещё раз.';
  switch (error.status) {
    case 400:
      return 'Проверьте адрес почты и пароль.';
    case 401:
      return register
        ? 'Не удалось создать аккаунт. Проверьте данные. Если аккаунт уже есть, войдите.'
        : 'Не удалось войти. Проверьте почту и пароль.';
    case 403:
      return 'Защищённая сессия недоступна. Проверьте адрес приложения и настройки сервера.';
    case 404:
      return 'Авторизация на сервере не настроена.';
    case 429:
      return 'Слишком много попыток. Подождите минуту и попробуйте снова.';
    case 500:
      return 'На сервере произошла ошибка. Попробуйте позже.';
    case 502:
      return register
        ? 'Сервис регистрации временно недоступен. Если аккаунт уже создан, попробуйте войти с теми же данными.'
        : 'Сервис авторизации временно недоступен. Попробуйте позже.';
    case 503:
      return 'Сервис авторизации временно недоступен. Попробуйте позже.';
    default:
      return error.message;
  }
}
