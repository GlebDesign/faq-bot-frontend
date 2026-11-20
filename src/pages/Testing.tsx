import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useStore } from '../store';
import { Badge, Button, Heading, Modal, Panel, Progress, Select } from '../ui';
import type { Message } from '../types';
export function demoAnswer(question: string) {
  const q = question.toLowerCase();
  if (/возврат|вернуть/.test(q))
    return {
      text: 'Товар можно вернуть в течение 14 дней после получения. Для возврата заполните форму на сайте и укажите номер заказа.',
      source: 'faq-acme.pdf · стр. 4',
    };
  if (/достав/.test(q))
    return {
      text: 'Доставка по России занимает от 3 до 7 рабочих дней. Для заказов от 5000 рублей доставка бесплатна.',
      source: 'Условия доставки',
    };
  return {
    text: 'В базе знаний нет подходящей информации. Добавьте материал по этому вопросу или оставьте заявку специалисту.',
  };
}
export function Testing() {
  const { id } = useParams();
  const { db, toast } = useStore();
  const key = `faq-test-${id}`;
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      return (
        JSON.parse(sessionStorage.getItem(key) || 'null') || [
          { id: '1', role: 'visitor', text: 'Какие условия возврата товара?' },
          { id: '2', role: 'bot', ...demoAnswer('возврат') },
        ]
      );
    } catch {
      return [];
    }
  });
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState('');
  const last = useRef<HTMLDivElement>(null);
  useEffect(() => {
    sessionStorage.setItem(key, JSON.stringify(messages));
    last.current?.scrollIntoView({ block: 'nearest' });
  }, [messages, key]);
  return (
    <>
      <Heading
        title="Проверка ответов"
        sub="Проверьте ответы вручную или запустите автоматический тест из 10 вопросов"
      />
      <div className="testing__grid">
        <Panel className="testing__chat">
          <div className="layout-row layout-row--between">
            <div>
              <h3>Тестовый чат</h3>
              <p className="text text--small text--muted">Проверьте несколько типовых вопросов</p>
            </div>
            <Link
              className="button button--primary button--compact"
              to={`/app/projects/${id}/auto-check`}
            >
              Автопроверка
            </Link>
          </div>
          <div className="conversation conversation--test" aria-live="polite">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`bubble ${m.role === 'visitor' ? 'bubble--user' : 'bubble--bot'}`}
              >
                {m.role === 'bot' && (
                  <b className="text text--small">{db.projects.find((p) => p.id === id)?.name}</b>
                )}
                <p>{m.text}</p>
                {m.source && (
                  <button className="source" onClick={() => setSource(m.source!)}>
                    Источник: {m.source} · Открыть →
                  </button>
                )}
                {m.role === 'bot' && (
                  <div className="layout-row feedback">
                    {(['up', 'down'] as const).map((v) => (
                      <button
                        className={`icon-button ${m.feedback === v ? 'text text--accent' : ''}`}
                        key={v}
                        aria-label={v === 'up' ? 'Помогло' : 'Не помогло'}
                        onClick={() => {
                          setMessages((prev) =>
                            prev.map((x) => (x.id === m.id ? { ...x, feedback: v } : x)),
                          );
                          toast('Оценка сохранена');
                        }}
                      >
                        {v === 'up' ? <ThumbsUp size={15} /> : <ThumbsDown size={15} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {busy && <span className="text text--small text--muted">Агент готовит ответ…</span>}
            <div ref={last} />
          </div>
          <form
            className="composer"
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const text = String(new FormData(form).get('message')).trim();
              if (!text || busy) return;
              setMessages((p) => [...p, { id: crypto.randomUUID(), role: 'visitor', text }]);
              form.reset();
              setBusy(true);
              await new Promise((r) => setTimeout(r, 600));
              setMessages((p) => [
                ...p,
                { id: crypto.randomUUID(), role: 'bot', ...demoAnswer(text) },
              ]);
              setBusy(false);
            }}
          >
            <input
              aria-label="Тестовый вопрос"
              name="message"
              placeholder="Задайте вопрос агенту…"
              required
              autoComplete="off"
            />
            <Button variant="dark" disabled={busy}>
              <Send size={16} />
              <span>Отправить</span>
            </Button>
          </form>
        </Panel>
        <Panel>
          <h3>Проверьте качество</h3>
          <p className="text text--small text--muted">Перед переходом к виджету убедитесь, что:</p>
          <div className="checklist">
            {[
              'Ответ соответствует вопросу',
              'Формулировка понятна',
              'Источник указан корректно',
            ].map((t) => (
              <div className="layout-row" key={t}>
                <Check size={17} />
                {t}
              </div>
            ))}
          </div>
          <h3>Ответы устраивают?</h3>
          <p className="text text--small text--muted">
            Если нет — дополните материалы и повторите обработку.
          </p>
          <Link className="button button--primary button--full" to={`/app/projects/${id}/widget`}>
            Да, перейти к виджету
          </Link>
          <Link
            className="button button--secondary button--full"
            to={`/app/projects/${id}/materials`}
          >
            Нет, изменить материалы
          </Link>
        </Panel>
      </div>
      {source && (
        <Modal title={source} onClose={() => setSource('')}>
          <p>
            {db.documents.find((d) => d.projectId === id)?.content || 'Источник пока не добавлен'}
          </p>
        </Modal>
      )}
    </>
  );
}
const questions = [
  'Сколько стоит доставка?',
  'Какие сроки доставки?',
  'Как оформить возврат?',
  'Какие способы оплаты?',
  'Где находится мой заказ?',
  'Есть ли гарантия на товар?',
  'Как изменить состав заказа?',
  'Можно ли отменить заказ?',
  'Доставляете ли вы в регионы?',
  'Как связаться с поддержкой?',
];
const scores = [9, 9, 10, 8, 7, 9, 8, 9, 6, 9];
export function AutoCheck() {
  const { id } = useParams();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selected, setSelected] = useState<number>();
  const [niche, setNiche] = useState('Интернет-магазин');
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(
      () =>
        setProgress((p) => {
          if (p >= 90) {
            setRunning(false);
            return 100;
          }
          return p + 10;
        }),
      260,
    );
    return () => clearInterval(timer);
  }, [running]);
  const complete = progress === 100;
  return (
    <>
      <Heading
        title="Автоматическая проверка"
        sub="Определите нишу и проверьте ответы на 10 типовых вопросов"
      />
      <div className="testing__grid">
        <Panel>
          <div className="layout-row layout-row--between">
            <div>
              <h3>Автопроверка</h3>
              <p className="text text--small text--muted">10 вопросов по нише проекта</p>
            </div>
            <Link
              className="button button--secondary button--compact"
              to={`/app/projects/${id}/test`}
            >
              Ручная проверка
            </Link>
          </div>
          <label className="field">
            <span>Ниша проекта</span>
            <Select
              disabled={running}
              value={niche}
              onValueChange={(value) => {
                setNiche(value);
                setProgress(0);
              }}
            >
              <option>Интернет-магазин</option>
              <option>Услуги</option>
              <option>Образование</option>
            </Select>
          </label>
          {running && (
            <>
              <Progress value={progress} />
              <p className="text text--muted text--small">
                Проверено {progress / 10} из 10 вопросов
              </p>
            </>
          )}
          {questions.map((q, i) => (
            <button key={q} className="auto-result" onClick={() => setSelected(i)}>
              <span className="number">{i + 1}</span>
              <span>
                {niche === 'Интернет-магазин'
                  ? q
                  : [
                      'Как записаться?',
                      'Сколько стоят услуги?',
                      'Как отменить запись?',
                      'Как оплатить?',
                      'Какие сроки?',
                      'Есть ли гарантия?',
                      'Как изменить заявку?',
                      'Есть ли возврат?',
                      'Работаете ли вы онлайн?',
                      'Как связаться с поддержкой?',
                    ][i]}
              </span>
              {complete && (
                <>
                  <b className={scores[i] < 8 ? 'text text--accent' : 'text text--positive'}>
                    {scores[i]} / 10
                  </b>
                  <Badge good={scores[i] >= 8}>{scores[i] < 8 ? 'Проверить' : 'Хорошо'}</Badge>
                </>
              )}
            </button>
          ))}
        </Panel>
        <Panel>
          <h3>Результат проверки</h3>
          {complete ? (
            <>
              <h2 className="text text--hero-number">8,4 / 10</h2>
              <p className="text text--positive">Высокое качество ответов</p>
              <div className="layout-grid layout-grid--two metrics-summary">
                <div>
                  <b>8</b>
                  <span>хороших ответов</span>
                </div>
                <div>
                  <b className="text text--accent">2</b>
                  <span>нужно проверить</span>
                </div>
              </div>
              <Button
                variant="secondary"
                className="button--full"
                onClick={() => {
                  setProgress(0);
                  setRunning(true);
                }}
              >
                Повторить проверку
              </Button>
              <Link
                className="button button--primary button--full"
                to={`/app/projects/${id}/widget`}
              >
                Перейти к виджету
              </Link>
              <Link
                className="button button--secondary button--full"
                to={`/app/projects/${id}/materials`}
              >
                Изменить материалы
              </Link>
            </>
          ) : (
            <>
              <p className="text text--muted">
                Система сгенерирует 10 типовых вопросов и оценит ответы агента.
              </p>
              <Button
                className="button--full"
                disabled={running}
                onClick={() => {
                  setProgress(0);
                  setRunning(true);
                }}
              >
                {running ? 'Проверка…' : 'Запустить проверку'}
              </Button>
            </>
          )}
        </Panel>
      </div>
      {selected !== undefined && (
        <Modal title={questions[selected]} onClose={() => setSelected(undefined)}>
          <h3>Ответ агента</h3>
          <p>{demoAnswer(questions[selected]).text}</p>
          <p className="text text--small text--muted">
            {complete
              ? `Оценка: ${scores[selected]} / 10. Соответствие вопросу, полнота ответа, наличие источника.`
              : 'Запустите проверку, чтобы увидеть оценку.'}
          </p>
        </Modal>
      )}
    </>
  );
}
