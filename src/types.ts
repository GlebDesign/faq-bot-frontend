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
  status: 'Новая' | 'В работе' | 'Закрыта';
  created: string;
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
export type User = { name: string; email: string };
export type DB = {
  user: User | null;
  projects: Project[];
  documents: Document[];
  conversations: Conversation[];
  tickets: Ticket[];
  widgets: Record<string, WidgetConfig>;
  balance: number;
  transactions: { id: string; text: string; amount: number; date: string }[];
};
