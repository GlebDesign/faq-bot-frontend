import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store';
import { Brand, Button, Field, Modal, Panel } from '../ui';
import { useSession } from '../auth/AuthProvider';
import { authErrorMessage } from '../auth/api';
export function Auth({ register = false }: { register?: boolean }) {
  const { toast } = useStore();
  const { status, authenticate } = useSession();
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const destination = typeof from === 'string' && /^\/app(?:\/|\?|$)/.test(from) ? from : '/app';
  if (status === 'authenticated') return <Navigate to={destination} replace />;
  return (
    <div className="auth">
      <section className="auth__main">
        <Link to="/">
          <Brand />
        </Link>
        <form
          className="auth__form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const email = String(f.get('email')).trim();
            const password = String(f.get('password'));
            if (register && password !== f.get('confirm')) {
              setError('Пароли не совпадают');
              return;
            }
            if (busy) return;
            if (
              new TextEncoder().encode(password).length > 1024 ||
              new TextEncoder().encode(email).length > 254
            ) {
              setError('Адрес почты или пароль слишком длинный.');
              return;
            }
            const name = register ? String(f.get('name')).trim() : undefined;
            if (register && !name) {
              setError('Введите имя и фамилию.');
              return;
            }
            setError('');
            setBusy(true);
            try {
              await authenticate(register ? 'register' : 'login', email, password, name);
              navigate(destination, { replace: true });
            } catch (failure) {
              setError(authErrorMessage(failure, register));
              setBusy(false);
            }
          }}
        >
          <h1>{register ? 'Создайте аккаунт' : 'Войдите в аккаунт'}</h1>
          <p className="text text--muted">
            {register
              ? 'Настройте первого FAQ-агента после регистрации'
              : 'Продолжите работу с вашими FAQ-агентами'}
          </p>
          <div className="auth__fields">
            {register && (
              <Field
                label="Имя и фамилия"
                name="name"
                placeholder="Алексей Петров"
                autoComplete="name"
                required
                maxLength={80}
              />
            )}
            <Field
              label="Электронная почта"
              name="email"
              type="email"
              placeholder="name@company.ru"
              autoComplete="email"
              required
              maxLength={254}
            />
            <div className="auth__password">
              <Field
                label="Пароль"
                name="password"
                type={show ? 'text' : 'password'}
                placeholder="••••••••••"
                minLength={register ? 8 : 1}
                maxLength={1024}
                autoComplete={register ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className="icon-button"
                aria-label={show ? 'Скрыть пароль' : 'Показать пароль'}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {register && (
              <Field
                label="Повторите пароль"
                name="confirm"
                type={show ? 'text' : 'password'}
                autoComplete="new-password"
                required
              />
            )}
          </div>
          <div className="layout-row layout-row--between text text--small">
            {register ? (
              <label className="checkbox">
                <input type="checkbox" required />Я принимаю условия использования
              </label>
            ) : (
              <span className="text text--muted">Вход по электронной почте</span>
            )}
            {!register && (
              <button type="button" className="text-link" onClick={() => setForgot(true)}>
                Забыли пароль?
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="text text--error">
              {error}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? 'Подождите…' : register ? 'Создать аккаунт' : 'Войти'}
          </Button>
          <p className="auth__switch text text--muted">
            {register ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
            <Link
              className="text-link"
              to={register ? '/login' : '/register'}
              state={{ from: destination }}
            >
              {register ? 'Войти' : 'Зарегистрироваться'}
            </Link>
          </p>
        </form>
        <footer className="text text--small text--muted">
          Продолжая, вы соглашаетесь с условиями использования и политикой конфиденциальности
        </footer>
      </section>
      <section className="auth__aside">
        <div className="auth__promo">
          <span className="text text--eyebrow">
            {register ? 'БЫСТРЫЙ СТАРТ' : 'ИНТЕЛЛЕКТУАЛЬНЫЙ FAQ-БОТ'}
          </span>
          <h2>
            {register
              ? 'Создайте FAQ-бота за несколько шагов'
              : 'Ответы на частые вопросы передайте ИИ'}
          </h2>
          <p>Загрузите материалы, проверьте ответы и подключите виджет к сайту.</p>
          <Panel>
            <div className="layout-row">
              <span className="avatar avatar--orange">F</span>
              <div>
                <strong>FAQ-бот</strong>
                <p className="text text--small text--muted">Отвечает по базе знаний</p>
              </div>
            </div>
            <div className="bubble bubble--user">Как оформить возврат?</div>
            <div className="bubble bubble--bot">
              Возврат можно оформить в течение 14 дней после получения заказа.
            </div>
            <span className="source">Источник: Условия возврата.pdf</span>
          </Panel>
          <div className="auth__trust">
            <Check size={18} />
            Ответы можно проверить до подключения к сайту
          </div>
        </div>
      </section>
      {forgot && (
        <Modal title="Восстановить пароль" onClose={() => setForgot(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              toast('Не удалось отправить письмо. Попробуйте позже.');
              setForgot(false);
            }}
          >
            <p className="text text--muted">Укажите почту вашего аккаунта</p>
            <Field label="Электронная почта" type="email" required />
            <Button>Отправить ссылку</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
export function Landing() {
  return (
    <div className="landing">
      <header>
        <Brand />
        <div className="layout-row">
          <Link to="/login">Войти</Link>
          <Link className="button button--dark" to="/register">
            Начать работу <ArrowRight size={16} />
          </Link>
        </div>
      </header>
      <section>
        <BadgeText />
        <h1>
          Знания вашей компании.
          <br />
          Ответы за секунды.
        </h1>
        <p className="text text--muted">
          FAQ-бот, который отвечает клиентам по вашим материалам.
          <br />
          От первого документа до виджета на сайте — в одном кабинете.
        </p>
        <Link className="button button--primary" to="/register">
          Создать первого агента <ArrowRight size={18} />
        </Link>
        <div className="layout-grid layout-grid--three">
          {[
            ['01', 'Добавьте знания', 'Файлы, ручной текст, аудио и видео.'],
            ['02', 'Проверьте ответы', 'Тестовый чат и 10 автоматических вопросов.'],
            ['03', 'Подключите виджет', 'Ваши цвета, ваш сайт, готовый код.'],
          ].map(([n, t, d]) => (
            <Panel key={n}>
              <span className="avatar">{n}</span>
              <h3>{t}</h3>
              <p className="text text--muted">{d}</p>
            </Panel>
          ))}
        </div>
      </section>
      <footer className="text text--muted">FAQ bot</footer>
    </div>
  );
}
function BadgeText() {
  return <span className="badge">Интеллектуальный FAQ-бот</span>;
}
