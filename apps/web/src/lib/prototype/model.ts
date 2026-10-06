import { MESSAGES, TASKS, THREADS } from "./seed";
import type {
  AssistantTurn,
  Draft,
  MailAccount,
  Message,
  PrototypeState,
  Rule,
  RuleConfig,
  Subscription,
  Task,
} from "./types";
import { validState } from "./validation";

export const STORAGE_KEY = "uteum-mail.prototype.v1";
export type Action =
  | {
      type: "message";
      id: string;
      patch: Partial<Pick<Message, "read" | "important" | "category">>;
    }
  | {
      type: "task";
      id: string;
      patch?: Partial<Pick<Task, "title" | "deadline" | "reminder" | "status">>;
      restore?: boolean;
    }
  | { type: "deadline"; id: string; accept: boolean }
  | { type: "connect"; id: string }
  | {
      type: "account";
      id: string;
      patch: Partial<
        Pick<
          MailAccount,
          "purpose" | "basic" | "ai" | "historyDays" | "newMailAnalysis"
        >
      >;
    }
  | { type: "disconnect"; id: string }
  | { type: "delete"; id: string }
  | { type: "analysis-start"; id: string }
  | { type: "analysis-complete" | "analysis-fail"; id: string; jobId: string }
  | { type: "draft-create"; draft: Draft }
  | {
      type: "draft-edit";
      id: string;
      patch: Partial<
        Pick<
          Draft,
          "accountId" | "to" | "cc" | "subject" | "body" | "attachments"
        >
      >;
    }
  | { type: "draft-save" | "draft-prepare" | "draft-send"; id: string }
  | {
      type: "draft-ready";
      id: string;
      revision: number;
      preparation: number;
      body: string;
    }
  | { type: "draft-result"; id: string; status: "sent" | "failed" | "unknown" }
  | { type: "rule-save"; id: string; config: RuleConfig }
  | { type: "rule-toggle" | "rule-undo"; id: string }
  | { type: "subscription-start" | "subscription-confirm"; id: string }
  | { type: "subscription-result"; id: string; status: Subscription["status"] }
  | { type: "turn"; turn: AssistantTurn };

export function canCollect(account?: MailAccount) {
  return (
    !!account &&
    account.connection === "connected" &&
    account.basic === "allowed"
  );
}
export function canAnalyze(account?: MailAccount) {
  return canCollect(account) && account?.ai === "allowed";
}
export function inScope(accountId: string, scope: string) {
  return scope === "all" || accountId === scope;
}
export function threadMessages(state: PrototypeState, id: string) {
  return state.messages
    .filter((message) => message.threadId === id)
    .sort((a, b) => a.at.localeCompare(b.at));
}
export function subjectFor(state: PrototypeState, message: Message) {
  return (
    state.threads.find((thread) => thread.id === message.threadId)?.subject ??
    "원문 없음"
  );
}
export function searchMessages(
  state: PrototypeState,
  query: string,
  scope: string,
) {
  const words = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return state.messages.filter(
    (message) =>
      inScope(message.accountId, scope) &&
      words.every((word) =>
        `${subjectFor(state, message)} ${message.sender} ${message.body} ${state.tasks
          .filter((task) => task.threadId === message.threadId)
          .map((task) => task.title)
          .join(" ")}`
          .toLocaleLowerCase()
          .includes(word),
      ),
  );
}
function ruleMatches(
  state: PrototypeState,
  message: Message,
  config: RuleConfig,
) {
  const text =
    `${subjectFor(state, message)} ${message.sender} ${message.body}`.toLocaleLowerCase();
  return (
    inScope(message.accountId, config.accountId) &&
    !!config.keyword.trim() &&
    config.keyword
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .every((word) => text.includes(word)) &&
    !config.exceptions
      .split(",")
      .map((value) => value.trim().toLocaleLowerCase())
      .filter(Boolean)
      .some((word) => text.includes(word))
  );
}
function configOf(rule: Rule): RuleConfig {
  const {
    title,
    accountId,
    keyword,
    exceptions,
    action,
    applyExisting,
    future,
    enabled,
  } = rule;
  return {
    title,
    accountId,
    keyword,
    exceptions,
    action,
    applyExisting,
    future,
    enabled,
  };
}
function applyFutureRules(state: PrototypeState, message: Message) {
  for (const rule of state.rules)
    if (rule.enabled && rule.future && ruleMatches(state, message, rule)) {
      if (rule.action === "important") message.important = true;
      else message.category = "promotion";
      message.fieldRevisions[
        rule.action === "important" ? "important" : "category"
      ]++;
    }
}

export function reduce(state: PrototypeState, action: Action): PrototypeState {
  const next = structuredClone(state);
  next.sequence++;
  const history = (text: string) => ({
    id: "history-" + next.sequence,
    at: next.clock,
    text,
  });
  switch (action.type) {
    case "message": {
      const message = next.messages.find((item) => item.id === action.id);
      if (!message) return state;
      Object.assign(message, action.patch);
      message.revision++;
      if (action.patch.important !== undefined)
        message.fieldRevisions.important++;
      if (action.patch.category !== undefined)
        message.fieldRevisions.category++;
      break;
    }
    case "task": {
      const task = next.tasks.find((item) => item.id === action.id);
      if (!task) return state;
      if (action.restore) {
        task.status = task.previousStatus ?? "active";
        task.history.push(history("업무 복원"));
      } else {
        if (
          action.patch?.status === "completed" ||
          action.patch?.status === "excluded"
        ) {
          if (["proposed", "active", "waiting"].includes(task.status))
            task.previousStatus = task.status as Task["previousStatus"];
        }
        Object.assign(task, action.patch);
        task.history.push(
          history(
            action.patch?.status === "active"
              ? "후보 채택 · 진행 중"
              : action.patch?.status === "completed"
                ? "사용자가 업무 완료"
                : action.patch?.status === "excluded"
                  ? "후보 제외"
                  : "업무 내용 수정",
          ),
        );
      }
      break;
    }
    case "deadline": {
      const task = next.tasks.find((item) => item.id === action.id);
      if (!task?.proposal) return state;
      if (action.accept) task.deadline = task.proposal.deadline;
      task.history.push(
        history(
          action.accept
            ? "기한 변경 제안 채택"
            : "기한 변경 제안 거절 · 기존 기한 유지",
        ),
      );
      delete task.proposal;
      break;
    }
    case "connect": {
      const account = next.accounts.find((item) => item.id === action.id);
      if (!account) return state;
      account.connection = "setup";
      account.basic = "unknown";
      account.ai = "unknown";
      break;
    }
    case "account": {
      const account = next.accounts.find((item) => item.id === action.id);
      if (!account) return state;
      Object.assign(account, action.patch);
      if (account.connection === "setup") account.connection = "connected";
      if (canCollect(account) && !account.dataDeleted) {
        for (const thread of THREADS.filter(
          (item) => item.accountId === account.id,
        ))
          if (!next.threads.some((item) => item.id === thread.id))
            next.threads.push(structuredClone(thread));
        for (const message of MESSAGES.filter(
          (item) => item.accountId === account.id,
        ))
          if (!next.messages.some((item) => item.id === message.id)) {
            const collected = { ...structuredClone(message), important: false };
            applyFutureRules(next, collected);
            next.messages.push(collected);
          }
      }
      if (!canAnalyze(account)) {
        next.jobs = next.jobs.map((job) =>
          job.accountId === account.id && job.status === "pending"
            ? {
                ...job,
                status: "retry",
                note: "AI 사용이 중단되어 분석을 적용하지 않았습니다.",
              }
            : job,
        );
        next.drafts = next.drafts.map((draft) =>
          draft.accountId === account.id && draft.status === "preparing"
            ? {
                ...draft,
                status: "retry",
                notice:
                  "AI 사용이 중단되어 준비 중인 초안을 적용하지 않았습니다.",
              }
            : draft,
        );
      }
      break;
    }
    case "disconnect": {
      const account = next.accounts.find((item) => item.id === action.id);
      if (!account) return state;
      account.connection = "disconnected";
      next.jobs = next.jobs.map((job) =>
        job.accountId === account.id && job.status === "pending"
          ? {
              ...job,
              status: "retry",
              note: "연결이 해제되어 새 분석이 중단되었습니다.",
            }
          : job,
      );
      next.drafts = next.drafts.map((draft) =>
        draft.accountId === account.id &&
        ["preparing", "sending"].includes(draft.status)
          ? {
              ...draft,
              status: draft.status === "sending" ? "unknown" : "retry",
              notice:
                "연결이 해제되어 처리 결과를 확인하지 못했습니다. 연결 후 결과 확인 또는 준비 재시도를 해 주세요.",
            }
          : draft,
      );
      for (const item of next.subscriptions.filter(
        (item) => item.accountId === account.id && item.status === "requesting",
      )) {
        item.status = "failed";
        item.history.push(
          history("연결이 해제되어 요청 결과를 적용하지 않았습니다."),
        );
      }
      break;
    }
    case "delete": {
      const account = next.accounts.find((item) => item.id === action.id);
      if (!account) return state;
      account.dataDeleted = true;
      next.messages = next.messages.filter(
        (item) => item.accountId !== account.id,
      );
      next.threads = next.threads.filter(
        (item) => item.accountId !== account.id,
      );
      next.tasks = next.tasks.filter((item) => item.accountId !== account.id);
      next.drafts = next.drafts.filter((item) => item.accountId !== account.id);
      next.services = next.services.filter(
        (item) => item.accountId !== account.id,
      );
      next.subscriptions = next.subscriptions.filter(
        (item) => item.accountId !== account.id,
      );
      next.jobs = next.jobs.filter((item) => item.accountId !== account.id);
      next.rules = next.rules
        .filter((item) => item.accountId !== account.id)
        .map((rule) => ({
          ...rule,
          changes: rule.changes.map((change) => ({
            ...change,
            applied: change.applied.filter((item) =>
              next.messages.some((message) => message.id === item.messageId),
            ),
          })),
        }));
      next.turns = next.turns
        .filter((turn) => turn.context?.accountId !== account.id)
        .map((turn) => ({
          ...turn,
          refs: turn.refs.filter((ref) => ref.accountId !== account.id),
          text: turn.refs.some((ref) => ref.accountId === account.id)
            ? "삭제된 계정의 근거를 제거했습니다. 남은 자료에서 다시 요청해 주세요."
            : turn.text,
        }));
      break;
    }
    case "analysis-start": {
      const account = next.accounts.find((item) => item.id === action.id);
      if (!canAnalyze(account) || account?.dataDeleted) return state;
      next.jobs = next.jobs.filter((job) => job.accountId !== action.id);
      next.jobs.push({
        id: "job-" + action.id + "-" + next.sequence,
        accountId: action.id,
        kind: "required",
        status: "pending",
        note: "업무와 중요 메일을 확인하고 있습니다.",
      });
      break;
    }
    case "analysis-complete": {
      const account = next.accounts.find((item) => item.id === action.id);
      const job = next.jobs.find(
        (item) =>
          item.id === action.jobId &&
          item.accountId === action.id &&
          item.status === "pending",
      );
      if (!canAnalyze(account) || account?.dataDeleted || !job) return state;
      job.status = "completed";
      job.note = "가상 자료 분석 완료";
      for (const task of TASKS.filter((item) => item.accountId === action.id))
        if (
          next.messages.some((item) => item.threadId === task.threadId) &&
          !next.tasks.some((item) => item.id === task.id)
        )
          next.tasks.push(structuredClone(task));
      for (const message of next.messages.filter(
        (item) =>
          item.accountId === action.id && item.fieldRevisions.important === 0,
      ))
        message.important =
          MESSAGES.find((item) => item.id === message.id)?.important ??
          message.important;
      break;
    }
    case "analysis-fail": {
      const job = next.jobs.find(
        (item) =>
          item.id === action.jobId &&
          item.accountId === action.id &&
          item.status === "pending",
      );
      if (!job) return state;
      job.status = "failed";
      job.note =
        "분석에 실패했습니다. 메일 열람과 수동 편집은 계속 사용할 수 있습니다.";
      break;
    }
    case "draft-create":
      next.drafts.push(structuredClone(action.draft));
      break;
    case "draft-edit": {
      const draft = next.drafts.find((item) => item.id === action.id);
      if (!draft || ["sending", "unknown", "sent"].includes(draft.status))
        return state;
      Object.assign(draft, action.patch);
      draft.revision++;
      draft.saved = false;
      if (draft.status !== "preparing") draft.status = "editing";
      break;
    }
    case "draft-save": {
      const draft = next.drafts.find((item) => item.id === action.id);
      if (!draft) return state;
      draft.saved = true;
      draft.notice = "이 브라우저의 가상 자료에 저장했습니다.";
      break;
    }
    case "draft-prepare": {
      const draft = next.drafts.find((item) => item.id === action.id);
      if (
        !draft ||
        !canAnalyze(
          next.accounts.find((item) => item.id === draft.accountId),
        ) ||
        ["preparing", "sending", "sent", "unknown"].includes(draft.status)
      )
        return state;
      draft.status = "preparing";
      draft.notice =
        "준비된 예시 초안을 불러오는 중입니다. 편집한 내용은 보존합니다.";
      draft.preparation++;
      break;
    }
    case "draft-ready": {
      const draft = next.drafts.find((item) => item.id === action.id);
      if (
        !draft ||
        draft.status !== "preparing" ||
        draft.preparation !== action.preparation
      )
        return state;
      if (
        !canAnalyze(next.accounts.find((item) => item.id === draft.accountId))
      ) {
        draft.status = "retry";
        draft.notice = "AI 사용이 중단되어 결과를 적용하지 않았습니다.";
        break;
      }
      if (draft.revision !== action.revision) {
        draft.status = "editing";
        draft.notice =
          "초안 준비 중 작성한 내용이 있어 사용자 편집을 유지했습니다.";
      } else {
        draft.body = action.body;
        draft.revision++;
        draft.status = "ready";
        draft.notice =
          "준비된 예시 초안입니다. 실제 상황에 맞게 검토해 주세요.";
      }
      break;
    }
    case "draft-send": {
      const draft = next.drafts.find((item) => item.id === action.id);
      if (
        !draft ||
        !canCollect(
          next.accounts.find((item) => item.id === draft.accountId),
        ) ||
        !draft.to.trim() ||
        !draft.subject.trim() ||
        !draft.body.trim() ||
        ["preparing", "sending", "sent", "unknown"].includes(draft.status)
      )
        return state;
      draft.status = "sending";
      draft.notice = "모의 발송 중입니다.";
      break;
    }
    case "draft-result": {
      const draft = next.drafts.find((item) => item.id === action.id);
      if (!draft || !["sending", "unknown"].includes(draft.status))
        return state;
      if (
        !canCollect(next.accounts.find((item) => item.id === draft.accountId))
      ) {
        draft.status = "failed";
        draft.notice =
          "계정 연결이 중단되어 모의 발송 결과를 적용하지 않았습니다.";
        break;
      }
      draft.status = action.status;
      draft.notice =
        action.status === "sent"
          ? "모의 발송 완료 · 실제 메일은 보내지 않았습니다. 남은 업무를 확인해 주세요."
          : action.status === "unknown"
            ? "발송 결과를 아직 확인하지 못했습니다. 자동 재발송하지 않으며 결과 확인을 눌러 확인합니다."
            : "모의 발송에 실패했습니다. 내용을 확인하고 다시 시도할 수 있습니다.";
      if (action.status !== "sent") break;
      const account = next.accounts.find(
        (item) => item.id === draft.accountId,
      )!;
      const threadId = draft.threadId ?? "thread-" + draft.id;
      if (!next.threads.some((item) => item.id === threadId))
        next.threads.push({
          id: threadId,
          accountId: draft.accountId,
          subject: draft.subject,
        });
      if (!next.messages.some((item) => item.id === "sent-" + draft.id))
        next.messages.push({
          id: "sent-" + draft.id,
          accountId: draft.accountId,
          threadId,
          sender: "이지우",
          address: account.address,
          to: draft.to,
          body: draft.body,
          at: next.clock,
          direction: "sent",
          category: "work",
          important: false,
          read: true,
          revision: 0,
          fieldRevisions: { important: 0, category: 0 },
          attachments: draft.attachments,
        });
      if (draft.taskId)
        next.tasks
          .find((item) => item.id === draft.taskId)
          ?.history.push(
            history("모의 답장 발송 · 업무 완료 여부는 별도 확인"),
          );
      break;
    }
    case "rule-save": {
      if (!action.config.keyword.trim()) return state;
      const existing = next.rules.find((item) => item.id === action.id);
      const change = {
        id: "change-" + next.sequence,
        at: next.clock,
        previous: existing ? configOf(existing) : null,
        applied: [] as Rule["changes"][number]["applied"],
      };
      if (action.config.enabled && action.config.applyExisting)
        for (const message of next.messages.filter((item) =>
          ruleMatches(next, item, action.config),
        )) {
          const field =
            action.config.action === "important" ? "important" : "category";
          change.applied.push({
            messageId: message.id,
            field,
            important: message.important,
            category: message.category,
            afterRevision: message.fieldRevisions[field] + 1,
          });
          if (action.config.action === "important") message.important = true;
          else message.category = "promotion";
          message.revision++;
          message.fieldRevisions[field]++;
        }
      if (existing) {
        Object.assign(existing, action.config);
        existing.changes.push(change);
      } else
        next.rules.push({ ...action.config, id: action.id, changes: [change] });
      break;
    }
    case "rule-toggle": {
      const rule = next.rules.find((item) => item.id === action.id);
      if (!rule) return state;
      rule.changes.push({
        id: "change-" + next.sequence,
        at: next.clock,
        previous: configOf(rule),
        applied: [],
      });
      rule.enabled = !rule.enabled;
      break;
    }
    case "rule-undo": {
      const rule = next.rules.find((item) => item.id === action.id);
      const change = rule?.changes.pop();
      if (!rule || !change) return state;
      for (const applied of change.applied) {
        const message = next.messages.find(
          (item) => item.id === applied.messageId,
        );
        if (message?.fieldRevisions[applied.field] === applied.afterRevision) {
          if (applied.field === "important")
            message.important = applied.important;
          else message.category = applied.category;
          message.fieldRevisions[applied.field] = applied.afterRevision - 1;
          message.revision++;
        }
      }
      if (change.previous) Object.assign(rule, change.previous);
      else next.rules = next.rules.filter((item) => item.id !== rule.id);
      break;
    }
    case "subscription-start": {
      const item = next.subscriptions.find((item) => item.id === action.id);
      if (
        !item ||
        !canCollect(
          next.accounts.find((account) => account.id === item.accountId),
        ) ||
        ["requesting", "requested", "confirmed"].includes(item.status)
      )
        return state;
      item.status = item.route === "manual" ? "manual" : "requesting";
      item.history.push(
        history(
          item.route === "manual"
            ? "직접 설정이 필요합니다."
            : "마케팅 수신 해제 요청 시작 · 주문/보안 안내 유지",
        ),
      );
      break;
    }
    case "subscription-result": {
      const item = next.subscriptions.find((item) => item.id === action.id);
      if (
        !item ||
        item.status !== "requesting" ||
        !canCollect(
          next.accounts.find((account) => account.id === item.accountId),
        )
      )
        return state;
      item.status = action.status;
      item.history.push(
        history(
          action.status === "failed"
            ? "요청 실패 · 재시도 가능"
            : "요청 접수 · 최종 해제 확인 전",
        ),
      );
      break;
    }
    case "subscription-confirm": {
      const item = next.subscriptions.find((item) => item.id === action.id);
      if (!item || !["requested", "manual"].includes(item.status)) return state;
      item.status = "confirmed";
      item.history.push(history("가상 수신 해제 확인 · 주문/보안 안내 유지"));
      break;
    }
    case "turn":
      next.turns.push(structuredClone(action.turn));
      break;
  }
  return next;
}

export function restoreState(raw: string): PrototypeState | null {
  try {
    const value = JSON.parse(raw);
    // Initial v1 demos used one revision counter. Preserve them conservatively.
    if (Array.isArray(value?.messages))
      for (const message of value.messages)
        if (message && message.fieldRevisions === undefined)
          message.fieldRevisions = {
            important: message.revision,
            category: message.revision,
          };
    if (Array.isArray(value?.drafts))
      for (const draft of value.drafts)
        if (draft && draft.preparation === undefined) draft.preparation = 0;
    if (!validState(value)) return null;
    const restored = value;
    restored.jobs = restored.jobs.map((job) =>
      job.status === "pending"
        ? {
            ...job,
            status: "retry",
            note: "화면을 다시 열었습니다. 분석을 다시 시도해 주세요.",
          }
        : job,
    );
    restored.drafts = restored.drafts.map((draft) =>
      ["sending", "preparing"].includes(draft.status)
        ? {
            ...draft,
            status: draft.status === "sending" ? "unknown" : "retry",
            notice:
              draft.status === "sending"
                ? "발송 도중 화면을 다시 열어 결과 확인이 필요합니다. 자동 재발송하지 않습니다."
                : "초안 준비를 다시 시도해 주세요.",
          }
        : draft,
    );
    restored.subscriptions = restored.subscriptions.map((item) =>
      item.status === "requesting"
        ? {
            ...item,
            status: "requested",
            history: [
              ...item.history,
              {
                id: "restore-" + item.id,
                at: restored.clock,
                text: "요청 중 화면을 다시 열었습니다. 결과 확인이 필요합니다.",
              },
            ],
          }
        : item,
    );
    return restored;
  } catch {
    return null;
  }
}
export function newDraft(
  state: PrototypeState,
  accountId: string,
  threadId?: string,
  mode: Draft["mode"] = "new",
  taskId?: string,
): Draft {
  const source = threadId
    ? threadMessages(state, threadId)
        .filter((item) => item.direction === "received")
        .at(-1)
    : undefined;
  const thread = state.threads.find((item) => item.id === threadId);
  return {
    id: "draft-" + (state.sequence + 1),
    accountId: source?.accountId ?? accountId,
    threadId: mode === "reply" ? threadId : undefined,
    taskId,
    mode,
    to: mode === "reply" ? (source?.address ?? "") : "",
    cc: "",
    subject: thread
      ? (mode === "forward" ? "Fwd: " : "Re: ") + thread.subject
      : "",
    body:
      mode === "forward" && source
        ? `\n\n--- 전달할 원문 ---\n${source.body}`
        : "",
    attachments: mode === "forward" ? (source?.attachments ?? []) : [],
    revision: 0,
    preparation: 0,
    status: "editing",
    notice: "가상 초안 · 최종 발신 계정과 수신자를 확인해 주세요.",
    saved: false,
  };
}
export function sampleDraftBody(state: PrototypeState, draft: Draft) {
  const source = draft.threadId
    ? threadMessages(state, draft.threadId)
        .filter((item) => item.direction === "received")
        .at(-1)
    : undefined;
  const name = source?.sender.split(" · ")[0] ?? "담당자";
  return `${name}님, 안녕하세요.\n\n보내주신 메일은 잘 확인했습니다. 요청하신 내용을 검토한 뒤 안내드리겠습니다.\n구체적인 견적과 일정은 확인 후 이 부분에 작성해 주세요.\n\n감사합니다.\n이지우 드림`;
}
