import { useRef, useState } from 'react';
import { Mail, Upload } from 'lucide-react';
import { useStore } from '../store';
import { Avatar, Button, Field, Heading, Modal, Panel } from '../ui';
import type { NotificationPreferences } from '../types';

const defaults: NotificationPreferences = { unanswered: true, processing: true, support: false };
const notificationRows: [keyof NotificationPreferences, string, string][] = [
  ['unanswered', 'Вопросы без ответа', 'Бот не нашёл информацию в базе знаний'],
  ['processing', 'Обработка материалов', 'Готовность источников и ошибки обработки'],
  ['support', 'Ответы поддержки', 'Изменения статуса ваших заявок'],
];

export function AccountSettings() {
  const { db, update, toast } = useStore();
  const user = db.user!;
  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [avatar, setAvatar] = useState(user.avatar ?? '/profile-avatar.png');
  const [notifications, setNotifications] = useState({ ...defaults, ...user.notifications });
  const [password, setPassword] = useState(false);
  const [imageError, setImageError] = useState('');
  const [readingImage, setReadingImage] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const imageRequest = useRef(0);

  const restore = () => {
    imageRequest.current++;
    setReadingImage(false);
    setName(user.name);
    setEmail(user.email);
    setAvatar(user.avatar ?? '/profile-avatar.png');
    setNotifications({ ...defaults, ...user.notifications });
    setImageError('');
    if (fileInput.current) fileInput.current.value = '';
  };
  const loadPhoto = async (file?: File) => {
    if (!file) return;
    const request = ++imageRequest.current;
    setImageError('');
    setReadingImage(false);
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      setImageError('Выберите изображение JPG или PNG.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setImageError('Размер фото должен быть не больше 2 МБ.');
      return;
    }
    setReadingImage(true);
    try {
      const data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('read'));
        reader.readAsDataURL(file);
      });
      const image = new Image();
      image.src = data;
      await image.decode();
      if (request === imageRequest.current) setAvatar(data);
    } catch {
      if (request === imageRequest.current)
        setImageError('Не удалось открыть фото. Выберите другое изображение.');
    } finally {
      if (request === imageRequest.current) setReadingImage(false);
    }
  };

  return (
    <div className="account-page account-settings">
      <Heading title="Настройки аккаунта" sub="Личные данные, безопасность и уведомления" />
      <form
        className="account-settings__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!name.trim()) return;
          if (
            update((d) => {
              d.user = {
                ...d.user!,
                name: name.trim(),
                email: email.trim(),
                avatar,
                notifications,
              };
            })
          )
            toast('Настройки сохранены');
        }}
      >
        <div className="account-settings__grid">
          <Panel className="profile">
            <h2>Профиль</h2>
            <div className="profile__identity">
              <Avatar name={name || user.name} src={avatar} className="profile__photo" />
              <div>
                <h3>{name || user.name}</h3>
                <button
                  type="button"
                  className="text-link profile__photo-action"
                  onClick={() => fileInput.current?.click()}
                >
                  <Upload size={16} />
                  {readingImage ? 'Загружаем фото…' : 'Изменить фото'}
                </button>
                <p className="text text--small text--muted">JPG, PNG до 2 МБ</p>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                aria-label="Фото профиля"
                tabIndex={-1}
                onChange={(e) => {
                  void loadPhoto(e.target.files?.[0]);
                  e.target.value = '';
                }}
              />
            </div>
            {imageError && (
              <p className="text text--error" role="alert">
                {imageError}
              </p>
            )}
            <Field
              label="Имя и фамилия"
              name="name"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={80}
              pattern=".*\S.*"
            />
            <Field
              label="Электронная почта"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={254}
            />
            <p className="text text--small text--muted profile__hint">
              Данные используются для входа и связи с вами
            </p>
          </Panel>
          <Panel className="password-reset">
            <h2>Пароль</h2>
            <div className="password-reset__explanation">
              <span className="password-reset__icon">
                <Mail size={24} strokeWidth={1.7} />
              </span>
              <div>
                <p>Для смены пароля отправим письмо со ссылкой на вашу почту.</p>
                <strong>{user.email}</strong>
              </div>
            </div>
            <div className="password-reset__request">
              <Button type="button" variant="dark" onClick={() => setPassword(true)}>
                Сменить пароль
              </Button>
              <p className="text text--muted">
                Перейдите по ссылке из письма,
                <br />
                чтобы задать новый пароль.
              </p>
            </div>
          </Panel>
        </div>
        <Panel className="notifications">
          <h2>Уведомления</h2>
          <p className="text text--small text--muted">
            Выберите, о чём сообщать вам по электронной почте
          </p>
          <div className="notifications__list">
            {notificationRows.map(([key, title, description]) => (
              <div className="notifications__row" key={key}>
                <div>
                  <label id={`notification-${key}`} htmlFor={`switch-${key}`}>
                    {title}
                  </label>
                  <p className="text text--small text--muted">{description}</p>
                </div>
                <button
                  id={`switch-${key}`}
                  type="button"
                  role="switch"
                  aria-checked={notifications[key]}
                  aria-labelledby={`notification-${key}`}
                  className="toggle-switch"
                  onClick={() => setNotifications((n) => ({ ...n, [key]: !n[key] }))}
                >
                  <span />
                </button>
              </div>
            ))}
          </div>
        </Panel>
        <div className="account-settings__actions">
          <Button type="button" variant="secondary" onClick={restore}>
            Отмена
          </Button>
          <Button type="submit" disabled={readingImage}>
            Сохранить изменения
          </Button>
        </div>
      </form>
      {password && (
        <Modal title="Смена пароля" onClose={() => setPassword(false)}>
          <p>
            Ссылка для смены пароля будет приходить на <strong>{user.email}</strong>.
          </p>
          <p className="text text--muted">
            Сейчас доступен деморежим: письмо не отправляется. Отправку подключим вместе с сервером.
          </p>
          <div className="modal__actions">
            <Button variant="secondary" onClick={() => setPassword(false)}>
              Закрыть
            </Button>
            <Button
              onClick={() => {
                setPassword(false);
                toast('Демо-запрос на смену пароля создан. Письмо не отправлено.');
              }}
            >
              Запросить письмо
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
