import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Copy, MessageSquare, Send, ThumbsDown, ThumbsUp, X } from 'lucide-react';
import { defaultWidget } from '../data';
import { useStore } from '../store';
import type { Message, WidgetConfig } from '../types';
import { Badge, Button, Field, Heading, Panel, Select } from '../ui';
import { demoAnswer } from './Testing';
export function WidgetPreview({ config, live = false }: { config: WidgetConfig; live?: boolean }) {
  const { id } = useParams();
  const storageKey = `faq-visitor-${id}`;
  const [messages, setMessages] = useState<Message[]>(() => {
    if (!live) return [];
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) || '[]');
    } catch {
      return [];
    }
  });
  const [contact, setContact] = useState(false);
  const [sent, setSent] = useState(false);
  const { update } = useStore();
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ block: 'nearest' });
    if (live) sessionStorage.setItem(storageKey, JSON.stringify(messages));
  }, [messages, live, storageKey]);
  const style = {
    '--widget-accent': config.color,
    '--widget-bg': config.background,
    '--widget-message': config.messageColor,
    '--widget-text': config.textColor,
    '--widget-radius': `${config.radius}px`,
    fontFamily: config.font,
  } as CSSProperties;
  return (
    <div className="widget" style={style}>
      <div className="widget__header">
        {config.avatar ? <img src={config.avatar} alt="" /> : <MessageSquare size={20} />}
        <span>{config.name}</span>
        <Badge good>Онлайн</Badge>
      </div>
      <div className="widget__messages" aria-live="polite">
        <div className="widget__bubble">{config.greeting}</div>
        {messages.map((m) => (
          <div
            key={m.id}
            className={`widget__bubble ${m.role === 'visitor' ? 'widget__bubble--visitor' : ''}`}
          >
            {m.text}
            {m.role === 'bot' && (
              <div className="layout-row feedback">
                {(['up', 'down'] as const).map((v) => (
                  <button
                    key={v}
                    className={`icon-button ${m.feedback === v ? 'text text--accent' : ''}`}
                    aria-label={v === 'up' ? 'Помогло' : 'Не помогло'}
                    onClick={() =>
                      setMessages((p) => p.map((x) => (x.id === m.id ? { ...x, feedback: v } : x)))
                    }
                  >
                    {v === 'up' ? <ThumbsUp size={13} /> : <ThumbsDown size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {live && messages.some((m) => m.role === 'bot' && !m.source) && !contact && !sent && (
          <button className="text-link text text--small" onClick={() => setContact(true)}>
            Связаться со специалистом
          </button>
        )}
        {contact && (
          <form
            className="widget__contact"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              update((d) => {
                d.conversations.push({
                  id: crypto.randomUUID(),
                  projectId: id || 'acme',
                  question: 'Заявка на связь',
                  time: 'Сейчас',
                  answered: false,
                  messages: [
                    ...messages,
                    {
                      id: crypto.randomUUID(),
                      role: 'visitor',
                      text: `Прошу связаться: ${f.get('name')}, ${f.get('email')}`,
                    },
                  ],
                });
              });
              setSent(true);
              setContact(false);
            }}
          >
            <Field label="Ваше имя" name="name" required />
            <Field label="Почта для связи" name="email" type="email" required />
            <Button>Оставить заявку</Button>
          </form>
        )}
        {sent && (
          <p className="text text--positive text--small">
            Заявка передана компании. Мы свяжемся с вами.
          </p>
        )}
        <div ref={end} />
      </div>
      <form
        className="widget__composer"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const q = String(new FormData(form).get('message')).trim();
          if (!q) return;
          const answer = demoAnswer(q);
          setMessages((p) => [
            ...p,
            { id: crypto.randomUUID(), role: 'visitor', text: q },
            { id: crypto.randomUUID(), role: 'bot', ...answer },
          ]);
          form.reset();
        }}
      >
        <input
          name="message"
          aria-label="Сообщение в виджете"
          placeholder={config.placeholder}
          required
        />
        <button type="submit" aria-label="Отправить сообщение">
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}
export function WidgetPage() {
  const { id } = useParams();
  const { db, update, toast } = useStore();
  const [config, setConfig] = useState<WidgetConfig>(
    () =>
      db.widgets[id!] || {
        ...defaultWidget,
        name: `Консультант ${db.projects.find((p) => p.id === id)?.name || ''}`,
      },
  );
  const [tab, setTab] = useState('code');
  const fileRef = useRef<HTMLInputElement>(null);
  const change = <K extends keyof WidgetConfig>(k: K, v: WidgetConfig[K]) =>
    setConfig((c) => ({ ...c, [k]: v }));
  const code = `<script src="${location.origin}/loader.js" data-agent="${id}" defer></script>`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast('Код скопирован');
    } catch {
      toast('Не удалось скопировать. Выделите код вручную.');
    }
  };
  return (
    <>
      <Heading
        title="Виджет и подключение"
        sub="Настройте внешний вид и выберите способ подключения к сайту"
      />
      <div className="widget-settings">
        <Panel>
          <h3>Настройки виджета</h3>
          <p className="text text--small text--muted">
            Изменения сразу отображаются в предпросмотре
          </p>
          <div className="layout-grid layout-grid--two widget-settings__fields">
            <div>
              <h4>Содержание</h4>
              <div className="layout-row">
                <span className="avatar">
                  {config.avatar ? (
                    <img className="avatar__image" src={config.avatar} alt="Аватар бота" />
                  ) : (
                    'A'
                  )}
                </span>
                <button className="text-link" onClick={() => fileRef.current?.click()}>
                  Заменить аватар
                </button>
                <input
                  ref={fileRef}
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    if (f.size > 1024 * 1024) {
                      toast('Выберите изображение до 1 МБ');
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => change('avatar', String(reader.result));
                    reader.readAsDataURL(f);
                  }}
                />
              </div>
              <Field
                label="Название бота"
                value={config.name}
                onChange={(e) => change('name', e.target.value)}
              />
              <Field
                label="Приветственное сообщение"
                value={config.greeting}
                onChange={(e) => change('greeting', e.target.value)}
              />
              <Field
                label="Placeholder поля ввода"
                value={config.placeholder}
                onChange={(e) => change('placeholder', e.target.value)}
              />
              <label className="field">
                <span>Иконка кнопки</span>
                <Select value={config.icon} onValueChange={(value) => change('icon', value)}>
                  <option value="chat">Чат</option>
                  <option value="help">Вопрос</option>
                </Select>
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={config.showLabel}
                  onChange={(e) => change('showLabel', e.target.checked)}
                />
                Показать подпись на кнопке
              </label>
            </div>
            <div>
              <h4>Оформление</h4>
              <div className="layout-grid layout-grid--two widget-settings__colors">
                {(
                  [
                    ['color', 'Основной цвет'],
                    ['background', 'Фон'],
                    ['messageColor', 'Сообщения'],
                    ['textColor', 'Текст'],
                  ] as const
                ).map(([key, label]) => (
                  <label className="field" key={key}>
                    <span>{label}</span>
                    <div className="color-field">
                      <input
                        aria-label={label}
                        type="color"
                        value={config[key]}
                        onChange={(e) => change(key, e.target.value)}
                      />
                      <span>{config[key].toUpperCase()}</span>
                    </div>
                  </label>
                ))}
              </div>
              <label className="field">
                <span>Шрифт</span>
                <Select value={config.font} onValueChange={(value) => change('font', value)}>
                  <option>Manrope</option>
                  <option>Arial</option>
                  <option>Georgia</option>
                </Select>
              </label>
              <label className="field">
                <span>Закругление · {config.radius} px</span>
                <input
                  type="range"
                  min="0"
                  max="24"
                  value={config.radius}
                  style={{ '--range-progress': `${(config.radius / 24) * 100}%` } as CSSProperties}
                  onChange={(e) => change('radius', Number(e.target.value))}
                />
              </label>
              <label className="field">
                <span>Форма кнопки открытия</span>
                <Select value={config.shape} onValueChange={(value) => change('shape', value)}>
                  <option value="round">Круглая</option>
                  <option value="square">Квадратная</option>
                </Select>
              </label>
              <label className="field">
                <span>Положение</span>
                <Select
                  value={config.position}
                  onValueChange={(value) => change('position', value)}
                >
                  <option value="right">Справа снизу</option>
                  <option value="left">Слева снизу</option>
                </Select>
              </label>
              <Field
                label="Отступ от края, px"
                type="number"
                min={8}
                max={80}
                value={config.offset}
                onChange={(e) =>
                  change('offset', Math.min(80, Math.max(8, Number(e.target.value))))
                }
              />
            </div>
          </div>
        </Panel>
        <div className="layout-stack">
          <Panel>
            <h3>Предпросмотр</h3>
            <p className="text text--small text--muted">Так виджет будет выглядеть на сайте</p>
            <div className="widget-settings__preview">
              <WidgetPreview config={config} />
              <div
                style={{
                  display: 'flex',
                  justifyContent: config.position === 'right' ? 'flex-end' : 'flex-start',
                  padding: `12px ${config.offset}px 0`,
                }}
              >
                <span
                  className="widget__launch"
                  style={{
                    background: config.color,
                    borderRadius: config.shape === 'round' ? 40 : 10,
                  }}
                >
                  {config.icon === 'help' ? '?' : <MessageSquare size={20} />}{' '}
                  {config.showLabel && 'Задать вопрос'}
                </span>
              </div>
            </div>
          </Panel>
          <Panel>
            <h3>Подключение</h3>
            <div className="filter-pills">
              <button
                className={
                  tab === 'code'
                    ? 'filter-pills__button filter-pills__button--selected'
                    : 'filter-pills__button'
                }
                onClick={() => setTab('code')}
              >
                Код на сайт
              </button>
              <button
                className={
                  tab === 'partner'
                    ? 'filter-pills__button filter-pills__button--selected'
                    : 'filter-pills__button'
                }
                onClick={() => setTab('partner')}
              >
                API партнёра
              </button>
            </div>
            {tab === 'code' ? (
              <>
                <pre className="code">{code}</pre>
                <Button variant="secondary" className="button--full" onClick={copy}>
                  <Copy size={16} />
                  Скопировать
                </Button>
                <p className="text text--small text--muted">
                  Вставьте код перед закрывающим тегом &lt;/body&gt;.
                </p>
              </>
            ) : (
              <>
                <p className="text text--small text--muted">
                  Запросы из собственного виджета проходят через сервер партнёра.
                </p>
                <Link className="text-link" to="/app/partner">
                  Пример интеграции →
                </Link>
              </>
            )}
            <Button
              className="button--full"
              onClick={() => {
                update((d) => {
                  d.widgets[id!] = { ...config, published: true };
                  const p = d.projects.find((p) => p.id === id);
                  if (p) {
                    p.active = true;
                    p.progress = 100;
                  }
                });
                toast('Настройки сохранены');
              }}
            >
              <Check size={16} />
              Завершить настройку
            </Button>
            <Link
              className="button button--secondary button--full"
              to={`/widget-demo/${id}`}
              target="_blank"
            >
              Открыть внешний виджет
            </Link>
          </Panel>
        </div>
      </div>
    </>
  );
}
export function WidgetDemo() {
  const { id } = useParams();
  const { db } = useStore();
  const config = db.widgets[id!] || defaultWidget;
  const embedded = new URLSearchParams(location.search).has('embed');
  const [open, setOpen] = useState(embedded);
  useEffect(() => {
    if (!embedded) return;
    const parentOrigin = new URLSearchParams(location.search).get('parentOrigin');
    if (!parentOrigin) return;
    try {
      if (new URL(parentOrigin).origin !== parentOrigin) return;
      window.parent.postMessage({ type: 'faq:ready', agent: id }, parentOrigin);
    } catch {
      /* Invalid parent origin is ignored. */
    }
  }, [embedded, id]);
  return (
    <div className={embedded ? 'widget-demo widget-demo--embedded' : 'widget-demo'}>
      {!embedded && (
        <>
          <BrandDemo />
          <h1>Пример сайта клиента</h1>
          <p className="text text--muted">Проверьте виджет перед подключением к сайту</p>
          <Link to="/app">Вернуться в кабинет</Link>
        </>
      )}
      {open ? (
        <div
          className="widget-demo__window"
          style={{
            [config.position === 'right' ? 'right' : 'left']: embedded ? 0 : config.offset,
            bottom: embedded ? 0 : config.offset,
          }}
        >
          <button
            className="widget-demo__close"
            aria-label="Закрыть виджет"
            onClick={() => {
              if (embedded) {
                const origin = new URLSearchParams(location.search).get('parentOrigin');
                if (origin) window.parent.postMessage({ type: 'faq:close', agent: id }, origin);
              } else setOpen(false);
            }}
          >
            <X size={18} />
          </button>
          <WidgetPreview config={config} live />
        </div>
      ) : (
        <button
          className="widget__launch widget__launch--floating"
          style={{
            background: config.color,
            borderRadius: config.shape === 'round' ? 40 : 10,
            [config.position === 'right' ? 'right' : 'left']: config.offset,
            bottom: config.offset,
          }}
          onClick={() => setOpen(true)}
          aria-label="Открыть чат"
        >
          <MessageSquare size={24} />
          {config.showLabel && 'Задать вопрос'}
        </button>
      )}
    </div>
  );
}
function BrandDemo() {
  return <div className="text text--eyebrow">FAQ BOT</div>;
}
