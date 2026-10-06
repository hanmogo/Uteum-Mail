export type Provider = "Gmail" | "네이버" | "다음" | "카카오메일";
export type Permission = "allowed" | "off" | "unknown";
export type Category =
  | "work"
  | "personal"
  | "promotion"
  | "transaction"
  | "security";
export type Scenario =
  | "normal"
  | "empty"
  | "analysis-pending"
  | "analysis-failed"
  | "connection-expired"
  | "unsubscribe-partial"
  | "send-failed"
  | "send-unknown";

export interface MailAccount {
  id: string;
  provider: Provider;
  address: string;
  label: string;
  purpose: "personal" | "work" | "mixed";
  color: string;
  connection: "connected" | "setup" | "disconnected" | "expired";
  basic: Permission;
  ai: Permission;
  historyDays: 0 | 30;
  newMailAnalysis: boolean;
  dataDeleted: boolean;
}
export interface Thread {
  id: string;
  accountId: string;
  subject: string;
}
export interface Attachment {
  id: string;
  name: string;
  size: string;
  path: string;
}
export interface Message {
  id: string;
  threadId: string;
  accountId: string;
  sender: string;
  address: string;
  to: string;
  body: string;
  at: string;
  direction: "received" | "sent";
  category: Category;
  important: boolean;
  read: boolean;
  revision: number;
  fieldRevisions: { important: number; category: number };
  attachments: Attachment[];
}
export interface HistoryEntry {
  id: string;
  at: string;
  text: string;
}
export interface Task {
  id: string;
  accountId: string;
  threadId: string;
  messageIds: string[];
  title: string;
  counterpart: string;
  kind: "reply" | "deliver" | "waiting";
  status: "proposed" | "active" | "waiting" | "completed" | "excluded";
  deadline: string;
  reminder: string;
  note: string;
  previousStatus?: "active" | "waiting" | "proposed";
  proposal?: { deadline: string; messageId: string };
  history: HistoryEntry[];
}
export interface Draft {
  id: string;
  accountId: string;
  threadId?: string;
  taskId?: string;
  mode: "new" | "reply" | "forward";
  to: string;
  cc: string;
  subject: string;
  body: string;
  attachments: Attachment[];
  revision: number;
  preparation: number;
  status:
    | "editing"
    | "preparing"
    | "ready"
    | "sending"
    | "sent"
    | "failed"
    | "unknown"
    | "retry";
  notice: string;
  saved: boolean;
}
export interface RuleConfig {
  title: string;
  accountId: string;
  keyword: string;
  exceptions: string;
  action: "important" | "promotion";
  applyExisting: boolean;
  future: boolean;
  enabled: boolean;
}
export interface RuleChange {
  id: string;
  at: string;
  previous: RuleConfig | null;
  applied: {
    messageId: string;
    field: "important" | "category";
    important: boolean;
    category: Category;
    afterRevision: number;
  }[];
}
export interface Rule extends RuleConfig {
  id: string;
  changes: RuleChange[];
}
export interface ServiceRecord {
  id: string;
  accountId: string;
  name: string;
  description: string;
  source: "connection" | "manual" | "mail";
  checkedAt: string;
  messageId?: string;
}
export interface Subscription {
  id: string;
  serviceId: string;
  accountId: string;
  marketing: boolean;
  keepTransactional: boolean;
  route: "automatic" | "manual";
  status:
    | "active"
    | "requesting"
    | "requested"
    | "confirmed"
    | "failed"
    | "manual";
  history: HistoryEntry[];
}
export interface AnalysisJob {
  id: string;
  accountId: string;
  kind: "required" | "summary";
  status: "pending" | "completed" | "failed" | "retry";
  note: string;
}
export interface AssistantTurn {
  id: string;
  role: "user" | "assistant";
  text: string;
  context?: { accountId: string; messageId?: string };
  refs: {
    label: string;
    href: string;
    accountId: string;
    messageId?: string;
  }[];
  clarification?: "advertising" | "rule";
}
export interface PrototypeState {
  version: 1;
  clock: string;
  sequence: number;
  scenario: Scenario;
  accounts: MailAccount[];
  threads: Thread[];
  messages: Message[];
  tasks: Task[];
  drafts: Draft[];
  rules: Rule[];
  services: ServiceRecord[];
  subscriptions: Subscription[];
  jobs: AnalysisJob[];
  turns: AssistantTurn[];
}
export const CATEGORY_LABELS: Record<Category, string> = {
  work: "업무",
  personal: "개인",
  promotion: "광고",
  transaction: "주문·거래",
  security: "보안",
};
export const TASK_LABELS: Record<Task["status"], string> = {
  proposed: "업무 후보",
  active: "진행 중",
  waiting: "답변 대기",
  completed: "완료",
  excluded: "제외",
};
export const SCENARIO_LABELS: Record<Scenario, string> = {
  normal: "기본 체험",
  empty: "빈 메일함",
  "analysis-pending": "분석 대기",
  "analysis-failed": "AI 분석 실패",
  "connection-expired": "계정 연결 만료",
  "unsubscribe-partial": "수신 해제 일부 실패",
  "send-failed": "발송 실패",
  "send-unknown": "발송 결과 미확인",
};
