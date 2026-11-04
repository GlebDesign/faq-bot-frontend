import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  MessageSquare,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { useStore } from '../store';
import type { Project } from '../types';
import { Avatar, Badge, Button, Empty, Field, Heading, Modal, Panel, Progress } from '../ui';
export function ProjectForm({ project, onClose }: { project?: Project; onClose: () => void }) {
  const { update, toast } = useStore();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return (
    <Modal title={project ? 'Изменить проект' : 'Создать проект'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setBusy(true);
          const f = new FormData(e.currentTarget);
          const id = project?.id || crypto.randomUUID();
          update((d) => {
            const next = {
              id,
              name: String(f.get('name')).trim(),
              url: String(f.get('url'))
                .trim()
                .replace(/^https?:\/\//, ''),
              active: project?.active || false,
              progress: project?.progress || 0,
            };
            if (project) d.projects = d.projects.map((p) => (p.id === id ? next : p));
            else d.projects.push(next);
          });
          toast(project ? 'Проект обновлён' : 'Проект создан');
          onClose();
          if (!project) navigate(`/app/projects/${id}/sources`);
        }}
      >
        <p className="muted">
          Проект — это отдельный сайт или клиент, для которого будет работать FAQ-бот
        </p>
        <Field
          label="Название проекта"
          name="name"
          defaultValue={project?.name}
          placeholder="Acme Support"
          required
          maxLength={80}
        />
        <Field
          label="Адрес сайта (необязательно)"
          name="url"
          defaultValue={project?.url}
          placeholder="https://acme.ru"
        />
        <p className="small muted">Данные проекта можно изменить позже</p>
        <div className="grid two">
          <Button type="button" variant="secondary" onClick={onClose}>
            Отмена
          </Button>
          <Button disabled={busy}>{project ? 'Сохранить' : 'Создать проект'}</Button>
        </div>
      </form>
    </Modal>
  );
}
export function Dashboard() {
  const { db, update, toast } = useStore();
  const [edit, setEdit] = useState<Project>();
  const [deleting, setDeleting] = useState<Project>();
  const [menu, setMenu] = useState('');
  const [create, setCreate] = useState(false);
  const unanswered = db.conversations.filter((c) => !c.answered).length;
  const unfinished = db.projects.find((p) => !p.active);
  return (
    <>
      <Heading
        title={`Добрый день, ${db.user?.name.split(' ')[0] || 'Алексей'}`}
        sub="Управляйте проектами и следите за качеством ответов"
      />
      <div className="banner">
        <span className="avatar white">
          <MessageSquare size={20} />
        </span>
        <div>
          <h3>{unanswered} вопросов без ответа</h3>
          <p className="muted small">
            Добавьте материалы в базу знаний, чтобы улучшить ответы агентов
          </p>
        </div>
        <Link className="button primary" to="/app/inbox">
          Перейти к вопросам <ArrowRight size={16} />
        </Link>
      </div>
      <Heading title="Мои проекты" sub={`${db.projects.length} проекта`} />
      <div className="dashboard-grid">
        <Panel className="project-list">
          {db.projects.length === 0 && (
            <Empty title="Создайте первый проект">
              <Button onClick={() => setCreate(true)}>
                <Plus size={16} />
                Создать проект
              </Button>
            </Empty>
          )}
          {db.projects.map((p) => (
            <div className="project-row" key={p.id}>
              <div className="row">
                <Avatar name={p.name} />
                <div>
                  <h3>{p.name}</h3>
                  <span className="small muted">{p.url || 'Сайт не указан'}</span>
                </div>
                <Badge good={p.active}>{p.active ? 'Активен' : 'Нужно настроить'}</Badge>
                <div className="project-menu">
                  <button
                    className="icon-button"
                    aria-label={`Действия ${p.name}`}
                    onClick={() => setMenu(menu === p.id ? '' : p.id)}
                  >
                    <MoreHorizontal />
                  </button>
                  {menu === p.id && (
                    <div className="dropdown">
                      <button
                        onClick={() => {
                          setEdit(p);
                          setMenu('');
                        }}
                      >
                        <Settings size={15} />
                        Изменить
                      </button>
                      <button
                        onClick={() => {
                          setDeleting(p);
                          setMenu('');
                        }}
                      >
                        <Trash2 size={15} />
                        Удалить
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="row project-metrics">
                {p.active ? (
                  <>
                    <div>
                      <strong>92%</strong>
                      <p className="small muted">ответов найдено</p>
                    </div>
                    <div>
                      <strong>
                        {db.conversations.filter((c) => c.projectId === p.id && !c.answered).length}
                      </strong>
                      <p className="small muted">без ответа</p>
                    </div>
                  </>
                ) : (
                  <div className="row setup-progress">
                    <span className="small">Настройка</span>
                    <Progress value={p.progress} />
                    <b>{p.progress}%</b>
                  </div>
                )}
                <Link
                  className={`button ${p.active ? 'dark' : 'secondary'}`}
                  to={`/app/projects/${p.id}${p.active ? '' : '/sources'}`}
                >
                  {p.active ? 'Открыть проект' : 'Продолжить настройку'}
                </Link>
              </div>
            </div>
          ))}
        </Panel>
        {unfinished && (
          <Panel className="attention">
            <h2>Требует внимания</h2>
            <div className="row">
              <Avatar name={unfinished.name} />
              <div>
                <h3>{unfinished.name}</h3>
                <span className="small muted">{unfinished.url}</span>
              </div>
            </div>
            {[
              'Добавить материалы',
              'Проверить ответы',
              'Настроить виджет',
              'Подключить к сайту',
            ].map((t, i) => (
              <div className={`check-row ${i > 1 ? 'muted' : ''}`} key={t}>
                <span className={`check-dot ${i === 0 ? 'done' : i === 1 ? 'current' : ''}`}>
                  {i === 0 ? <Check size={15} /> : i === 1 ? '•' : ''}
                </span>
                {t}
              </div>
            ))}
            <Link className="text-link" to={`/app/projects/${unfinished.id}/test`}>
              Перейти к настройке →
            </Link>
          </Panel>
        )}
      </div>
      <div className="hint-strip">
        <Plus size={20} />
        <div>
          <b>Новый проект — отдельный сайт или клиент</b>
          <p className="small muted">
            Создайте агента, загрузите материалы и подключите готовый виджет.
          </p>
        </div>
      </div>
      {edit && <ProjectForm project={edit} onClose={() => setEdit(undefined)} />}
      {deleting && (
        <Modal title="Удалить проект?" onClose={() => setDeleting(undefined)}>
          <p>
            Проект «{deleting.name}» и его демонстрационные материалы будут удалены из этого
            браузера.
          </p>
          <div className="row end">
            <Button variant="secondary" onClick={() => setDeleting(undefined)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                update((d) => {
                  d.projects = d.projects.filter((p) => p.id !== deleting.id);
                  d.documents = d.documents.filter((x) => x.projectId !== deleting.id);
                  d.conversations = d.conversations.filter((x) => x.projectId !== deleting.id);
                  delete d.widgets[deleting.id];
                });
                setDeleting(undefined);
                toast('Проект удалён');
              }}
            >
              Удалить
            </Button>
          </div>
        </Modal>
      )}
      {create && <ProjectForm onClose={() => setCreate(false)} />}
    </>
  );
}
export function Overview() {
  const { id } = useParams();
  const { db, update, toast } = useStore();
  const p = db.projects.find((x) => x.id === id)!;
  const docs = db.documents.filter((d) => d.projectId === id);
  const count = db.conversations.filter((c) => c.projectId === id && !c.answered).length;
  return (
    <>
      <Heading title="Обзор проекта" sub="Ключевая информация и быстрые действия по проекту" />
      <div className="grid two">
        <Panel>
          <div className="row">
            <Avatar name="Б" />
            <h3>База знаний</h3>
          </div>
          <h2 className="large-number">{docs.length} материала</h2>
          <div className="row between">
            <span className="small muted">Источники информации вашего агента</span>
            <Link className="text-link" to="materials">
              Открыть базу →
            </Link>
          </div>
        </Panel>
        <Panel>
          <div className="row">
            <Avatar name="В" />
            <h3>Виджет</h3>
          </div>
          <h2 className="large-number">{p.active ? '● Активен' : 'Не подключён'}</h2>
          <div className="row between">
            <span className="small muted">{p.url}</span>
            <Button
              variant="secondary"
              onClick={() => {
                update((d) => {
                  d.projects.find((x) => x.id === id)!.active = !p.active;
                });
                toast(p.active ? 'Виджет на паузе' : 'Виджет активирован');
              }}
            >
              {p.active ? 'Поставить на паузу' : 'Активировать'}
            </Button>
          </div>
        </Panel>
      </div>
      <div className="banner">
        <Avatar name="?" className="white" />
        <div>
          <h3>{count} вопросов без ответа</h3>
          <p className="small muted">Добавьте материалы, чтобы улучшить ответы агента</p>
        </div>
        <Link className="button primary" to={`/app/inbox?project=${id}`}>
          Посмотреть вопросы
        </Link>
      </div>
      <h3 className="section-label">Быстрые действия</h3>
      <div className="grid three">
        {[
          ['+', 'Добавить материалы', 'Загрузить файл, текст или медиа', 'sources'],
          ['П', 'Проверить ответы', 'Ручная и автоматическая проверка', 'test'],
          ['В', 'Настроить виджет', 'Изменить вид и подключение', 'widget'],
        ].map(([icon, t, d, path]) => (
          <Panel key={path}>
            <div className="row">
              <Avatar name={icon} />
              <div>
                <h3>{t}</h3>
                <p className="small muted">{d}</p>
              </div>
            </div>
            <Link className="text-link card-link" to={path}>
              Открыть →
            </Link>
          </Panel>
        ))}
      </div>
    </>
  );
}
export function SettingsPage() {
  const { db, update, toast } = useStore();
  return (
    <>
      <Heading title="Настройки аккаунта" sub="Личные данные и параметры профиля" />
      <Panel className="narrow">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            update((d) => {
              d.user = { name: String(f.get('name')).trim(), email: String(f.get('email')) };
            });
            toast('Настройки сохранены');
          }}
        >
          <Field
            label="Имя и фамилия"
            name="name"
            defaultValue={db.user?.name}
            required
            maxLength={80}
          />
          <Field
            label="Электронная почта"
            name="email"
            type="email"
            defaultValue={db.user?.email}
            required
          />
          <Button>Сохранить изменения</Button>
        </form>
        <p className="muted small">Управление паролем станет доступно после подключения API.</p>
      </Panel>
    </>
  );
}
