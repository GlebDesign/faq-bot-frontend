/** Implemented Go DTOs from faq-bot-backend dev c69690b. */
export type AgentInput = { name: string; website: string; description: string };
export type Agent = AgentInput & {
  id: string;
  account_id: string;
  public_id: string;
  status: 'draft' | 'published' | 'deleted';
  revision: number;
  knowledge_revision: number;
  active_knowledge_revision: number;
  config_revision: number;
  published_config_revision: number;
  public_sources_enabled: boolean;
};
export type AgentPage = { items: Agent[]; next_cursor: string | null };
export type AgentCleanup = { id: string; status: 'pending'; error_code: string | null };
