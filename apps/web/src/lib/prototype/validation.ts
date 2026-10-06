import { ACCOUNTS } from "./seed";
import { SCENARIO_LABELS, type PrototypeState } from "./types";

type Row = Record<string, unknown>;
const record = (value: unknown): value is Row =>
  !!value && typeof value === "object" && !Array.isArray(value);
const strings = (row: Row, names: string[]) =>
  names.every((name) => typeof row[name] === "string");
const flags = (row: Row, names: string[]) =>
  names.every((name) => typeof row[name] === "boolean");
const member = (value: unknown, options: readonly unknown[]) =>
  options.includes(value);
const integer = (value: unknown) =>
  Number.isSafeInteger(value) && (value as number) >= 0;
const date = (value: unknown) =>
  typeof value === "string" && Number.isFinite(Date.parse(value));
const rows = (value: unknown, valid: (row: Row) => boolean): boolean =>
  Array.isArray(value) && value.every((row) => record(row) && valid(row));
const categories = ["work", "personal", "promotion", "transaction", "security"];
const permission = ["allowed", "off", "unknown"];
const accountId = (value: unknown) =>
  ACCOUNTS.some((account) => account.id === value);
const scope = (value: unknown) => value === "all" || accountId(value);
const history = (value: unknown) =>
  rows(value, (row) => strings(row, ["id", "text"]) && date(row.at));
const attachments = (value: unknown) =>
  rows(
    value,
    (row) =>
      strings(row, ["id", "name", "size"]) &&
      row.path === "/demo/project-request.txt",
  );
const ruleConfig = (row: Row) =>
  strings(row, ["title", "keyword", "exceptions"]) &&
  scope(row.accountId) &&
  member(row.action, ["important", "promotion"]) &&
  flags(row, ["applyExisting", "future", "enabled"]);
const localHref = (value: unknown) =>
  typeof value === "string" &&
  /^\/(?:mail|tasks|settings|today|rules|services|search|onboarding)(?:\?[^\s]*)?$/.test(
    value,
  );

// Browser storage is editable and may contain an interrupted or older demo.
export function validState(value: unknown): value is PrototypeState {
  if (
    !record(value) ||
    value.version !== 1 ||
    !date(value.clock) ||
    !integer(value.sequence) ||
    !member(value.scenario, Object.keys(SCENARIO_LABELS))
  )
    return false;
  const groups = [
    "accounts",
    "threads",
    "messages",
    "tasks",
    "drafts",
    "rules",
    "services",
    "subscriptions",
    "jobs",
    "turns",
  ];
  if (
    !groups.every((name) =>
      rows(
        value[name],
        (row) => typeof row.id === "string" && /^[a-zA-Z0-9-]+$/.test(row.id),
      ),
    )
  )
    return false;
  if (
    !groups.every((name) => {
      const group = value[name] as Row[];
      return new Set(group.map((row) => row.id)).size === group.length;
    })
  )
    return false;
  if (
    !rows(
      value.accounts,
      (row) =>
        accountId(row.id) &&
        strings(row, ["address", "label", "color"]) &&
        member(row.provider, ["Gmail", "네이버", "다음", "카카오메일"]) &&
        member(row.purpose, ["personal", "work", "mixed"]) &&
        member(row.connection, [
          "connected",
          "setup",
          "disconnected",
          "expired",
        ]) &&
        member(row.basic, permission) &&
        member(row.ai, permission) &&
        member(row.historyDays, [0, 30]) &&
        flags(row, ["newMailAnalysis", "dataDeleted"]),
    )
  )
    return false;
  if ((value.accounts as Row[]).length !== ACCOUNTS.length) return false;
  if (
    !rows(
      value.threads,
      (row) => accountId(row.accountId) && strings(row, ["subject"]),
    )
  )
    return false;
  if (
    !rows(
      value.messages,
      (row) =>
        accountId(row.accountId) &&
        strings(row, ["threadId", "sender", "address", "to", "body"]) &&
        date(row.at) &&
        member(row.direction, ["received", "sent"]) &&
        member(row.category, categories) &&
        flags(row, ["important", "read"]) &&
        integer(row.revision) &&
        record(row.fieldRevisions) &&
        integer(row.fieldRevisions.important) &&
        integer(row.fieldRevisions.category) &&
        attachments(row.attachments),
    )
  )
    return false;
  if (
    !rows(
      value.tasks,
      (row) =>
        accountId(row.accountId) &&
        strings(row, [
          "threadId",
          "title",
          "counterpart",
          "deadline",
          "reminder",
          "note",
        ]) &&
        member(row.kind, ["reply", "deliver", "waiting"]) &&
        member(row.status, [
          "proposed",
          "active",
          "waiting",
          "completed",
          "excluded",
        ]) &&
        (row.previousStatus === undefined ||
          member(row.previousStatus, ["active", "waiting", "proposed"])) &&
        Array.isArray(row.messageIds) &&
        row.messageIds.every((id) => typeof id === "string") &&
        (row.proposal === undefined ||
          (record(row.proposal) &&
            strings(row.proposal, ["deadline", "messageId"]))) &&
        history(row.history),
    )
  )
    return false;
  if (
    !rows(
      value.drafts,
      (row) =>
        accountId(row.accountId) &&
        strings(row, ["to", "cc", "subject", "body", "notice"]) &&
        member(row.mode, ["new", "reply", "forward"]) &&
        member(row.status, [
          "editing",
          "preparing",
          "ready",
          "sending",
          "sent",
          "failed",
          "unknown",
          "retry",
        ]) &&
        integer(row.revision) &&
        integer(row.preparation) &&
        flags(row, ["saved"]) &&
        attachments(row.attachments),
    )
  )
    return false;
  if (
    !rows(
      value.rules,
      (row) =>
        ruleConfig(row) &&
        rows(
          row.changes,
          (change) =>
            strings(change, ["id"]) &&
            date(change.at) &&
            (change.previous === null ||
              (record(change.previous) && ruleConfig(change.previous))) &&
            rows(
              change.applied,
              (applied) =>
                strings(applied, ["messageId"]) &&
                member(applied.field, ["important", "category"]) &&
                flags(applied, ["important"]) &&
                member(applied.category, categories) &&
                integer(applied.afterRevision),
            ),
        ),
    )
  )
    return false;
  if (
    !rows(
      value.services,
      (row) =>
        accountId(row.accountId) &&
        strings(row, ["name", "description"]) &&
        member(row.source, ["connection", "manual", "mail"]) &&
        date(row.checkedAt),
    )
  )
    return false;
  if (
    !rows(
      value.subscriptions,
      (row) =>
        accountId(row.accountId) &&
        strings(row, ["serviceId"]) &&
        flags(row, ["marketing", "keepTransactional"]) &&
        member(row.route, ["automatic", "manual"]) &&
        member(row.status, [
          "active",
          "requesting",
          "requested",
          "confirmed",
          "failed",
          "manual",
        ]) &&
        history(row.history),
    )
  )
    return false;
  if (
    !rows(
      value.jobs,
      (row) =>
        accountId(row.accountId) &&
        strings(row, ["note"]) &&
        member(row.kind, ["required", "summary"]) &&
        member(row.status, ["pending", "completed", "failed", "retry"]),
    )
  )
    return false;
  if (
    !rows(
      value.turns,
      (row) =>
        strings(row, ["text"]) &&
        member(row.role, ["user", "assistant"]) &&
        (row.context === undefined ||
          (record(row.context) && scope(row.context.accountId))) &&
        (row.clarification === undefined ||
          member(row.clarification, ["advertising", "rule"])) &&
        rows(
          row.refs,
          (ref) =>
            strings(ref, ["label"]) &&
            scope(ref.accountId) &&
            localHref(ref.href),
        ),
    )
  )
    return false;

  const state = value as unknown as PrototypeState;
  const messageExists = (id: string | undefined, owner: string) =>
    id === undefined ||
    state.messages.some(
      (message) =>
        message.id === id && (owner === "all" || message.accountId === owner),
    );
  const threadExists = (id: string, owner: string) =>
    state.threads.some(
      (thread) => thread.id === id && thread.accountId === owner,
    );
  return (
    state.messages.every((message) =>
      threadExists(message.threadId, message.accountId),
    ) &&
    state.tasks.every(
      (task) =>
        threadExists(task.threadId, task.accountId) &&
        task.messageIds.every((id) => messageExists(id, task.accountId)) &&
        messageExists(task.proposal?.messageId, task.accountId),
    ) &&
    state.drafts.every(
      (draft) =>
        (!draft.threadId || threadExists(draft.threadId, draft.accountId)) &&
        (!draft.taskId ||
          state.tasks.some(
            (task) =>
              task.id === draft.taskId && task.accountId === draft.accountId,
          )),
    ) &&
    state.rules.every((rule) =>
      rule.changes.every((change) =>
        change.applied.every((applied) =>
          messageExists(applied.messageId, rule.accountId),
        ),
      ),
    ) &&
    state.services.every((service) =>
      messageExists(service.messageId, service.accountId),
    ) &&
    state.subscriptions.every((subscription) =>
      state.services.some(
        (service) =>
          service.id === subscription.serviceId &&
          service.accountId === subscription.accountId,
      ),
    ) &&
    state.turns.every(
      (turn) =>
        messageExists(
          turn.context?.messageId,
          turn.context?.accountId ?? "all",
        ) &&
        turn.refs.every((ref) => messageExists(ref.messageId, ref.accountId)),
    )
  );
}
