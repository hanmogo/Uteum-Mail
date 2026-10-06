import { canAnalyze, inScope, subjectFor } from "./model";
import type { PrototypeStore } from "./store";
import type { AssistantTurn } from "./types";

export const ASSISTANT_EXAMPLES = [
  "밀린 답장 찾아줘",
  "이 메일 답장 써줘",
  "이 메일 중요하게",
  "앞으로 라온 견적은 중요하게",
  "광고 정리해줘",
];
export async function askAssistant(
  store: PrototypeStore,
  input: string,
  scope: string,
  messageId?: string,
) {
  const state = store.getSnapshot().state;
  const message = state.messages.find(
    (item) => item.id === messageId && inScope(item.accountId, scope),
  );
  const accountId = message?.accountId ?? scope;
  const context = { accountId, messageId: message?.id };
  const questionId = "turn-" + (state.sequence + 1);
  await store.command({
    type: "turn",
    turn: {
      id: questionId,
      role: "user",
      text: input,
      context,
      refs: [],
    },
  });
  const answer = async (
    text: string,
    refs: AssistantTurn["refs"] = [],
    clarification?: AssistantTurn["clarification"],
  ) => {
    const current = store.getSnapshot().state;
    if (
      !current.turns.some(
        (turn) =>
          turn.id === questionId && turn.role === "user" && turn.text === input,
      ) ||
      (message && !current.messages.some((item) => item.id === message.id))
    )
      return;
    return store.command({
      type: "turn",
      turn: {
        id: "turn-" + (store.getSnapshot().state.sequence + 1),
        role: "assistant",
        text,
        context,
        refs,
        clarification,
      },
    });
  };
  const allowed = state.accounts.filter(
    (item) => inScope(item.id, accountId) && canAnalyze(item),
  );
  if (!allowed.length)
    return answer(
      "현재 계정에서는 AI 사용을 체험할 수 없습니다. 연결·기본 처리·AI 허용 상태를 설정에서 확인해 주세요. 메일 열람과 직접 작성은 가능합니다.",
      [{ label: "설정 확인", href: "/settings?account=" + scope, accountId }],
    );
  if (
    state.jobs.some(
      (job) => inScope(job.accountId, accountId) && job.status !== "completed",
    )
  )
    return answer(
      "아직 분석 결과가 확인되지 않았습니다. 실패·대기 상태를 해결한 뒤 다시 요청해 주세요. 남은 요청이 없다는 뜻은 아닙니다.",
      [{ label: "분석 상태 확인", href: "/today?account=" + scope, accountId }],
    );
  const text = input.replace(/\s+/g, "").replace(/[.!?。]/g, "");
  if (text.includes("밀린답장") || text.includes("아직답변")) {
    const tasks = state.tasks.filter(
      (task) =>
        inScope(task.accountId, accountId) &&
        allowed.some((item) => item.id === task.accountId) &&
        ["proposed", "active", "waiting"].includes(task.status),
    );
    return answer(
      tasks.length
        ? `확인할 요청 ${tasks.length}개를 찾았습니다. 계약서 답변 이후에도 수정 시안 요청은 남아 있고, 휴가 자동 회신은 촬영 날짜의 답변으로 처리하지 않았습니다. 아래 원문과 업무를 확인해 주세요.`
        : "현재 가상 자료에서 남은 요청을 찾지 못했습니다. 실제 AI 판단 결과가 아닌 준비된 체험 결과입니다.",
      tasks.map((task) => ({
        label: task.title,
        href: `/tasks?account=${task.accountId}&task=${task.id}`,
        accountId: task.accountId,
        messageId: task.messageIds[0],
      })),
    );
  }
  if (text.includes("답장써") || text.includes("답장초안")) {
    if (!message)
      return answer(
        "답장할 메일을 먼저 열고 비서를 다시 실행해 주세요. 현재 계정 범위에서 대상 메일을 선택해야 합니다.",
        [{ label: "메일 선택", href: "/mail?account=" + scope, accountId }],
      );
    const draftId = await store.createDraft(
      message.accountId,
      message.threadId,
      "reply",
      state.tasks.find((task) => task.threadId === message.threadId)?.id,
    );
    await store.prepareDraft(draftId);
    const current = store.getSnapshot().state;
    if (
      !current.drafts.some((draft) => draft.id === draftId) ||
      !canAnalyze(
        current.accounts.find((account) => account.id === message.accountId),
      )
    )
      return;
    return answer(
      "준비된 답장 초안을 만들었습니다. 발신 계정·수신자·본문을 확인하고 편집해 주세요. 발송은 편집기에서 별도로 눌러야 합니다.",
      [
        {
          label: "초안 검토",
          href: `/mail?account=${message.accountId}&draft=${draftId}`,
          accountId: message.accountId,
          messageId: message.id,
        },
      ],
    );
  }
  if (text.includes("앞으로") && text.includes("중요")) {
    if (accountId === "all")
      return answer(
        "어느 계정에 적용할지 계정 범위를 먼저 선택해 주세요. 향후 메일에 적용하는 지속 규칙으로 만들겠습니다.",
        [],
        "rule",
      );
    const keyword = text.includes("라온견적")
      ? "라온 견적"
      : text.includes("라온")
        ? "라온"
        : text.includes("이메일") && message
          ? (message.sender.split(" · ")[1] ?? message.sender)
          : "";
    if (!keyword)
      return answer(
        "이 체험에서 지원하는 조건을 확인해 주세요. ‘앞으로 라온 견적은 중요하게’를 선택하거나 규칙 화면에서 거래처·키워드·예외를 직접 지정할 수 있습니다.",
        [
          {
            label: "규칙 직접 작성",
            href: "/rules?account=" + accountId,
            accountId,
          },
        ],
      );
    await store.command({
      type: "rule-save",
      id: "rule-" + (store.getSnapshot().state.sequence + 1),
      config: {
        title: keyword + " 메일을 중요하게",
        accountId,
        keyword,
        exceptions: "",
        action: "important",
        applyExisting: false,
        future: true,
        enabled: true,
      },
    });
    return answer(
      `‘${keyword}’ 키워드를 모두 포함하는 향후 메일을 중요하게 표시하는 규칙을 등록했습니다. 적용 범위·예외는 규칙 화면에서 수정할 수 있습니다.`,
      [
        {
          label: "지속 규칙 확인",
          href: "/rules?account=" + accountId,
          accountId,
        },
      ],
    );
  }
  if (text.includes("이메일중요") || text.includes("이메일을중요")) {
    if (!message)
      return answer(
        "중요하게 표시할 메일을 먼저 선택해 주세요. 이 요청은 한 통에만 적용합니다.",
        [{ label: "메일 선택", href: "/mail?account=" + scope, accountId }],
      );
    await store.command({
      type: "message",
      id: message.id,
      patch: { important: true },
    });
    return answer(
      "선택한 메일만 중요하게 표시했습니다. 향후 규칙은 만들지 않았습니다.",
      [
        {
          label: subjectFor(state, message),
          href: `/mail?account=${message.accountId}&thread=${message.threadId}&message=${message.id}`,
          accountId: message.accountId,
          messageId: message.id,
        },
      ],
    );
  }
  if (text.includes("광고정리"))
    return answer(
      "어떤 정리를 원하시나요? 광고 분류와 마케팅 수신 해제는 효과가 다릅니다. 중요한 광고와 주문·보안 안내는 유지합니다.",
      [],
      "advertising",
    );
  if (text.includes("광고로분류")) {
    const messages = state.messages.filter(
      (item) =>
        item.category === "promotion" &&
        inScope(item.accountId, accountId) &&
        allowed.some((account) => account.id === item.accountId),
    );
    for (const item of messages)
      await store.command({
        type: "message",
        id: item.id,
        patch: { category: "promotion" },
      });
    return answer(
      `현재 허용 범위의 광고 ${messages.length}통을 광고 보기로 정리했습니다. 중요도와 구독 상태는 유지했습니다.`,
      [
        {
          label: "광고 보기",
          href: "/mail?filter=promotion&account=" + scope,
          accountId,
        },
      ],
    );
  }
  if (text.includes("마케팅수신해제")) {
    const subscriptions = state.subscriptions.filter(
      (item) =>
        item.marketing &&
        inScope(item.accountId, accountId) &&
        allowed.some((account) => account.id === item.accountId),
    );
    await Promise.all(subscriptions.map((item) => store.unsubscribe(item.id)));
    const current = store.getSnapshot().state;
    return answer(
      "마케팅 항목별 모의 요청을 처리했습니다. 요청 접수·실패·직접 설정 필요를 수신 관리에서 확인해 주세요. 주문·보안 안내는 유지합니다.",
      current.services
        .filter((service) => inScope(service.accountId, accountId))
        .map((service) => ({
          label: service.name + " 처리 확인",
          href: "/services?account=" + service.accountId,
          accountId: service.accountId,
          messageId: service.messageId,
        })),
    );
  }
  return answer(
    "이 체험은 준비된 요청에만 응답합니다. ‘밀린 답장 찾아줘’, ‘이 메일 답장 써줘’, ‘이 메일 중요하게’, ‘앞으로 라온 견적은 중요하게’, ‘광고 정리해줘’를 선택해 주세요. 실제 모델 호출은 없습니다.",
  );
}
