import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../store';
import { Brand, Button, Field, Modal, Panel } from '../ui';
export function Auth({ register = false }: { register?: boolean }) {
  const { db, update, toast } = useStore();
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [forgot, setForgot] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  if (db.user) return <Navigate to="/app" replace />;
  return (
    <div className="auth">
      <section className="auth-left">
        <Link to="/">
          <Brand />
        </Link>
        <form
          className="auth-form"
          onSubmit={async (e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            const email = String(f.get('email')).trim();
            const password = String(f.get('password'));
            if (register && password !== f.get('confirm')) {
              setError('Пароли не совпадают');
              return;
            }
            setError('');
            setBusy(true);
            await new Promise((r) => setTimeout(r, 250));
            update((d) => {
              d.user = { name: register ? String(f.get('name')).trim() : 'Алексей Петров', email };
            });
            navigate(location.state?.from || '/app');
          }}
        >
          <h1>{register ? 'Создайте аккаунт' : 'Войдите в аккаунт'}</h1>
          <p className="muted">
            {register
              ? 'Настройте первого FAQ-агента после регистрации'
              : 'Продолжите работу с вашими FAQ-агентами'}
          </p>
          <div className="form-fields">
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
            />
            <div className="password-field">
              <Field
                label="Пароль"
                name="password"
                type={show ? 'text' : 'password'}
                placeholder="••••••••••"
                minLength={8}
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
          <div className="row between small">
            <label className="checkbox">
              <input type="checkbox" required={register} />
              {register ? 'Я принимаю условия использования' : 'Запомнить меня'}
            </label>
            {!register && (
              <button type="button" className="text-link" onClick={() => setForgot(true)}>
                Забыли пароль?
              </button>
            )}
          </div>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? 'Подождите…' : register ? 'Создать аккаунт' : 'Войти'}
          </Button>
          <p className="auth-switch muted">
            {register ? 'Уже есть аккаунт?' : 'Нет аккаунта?'}{' '}
            <Link className="text-link" to={register ? '/login' : '/register'}>
              {register ? 'Войти' : 'Зарегистрироваться'}
            </Link>
          </p>
          <p className="small muted demo-note">
            Демонстрационный вход: любая почта и пароль от 8 символов. Пароль не сохраняется.
          </p>
        </form>
        <footer className="small muted">
          Продолжая, вы соглашаетесь с условиями использования и политикой конфиденциальности
        </footer>
      </section>
      <section className="auth-right">
        <div className="auth-promo">
          <span className="eyebrow">{register ? 'БЫСТРЫЙ СТАРТ' : 'ИНТЕЛЛЕКТУАЛЬНЫЙ FAQ-БОТ'}</span>
          <h2>
            {register
              ? 'Создайте FAQ-бота за несколько шагов'
              : 'Ответы на частые вопросы передайте ИИ'}
          </h2>
          <p>Загрузите материалы, проверьте ответы и подключите виджет к сайту.</p>
          <Panel>
            <div className="row">
              <span className="avatar orange">F</span>
              <div>
                <strong>FAQ-бот</strong>
                <p className="small muted">Отвечает по базе знаний</p>
              </div>
            </div>
            <div className="bubble user">Как оформить возврат?</div>
            <div className="bubble bot">
              Возврат можно оформить в течение 14 дней после получения заказа.
            </div>
            <span className="source">Источник: Условия возврата.pdf</span>
          </Panel>
          <div className="trust">
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
              toast('Демонстрация: письмо для восстановления не отправляется без сервера.');
              setForgot(false);
            }}
          >
            <p className="muted">Укажите почту вашего аккаунта</p>
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
        <div className="row">
          <Link to="/login">Войти</Link>
          <Link className="button dark" to="/register">
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
        <p className="muted">
          FAQ-бот, который отвечает клиентам по вашим материалам.
          <br />
          От первого документа до виджета на сайте — в одном кабинете.
        </p>
        <Link className="button primary" to="/register">
          Создать первого агента <ArrowRight size={18} />
        </Link>
        <div className="grid three">
          {[
            ['01', 'Добавьте знания', 'Файлы, ручной текст, аудио и видео.'],
            ['02', 'Проверьте ответы', 'Тестовый чат и 10 автоматических вопросов.'],
            ['03', 'Подключите виджет', 'Ваши цвета, ваш сайт, готовый код.'],
          ].map(([n, t, d]) => (
            <Panel key={n}>
              <span className="avatar">{n}</span>
              <h3>{t}</h3>
              <p className="muted">{d}</p>
            </Panel>
          ))}
        </div>
      </section>
      <footer className="muted">FAQ bot · Демонстрационный frontend</footer>
    </div>
  );
}
function BadgeText() {
  return <span className="badge">Интеллектуальный FAQ-бот</span>;
}
