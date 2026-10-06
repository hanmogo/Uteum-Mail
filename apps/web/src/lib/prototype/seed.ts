import type {
  Attachment,
  MailAccount,
  Message,
  PrototypeState,
  Scenario,
  Task,
  Thread,
} from "./types";

export const CLOCK = "2026-10-03T09:00:00+09:00";
export const SAMPLE_ATTACHMENT: Attachment = {
  id: "attachment-quote",
  name: "프로젝트_요청서.txt",
  size: "1.2 KB",
  path: "/demo/project-request.txt",
};
export const ACCOUNTS: MailAccount[] = [
  {
    id: "gmail",
    provider: "Gmail",
    address: "jiwoo@gmail.example",
    label: "지우 · 업무",
    color: "#d66b57",
    purpose: "work",
    connection: "connected",
    basic: "allowed",
    ai: "allowed",
    historyDays: 30,
    newMailAnalysis: true,
    dataDeleted: false,
  },
  {
    id: "naver",
    provider: "네이버",
    address: "jiwoo@naver.example",
    label: "지우 · 개인",
    color: "#23a66d",
    purpose: "personal",
    connection: "connected",
    basic: "allowed",
    ai: "allowed",
    historyDays: 30,
    newMailAnalysis: true,
    dataDeleted: false,
  },
  {
    id: "daum",
    provider: "다음",
    address: "studio@daum.example",
    label: "스튜디오",
    color: "#6b7cc3",
    purpose: "mixed",
    connection: "connected",
    basic: "allowed",
    ai: "allowed",
    historyDays: 30,
    newMailAnalysis: true,
    dataDeleted: false,
  },
  {
    id: "kakao",
    provider: "카카오메일",
    address: "hello@kakao.example",
    label: "지우 · 소식",
    color: "#c59823",
    purpose: "personal",
    connection: "connected",
    basic: "allowed",
    ai: "allowed",
    historyDays: 30,
    newMailAnalysis: true,
    dataDeleted: false,
  },
];
export const THREADS: Thread[] = [
  {
    id: "t-quote",
    accountId: "gmail",
    subject: "[라온 스튜디오] 웹사이트 리뉴얼 견적 및 일정 문의",
  },
  {
    id: "t-review",
    accountId: "gmail",
    subject: "브랜드 시안 피드백과 계약서 확인 부탁드립니다",
  },
  {
    id: "t-wait",
    accountId: "daum",
    subject: "촬영 일정 확정을 위한 회신 부탁드립니다",
  },
  {
    id: "t-letter",
    accountId: "kakao",
    subject: "이번 주 꼭 읽어볼 제품 디자인 이야기",
  },
  {
    id: "t-sale",
    accountId: "naver",
    subject: "가을을 위한 작은 준비, 회원 전용 혜택",
  },
  {
    id: "t-order",
    accountId: "naver",
    subject: "주문하신 데스크 매트가 배송을 시작했어요",
  },
  {
    id: "t-security",
    accountId: "gmail",
    subject: "새 기기에서 로그인한 내역을 확인해 주세요",
  },
  {
    id: "t-invite",
    accountId: "daum",
    subject: "10월 커뮤니티 모임에 초대합니다",
  },
  {
    id: "t-note",
    accountId: "naver",
    subject: "토요일 전시회, 같이 보러 갈까요?",
  },
];
function mail(
  id: string,
  threadId: string,
  sender: string,
  body: string,
  at: string,
  extra: Partial<Message> = {},
): Message {
  const thread = THREADS.find((item) => item.id === threadId)!;
  const account = ACCOUNTS.find((item) => item.id === thread.accountId)!;
  return {
    id,
    threadId,
    accountId: account.id,
    sender,
    address: `${id}@sender.example`,
    to: account.address,
    body,
    at,
    direction: "received",
    category: "work",
    important: false,
    read: false,
    revision: 0,
    fieldRevisions: { important: 0, category: 0 },
    attachments: [],
    ...extra,
  };
}
export const MESSAGES: Message[] = [
  mail(
    "m-quote",
    "t-quote",
    "김서윤 · 라온 스튜디오",
    "지우님, 안녕하세요. 라온 스튜디오 김서윤입니다.\n\n지난 미팅에서 이야기한 웹사이트 리뉴얼을 진행하고 싶습니다.\n아래 두 가지를 10월 5일(월)까지 부탁드릴 수 있을까요?\n\n1. 5페이지 기준 예상 견적과 작업 일정\n2. 프로젝트 시작에 필요한 자료 목록\n\n브랜드 소개와 참고 사이트는 첨부한 요청서에 정리했습니다.\n편하게 검토하신 뒤 알려주세요.\n\n감사합니다.\n김서윤 드림",
    "2026-10-03T08:40:00+09:00",
    { important: true, attachments: [SAMPLE_ATTACHMENT] },
  ),
  mail(
    "m-review",
    "t-review",
    "박도현 · 오브젝트",
    "안녕하세요. 보내주신 1차 시안 잘 확인했습니다.\n\n로고의 색상은 A안으로 진행하겠습니다. 다만 서체는 조금 더 부드러운 인상이면 좋겠습니다.\n수정 시안과 서명한 계약서를 10월 2일까지 전달 부탁드립니다.",
    "2026-10-01T14:20:00+09:00",
    { important: true, read: true },
  ),
  mail(
    "m-review-reply",
    "t-review",
    "이지우",
    "안녕하세요, 도현님. 서명한 계약서를 전달드립니다.\n서체를 수정한 시안은 검토 중이며 따로 전달드리겠습니다.",
    "2026-10-01T16:00:00+09:00",
    {
      direction: "sent",
      address: "jiwoo@gmail.example",
      to: "dohyun@object.example",
      read: true,
    },
  ),
  mail(
    "m-review-change",
    "t-review",
    "박도현 · 오브젝트",
    "계약서는 잘 받았습니다. 수정 시안은 내부 일정이 바뀌어 10월 6일까지 보내주셔도 괜찮습니다.\n최종 시안을 기다리겠습니다.",
    "2026-10-02T17:10:00+09:00",
    { important: true },
  ),
  mail(
    "m-wait",
    "t-wait",
    "이지우",
    "안녕하세요, 민재님. 다음 주 촬영은 10월 7일 또는 8일 오전이 가능합니다.\n편하신 날짜를 알려주시면 일정을 확정하겠습니다.",
    "2026-10-01T10:00:00+09:00",
    {
      direction: "sent",
      address: "studio@daum.example",
      to: "minjae@light.example",
      read: true,
    },
  ),
  mail(
    "m-auto",
    "t-wait",
    "정민재 · 라이트",
    "[자동 회신] 10월 4일까지 휴가 중입니다. 복귀 후 메일을 확인하겠습니다.\n이 메시지는 자동으로 발송되었습니다.",
    "2026-10-01T10:01:00+09:00",
    { read: true },
  ),
  mail(
    "m-letter",
    "t-letter",
    "디자인 위클리",
    "이번 주 디자인 위클리입니다.\n\n작은 팀이 복잡한 제품을 단순하게 만드는 방법을 소개합니다.\n지우님이 관심을 두신 디자인 시스템과 접근성 실무 이야기도 함께 담았습니다.\n\n이 메일은 구독한 뉴스레터입니다.",
    "2026-10-03T07:30:00+09:00",
    { category: "promotion", important: true },
  ),
  mail(
    "m-sale",
    "t-sale",
    "데일리 스토어",
    "회원님을 위한 가을 할인 소식입니다.\n이번 주말 한정 데스크 용품을 20% 할인합니다.\n광고성 정보 수신에 동의한 회원에게 보내드립니다.",
    "2026-10-03T07:00:00+09:00",
    { category: "promotion" },
  ),
  mail(
    "m-order",
    "t-order",
    "데일리 스토어",
    "주문번호 DEMO-1002의 배송이 시작되었습니다.\n예상 도착일은 10월 5일입니다.\n이 메일은 주문 처리에 필요한 거래 안내이며 광고와 별도로 유지됩니다.",
    "2026-10-02T19:00:00+09:00",
    { category: "transaction", read: true },
  ),
  mail(
    "m-security",
    "t-security",
    "계정 보안 안내",
    "새로운 기기에서 로그인한 내역이 있습니다.\n본인의 활동인지 확인해 주세요.\n이 메일은 준비된 보안 안내 예시입니다.",
    "2026-10-02T11:30:00+09:00",
    { category: "security", important: true, read: true },
  ),
  mail(
    "m-invite",
    "t-invite",
    "만드는 사람들",
    "10월 10일 토요일, 작은 팀들의 작업 이야기를 나눕니다.\n시간이 맞으시면 함께해 주세요. 참여 여부는 편하실 때 알려주세요.",
    "2026-10-02T09:10:00+09:00",
    { category: "personal", read: true },
  ),
  mail(
    "m-note",
    "t-note",
    "윤하",
    "지우야, 토요일 오후에 성수에서 열리는 사진전 같이 볼래?\n일정 괜찮으면 알려줘!",
    "2026-10-02T08:00:00+09:00",
    { category: "personal", read: true },
  ),
];
export const TASKS: Task[] = [
  {
    id: "task-quote",
    accountId: "gmail",
    threadId: "t-quote",
    messageIds: ["m-quote"],
    title: "리뉴얼 견적과 작업 일정 회신",
    counterpart: "김서윤 · 라온 스튜디오",
    kind: "reply",
    status: "proposed",
    deadline: "2026-10-05",
    reminder: "2026-10-03",
    note: "10월 5일까지 요청한 두 항목 중 견적·일정 회신입니다. 후보를 확인한 뒤 채택하세요.",
    history: [],
  },
  {
    id: "task-material",
    accountId: "gmail",
    threadId: "t-quote",
    messageIds: ["m-quote"],
    title: "프로젝트에 필요한 자료 목록 전달",
    counterpart: "김서윤 · 라온 스튜디오",
    kind: "deliver",
    status: "proposed",
    deadline: "2026-10-05",
    reminder: "",
    note: "같은 메일의 두 번째 요청입니다. 견적에 답장해도 이 업무는 별도로 남습니다.",
    history: [],
  },
  {
    id: "task-review",
    accountId: "gmail",
    threadId: "t-review",
    messageIds: ["m-review", "m-review-reply", "m-review-change"],
    title: "브랜드 서체 수정 시안 전달",
    counterpart: "박도현 · 오브젝트",
    kind: "deliver",
    status: "active",
    deadline: "2026-10-02",
    reminder: "2026-10-03",
    note: "계약서에는 답변했지만 수정 시안은 아직 전달하지 않았습니다.",
    proposal: { deadline: "2026-10-06", messageId: "m-review-change" },
    history: [
      {
        id: "h-review",
        at: "2026-10-01T16:00:00+09:00",
        text: "계약서만 전달 · 수정 시안 요청은 남아 있음",
      },
    ],
  },
  {
    id: "task-wait",
    accountId: "daum",
    threadId: "t-wait",
    messageIds: ["m-wait", "m-auto"],
    title: "촬영 가능한 날짜 회신 확인",
    counterpart: "정민재 · 라이트",
    kind: "waiting",
    status: "waiting",
    deadline: "",
    reminder: "2026-10-05",
    note: "휴가 자동 회신은 날짜에 대한 답변이 아닙니다. 10월 5일에 다시 확인하세요.",
    history: [],
  },
];
export function createSeed(
  scenario: Scenario = "normal",
  onboarding = false,
): PrototypeState {
  const state: PrototypeState = {
    version: 1,
    clock: CLOCK,
    sequence: 100,
    scenario,
    accounts: structuredClone(ACCOUNTS),
    threads: structuredClone(THREADS),
    messages: structuredClone(MESSAGES),
    tasks: structuredClone(TASKS),
    drafts: [
      {
        id: "draft-welcome",
        accountId: "gmail",
        threadId: "t-quote",
        taskId: "task-quote",
        mode: "reply",
        to: "m-quote@sender.example",
        cc: "",
        subject: "Re: " + THREADS[0].subject,
        body: "서윤님, 안녕하세요.\n\n보내주신 요청서는 잘 확인했습니다. 견적과 일정을 검토한 뒤 회신드리겠습니다.\n\n감사합니다.\n이지우 드림",
        attachments: [],
        revision: 0,
        preparation: 0,
        status: "ready",
        notice: "준비된 가상 초안입니다. 내용을 확인하고 편집해 주세요.",
        saved: true,
      },
    ],
    rules: [],
    services: [
      {
        id: "svc-weekly",
        accountId: "kakao",
        name: "디자인 위클리",
        description: "제품 디자인 뉴스레터",
        source: "mail",
        checkedAt: CLOCK,
        messageId: "m-letter",
      },
      {
        id: "svc-store",
        accountId: "naver",
        name: "데일리 스토어",
        description: "온라인 쇼핑 · 광고와 주문 안내",
        source: "connection",
        checkedAt: CLOCK,
        messageId: "m-sale",
      },
      {
        id: "svc-community",
        accountId: "daum",
        name: "만드는 사람들",
        description: "커뮤니티 소식 · 직접 설정 필요",
        source: "manual",
        checkedAt: "2026-10-01T10:00:00+09:00",
        messageId: "m-invite",
      },
    ],
    subscriptions: [
      {
        id: "sub-weekly",
        serviceId: "svc-weekly",
        accountId: "kakao",
        marketing: true,
        keepTransactional: true,
        route: "automatic",
        status: "active",
        history: [],
      },
      {
        id: "sub-store",
        serviceId: "svc-store",
        accountId: "naver",
        marketing: true,
        keepTransactional: true,
        route: "automatic",
        status: "active",
        history: [],
      },
      {
        id: "sub-community",
        serviceId: "svc-community",
        accountId: "daum",
        marketing: true,
        keepTransactional: true,
        route: "manual",
        status: "active",
        history: [],
      },
    ],
    jobs: ACCOUNTS.map((account) => ({
      id: "job-" + account.id,
      accountId: account.id,
      kind: "required",
      status: "completed",
      note: "가상 자료 분석 완료",
    })),
    turns: [],
  };
  if (onboarding || scenario === "empty") {
    state.threads = [];
    state.messages = [];
    state.tasks = [];
    state.drafts = [];
    state.services = [];
    state.subscriptions = [];
    state.jobs = [];
    if (onboarding)
      state.accounts = state.accounts.map((account) => ({
        ...account,
        connection: "disconnected",
        basic: "unknown",
        ai: "unknown",
        newMailAnalysis: false,
      }));
  }
  if (scenario === "analysis-pending" || scenario === "analysis-failed") {
    state.tasks = [];
    for (const draft of state.drafts) delete draft.taskId;
    state.jobs = state.jobs.map((job) => ({
      ...job,
      status: scenario === "analysis-pending" ? "pending" : "failed",
      note:
        scenario === "analysis-pending"
          ? "분석 대기를 재현하는 체험 상태"
          : "분석에 실패했습니다. 메일은 계속 사용할 수 있습니다.",
    }));
  }
  if (scenario === "connection-expired")
    state.accounts[0].connection = "expired";
  return state;
}
