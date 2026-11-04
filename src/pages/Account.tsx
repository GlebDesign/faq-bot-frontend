import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Database, File, MessageSquare, Paperclip, Plus, Send } from 'lucide-react';
import { useStore } from '../store';
import {
  Avatar,
  Badge,
  Button,
  Empty,
  Field,
  Heading,
  Modal,
  Panel,
  SearchField,
  Select,
} from '../ui';
import type { Ticket } from '../types';
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
            className="period"
            value={period}
            onValueChange={setPeriod}
          >
            <option value="30">Последние 30 дней</option>
            <option value="7">Последние 7 дней</option>
          </Select>
        }
      />
      <div className="grid four metrics">
        {[
          ['Всего вопросов', total.toLocaleString('ru-RU'), '+18%'],
          ['Ответ найден', project ? '92%' : '89%', '+2%'],
          ['Без ответа', String(unanswered), 'Требуют внимания'],
          ['Помогло', '74%', '+4%'],
        ].map(([t, v, d]) => (
          <Panel key={t}>
            <p className="small muted">{t}</p>
            <h2>{v}</h2>
            <Badge>{d}</Badge>
          </Panel>
        ))}
      </div>
      <div className="stats-grid">
        <Panel>
          <h3>Динамика вопросов</h3>
          <p className="small muted">Количество вопросов по дням · демонстрационные данные</p>
          <div className="chart">
            <div className="chart-axis">
              <span>300</span>
              <span>200</span>
              <span>100</span>
              <span>0</span>
            </div>
            <div className="chart-bars">
              {bars.map((b, i) => (
                <div className="bar-column" key={i}>
                  <div className="bar-track">
                    <div
                      className="bar"
                      style={{ height: `${b / 3.2}%` }}
                      title={`${b} вопросов`}
                    />
                  </div>
                  <span>{period === '7' ? i + 1 : [1, 5, 10, 15, 20, 25, 30][i]}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="small muted text-right">
            {period === '7' ? 'Дни недели' : 'Дни месяца'}
          </div>
        </Panel>
        <Panel>
          <h3>Качество ответов</h3>
          <p className="small muted">Оценки пользователей за период</p>
          <h2 className="hero-number">89%</h2>
          <span className="small muted">ответов найдено в базе знаний</span>
          {[
            ['Помогло', 74, 'var(--positive)'],
            ['Не помогло', 15, 'var(--accent)'],
            ['Без оценки', 11, 'var(--secondary)'],
          ].map(([t, n, color]) => (
            <div className="quality-row" key={t}>
              <div className="row between small">
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
        <Panel className="table-panel">
          <h3>Проекты</h3>
          <div className="table-scroll">
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
                      <Link className="row" to={`/app/projects/${p.id}/analytics`}>
                        <Avatar name={p.name} />
                        <span>{p.name}</span>
                        <span className="small muted">{p.url}</span>
                      </Link>
                    </td>
                    <td>{i ? 2234 : 1248}</td>
                    <td className="positive">{i ? '87%' : '92%'}</td>
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
      <p className="small muted">
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
      <div className={`inbox ${mobileChat ? 'show-chat' : ''}`}>
        <section className="inbox-list">
          <div className="row between">
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
              className={filter === 'unanswered' ? 'selected' : ''}
              onClick={() => setFilter('unanswered')}
            >
              Без ответа
            </button>
            <button className={filter === 'all' ? 'selected' : ''} onClick={() => setFilter('all')}>
              Все
            </button>
          </div>
          <div className="dialog-list">
            {conversations.map((c) => (
              <button
                key={c.id}
                className={`dialog-row ${chosen?.id === c.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelected(c.id);
                  setMobileChat(true);
                }}
              >
                <Avatar name={db.projects.find((p) => p.id === c.projectId)?.name || 'П'} />
                <div>
                  <div className="row between">
                    <b>{c.question}</b>
                    <span className="tiny muted">{c.time}</span>
                  </div>
                  <p className="small muted">
                    {c.answered ? 'Ответ отправлен' : 'Бот не нашёл ответ в базе знаний'}
                  </p>
                  <span className="source tiny">
                    {db.projects.find((p) => p.id === c.projectId)?.name}
                  </span>
                </div>
                {!c.answered && <span className="unread" />}
              </button>
            ))}
            {!conversations.length && (
              <Empty title="Вопросов нет">
                <p className="small muted">Все сообщения обработаны или не подходят под фильтр</p>
              </Empty>
            )}
          </div>
        </section>
        <section className="inbox-chat">
          {chosen ? (
            <>
              <header className="chat-header">
                <button
                  className="icon-button mobile-only"
                  aria-label="Назад к диалогам"
                  onClick={() => setMobileChat(false)}
                >
                  <ArrowLeft />
                </button>
                <Avatar name={projectName} />
                <div>
                  <h3>{chosen.question}</h3>
                  <p className="small muted">
                    {projectName} · Посетитель #{chosen.id.slice(-4)}
                  </p>
                </div>
                <Badge good={chosen.answered}>{chosen.answered ? 'Отвечено' : 'Без ответа'}</Badge>
              </header>
              <div className="conversation inbox-conversation" aria-live="polite">
                <span className="date-label">Сегодня</span>
                {chosen.messages.map((m) => (
                  <div
                    className={`bubble ${m.role === 'admin' ? 'user' : m.role === 'bot' ? 'notice' : 'bot'}`}
                    key={m.id}
                  >
                    <span className="tiny muted">
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
                  <p className="small muted">
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
      <p className="small muted">
        Демо: сообщения сохраняются локально. Отправка посетителю потребует подключения сервера.
      </p>
    </>
  );
}
export function Tokens() {
  const { db, update, toast } = useStore();
  const [pack, setPack] = useState<number>();
  return (
    <>
      <Heading title="Токены" sub="Единый баланс аккаунта для всех ваших проектов" />
      <Panel className="token-balance">
        <Database size={28} />
        <p className="muted">Доступно на аккаунте</p>
        <h2>
          {db.balance.toLocaleString('ru-RU')} <span>токенов</span>
        </h2>
        <p className="small muted">Токены используются для обработки материалов и ответов агента</p>
      </Panel>
      <Heading
        title="Выберите пакет"
        sub="Демонстрационные пакеты — реальная оплата пока не подключена"
      />
      <div className="grid three">
        {[10000, 50000, 100000].map((n, i) => (
          <Panel key={n}>
            <Badge>{['Старт', 'Оптимальный', 'Команда'][i]}</Badge>
            <h2 className="large-number">{n.toLocaleString('ru-RU')}</h2>
            <p className="muted">токенов на аккаунт</p>
            <Button
              className="full"
              variant={i === 1 ? 'primary' : 'secondary'}
              onClick={() => setPack(n)}
            >
              Выбрать пакет
            </Button>
          </Panel>
        ))}
      </div>
      <Panel>
        <h3>История пополнений</h3>
        {!db.transactions.length ? (
          <p className="muted">Пополнений пока нет</p>
        ) : (
          db.transactions.map((t) => (
            <div className="document-progress row between" key={t.id}>
              <div>
                <b>{t.text}</b>
                <p className="small muted">{t.date}</p>
              </div>
              <b className="positive">+{t.amount.toLocaleString('ru-RU')}</b>
            </div>
          ))
        )}
      </Panel>
      {pack && (
        <Modal title="Демо-пополнение" onClose={() => setPack(undefined)}>
          <p>Добавить {pack.toLocaleString('ru-RU')} тестовых токенов? Платёж не производится.</p>
          <Button
            onClick={() => {
              update((d) => {
                d.balance += pack;
                d.transactions.unshift({
                  id: crypto.randomUUID(),
                  text: 'Демо-пополнение',
                  amount: pack,
                  date: new Date().toLocaleDateString('ru-RU'),
                });
              });
              setPack(undefined);
              toast('Тестовые токены начислены');
            }}
          >
            Начислить тестовые токены
          </Button>
        </Modal>
      )}
    </>
  );
}
const categories = [
  'Техническая проблема',
  'Вопрос по интеграции',
  'Партнёрское подключение',
  'Размещение на серверах клиента',
  'Другой вопрос',
];
export function Support() {
  const { db, update, toast } = useStore();
  const [create, setCreate] = useState(false);
  const [ticket, setTicket] = useState<Ticket>();
  return (
    <>
      <Heading
        title="Поддержка"
        sub="Обратитесь к нашей команде — поможем разобраться"
        action={
          <Button onClick={() => setCreate(true)}>
            <Plus size={16} />
            Создать заявку
          </Button>
        }
      />
      <Panel className="table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Заявка</th>
                <th>Категория</th>
                <th>Статус</th>
                <th>Создана</th>
              </tr>
            </thead>
            <tbody>
              {db.tickets.map((t) => (
                <tr key={t.id}>
                  <td>
                    <button className="text-link" onClick={() => setTicket(t)}>
                      {t.title}
                    </button>
                  </td>
                  <td>{t.category}</td>
                  <td>
                    <Badge>{t.status}</Badge>
                  </td>
                  <td>{t.created}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!db.tickets.length && (
          <Empty title="Заявок пока нет">
            <p className="muted">Расскажите о проблеме, и команда поддержки поможет</p>
            <Button variant="secondary" onClick={() => setCreate(true)}>
              Создать первую заявку
            </Button>
          </Empty>
        )}
      </Panel>
      {create && (
        <Modal title="Создать заявку" onClose={() => setCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const attachment = f.get('attachment') as File;
              if (attachment?.size > 25 * 1024 * 1024) {
                toast('Вложение должно быть до 25 МБ');
                return;
              }
              update((d) => {
                d.tickets.unshift({
                  id: crypto.randomUUID(),
                  title: String(f.get('title')),
                  category: String(f.get('category')),
                  description: String(f.get('description')),
                  projectId: String(f.get('project')),
                  attachment: attachment?.name,
                  status: 'Новая',
                  created: new Date().toLocaleDateString('ru-RU'),
                });
              });
              setCreate(false);
              toast('Заявка сохранена в демо-кабинете');
            }}
          >
            <Field label="Тема заявки" name="title" required maxLength={120} />
            <label className="field">
              <span>Категория</span>
              <Select name="category">
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>Описание проблемы</span>
              <textarea name="description" required rows={4} />
            </label>
            <label className="field">
              <span>Проект (необязательно)</span>
              <Select name="project">
                <option value="">Без проекта</option>
                {db.projects.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
            <Field label="Вложение (до 25 МБ)" name="attachment" type="file" />
            <Button>Отправить заявку</Button>
          </form>
        </Modal>
      )}
      {ticket && (
        <Modal title={ticket.title} onClose={() => setTicket(undefined)}>
          <Badge>{ticket.status}</Badge>
          <p className="small muted">
            {ticket.category} · {ticket.created}
          </p>
          <p className="pre-wrap">{ticket.description}</p>
          {ticket.attachment && (
            <p className="row">
              <File size={16} />
              {ticket.attachment}
            </p>
          )}
          <p className="small muted">Серверная отправка и ответы поддержки пока не подключены.</p>
        </Modal>
      )}
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
          <div className="check-row" key={t}>
            <span className="number">{i + 1}</span>
            {t}
          </div>
        ))}
        <p className="muted">
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
            <div className="document-progress" key={t.id}>
              {t.text} · {t.date}
            </div>
          ))}
        <p className="muted">
          Полный серверный аудит и права platform-admin будут доступны после подключения API.
        </p>
      </Panel>
    </>
  );
}
