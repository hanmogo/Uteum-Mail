import assert from "node:assert/strict";
import { test } from "node:test";
import { askAssistant } from "../src/lib/prototype/assistant";
import {
  canAnalyze,
  canCollect,
  newDraft,
  reduce,
  restoreState,
  searchMessages,
  STORAGE_KEY,
} from "../src/lib/prototype/model";
import { createSeed } from "../src/lib/prototype/seed";
import { createPrototypeStore } from "../src/lib/prototype/store";
import {
  SCENARIO_LABELS,
  type PrototypeState,
  type RuleConfig,
  type Scenario,
} from "../src/lib/prototype/types";

const message = (state: PrototypeState, id: string) =>
  state.messages.find((item) => item.id === id)!;
const draft = (state: PrototypeState, id = "draft-welcome") =>
  state.drafts.find((item) => item.id === id)!;
const rule: RuleConfig = {
  title: "혜택 메일 중요 표시",
  accountId: "naver",
  keyword: "혜택",
  exceptions: "",
  action: "important",
  applyExisting: true,
  future: true,
  enabled: true,
};
function memory(raw?: string) {
  const data = new Map<string, string>([["other-app", "keep"]]);
  if (raw !== undefined) data.set(STORAGE_KEY, raw);
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}
function loaded(state = createSeed()) {
  const store = createPrototypeStore();
  const storage = memory(JSON.stringify(state));
  store.hydrate(() => storage);
  assert.equal(store.getSnapshot().storageWarning, "");
  return { store, storage };
}

test("모든 고정 시나리오와 시작 전 자료의 ID 관계를 복원할 수 있다", () => {
  for (const scenario of Object.keys(SCENARIO_LABELS) as Scenario[]) {
    const state = createSeed(scenario);
    assert.ok(restoreState(JSON.stringify(state)), scenario);
  }
  assert.ok(restoreState(JSON.stringify(createSeed("normal", true))));
});

test("광고 유형과 중요도는 독립적이고 읽음으로 업무를 완료하지 않는다", () => {
  let state = createSeed();
  assert.equal(message(state, "m-letter").category, "promotion");
  assert.equal(message(state, "m-letter").important, true);
  state = reduce(state, {
    type: "message",
    id: "m-letter",
    patch: { read: true },
  });
  state = reduce(state, {
    type: "message",
    id: "m-quote",
    patch: { read: true },
  });
  assert.equal(message(state, "m-letter").important, true);
  assert.equal(
    state.tasks.find((item) => item.id === "task-quote")!.status,
    "proposed",
  );
  assert.equal(searchMessages(state, "디자인", "gmail").length, 0);
  assert.ok(searchMessages(state, "디자인", "kakao").length);
});

test("기한 제안을 채택하거나 거절하고 완료·제외한 업무를 복원한다", () => {
  const original = createSeed();
  assert.equal(
    original.tasks.find((item) => item.id === "task-review")!.status,
    "active",
  );
  assert.equal(
    original.tasks.find((item) => item.id === "task-wait")!.status,
    "waiting",
  );
  const accepted = reduce(original, {
    type: "deadline",
    id: "task-review",
    accept: true,
  });
  assert.equal(
    accepted.tasks.find((item) => item.id === "task-review")!.deadline,
    "2026-10-06",
  );
  const rejected = reduce(original, {
    type: "deadline",
    id: "task-review",
    accept: false,
  });
  assert.equal(
    rejected.tasks.find((item) => item.id === "task-review")!.deadline,
    "2026-10-02",
  );
  assert.equal(
    rejected.tasks.find((item) => item.id === "task-review")!.proposal,
    undefined,
  );
  for (const status of ["completed", "excluded"] as const) {
    const finished = reduce(accepted, {
      type: "task",
      id: "task-review",
      patch: { status },
    });
    const restored = reduce(finished, {
      type: "task",
      id: "task-review",
      restore: true,
    });
    assert.equal(
      restored.tasks.find((item) => item.id === "task-review")!.status,
      "active",
    );
    assert.equal(
      restored.tasks.find((item) => item.id === "task-review")!.deadline,
      "2026-10-06",
    );
  }
});

test("가상 인증만으로 수집하지 않고 AI를 끈 계정은 메일만 수집한다", async () => {
  const { store } = loaded(createSeed("normal", true));
  await store.command({ type: "connect", id: "gmail" });
  assert.equal(store.getSnapshot().state.messages.length, 0);
  assert.equal(canCollect(store.getSnapshot().state.accounts[0]), false);
  await store.configure("gmail", { basic: "unknown", ai: "allowed" });
  assert.equal(store.getSnapshot().state.messages.length, 0);
  await store.configure("gmail", { basic: "allowed", ai: "off" });
  const state = store.getSnapshot().state;
  assert.ok(state.messages.length > 0);
  assert.equal(state.tasks.length, 0);
  assert.equal(state.jobs.length, 0);
  assert.equal(canAnalyze(state.accounts[0]), false);
});

test("새 메일 자동 분석 선택으로 기존 메일의 과거 분석 범위를 확대하지 않는다", async () => {
  const { store } = loaded(createSeed("normal", true));
  await store.command({ type: "connect", id: "gmail" });
  await store.configure("gmail", {
    basic: "allowed",
    ai: "allowed",
    historyDays: 0,
    newMailAnalysis: true,
  });
  assert.ok(store.getSnapshot().state.messages.length > 0);
  assert.equal(store.getSnapshot().state.jobs.length, 0);
  assert.equal(store.getSnapshot().state.tasks.length, 0);
});

test("AI를 끄거나 자료를 삭제한 뒤 도착한 분석 결과를 적용하지 않는다", async () => {
  for (const action of ["off", "delete"] as const) {
    const { store } = loaded(createSeed("analysis-pending"));
    const other = store
      .getSnapshot()
      .state.messages.filter((item) => item.accountId === "naver");
    const pending = store.analyze("gmail");
    await store.command(
      action === "off"
        ? { type: "account", id: "gmail", patch: { ai: "off" } }
        : { type: "delete", id: "gmail" },
    );
    await pending;
    const state = store.getSnapshot().state;
    assert.equal(
      state.tasks.filter((item) => item.accountId === "gmail").length,
      0,
    );
    assert.deepEqual(
      state.messages.filter((item) => item.accountId === "naver"),
      other,
    );
    if (action === "delete")
      assert.equal(
        state.messages.filter((item) => item.accountId === "gmail").length,
        0,
      );
    else
      assert.equal(
        state.jobs.find((item) => item.accountId === "gmail")!.status,
        "retry",
      );
  }
});

test("취소된 분석의 완료가 새 분석 작업을 완료시키지 않는다", () => {
  let state = reduce(createSeed("analysis-pending"), {
    type: "analysis-start",
    id: "gmail",
  });
  const oldJob = state.jobs.find((item) => item.accountId === "gmail")!.id;
  state = reduce(state, { type: "account", id: "gmail", patch: { ai: "off" } });
  state = reduce(state, {
    type: "account",
    id: "gmail",
    patch: { ai: "allowed" },
  });
  state = reduce(state, { type: "analysis-start", id: "gmail" });
  state = reduce(state, {
    type: "analysis-complete",
    id: "gmail",
    jobId: oldJob,
  });
  assert.equal(
    state.jobs.find((item) => item.accountId === "gmail")!.status,
    "pending",
  );
  assert.equal(state.tasks.length, 0);
});

test("분석 도중 읽은 메일에는 중요 결과를 적용하되 수동 중요 수정은 유지한다", () => {
  let state = reduce(createSeed("normal", true), {
    type: "connect",
    id: "gmail",
  });
  state = reduce(state, {
    type: "account",
    id: "gmail",
    patch: { basic: "allowed", ai: "allowed" },
  });
  state = reduce(state, { type: "analysis-start", id: "gmail" });
  state = reduce(state, {
    type: "message",
    id: "m-quote",
    patch: { read: true },
  });
  state = reduce(state, {
    type: "message",
    id: "m-security",
    patch: { important: false },
  });
  state = reduce(state, {
    type: "analysis-complete",
    id: "gmail",
    jobId: state.jobs[0].id,
  });
  assert.equal(message(state, "m-quote").important, true);
  assert.equal(message(state, "m-quote").read, true);
  assert.equal(message(state, "m-security").important, false);
});

test("늦게 준비된 초안이 사용자 편집을 덮어쓰지 않는다", async () => {
  const { store, storage } = loaded();
  const pending = store.prepareDraft("draft-welcome");
  await store.command({
    type: "draft-edit",
    id: "draft-welcome",
    patch: { body: "제가 직접 검토해 작성한 답장입니다." },
  });
  await pending;
  assert.equal(
    draft(store.getSnapshot().state).body,
    "제가 직접 검토해 작성한 답장입니다.",
  );
  assert.equal(draft(store.getSnapshot().state).status, "editing");
  const reloaded = createPrototypeStore();
  reloaded.hydrate(() => storage);
  assert.equal(
    draft(reloaded.getSnapshot().state).body,
    "제가 직접 검토해 작성한 답장입니다.",
  );
});

test("준비를 취소하고 다시 시작하면 이전 초안 응답을 적용하지 않는다", () => {
  let state = reduce(createSeed(), {
    type: "draft-prepare",
    id: "draft-welcome",
  });
  const old = draft(state).preparation;
  state = reduce(state, { type: "account", id: "gmail", patch: { ai: "off" } });
  state = reduce(state, {
    type: "account",
    id: "gmail",
    patch: { ai: "allowed" },
  });
  state = reduce(state, { type: "draft-prepare", id: "draft-welcome" });
  state = reduce(state, {
    type: "draft-ready",
    id: "draft-welcome",
    preparation: old,
    revision: 0,
    body: "취소된 결과",
  });
  assert.equal(draft(state).status, "preparing");
  assert.notEqual(draft(state).body, "취소된 결과");
});

test("중복 발송 클릭은 한 통만 추가하고 두 요청을 완료 처리하지 않는다", async () => {
  const { store } = loaded();
  assert.equal(
    store
      .getSnapshot()
      .state.messages.some((item) => item.id === "sent-draft-welcome"),
    false,
  );
  await Promise.all([
    store.sendDraft("draft-welcome"),
    store.sendDraft("draft-welcome"),
  ]);
  const state = store.getSnapshot().state;
  assert.equal(
    state.messages.filter((item) => item.id === "sent-draft-welcome").length,
    1,
  );
  assert.equal(
    state.tasks.find((item) => item.id === "task-quote")!.status,
    "proposed",
  );
  assert.equal(
    state.tasks.find((item) => item.id === "task-material")!.status,
    "proposed",
  );
});

test("발송 미확인은 재발송을 차단하고 결과 확인은 중복 없이 처리한다", async () => {
  const { store } = loaded(createSeed("send-unknown"));
  await store.sendDraft("draft-welcome");
  assert.equal(draft(store.getSnapshot().state).status, "unknown");
  await store.sendDraft("draft-welcome");
  assert.equal(
    store
      .getSnapshot()
      .state.messages.some((item) => item.id === "sent-draft-welcome"),
    false,
  );
  await store.confirmSend("draft-welcome");
  await store.confirmSend("draft-welcome");
  assert.equal(
    store
      .getSnapshot()
      .state.messages.filter((item) => item.id === "sent-draft-welcome").length,
    1,
  );
});

test("연결이 끊긴 발신 계정은 기존 초안을 보존하고 모의 전송을 막는다", async () => {
  const { store } = loaded();
  const sending = store.sendDraft("draft-welcome");
  await store.command({ type: "disconnect", id: "gmail" });
  await sending;
  assert.equal(draft(store.getSnapshot().state).status, "unknown");
  assert.equal(
    store
      .getSnapshot()
      .state.messages.some((item) => item.id === "sent-draft-welcome"),
    false,
  );
});

test("규칙 되돌리기는 읽음·분류·다른 계정을 보존하면서 중요도만 복원한다", () => {
  const original = createSeed();
  let state = reduce(original, {
    type: "rule-save",
    id: "rule-test",
    config: rule,
  });
  assert.equal(message(state, "m-sale").important, true);
  state = reduce(state, {
    type: "message",
    id: "m-sale",
    patch: { read: true, category: "personal" },
  });
  state = reduce(state, { type: "rule-undo", id: "rule-test" });
  assert.equal(message(state, "m-sale").important, false);
  assert.equal(message(state, "m-sale").read, true);
  assert.equal(message(state, "m-sale").category, "personal");
  assert.deepEqual(message(state, "m-letter"), message(original, "m-letter"));
  assert.equal(state.rules.length, 0);
});

test("규칙 뒤의 수동 중요도 수정은 보존하고 여러 규칙 변경은 순서대로 되돌린다", () => {
  let state = reduce(createSeed(), {
    type: "rule-save",
    id: "rule-test",
    config: rule,
  });
  state = reduce(state, {
    type: "message",
    id: "m-sale",
    patch: { important: true },
  });
  state = reduce(state, { type: "rule-undo", id: "rule-test" });
  assert.equal(message(state, "m-sale").important, true);
  state = reduce(createSeed(), {
    type: "rule-save",
    id: "rule-test",
    config: rule,
  });
  state = reduce(state, {
    type: "rule-save",
    id: "rule-test",
    config: { ...rule, title: "변경" },
  });
  state = reduce(state, { type: "rule-undo", id: "rule-test" });
  state = reduce(state, { type: "rule-undo", id: "rule-test" });
  assert.equal(message(state, "m-sale").important, false);
});

test("일회성 표시와 향후 규칙을 구분하고 라온 견적의 두 조건을 유지한다", async () => {
  const { store } = loaded();
  await askAssistant(store, "이 메일 중요하게", "naver", "m-sale");
  assert.equal(message(store.getSnapshot().state, "m-sale").important, true);
  assert.equal(store.getSnapshot().state.rules.length, 0);
  await askAssistant(store, "앞으로 라온 견적은 중요하게", "all");
  assert.equal(store.getSnapshot().state.rules.length, 0);
  await askAssistant(store, "앞으로 A사는 중요하게", "gmail");
  assert.equal(store.getSnapshot().state.rules.length, 0);
  await askAssistant(store, "앞으로 라온 견적은 중요하게", "gmail");
  assert.equal(store.getSnapshot().state.rules[0].keyword, "라온 견적");
  assert.equal(store.getSnapshot().state.rules[0].applyExisting, false);
  const state = reduce(store.getSnapshot().state, {
    type: "account",
    id: "gmail",
    patch: { basic: "allowed" },
  });
  assert.ok(restoreState(JSON.stringify(state)));
});

test("비서는 범위 밖 대상·미지원 요청·분석 실패를 완료 결과로 표시하지 않는다", async () => {
  const { store } = loaded();
  await askAssistant(store, "이 메일 답장 써줘", "naver", "m-quote");
  assert.equal(store.getSnapshot().state.drafts.length, 1);
  assert.match(store.getSnapshot().state.turns.at(-1)!.text, /메일을 먼저/);
  await askAssistant(store, "자동으로 계약을 체결해줘", "gmail");
  assert.match(store.getSnapshot().state.turns.at(-1)!.text, /준비된 요청/);
  const failed = loaded(createSeed("analysis-failed")).store;
  await askAssistant(failed, "밀린 답장 찾아줘", "all");
  assert.match(failed.getSnapshot().state.turns.at(-1)!.text, /아직 분석/);
});

test("수신 해제는 항목별 접수·실패·직접 설정을 구분하고 주문·보안 메일을 유지한다", async () => {
  const { store } = loaded(createSeed("unsubscribe-partial"));
  const before = store.getSnapshot().state.messages;
  await Promise.all([
    store.unsubscribe("sub-weekly"),
    store.unsubscribe("sub-store"),
    store.unsubscribe("sub-community"),
  ]);
  let state = store.getSnapshot().state;
  assert.deepEqual(
    state.subscriptions.map((item) => item.status),
    ["requested", "failed", "manual"],
  );
  assert.deepEqual(state.messages, before);
  await store.command({ type: "subscription-confirm", id: "sub-weekly" });
  await store.command({ type: "subscription-confirm", id: "sub-community" });
  state = store.getSnapshot().state;
  assert.deepEqual(
    state.subscriptions.map((item) => item.status),
    ["confirmed", "failed", "confirmed"],
  );
  assert.ok(state.subscriptions.every((item) => item.keepTransactional));
});

test("수신 요청 중 계정 연결을 해제하면 진행 표시를 끝내고 늦은 응답을 무시한다", async () => {
  const { store } = loaded();
  const pending = store.unsubscribe("sub-store");
  await store.command({ type: "disconnect", id: "naver" });
  await pending;
  assert.equal(
    store
      .getSnapshot()
      .state.subscriptions.find((item) => item.id === "sub-store")!.status,
    "failed",
  );
});

test("한 계정의 삭제는 파생 참조를 지우고 다른 계정과 빈 상태를 보존한다", async () => {
  const { store, storage } = loaded();
  await askAssistant(store, "밀린 답장 찾아줘", "all");
  await store.command({ type: "delete", id: "gmail" });
  let state = store.getSnapshot().state;
  assert.equal(searchMessages(state, "라온", "all").length, 0);
  assert.equal(state.drafts.length, 0);
  assert.equal(
    state.tasks.filter((item) => item.accountId === "gmail").length,
    0,
  );
  assert.ok(state.messages.some((item) => item.accountId === "naver"));
  assert.ok(
    state.turns.every((turn) =>
      turn.refs.every((ref) => ref.accountId !== "gmail"),
    ),
  );
  const reloaded = createPrototypeStore();
  reloaded.hydrate(() => storage);
  await reloaded.configure("gmail", { ai: "allowed" });
  state = reloaded.getSnapshot().state;
  assert.equal(
    state.messages.filter((item) => item.accountId === "gmail").length,
    0,
  );
  assert.equal(reloaded.getSnapshot().storageWarning, "");
});

test("빈 메일함 복원과 초기화는 체험 전용 저장 키만 변경한다", async () => {
  const { store, storage } = loaded(createSeed("empty"));
  assert.equal(store.getSnapshot().state.messages.length, 0);
  await store.reset();
  assert.ok(store.getSnapshot().state.messages.length);
  assert.equal(storage.data.get("other-app"), "keep");
});

test("저장 차단은 체험을 유지하고 손상 자료는 초기화 전 덮어쓰지 않는다", async () => {
  const blocked = createPrototypeStore();
  blocked.hydrate(() => {
    throw new Error("storage denied");
  });
  await blocked.command({
    type: "message",
    id: "m-quote",
    patch: { read: true },
  });
  assert.equal(message(blocked.getSnapshot().state, "m-quote").read, true);
  assert.match(blocked.getSnapshot().storageWarning, /저장/);
  const corrupt = memory("{broken");
  const store = createPrototypeStore();
  store.hydrate(() => corrupt);
  await store.command({
    type: "message",
    id: "m-quote",
    patch: { read: true },
  });
  assert.equal(corrupt.data.get(STORAGE_KEY), "{broken");
  await store.reset();
  assert.ok(restoreState(corrupt.data.get(STORAGE_KEY)!));
});

test("진행 도중 복원 시 분석은 재시도, 발송은 미확인으로 남긴다", () => {
  let state = reduce(createSeed("analysis-pending"), {
    type: "draft-send",
    id: "draft-welcome",
  });
  state = reduce(state, { type: "subscription-start", id: "sub-store" });
  const restored = restoreState(JSON.stringify(state))!;
  assert.equal(draft(restored).status, "unknown");
  assert.ok(restored.jobs.every((job) => job.status === "retry"));
  assert.equal(
    restored.subscriptions.find((item) => item.id === "sub-store")!.status,
    "requested",
  );
});

test("손상된 중첩 자료·외부 참조·삭제된 원문을 복원하지 않는다", () => {
  const invalid = [
    { ...createSeed(), tasks: [{ id: "task-broken" }] },
    {
      ...createSeed(),
      turns: [
        {
          id: "turn-broken",
          role: "assistant",
          text: "x",
          refs: [
            {
              label: "외부",
              href: "https://outside.example",
              accountId: "all",
            },
          ],
        },
      ],
    },
    {
      ...createSeed(),
      messages: createSeed().messages.filter((item) => item.id !== "m-quote"),
    },
  ];
  for (const state of invalid)
    assert.equal(restoreState(JSON.stringify(state)), null);
});

test("새 답장과 전달은 원본 계정·수신자·첨부를 보존한다", () => {
  const state = createSeed();
  const reply = newDraft(state, "naver", "t-quote", "reply");
  assert.equal(reply.accountId, "gmail");
  assert.equal(reply.to, message(state, "m-quote").address);
  const forwarded = newDraft(state, "gmail", "t-quote", "forward");
  assert.equal(forwarded.to, "");
  assert.match(forwarded.body, /전달할 원문/);
  assert.equal(forwarded.attachments.length, 1);
});

test("비서 처리 도중 삭제·초기화하면 늦은 답변과 삭제된 근거를 복원하지 않는다", async () => {
  for (const action of ["delete", "reset"] as const) {
    const { store } = loaded();
    const pending = askAssistant(store, "마케팅 수신 해제", "naver", "m-sale");
    if (action === "delete")
      await store.command({ type: "delete", id: "naver" });
    else await store.reset();
    await pending;
    assert.equal(store.getSnapshot().state.turns.length, 0);
    assert.ok(restoreState(JSON.stringify(store.getSnapshot().state)));
  }
});
