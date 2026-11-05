import { useState } from 'react';
import { ArrowLeft, Paperclip, Plus } from 'lucide-react';
import { useStore } from '../store';
import { Button, Empty, Field, Heading, Modal, Panel, SearchField, Select } from '../ui';
import type { Ticket } from '../types';

const categories = [
  'Техническая проблема',
  'Вопрос по интеграции',
  'Партнёрское подключение',
  'Размещение на серверах клиента',
  'Другой вопрос',
];
const isClosed = (t: Ticket) => t.status === 'Решена' || t.status === 'Закрыта';
const ticketNumber = (t: Ticket) => (t.number ? `#${t.number}` : `#${t.id.slice(0, 6)}`);

function TicketStatus({ ticket }: { ticket: Ticket }) {
  return (
    <span
      className={`ticket-status ${isClosed(ticket) ? 'resolved' : ticket.status === 'В работе' ? 'in-progress' : 'new'}`}
    >
      {ticket.status}
    </span>
  );
}

export function Support() {
  const { db, update, toast } = useStore();
  const [create, setCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState('');
  const [mobileDetails, setMobileDetails] = useState(false);
  const [formError, setFormError] = useState('');
  const projectName = (t: Ticket) =>
    db.projects.find((p) => p.id === t.projectId)?.name ||
    (t.projectId ? 'Проект удалён' : 'Без проекта');
  const query = search.trim().toLocaleLowerCase('ru');
  const tickets = db.tickets.filter(
    (t) =>
      (filter === 'all' || (filter === 'closed' ? isClosed(t) : t.status === 'В работе')) &&
      `${ticketNumber(t)} ${t.title} ${projectName(t)} ${t.category}`
        .toLocaleLowerCase('ru')
        .includes(query),
  );
  const chosen = tickets.find((t) => t.id === selected) || tickets[0];
  const events = chosen?.history?.length
    ? chosen.history
    : chosen
      ? [
          {
            date: chosen.created,
            title: 'Заявка создана',
            body: 'Обращение сохранено в демо-кабинете.',
          },
        ]
      : [];

  return (
    <div className="account-page support-page">
      <Heading
        title="Поддержка"
        sub="Заявки, ответы команды и история обращений"
        action={
          <Button
            onClick={() => {
              setFormError('');
              setCreate(true);
            }}
          >
            <Plus size={16} />
            Создать заявку
          </Button>
        }
      />
      <div className={`support-workspace ${mobileDetails && chosen ? 'show-details' : ''}`}>
        <Panel className="support-list-panel">
          <div className="support-list-heading">
            <h2>Мои заявки</h2>
            <span className="muted">{db.tickets.length}</span>
          </div>
          <SearchField
            value={search}
            onChange={(value) => {
              setSearch(value);
              setMobileDetails(false);
            }}
            placeholder="Поиск по заявкам"
          />
          <div className="filter-pills" aria-label="Фильтр заявок">
            {[
              ['all', 'Все'],
              ['progress', 'В работе'],
              ['closed', 'Закрытые'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={filter === value ? 'selected' : ''}
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                  setMobileDetails(false);
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="support-ticket-list">
            <div className="support-table-heading" aria-hidden="true">
              <span>Заявка</span>
              <span>Статус</span>
              <span>Обновлено</span>
            </div>
            {tickets.map((t) => (
              <button
                type="button"
                key={t.id}
                className={`support-ticket-row ${chosen?.id === t.id ? 'selected' : ''}`}
                aria-label={`${t.title} · ${projectName(t)} · ${t.status}`}
                aria-pressed={chosen?.id === t.id}
                onClick={() => {
                  setSelected(t.id);
                  setMobileDetails(true);
                }}
              >
                <span className="support-ticket-copy">
                  <strong>{t.title}</strong>
                  <span className="small muted">
                    {ticketNumber(t)} · {projectName(t)}
                  </span>
                </span>
                <TicketStatus ticket={t} />
                <span className="support-ticket-updated">{t.updated || t.created}</span>
              </button>
            ))}
            {!tickets.length && (
              <Empty title={search || filter !== 'all' ? 'Ничего не найдено' : 'Заявок пока нет'}>
                <p className="small muted">
                  {search || filter !== 'all'
                    ? 'Попробуйте другой запрос или сбросьте фильтры.'
                    : 'Создайте заявку, чтобы обратиться в поддержку.'}
                </p>
                {(search || filter !== 'all') && (
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setSearch('');
                      setFilter('all');
                    }}
                  >
                    Сбросить фильтры
                  </Button>
                )}
              </Empty>
            )}
          </div>
          <p className="support-list-footer small muted">
            Показано {tickets.length} из {db.tickets.length} заявок
          </p>
        </Panel>
        <Panel className="support-details-panel">
          {chosen ? (
            <div key={chosen.id} className="support-details-content">
              <button className="support-back text-link" onClick={() => setMobileDetails(false)}>
                <ArrowLeft size={18} />К заявкам
              </button>
              <div className="ticket-topline">
                <strong className="muted">{ticketNumber(chosen)}</strong>
                <TicketStatus ticket={chosen} />
              </div>
              <div className="ticket-heading">
                <h2>{chosen.title}</h2>
                <p className="muted">{chosen.category}</p>
              </div>
              <dl className="ticket-metadata">
                <div>
                  <dt>Проект:</dt>
                  <dd>{projectName(chosen)}</dd>
                </div>
                <div>
                  <dt>Создана:</dt>
                  <dd>{chosen.created}</dd>
                </div>
              </dl>
              <div className="ticket-description">
                <h3>Описание</h3>
                <p className="pre-wrap">{chosen.description}</p>
              </div>
              {chosen.attachment && (
                <div className="support-attachment">
                  <Paperclip size={20} />
                  <span>
                    {chosen.attachment}
                    {chosen.attachmentSize
                      ? ` · ${Math.ceil(chosen.attachmentSize / 1024).toLocaleString('ru-RU')} КБ`
                      : ''}
                  </span>
                </div>
              )}
              <div className="support-history">
                <h3>История заявки</h3>
                <ol className="ticket-timeline">
                  {events.map((event, i) => (
                    <li
                      key={`${i}-${event.date}`}
                      className={
                        i === events.length - 1 && event.title === 'Ответ поддержки'
                          ? 'support-reply'
                          : ''
                      }
                    >
                      <div>
                        <time className="small muted">{event.date}</time>
                        <strong>{event.title}</strong>
                        <p className="muted">{event.body}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          ) : (
            <Empty title="Выберите заявку">
              <p className="small muted">Здесь появятся описание и история обращения.</p>
            </Empty>
          )}
        </Panel>
      </div>
      {create && (
        <Modal title="Создать заявку" onClose={() => setCreate(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const attachment = f.get('attachment') as File;
              if (attachment?.size > 25 * 1024 * 1024) {
                setFormError('Вложение должно быть до 25 МБ');
                return;
              }
              const title = String(f.get('title')).trim();
              const description = String(f.get('description')).trim();
              if (!title || !description) {
                setFormError('Укажите тему и описание проблемы.');
                return;
              }
              const id = crypto.randomUUID();
              const now = new Date().toLocaleString('ru-RU', {
                day: 'numeric',
                month: 'long',
                hour: '2-digit',
                minute: '2-digit',
              });
              if (
                update((d) => {
                  d.tickets.unshift({
                    id,
                    number: Math.max(1042, ...d.tickets.map((t) => t.number || 0)) + 1,
                    title,
                    category: String(f.get('category')),
                    description,
                    projectId: String(f.get('project') || ''),
                    attachment: attachment?.size ? attachment.name : undefined,
                    attachmentSize: attachment?.size || undefined,
                    status: 'Новая',
                    created: now,
                    updated: 'Сегодня',
                    history: [
                      {
                        date: now,
                        title: 'Заявка создана',
                        body: 'Обращение сохранено в демо-кабинете. Отправка в поддержку станет доступна после подключения сервера.',
                      },
                    ],
                  });
                })
              ) {
                setSelected(id);
                setFilter('all');
                setSearch('');
                setCreate(false);
                setMobileDetails(true);
                toast('Заявка сохранена в демо-кабинете');
              }
            }}
          >
            <Field label="Тема заявки" name="title" required maxLength={120} />
            <label className="field">
              <span>Категория</span>
              <Select name="category" aria-label="Категория">
                {categories.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
            </label>
            <label className="field">
              <span>Описание проблемы</span>
              <textarea name="description" required rows={4} maxLength={10000} />
            </label>
            <label className="field">
              <span>Проект (необязательно)</span>
              <Select name="project" aria-label="Проект (необязательно)">
                <option value="">Без проекта</option>
                {db.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </label>
            <Field label="Вложение (до 25 МБ)" name="attachment" type="file" />
            <p className="small muted">Демо: заявка и имя вложения сохраняются в этом браузере.</p>
            {formError && (
              <p className="error" role="alert">
                {formError}
              </p>
            )}
            <Button>Отправить заявку</Button>
          </form>
        </Modal>
      )}
    </div>
  );
}
