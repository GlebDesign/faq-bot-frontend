import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  FileText,
  Upload,
  Type,
  Video,
  Plus,
  Trash2,
  RefreshCw,
  Check,
  ArrowRight,
} from 'lucide-react';
import { useStore } from '../store';
import type { Document } from '../types';
import { Badge, Button, Empty, Field, Heading, Modal, Panel, Progress, SearchField } from '../ui';
export function Materials({ adding = false }: { adding?: boolean }) {
  const { id } = useParams();
  const { db, update, toast } = useStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'file' | 'text' | 'media'>();
  const [editing, setEditing] = useState<Document>();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [file, setFile] = useState<File>();
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState<Document>();
  const input = useRef<HTMLInputElement>(null);
  const docs = db.documents.filter((d) => d.projectId === id);
  const visible = docs.filter(
    (d) =>
      (filter === 'all' || d.kind === filter) &&
      d.name.toLowerCase().includes(search.toLowerCase()),
  );
  const open = (kind: 'file' | 'text' | 'media') => {
    setFile(undefined);
    setError('');
    setMode(kind);
  };
  const choose = (next?: File) => {
    if (!next) return;
    const ext = next.name.split('.').pop()?.toLowerCase();
    const allowed =
      mode === 'media' ? ['mp3', 'wav', 'm4a', 'mp4', 'webm', 'mov'] : ['pdf', 'docx', 'txt'];
    if (!ext || !allowed.includes(ext)) {
      setError('Неподдерживаемый формат файла');
      return;
    }
    if (next.size > 25 * 1024 * 1024) {
      setError('Размер файла не должен превышать 25 МБ');
      return;
    }
    setError('');
    setFile(next);
  };
  return (
    <>
      <Heading
        title={adding || !docs.length ? 'Добавьте материалы' : 'Загруженные материалы'}
        sub="Агент будет использовать их как источник для ответов пользователям"
        action={
          docs.length > 0 &&
          !adding && (
            <Button onClick={() => navigate(`/app/projects/${id}/sources`)}>
              <Plus size={16} />
              Добавить источник
            </Button>
          )
        }
      />
      {adding || !docs.length ? (
        <>
          <div className="grid three source-grid">
            {[
              {
                kind: 'file' as const,
                icon: Upload,
                title: 'Загрузить файл',
                desc: 'PDF, DOCX, TXT до 25 МБ',
                cta: 'Выбрать файл',
              },
              {
                kind: 'text' as const,
                icon: Type,
                title: 'Добавить текст',
                desc: 'Вставить информацию вручную',
                cta: 'Открыть редактор',
              },
              {
                kind: 'media' as const,
                icon: Video,
                title: 'Аудио или видео',
                desc: 'MP3, WAV, MP4 до 25 МБ',
                cta: 'Загрузить медиа',
              },
            ].map((s) => (
              <button className="panel source-card" key={s.kind} onClick={() => open(s.kind)}>
                <span className="avatar">
                  <s.icon size={22} />
                </span>
                <h3>{s.title}</h3>
                <p className="small muted">{s.desc}</p>
                <span className="text-link small">{s.cta} →</span>
              </button>
            ))}
          </div>
          <div className="hint-strip">
            <div>
              <b className="accent">Что дальше</b>
              <p className="small">
                После обработки материалов станет доступна проверка ответов агента
              </p>
            </div>
          </div>
          <p className="small muted">Можно добавить несколько источников и вернуться к ним позже</p>
          {docs.length > 0 && (
            <Link className="button secondary" to={`/app/projects/${id}/materials`}>
              К загруженным материалам <ArrowRight size={16} />
            </Link>
          )}
        </>
      ) : (
        <>
          <Panel className="toolbar">
            <SearchField value={search} onChange={setSearch} placeholder="Поиск по материалам…" />
            <div className="filter-pills">
              {[
                ['all', `Все · ${docs.length}`],
                ['file', 'Файлы'],
                ['text', 'Текст'],
                ['media', 'Медиа'],
              ].map(([v, label]) => (
                <button
                  className={filter === v ? 'selected' : ''}
                  key={v}
                  onClick={() => setFilter(v)}
                >
                  {label}
                </button>
              ))}
            </div>
          </Panel>
          <Panel className="table-panel">
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Название</th>
                    <th>Статус</th>
                    <th>Обновлено</th>
                    <th>
                      <span className="sr-only">Действия</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((d) => (
                    <tr key={d.id}>
                      <td>
                        <button className="plain-button" onClick={() => setEditing(d)}>
                          <b>{d.name}</b>
                          <span className="small muted">{d.size}</span>
                        </button>
                      </td>
                      <td>
                        <Badge good={d.status === 'ready'}>
                          {d.status === 'ready'
                            ? 'Обработан'
                            : d.status === 'processing'
                              ? 'Обработка'
                              : 'Ошибка'}
                        </Badge>
                      </td>
                      <td className="muted small">{d.updated}</td>
                      <td>
                        <div className="row end">
                          <button
                            className="icon-button"
                            aria-label={`Повторно обработать ${d.name}`}
                            onClick={() => {
                              update((x) => {
                                x.documents.find((doc) => doc.id === d.id)!.status = 'processing';
                              });
                              navigate(`/app/projects/${id}/processing`);
                            }}
                          >
                            <RefreshCw size={16} />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Удалить ${d.name}`}
                            onClick={() => setDeleting(d)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!visible.length && (
              <Empty title="Материалы не найдены">
                <p className="muted">Измените запрос или добавьте источник</p>
              </Empty>
            )}
            <div className="row between table-footer">
              <span>
                Показано {visible.length} из {docs.length}
              </span>
              <Link className="text-link" to={`/app/projects/${id}/test`}>
                Проверить ответы →
              </Link>
            </div>
          </Panel>
        </>
      )}
      {(mode || editing) && (
        <Modal
          title={
            editing
              ? 'Просмотр и редактирование материала'
              : mode === 'text'
                ? 'Добавить текст'
                : mode === 'media'
                  ? 'Загрузить медиа'
                  : 'Загрузить файл'
          }
          onClose={() => {
            setMode(undefined);
            setEditing(undefined);
          }}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              if (!editing && mode !== 'text' && !file) {
                setError('Сначала выберите файл');
                return;
              }
              const content = String(f.get('content') || '');
              let text = content;
              if (file?.name.endsWith('.txt')) text = await file.text();
              update((d) => {
                if (editing) {
                  const doc = d.documents.find((x) => x.id === editing.id)!;
                  doc.name = String(f.get('title'));
                  doc.content = content;
                  doc.status = 'processing';
                  doc.updated = 'Сегодня';
                } else
                  d.documents.push({
                    id: crypto.randomUUID(),
                    projectId: id!,
                    name: mode === 'text' ? String(f.get('title')) : file!.name,
                    kind: mode!,
                    content: text || 'Содержимое файла будет обработано после подключения сервера.',
                    size:
                      mode === 'text'
                        ? `Текст · ${content.length} символов`
                        : `${(file!.size / 1024 / 1024).toFixed(1)} МБ`,
                    status: 'processing',
                    updated: 'Сегодня',
                  });
              });
              setMode(undefined);
              setEditing(undefined);
              navigate(`/app/projects/${id}/processing`);
            }}
          >
            {mode === 'text' || editing ? (
              <>
                <Field
                  label="Название материала"
                  name="title"
                  required
                  defaultValue={editing?.name}
                  maxLength={120}
                />
                <label className="field">
                  <span>Содержание</span>
                  <textarea
                    name="content"
                    defaultValue={editing?.content}
                    required
                    rows={8}
                    placeholder="Добавьте информацию о компании, услугах и частых вопросах…"
                  />
                </label>
              </>
            ) : (
              <>
                <input
                  ref={input}
                  type="file"
                  className="sr-only"
                  accept={mode === 'media' ? '.mp3,.wav,.m4a,.mp4,.webm,.mov' : '.pdf,.docx,.txt'}
                  onChange={(e) => choose(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className="upload-zone"
                  onClick={() => input.current?.click()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    choose(e.dataTransfer.files[0]);
                  }}
                >
                  <Upload size={28} />
                  <h3>Перетащите файл сюда</h3>
                  <span className="muted">или выберите на компьютере</span>
                  <span className="small muted">До 25 МБ</span>
                </button>
                {file && (
                  <div className="hint-strip">
                    <FileText size={20} />
                    <div>
                      <b>{file.name}</b>
                      <p className="small muted">{(file.size / 1024).toFixed(1)} КБ</p>
                    </div>
                    <Check size={18} />
                  </div>
                )}
                <p className="small muted">
                  Демо: сохраняется название файла. Разбор PDF, документов и транскрибация
                  выполняются сервером.
                </p>
              </>
            )}
            {error && (
              <p role="alert" className="error">
                {error}
              </p>
            )}
            <div className="row end">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setMode(undefined);
                  setEditing(undefined);
                }}
              >
                Отмена
              </Button>
              <Button>{editing ? 'Сохранить и обработать' : 'Загрузить'}</Button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Удалить материал?" onClose={() => setDeleting(undefined)}>
          <p>«{deleting.name}» будет удалён из базы знаний проекта.</p>
          <div className="row end">
            <Button variant="secondary" onClick={() => setDeleting(undefined)}>
              Отмена
            </Button>
            <Button
              onClick={() => {
                update((d) => {
                  d.documents = d.documents.filter((x) => x.id !== deleting.id);
                });
                setDeleting(undefined);
                toast('Материал удалён');
              }}
            >
              Удалить
            </Button>
          </div>
        </Modal>
      )}
    </>
  );
}
export function Processing() {
  const { id } = useParams();
  const { db, update } = useStore();
  const [progress, setProgress] = useState(0);
  const done = useRef(false);
  const updateRef = useRef(update);
  updateRef.current = update;
  useEffect(() => {
    const timer = setInterval(() => setProgress((p) => Math.min(100, p + 8)), 240);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (progress === 100 && !done.current) {
      done.current = true;
      updateRef.current((d) => {
        d.documents
          .filter((x) => x.projectId === id && x.status === 'processing')
          .forEach((x) => {
            x.status = 'ready';
          });
        const p = d.projects.find((x) => x.id === id);
        if (p) p.progress = Math.max(p.progress, 60);
      });
    }
  }, [progress, id]);
  return (
    <>
      <Heading
        title="Обработка материалов"
        sub="Подготавливаем материалы для поиска ответов агента"
      />
      <Panel className="processing">
        <div
          className="progress-circle"
          style={{
            background: `conic-gradient(var(--accent) ${progress * 3.6}deg,var(--muted) 0)`,
          }}
        >
          <span>{progress}%</span>
        </div>
        <h2>{progress === 100 ? 'Материалы обработаны' : 'Обрабатываем материалы'}</h2>
        <p className="muted">
          {progress === 100
            ? 'Теперь можно проверить ответы агента'
            : 'Демонстрация этапов: фрагменты, индексирование, подготовка поиска'}
        </p>
        <Progress value={progress} />
      </Panel>
      <Panel>
        <h3>Добавленные материалы</h3>
        {db.documents
          .filter((d) => d.projectId === id)
          .map((d) => (
            <div className="document-progress row between" key={d.id}>
              <div className="row">
                <FileText size={20} />
                <div>
                  <b>{d.name}</b>
                  <p className="muted small">{d.size}</p>
                </div>
              </div>
              <Badge good={progress === 100}>
                {progress === 100 ? 'Обработан' : `${progress}%`}
              </Badge>
            </div>
          ))}
      </Panel>
      <div className="row end">
        <Link
          className={`button ${progress === 100 ? 'primary' : 'secondary disabled'}`}
          aria-disabled={progress !== 100}
          onClick={(e) => {
            if (progress !== 100) e.preventDefault();
          }}
          to={`/app/projects/${id}/test`}
        >
          Перейти к проверке <ArrowRight size={16} />
        </Link>
      </div>
    </>
  );
}
