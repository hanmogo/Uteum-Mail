import { createSeed } from "./seed";
import {
  canAnalyze,
  canCollect,
  newDraft,
  reduce,
  restoreState,
  sampleDraftBody,
  STORAGE_KEY,
  type Action,
} from "./model";
import type { Draft, MailAccount, PrototypeState, Scenario } from "./types";

export interface Snapshot {
  state: PrototypeState;
  hydrated: boolean;
  storageWarning: string;
  notice: string;
}
type StorageAccess = Pick<Storage, "getItem" | "setItem">;
const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export function createPrototypeStore() {
  let snapshot: Snapshot = {
    state: createSeed(),
    hydrated: false,
    storageWarning: "",
    notice: "",
  };
  const serverSnapshot = snapshot;
  let storage: StorageAccess | undefined;
  let invalidStorage = false;
  let epoch = 0;
  const listeners = new Set<() => void>();
  const notify = () => listeners.forEach((listener) => listener());
  function publish(state: PrototypeState, notice = snapshot.notice) {
    snapshot = { ...snapshot, state, notice };
    if (snapshot.hydrated && storage && !invalidStorage) {
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch {
        storage = undefined;
        snapshot = {
          ...snapshot,
          storageWarning:
            "브라우저 저장을 사용할 수 없습니다. 현재 체험은 가능하지만 새로고침 후 변경 내용이 유지되지 않습니다.",
        };
      }
    }
    notify();
  }
  function dispatch(action: Action, notice?: string) {
    publish(reduce(snapshot.state, action), notice);
  }
  const store = {
    getSnapshot: () => snapshot,
    getServerSnapshot: () => serverSnapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    hydrate(access: () => StorageAccess) {
      if (snapshot.hydrated) return;
      let state = snapshot.state;
      let warning = "";
      try {
        storage = access();
        const raw = storage.getItem(STORAGE_KEY);
        if (raw !== null) {
          const restored = restoreState(raw);
          if (restored) state = restored;
          else {
            invalidStorage = true;
            warning =
              "저장된 체험 자료를 읽지 못했습니다. 데모 초기화로 복구할 수 있습니다. 원래 저장 자료는 아직 덮어쓰지 않았습니다.";
          }
        }
      } catch {
        storage = undefined;
        warning =
          "브라우저 저장을 사용할 수 없습니다. 새로고침하면 가상 자료가 초기화됩니다.";
      }
      snapshot = {
        ...snapshot,
        state,
        hydrated: true,
        storageWarning: warning,
      };
      notify();
    },
    async query<T>(selector: (state: PrototypeState) => T): Promise<T> {
      return selector(snapshot.state);
    },
    async command(action: Action, notice?: string) {
      dispatch(action, notice);
    },
    tell(notice: string) {
      snapshot = { ...snapshot, notice };
      notify();
    },
    clearNotice() {
      snapshot = { ...snapshot, notice: "" };
      notify();
    },
    async reset(scenario: Scenario = "normal", onboarding = false) {
      epoch++;
      invalidStorage = false;
      snapshot = {
        ...snapshot,
        storageWarning: storage ? "" : snapshot.storageWarning,
      };
      publish(
        createSeed(scenario, onboarding),
        onboarding
          ? "처음부터 체험을 시작합니다. 가상 계정을 선택해 주세요."
          : "가상 자료를 선택한 시나리오의 원본으로 초기화했습니다.",
      );
    },
    async configure(
      id: string,
      patch: Partial<
        Pick<
          MailAccount,
          "purpose" | "basic" | "ai" | "historyDays" | "newMailAnalysis"
        >
      >,
    ) {
      dispatch(
        { type: "account", id, patch },
        "가상 시작 설정을 저장했습니다.",
      );
      const account = snapshot.state.accounts.find((item) => item.id === id);
      if (
        canAnalyze(account) &&
        !account?.dataDeleted &&
        account?.historyDays === 30
      )
        await store.analyze(id);
    },
    async analyze(id: string) {
      const account = snapshot.state.accounts.find((item) => item.id === id);
      if (!canAnalyze(account) || account?.dataDeleted) {
        store.tell("해당 계정의 연결·기본 처리·AI 허용 상태를 확인해 주세요.");
        return;
      }
      const currentEpoch = epoch;
      dispatch({ type: "analysis-start", id });
      const jobId = snapshot.state.jobs.find((job) => job.accountId === id)!.id;
      await pause(700);
      if (currentEpoch !== epoch) return;
      dispatch(
        {
          type:
            snapshot.state.scenario === "analysis-failed"
              ? "analysis-fail"
              : "analysis-complete",
          id,
          jobId,
        },
        snapshot.state.scenario === "analysis-failed"
          ? "가상 분석 실패를 재현했습니다. 메일 열람과 수동 편집은 가능합니다."
          : "가상 분석을 마쳤습니다. 업무 후보를 확인해 주세요.",
      );
    },
    async createDraft(
      accountId: string,
      threadId?: string,
      mode: Draft["mode"] = "new",
      taskId?: string,
    ) {
      const draft = newDraft(snapshot.state, accountId, threadId, mode, taskId);
      dispatch({ type: "draft-create", draft });
      return draft.id;
    },
    async prepareDraft(id: string) {
      const draft = snapshot.state.drafts.find((item) => item.id === id);
      if (
        !draft ||
        !canAnalyze(
          snapshot.state.accounts.find(
            (account) => account.id === draft.accountId,
          ),
        )
      ) {
        store.tell(
          "초안 준비를 체험하려면 계정의 AI 사용을 켜 주세요. 직접 작성은 가능합니다.",
        );
        return;
      }
      if (["preparing", "sending", "sent", "unknown"].includes(draft.status))
        return;
      const currentEpoch = epoch;
      const revision = draft.revision;
      const body = sampleDraftBody(snapshot.state, draft);
      dispatch({ type: "draft-prepare", id });
      const preparation = snapshot.state.drafts.find(
        (draft) => draft.id === id,
      )!.preparation;
      await pause(900);
      if (currentEpoch !== epoch) return;
      dispatch({ type: "draft-ready", id, revision, preparation, body });
    },
    async sendDraft(id: string) {
      const draft = snapshot.state.drafts.find((item) => item.id === id);
      if (
        !draft ||
        ["preparing", "sending", "sent", "unknown"].includes(draft.status)
      )
        return;
      if (
        !canCollect(
          snapshot.state.accounts.find(
            (account) => account.id === draft.accountId,
          ),
        )
      ) {
        store.tell("발신 계정의 연결과 기본 처리 허용을 확인해 주세요.");
        return;
      }
      if (!draft.to.trim() || !draft.subject.trim() || !draft.body.trim()) {
        store.tell("수신자·제목·본문을 입력해 주세요.");
        return;
      }
      const currentEpoch = epoch;
      dispatch({ type: "draft-send", id });
      await pause(700);
      if (currentEpoch !== epoch) return;
      if (
        snapshot.state.drafts.find((draft) => draft.id === id)?.status !==
        "sending"
      )
        return;
      const scenario = snapshot.state.scenario;
      dispatch(
        {
          type: "draft-result",
          id,
          status:
            scenario === "send-unknown"
              ? "unknown"
              : scenario === "send-failed"
                ? "failed"
                : "sent",
        },
        "모의 발송 결과를 확인해 주세요.",
      );
    },
    async confirmSend(id: string) {
      dispatch(
        { type: "draft-result", id, status: "sent" },
        "가상 발송 결과를 확인했습니다. 중복 발송은 발생하지 않았습니다.",
      );
    },
    async unsubscribe(id: string) {
      const item = snapshot.state.subscriptions.find((item) => item.id === id);
      if (
        !item ||
        ["requesting", "requested", "confirmed"].includes(item.status)
      )
        return;
      if (
        !canCollect(
          snapshot.state.accounts.find(
            (account) => account.id === item.accountId,
          ),
        )
      ) {
        store.tell("가상 계정 연결과 기본 처리 허용이 필요합니다.");
        return;
      }
      const currentEpoch = epoch;
      dispatch({ type: "subscription-start", id });
      if (item.route === "manual") return;
      await pause(600);
      if (currentEpoch !== epoch) return;
      dispatch({
        type: "subscription-result",
        id,
        status:
          snapshot.state.scenario === "unsubscribe-partial" &&
          id === "sub-store"
            ? "failed"
            : "requested",
      });
    },
  };
  return store;
}
export type PrototypeStore = ReturnType<typeof createPrototypeStore>;
