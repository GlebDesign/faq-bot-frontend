import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, MessageSquare, Paperclip, Send } from 'lucide-react';
import { useStore } from '../store';
import { Avatar, Badge, Button, Empty, Heading, Panel, SearchField, Select } from '../ui';
export function Statistics({ project = false }: { project?: boolean }) {
  const { id } = useParams();
  const { db } = useStore();
  const [period, setPeriod] = useState('30');
  const projects = project ? db.projects.filter((p) => p.id === id) : db.projects;
  const conversations = db.conversations.filter((c) => !project || c.projectId === id);
  const unanswered = conversations.filter((c) => !c.answered).length;
  const total = period === '7' ? 812 : project ? 1248 : 3482;
  const bars =
    period === '7' ? [50, 80, 65, 100, 85, 120, 110] : [150, 200, 175, 255, 218, 310, 285];
  return (
    <>
      <Heading
        title={project ? 'Аналитика' : 'Общая статистика'}
        sub={
          project
            ? 'Как пользователи взаимодействуют с агентом'
            : 'Сводные показатели по всем проектам'
        }
        action={
          <Select
            aria-label="Период статистики"
            className="select__trigger--period"
            value={period}
            onValueChange={setPeriod}
          >
            <option value="30">Последние 30 дней</option>
            <option value="7">Последние 7 дней</option>
          </Select>
        }
      />
      <div className="layout-grid layout-grid--four metrics">
        {[
          ['Всего вопросов', total.toLocaleString('ru-RU'), '+18%'],
          ['Ответ найден', project ? '92%' : '89%', '+2%'],
          ['Без ответа', String(unanswered), 'Требуют внимания'],
          ['Помогло', '74%', '+4%'],
        ].map(([t, v, d]) => (
          <Panel key={t}>
            <p className="text text--small text--muted">{t}</p>
            <h2>{v}</h2>
            <Badge>{d}</Badge>
          </Panel>
        ))}
      </div>
      <div className="statistics__grid">
        <Panel>
          <h3>Динамика вопросов</h3>
          <p className="text text--small text--muted">
            Количество вопросов по дням · демонстрационные данные
          </p>
          <div className="chart">
            <div className="chart__axis">
              <span>300</span>
              <span>200</span>
              <span>100</span>
              <span>0</span>
            </div>
            <div className="chart__bars">
              {bars.map((b, i) => (
                <div className="chart__column" key={i}>
                  <div className="chart__track">
                    <div
                      className="chart__bar"
                      style={{ height: `${b / 3.2}%` }}
                      title={`${b} вопросов`}
                    />
                  </div>
                  <span>{period === '7' ? i + 1 : [1, 5, 10, 15, 20, 25, 30][i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="text text--small text--muted text--right">
            {period === '7' ? 'Дни недели' : 'Дни месяца'}
          </div>
        </Panel>
        <Panel>
          <h3>Качество ответов</h3>
          <p className="text text--small text--muted">Оценки пользователей за период</p>
          <h2 className="text text--hero-number">89%</h2>
          <span className="text text--small text--muted">ответов найдено в базе знаний</span>
          {[
            ['Помогло', 74, 'var(--positive)'],
            ['Не помогло', 15, 'var(--accent)'],
            ['Без оценки', 11, 'var(--secondary)'],
          ].map(([t, n, color]) => (
            <div className="statistics__quality" key={t}>
              <div className="layout-row layout-row--between text text--small">
                <span>{t}</span>
                <b>{n}%</b>
              </div>
              <div className="progress">
                <span style={{ width: `${n}%`, background: color }} />
              </div>
            </div>
          ))}
        </Panel>
      </div>
      {!project && (
        <Panel className="data-table">
          <h3>Проекты</h3>
          <div className="data-table__scroll">
            <table>
              <thead>
                <tr>
                  <th>Проект</th>
                  <th>Вопросы</th>
                  <th>Ответ найден</th>
                  <th>Без ответа</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, i) => (
                  <tr key={p.id}>
                    <td>
                      <Link className="layout-row" to={`/app/projects/${p.id}/analytics`}>
                        <Avatar name={p.name} />
                        <span>{p.name}</span>
                        <span className="text text--small text--muted">{p.url}</span>
                      </Link>
                    </td>
                    <td>{i ? 2234 : 1248}</td>
                    <td className="text text--positive">{i ? '87%' : '92%'}</td>
                    <td>
                      <Link className="text-link" to={`/app/inbox?project=${p.id}`}>
                        {db.conversations.filter((c) => c.projectId === p.id && !c.answered).length}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      <p className="text text--small text--muted">
        График и проценты — демо-данные. Список неотвеченных вопросов связан с локальными диалогами.
      </p>
    </>
  );
}
export function Inbox() {
  const { db, update, toast } = useStore();
  const [params] = useSearchParams();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('unanswered');
  const [project, setProject] = useState(params.get('project') || '');
  const [selected, setSelected] = useState('');
  const [mobileChat, setMobileChat] = useState(false);
  const [attachment, setAttachment] = useState('');
  const conversations = db.conversations.filter(
    (c) =>
      (!project || c.projectId === project) &&
      (filter === 'all' || !c.answered) &&
      c.question.toLowerCase().includes(search.toLowerCase()),
  );
  const chosen = db.conversations.find((c) => c.id === selected) || conversations[0];
  const projectName = db.projects.find((p) => p.id === chosen?.projectId)?.name || '';
  return (
    <>
      <Heading
        title="Вопросы без ответа"
        sub="Выберите диалог и ответьте пользователю прямо в этом окне"
        action={<Badge>{db.conversations.filter((c) => !c.answered).length} без ответа</Badge>}
      />
      <div className={`inbox ${mobileChat ? 'inbox--show-chat' : ''}`}>
        <section className="inbox__list">
          <div className="layout-row layout-row--between">
            <h3>Диалоги</h3>
            <Badge>{conversations.length} сообщений</Badge>
          </div>
          <SearchField value={search} onChange={setSearch} placeholder="Поиск по сообщениям" />
          <Select
            aria-label="Фильтр по проекту"
            value={project}
            onValueChange={(value) => {
              setProject(value);
              setSelected('');
            }}
          >
            <option value="">Все проекты</option>
            {db.projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          <div className="filter-pills">
            <button
              className={
                filter === 'unanswered'
                  ? 'filter-pills__button filter-pills__button--selected'
                  : 'filter-pills__button'
              }
              onClick={() => setFilter('unanswered')}
            >
              Без ответа
            </button>
            <button
              className={
                filter === 'all'
                  ? 'filter-pills__button filter-pills__button--selected'
                  : 'filter-pills__button'
              }
              onClick={() => setFilter('all')}
            >
              Все
            </button>
          </div>
          <div className="inbox__dialogs">
            {conversations.map((c) => (
              <button
                key={c.id}
                className={`inbox__dialog ${chosen?.id === c.id ? 'inbox__dialog--selected' : ''}`}
                onClick={() => {
                  setSelected(c.id);
                  setMobileChat(true);
                }}
              >
                <Avatar name={db.projects.find((p) => p.id === c.projectId)?.name || 'П'} />
                <div>
                  <div className="layout-row layout-row--between">
                    <b>{c.question}</b>
                    <span className="text text--tiny text--muted">{c.time}</span>
                  </div>
                  <p className="text text--small text--muted">
                    {c.answered ? 'Ответ отправлен' : 'Бот не нашёл ответ в базе знаний'}
                  </p>
                  <span className="source text text--tiny">
                    {db.projects.find((p) => p.id === c.projectId)?.name}
                  </span>
                </div>
                {!c.answered && <span className="inbox__unread" />}
              </button>
            ))}
            {!conversations.length && (
              <Empty title="Вопросов нет">
                <p className="text text--small text--muted">
                  Все сообщения обработаны или не подходят под фильтр
                </p>
              </Empty>
            )}
          </div>
        </section>
        <section className="inbox__chat">
          {chosen ? (
            <>
              <header className="inbox__header">
                <button
                  className="icon-button visibility visibility--mobile"
                  aria-label="Назад к диалогам"
                  onClick={() => setMobileChat(false)}
                >
                  <ArrowLeft />
                </button>
                <Avatar name={projectName} />
                <div>
                  <h3>{chosen.question}</h3>
                  <p className="text text--small text--muted">
                    {projectName} · Посетитель #{chosen.id.slice(-4)}
                  </p>
                </div>
                <Badge good={chosen.answered}>{chosen.answered ? 'Отвечено' : 'Без ответа'}</Badge>
              </header>
              <div className="conversation conversation--inbox" aria-live="polite">
                <span className="conversation__date">Сегодня</span>
                {chosen.messages.map((m) => (
                  <div
                    className={`bubble ${m.role === 'admin' ? 'bubble--user' : m.role === 'bot' ? 'bubble--notice' : 'bubble--bot'}`}
                    key={m.id}
                  >
                    <span className="text text--tiny text--muted">
                      {m.role === 'visitor'
                        ? 'Посетитель'
                        : m.role === 'admin'
                          ? 'Ваш ответ'
                          : 'FAQ-бот'}
                    </span>
                    <p>{m.text}</p>
                  </div>
                ))}
                {attachment && (
                  <p className="text text--small text--muted">
                    <Paperclip size={14} />
                    {attachment}
                  </p>
                )}
              </div>
              <form
                className="composer"
                key={chosen.id}
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const text = String(new FormData(form).get('message')).trim();
                  if (!text) return;
                  const chatId = chosen.id;
                  update((d) => {
                    const c = d.conversations.find((c) => c.id === chatId)!;
                    c.messages.push({
                      id: crypto.randomUUID(),
                      role: 'admin',
                      text: attachment ? `${text} [Вложение: ${attachment}]` : text,
                    });
                    c.answered = true;
                  });
                  setSelected(chatId);
                  setFilter('all');
                  setAttachment('');
                  form.reset();
                  toast('Ответ сохранён в демо-диалоге');
                }}
              >
                <label className="icon-button">
                  <span className="sr-only">Прикрепить файл</span>
                  <Paperclip size={19} />
                  <input
                    type="file"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        if (f.size > 25 * 1024 * 1024) {
                          toast('Выберите файл до 25 МБ');
                          return;
                        }
                        setAttachment(f.name);
                      }
                    }}
                  />
                </label>
                <input
                  aria-label="Ответ пользователю"
                  name="message"
                  placeholder="Напишите ответ пользователю…"
                  required
                />
                <Button>
                  <Send size={17} />
                  <span>Отправить</span>
                </Button>
              </form>
            </>
          ) : (
            <Empty title="Выберите диалог">
              <MessageSquare size={32} />
            </Empty>
          )}
        </section>
      </div>
      <p className="text text--small text--muted">
        Демо: сообщения сохраняются локально. Отправка посетителю потребует подключения сервера.
      </p>
    </>
  );
}
export function Partner() {
  return (
    <>
      <Heading
        title="Партнёрское подключение"
        sub="Интеграция собственного виджета через ваш сервер"
      />
      <Panel>
        <h3>Последовательность подключения</h3>
        {[
          'Посетитель задаёт вопрос в виджете партнёра',
          'Сервер партнёра выполняет свою авторизацию',
          'Сервер вызывает REST API агента',
          'Ответ возвращается в виджет посетителя',
        ].map((t, i) => (
          <div className="checklist__row" key={t}>
            <span className="number">{i + 1}</span>
            {t}
          </div>
        ))}
        <p className="text text--muted">
          Контракт API и серверные ключи согласуем с Go-командой. Секретный ключ не должен попадать
          в код браузера.
        </p>
      </Panel>
    </>
  );
}
export function Platform() {
  const { db } = useStore();
  const [search, setSearch] = useState('');
  return (
    <>
      <Heading title="Аудит" sub="Локальная история демонстрационных операций" />
      <SearchField value={search} onChange={setSearch} placeholder="Поиск по событиям" />
      <Panel>
        {db.transactions
          .filter((t) => t.text.toLowerCase().includes(search.toLowerCase()))
          .map((t) => (
            <div className="processing__document" key={t.id}>
              {t.text} · {t.date}
            </div>
          ))}
        <p className="text text--muted">
          Полный серверный аудит и права platform-admin будут доступны после подключения API.
        </p>
      </Panel>
    </>
  );
}
