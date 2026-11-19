import { useEffect, useState } from 'react';
import {
  Link,
  Navigate,
  NavLink,
  Outlet,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';
import {
  Bell,
  ChartNoAxesColumn,
  Database,
  Headphones,
  LayoutGrid,
  Menu,
  Plus,
  Settings,
  X,
  LogOut,
  ChevronRight,
} from 'lucide-react';
import { StoreProvider, useStore } from './store';
import { Avatar, Badge, Brand, Button } from './ui';
import { Auth, Landing } from './pages/Auth';
import { Dashboard, Overview, ProjectForm } from './pages/Projects';
import { Materials, Processing } from './pages/Materials';
import { Testing, AutoCheck } from './pages/Testing';
import { WidgetPage, WidgetDemo } from './pages/Widget';
import { Statistics, Inbox, Platform, Partner } from './pages/Account';
import { AccountSettings } from './pages/AccountSettings';
import { Tokens } from './pages/Tokens';
import { Support } from './pages/Support';
import { AuthProvider, useSession } from './auth/AuthProvider';
import { authErrorMessage } from './auth/api';
const nav = [
  { to: '/app', label: 'Проекты', icon: LayoutGrid, end: true },
  { to: '/app/statistics', label: 'Общая статистика', icon: ChartNoAxesColumn },
  { to: '/app/tokens', label: 'Токены', icon: Database },
  { to: '/app/support', label: 'Поддержка', icon: Headphones },
];
function Shell() {
  const { db, toast } = useStore();
  const { logout } = useSession();
  const [menu, setMenu] = useState(false);
  const [create, setCreate] = useState(false);
  const [profile, setProfile] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const location = useLocation();
  if (!db.user)
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  return (
    <div className="app-shell">
      <aside className={`sidebar ${menu ? 'sidebar--open' : ''}`}>
        <div className="layout-row layout-row--between">
          <Link to="/app" onClick={() => setMenu(false)}>
            <Brand />
          </Link>
          <button
            className="icon-button visibility visibility--mobile"
            aria-label="Закрыть меню"
            onClick={() => setMenu(false)}
          >
            <X />
          </button>
        </div>
        <nav>
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              onClick={() => setMenu(false)}
              className={({ isActive }) =>
                `sidebar__link ${isActive || (n.end && location.pathname.includes('/projects')) ? 'sidebar__link--active' : ''}`
              }
            >
              <n.icon size={21} />
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar__bottom">
          <NavLink
            to="/app/settings"
            onClick={() => setMenu(false)}
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
          >
            <Settings size={21} />
            Настройки
          </NavLink>
          <button className="sidebar__profile" onClick={() => setProfile(!profile)}>
            <Avatar
              name={db.user.name}
              src={db.user.avatar ?? '/profile-avatar.png'}
              className="avatar--dark"
            />
            <span>{db.user.name}</span>
            <ChevronRight size={19} />
          </button>
          {profile && (
            <Button
              variant="secondary"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await logout();
                } catch (failure) {
                  toast(authErrorMessage(failure));
                } finally {
                  setLoggingOut(false);
                }
              }}
            >
              <LogOut size={17} />
              Выйти
            </Button>
          )}
        </div>
      </aside>
      {menu && (
        <button
          className="sidebar__backdrop"
          aria-label="Закрыть меню"
          onClick={() => setMenu(false)}
        />
      )}
      <main className="workspace">
        <header className="topbar">
          <div className="layout-row">
            <button
              className="icon-button visibility visibility--mobile"
              aria-label="Открыть меню"
              onClick={() => setMenu(true)}
            >
              <Menu />
            </button>
            <span className="topbar__breadcrumb">
              {location.pathname.includes('/projects/')
                ? 'Проекты'
                : location.pathname === '/app/settings'
                  ? 'Настройки аккаунта'
                  : location.pathname === '/app/tokens'
                    ? 'Токены и оплата'
                    : nav.find((n) => n.to === location.pathname)?.label || 'Главная'}
            </span>
          </div>
          <div className="topbar__actions">
            <Link
              className="icon-button"
              aria-label="Уведомления — вопросы без ответа"
              to="/app/inbox"
            >
              <Bell size={20} />
            </Link>
            <Link className="topbar__balance" to="/app/tokens" aria-label="Баланс токенов">
              <Database size={19} />
              {db.balance.toLocaleString('ru-RU')}
              <ChevronRight size={16} />
            </Link>
            <Link
              to="/app/settings"
              className="icon-button topbar__avatar"
              aria-label="Настройки аккаунта"
            >
              <Avatar
                name={db.user.name}
                src={db.user.avatar ?? '/profile-avatar.png'}
                className="avatar--dark"
              />
            </Link>
            <Button
              variant="dark"
              className="topbar__create-project"
              onClick={() => setCreate(true)}
            >
              <Plus size={16} />
              <span>Создать проект</span>
            </Button>
          </div>
        </header>
        <Outlet />
        <div className="app-shell__demo-label">Демо · данные хранятся в этом браузере</div>
      </main>
      {create && <ProjectForm onClose={() => setCreate(false)} />}
    </div>
  );
}
export function ProjectLayout() {
  const { db } = useStore();
  const { id } = useParams();
  const project = db.projects.find((p) => p.id === id);
  const loc = useLocation();
  if (!project)
    return (
      <div className="empty">
        <h1>Проект не найден</h1>
        <Link to="/app">Вернуться к проектам</Link>
      </div>
    );
  const base = `/app/projects/${id}`;
  const setup = !project.active;
  return (
    <>
      <div className="project-identity">
        <Avatar name={project.name} />
        <div>
          <h2>{project.name}</h2>
          <span className="text text--muted text--small">
            {project.url || 'Сайт ещё не указан'}
          </span>
        </div>
        <Badge good={project.active}>{project.active ? 'Активен' : 'Настройка проекта'}</Badge>
      </div>
      <nav className="project-tabs">
        {[
          ['', 'Обзор'],
          ['/materials', 'База и проверка'],
          ['/widget', 'Виджет и подключение'],
          ['/analytics', 'Аналитика'],
        ].map(([path, label]) => (
          <NavLink
            key={path}
            end={!path}
            to={base + path}
            className={({ isActive }) =>
              isActive ||
              (path === '/materials' && /test|processing|sources|auto-check/.test(loc.pathname))
                ? 'project-tabs__link project-tabs__link--active'
                : 'project-tabs__link'
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      {setup && (
        <div className="steps">
          <span className="text text--muted text--small">Настройка проекта</span>
          {['Материалы', 'Проверка', 'Виджет'].map((s, i) => (
            <Link key={s} to={base + ['/materials', '/test', '/widget'][i]}>
              <b
                className={`steps__number ${loc.pathname.includes(['/materials', '/test', '/widget'][i]) ? 'steps__number--selected' : ''}`}
              >
                {i + 1}
              </b>
              {s}
            </Link>
          ))}
        </div>
      )}
      <Outlet />
    </>
  );
}
export function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <AuthProvider
      enabled={pathname.startsWith('/app') || pathname === '/login' || pathname === '/register'}
    >
      <StoreProvider>
        <SessionBoundary
          enabled={pathname.startsWith('/app') || pathname === '/login' || pathname === '/register'}
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Auth key="login" />} />
            <Route path="/register" element={<Auth key="register" register />} />
            <Route path="/widget-demo/:id" element={<WidgetDemo />} />
            <Route path="/app" element={<Shell />}>
              <Route index element={<Dashboard />} />
              <Route path="statistics" element={<Statistics />} />
              <Route path="inbox" element={<Inbox />} />
              <Route path="tokens" element={<Tokens />} />
              <Route path="support" element={<Support />} />
              <Route path="settings" element={<AccountSettings />} />
              <Route path="audit" element={<Platform />} />
              <Route path="partner" element={<Partner />} />
              <Route path="projects/:id" element={<ProjectLayout />}>
                <Route index element={<Overview />} />
                <Route path="materials" element={<Materials />} />
                <Route path="sources" element={<Materials adding />} />
                <Route path="processing" element={<Processing />} />
                <Route path="test" element={<Testing />} />
                <Route path="auto-check" element={<AutoCheck />} />
                <Route path="widget" element={<WidgetPage />} />
                <Route path="analytics" element={<Statistics project />} />
              </Route>
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </SessionBoundary>
      </StoreProvider>
    </AuthProvider>
  );
}
function SessionBoundary({ children, enabled }: { children: React.ReactNode; enabled: boolean }) {
  const { status, error, retry } = useSession();
  if (!enabled || (status !== 'loading' && status !== 'error')) return children;
  return (
    <div className="session-screen">
      <Brand />
      {status === 'loading' ? (
        <p role="status">Проверяем сессию…</p>
      ) : (
        <>
          <h1>Не удалось проверить вход</h1>
          <p role="alert">{error}</p>
          <Button onClick={retry}>Повторить</Button>
        </>
      )}
    </div>
  );
}
function NotFound() {
  return (
    <div className="empty">
      <h1>Страница не найдена</h1>
      <Link to="/app">Перейти к проектам</Link>
    </div>
  );
}
