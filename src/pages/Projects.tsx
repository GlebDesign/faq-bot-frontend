import { useRef, useState } from 'react';
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
import { ApiError } from '../api';
import { projectErrorMessage } from '../api/agents';
export function ProjectForm({ project, onClose }: { project?: Project; onClose: () => void }) {
  const { saveProject, loadProject, toast } = useStore();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [name, setName] = useState(project?.name || '');
  const [website, setWebsite] = useState(project?.url || '');
  const [snapshot, setSnapshot] = useState(project);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const pending = useRef<{ signature: string; key: string } | null>(null);
  const close = () => {
    if (!busyRef.current) onClose();
  };
  return (
    <Modal title={project ? 'Изменить проект' : 'Создать проект'} onClose={close}>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (busyRef.current) return;
          if (!name.trim() || [...name.trim()].length > 100) {
            setError('Введите название проекта от 1 до 100 символов.');
            return;
          }
          const input = {
            name: name.trim(),
            website: website.trim(),
            description: snapshot?.description || '',
          };
          const signature = JSON.stringify({ input, revision: snapshot?.revision });
          if (pending.current?.signature !== signature)
            pending.current = { signature, key: crypto.randomUUID() };
          busyRef.current = true;
          setBusy(true);
          setError('');
          try {
            const result = await saveProject(input, pending.current.key, snapshot);
            toast(project ? 'Проект обновлён' : 'Проект создан');
            onClose();
            if (!project) navigate(`/app/projects/${result.id}/sources`);
          } catch (failure) {
            setError(projectErrorMessage(failure));
            setConflict(failure instanceof ApiError && failure.status === 412);
          } finally {
            busyRef.current = false;
            setBusy(false);
          }
        }}
      >
        <p className="text text--muted">
          Проект — это отдельный сайт или клиент, для которого будет работать FAQ-бот
        </p>
        <Field
          label="Название проекта"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Support"
          required
          maxLength={200}
        />
        <Field
          label="Адрес сайта (необязательно)"
          name="url"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://acme.ru"
        />
        <p className="text text--small text--muted">Данные проекта можно изменить позже</p>
        {error && (
          <p className="text text--error" role="alert">
            {error}
          </p>
        )}
        {conflict && snapshot && (
          <Button
            type="button"
            variant="secondary"
            disabled={busy}
            onClick={async () => {
              busyRef.current = true;
              setBusy(true);
              try {
                const fresh = await loadProject(snapshot.id);
                setSnapshot(fresh);
                setName(fresh.name);
                setWebsite(fresh.url);
                pending.current = null;
                setConflict(false);
                setError('');
              } catch (failure) {
                setError(projectErrorMessage(failure));
              } finally {
                busyRef.current = false;
                setBusy(false);
              }
            }}
          >
            Загрузить свежие данные
          </Button>
        )}
        <div className="layout-grid layout-grid--two">
          <Button type="button" variant="secondary" onClick={close} disabled={busy}>
            Отмена
          </Button>
          <Button disabled={busy || conflict}>
            {busy ? 'Сохраняем…' : project ? 'Сохранить' : 'Создать проект'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
export function Dashboard() {
  const { db, projectsStatus, projectsError, loadProjects } = useStore();
  const [edit, setEdit] = useState<Project>();
  const [deleting, setDeleting] = useState<Project>();
  const [menu, setMenu] = useState('');
  const [create, setCreate] = useState(false);
  const unanswered = db.conversations.filter((c) => !c.answered).length;
  const unfinished = projectsStatus === 'ready' ? db.projects.find((p) => !p.active) : undefined;
  return (
    <>
      <Heading
        title={`Добрый день, ${db.user?.name.split(' ')[0] || 'Алексей'}`}
        sub="Управляйте проектами и следите за качеством ответов"
      />
      <div className="banner">
        <span className="avatar avatar--white">
          <MessageSquare size={20} />
        </span>
        <div>
          <h3>{unanswered} вопросов без ответа</h3>
          <p className="text text--muted text--small">
            Добавьте материалы в базу знаний, чтобы улучшить ответы агентов
          </p>
        </div>
        <Link className="button button--primary" to="/app/inbox">
          Перейти к вопросам <ArrowRight size={16} />
        </Link>
      </div>
      <Heading title="Мои проекты" sub={`${db.projects.length} проекта`} />
      <div className="dashboard__grid">
        <Panel className="project-list">
          {projectsStatus === 'loading' && (
            <Empty title="Загружаем проекты">
              <p role="status" className="text text--muted">
                Подождите немного…
              </p>
            </Empty>
          )}
          {projectsStatus === 'error' && (
            <Empty title="Не удалось загрузить проекты">
              <p role="alert" className="text text--error">
                {projectsError}
              </p>
              <Button variant="secondary" onClick={() => void loadProjects()}>
                Повторить загрузку
              </Button>
            </Empty>
          )}
          {projectsStatus === 'ready' && db.projects.length === 0 && (
            <Empty title="Создайте первый проект">
              <Button onClick={() => setCreate(true)}>
                <Plus size={16} />
                Создать проект
              </Button>
            </Empty>
          )}
          {projectsStatus === 'ready' &&
            db.projects.map((p) => (
              <div className="project-list__row" key={p.id}>
                <div className="layout-row">
                  <Avatar name={p.name} />
                  <div>
                    <h3>{p.name}</h3>
                    <span className="text text--small text--muted">
                      {p.url || 'Сайт не указан'}
                    </span>
                  </div>
                  <Badge good={p.active}>{p.active ? 'Активен' : 'Нужно настроить'}</Badge>
                  <div className="project-list__menu">
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
                <div className="layout-row project-list__metrics">
                  {p.active ? (
                    <>
                      <div>
                        <strong>92%</strong>
                        <p className="text text--small text--muted">ответов найдено</p>
                      </div>
                      <div>
                        <strong>
                          {
                            db.conversations.filter((c) => c.projectId === p.id && !c.answered)
                              .length
                          }
                        </strong>
                        <p className="text text--small text--muted">без ответа</p>
                      </div>
                    </>
                  ) : (
                    <div className="layout-row project-list__progress">
                      <span className="text text--small">Настройка</span>
                      <Progress value={p.progress} />
                      <b>{p.progress}%</b>
                    </div>
                  )}
                  <Link
                    className={`button ${p.active ? 'button--dark' : 'button--secondary'}`}
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
            <div className="layout-row">
              <Avatar name={unfinished.name} />
              <div>
                <h3>{unfinished.name}</h3>
                <span className="text text--small text--muted">{unfinished.url}</span>
              </div>
            </div>
            {[
              'Добавить материалы',
              'Проверить ответы',
              'Настроить виджет',
              'Подключить к сайту',
            ].map((t, i) => (
              <div className={`checklist__row ${i > 1 ? 'text text--muted' : ''}`} key={t}>
                <span
                  className={`checklist__dot ${i === 0 ? 'checklist__dot--done' : i === 1 ? 'checklist__dot--current' : ''}`}
                >
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
          <p className="text text--small text--muted">
            Создайте агента, загрузите материалы и подключите готовый виджет.
          </p>
        </div>
      </div>
      {edit && <ProjectForm project={edit} onClose={() => setEdit(undefined)} />}
      {deleting && (
        <DeleteProjectDialog
          key={deleting.id}
          project={deleting}
          onClose={() => setDeleting(undefined)}
        />
      )}
      {create && <ProjectForm onClose={() => setCreate(false)} />}
    </>
  );
}
function DeleteProjectDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const { deleteProject, remoteProjects, toast } = useStore();
  const key = useRef(crypto.randomUUID());
  const busyRef = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const close = () => {
    if (!busyRef.current) onClose();
  };
  return (
    <Modal title="Удалить проект?" onClose={close}>
      <p>
        Проект «{project.name}» будет удалён вместе с материалами и настройками. Это действие нельзя
        отменить.
      </p>
      {error && (
        <p className="text text--error" role="alert">
          {error}
        </p>
      )}
      <div className="layout-row layout-row--end">
        <Button variant="secondary" onClick={close} disabled={busy}>
          Отмена
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            if (busyRef.current) return;
            busyRef.current = true;
            setBusy(true);
            setError('');
            try {
              await deleteProject(project.id, key.current);
              toast(
                remoteProjects
                  ? 'Проект убран из списка. Очистка данных запрошена.'
                  : 'Проект удалён',
              );
              onClose();
            } catch (failure) {
              setError(projectErrorMessage(failure));
            } finally {
              busyRef.current = false;
              setBusy(false);
            }
          }}
        >
          {busy ? 'Удаляем…' : 'Удалить'}
        </Button>
      </div>
    </Modal>
  );
}
export function Overview() {
  const { id } = useParams();
  const { db, update, toast, remoteProjects } = useStore();
  const p = db.projects.find((x) => x.id === id)!;
  const docs = db.documents.filter((d) => d.projectId === id);
  const count = db.conversations.filter((c) => c.projectId === id && !c.answered).length;
  return (
    <>
      <Heading title="Обзор проекта" sub="Ключевая информация и быстрые действия по проекту" />
      <div className="layout-grid layout-grid--two">
        <Panel>
          <div className="layout-row">
            <Avatar name="Б" />
            <h3>База знаний</h3>
          </div>
          <h2 className="text text--large-number">{docs.length} материала</h2>
          <div className="layout-row layout-row--between">
            <span className="text text--small text--muted">Источники информации вашего агента</span>
            <Link className="text-link" to="materials">
              Открыть базу →
            </Link>
          </div>
        </Panel>
        <Panel>
          <div className="layout-row">
            <Avatar name="В" />
            <h3>Виджет</h3>
          </div>
          <h2 className="text text--large-number">{p.active ? '● Активен' : 'Не подключён'}</h2>
          <div className="layout-row layout-row--between">
            <span className="text text--small text--muted">{p.url}</span>
            {remoteProjects ? (
              <Link className="button button--secondary" to="widget">
                Настроить виджет
              </Link>
            ) : (
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
            )}
          </div>
        </Panel>
      </div>
      <div className="banner">
        <Avatar name="?" className="avatar--white" />
        <div>
          <h3>{count} вопросов без ответа</h3>
          <p className="text text--small text--muted">
            Добавьте материалы, чтобы улучшить ответы агента
          </p>
        </div>
        <Link className="button button--primary" to={`/app/inbox?project=${id}`}>
          Посмотреть вопросы
        </Link>
      </div>
      <h3 className="text text--section-label">Быстрые действия</h3>
      <div className="layout-grid layout-grid--three">
        {[
          ['+', 'Добавить материалы', 'Загрузить файл, текст или медиа', 'sources'],
          ['П', 'Проверить ответы', 'Ручная и автоматическая проверка', 'test'],
          ['В', 'Настроить виджет', 'Изменить вид и подключение', 'widget'],
        ].map(([icon, t, d, path]) => (
          <Panel key={path}>
            <div className="layout-row">
              <Avatar name={icon} />
              <div>
                <h3>{t}</h3>
                <p className="text text--small text--muted">{d}</p>
              </div>
            </div>
            <Link className="text-link panel__link" to={path}>
              Открыть →
            </Link>
          </Panel>
        ))}
      </div>
    </>
  );
}
