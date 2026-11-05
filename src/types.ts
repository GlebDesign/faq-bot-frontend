export type Project = { id: string; name: string; url: string; active: boolean; progress: number };
export type Document = {
  id: string;
  projectId: string;
  name: string;
  kind: 'file' | 'text' | 'media';
  content: string;
  size: string;
  status: 'ready' | 'processing' | 'error';
  updated: string;
};
export type Message = {
  id: string;
  role: 'visitor' | 'bot' | 'admin';
  text: string;
  source?: string;
  feedback?: 'up' | 'down';
};
export type Conversation = {
  id: string;
  projectId: string;
  question: string;
  time: string;
  answered: boolean;
  messages: Message[];
};
export type Ticket = {
  id: string;
  title: string;
  category: string;
  description: string;
  projectId: string;
  attachment?: string;
  attachmentSize?: number;
  number?: number;
  status: 'Новая' | 'В работе' | 'Решена' | 'Закрыта';
  created: string;
  updated?: string;
  history?: TicketEvent[];
};
export type TicketEvent = { date: string; title: string; body: string };
export type NotificationPreferences = {
  unanswered: boolean;
  processing: boolean;
  support: boolean;
};
export type Transaction = {
  id: string;
  text: string;
  amount: number;
  date: string;
  price?: number;
  method?: 'card' | 'sbp';
  demo?: boolean;
};
export type WidgetConfig = {
  name: string;
  greeting: string;
  placeholder: string;
  color: string;
  background: string;
  messageColor: string;
  textColor: string;
  font: string;
  radius: number;
  shape: string;
  icon: string;
  position: string;
  offset: number;
  showLabel: boolean;
  avatar: string;
  published: boolean;
};
export type User = {
  name: string;
  email: string;
  avatar?: string;
  notifications?: NotificationPreferences;
};
export type DB = {
  user: User | null;
  projects: Project[];
  documents: Document[];
  conversations: Conversation[];
  tickets: Ticket[];
  widgets: Record<string, WidgetConfig>;
  balance: number;
  transactions: Transaction[];
  accountScreensVersion?: number;
};
