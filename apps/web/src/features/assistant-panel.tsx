"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { ArrowRight, ArrowUp, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePrototype } from "@/lib/prototype/context";
import { ASSISTANT_EXAMPLES, askAssistant } from "@/lib/prototype/assistant";
import { inScope, threadMessages } from "@/lib/prototype/model";
import { restorePanelFocus, useView } from "./shared";

export function AssistantConversation() {
  const { state, store } = usePrototype();
  const { params, scope } = useView();
  const inputId = useId();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const messagesRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = messagesRef.current;
    if (panel) panel.scrollTop = panel.scrollHeight;
  }, [state.turns.length, busy]);
  const message =
    state.messages.find(
      (item) =>
        item.id === params.get("message") && inScope(item.accountId, scope),
    ) ??
    threadMessages(state, params.get("thread") ?? "")
      .filter(
        (item) =>
          item.direction === "received" && inScope(item.accountId, scope),
      )
      .at(-1);
  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setInput("");
    setBusy(true);
    try {
      await askAssistant(store, text.trim(), scope, message?.id);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="assistant-conversation">
      <div className="assistant-context">
        <span className="tag">
          {scope === "all"
            ? "모든 계정"
            : state.accounts.find((item) => item.id === scope)?.provider}
        </span>
        <span>
          {message
            ? state.threads.find((thread) => thread.id === message.threadId)
                ?.subject
            : "메일을 열면 해당 대화를 참고합니다"}
        </span>
      </div>
      <div className="assistant-messages" aria-live="polite" ref={messagesRef}>
        {!state.turns.length && (
          <div className="assistant-welcome">
            <span className="assistant-orb">
              <Sparkles size={26} />
            </span>
            <h3>어떤 메일부터 도와드릴까요?</h3>
            <p>
              짧게 요청해도 괜찮아요.
              <br />
              아래 준비된 질문으로 흐름을 체험해 보세요.
            </p>
          </div>
        )}
        {state.turns.map((turn) => (
          <div className={`chat-turn chat-${turn.role}`} key={turn.id}>
            {turn.role === "assistant" && <Sparkles size={14} />}
            <div>
              <p>{turn.text}</p>
              {turn.refs.length > 0 && (
                <div className="chat-references">
                  {turn.refs.map((ref, index) => (
                    <Link key={index} href={ref.href}>
                      {ref.label}
                      <ArrowRight size={13} />
                    </Link>
                  ))}
                </div>
              )}
              {turn.clarification === "advertising" && (
                <div className="chat-choices">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => send("광고로 분류해줘")}
                    disabled={busy}
                  >
                    광고로 분류
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => send("마케팅 수신 해제")}
                    disabled={busy}
                  >
                    마케팅 수신 해제
                  </Button>
                </div>
              )}
            </div>
          </div>
        ))}
        {busy && (
          <div className="chat-turn chat-assistant">
            <LoaderCircle size={15} className="spin" />
            <p>가상 자료를 확인하고 있습니다…</p>
          </div>
        )}
      </div>
      <div className="assistant-prompts">
        {ASSISTANT_EXAMPLES.map((example) => (
          <button key={example} onClick={() => send(example)} disabled={busy}>
            {example}
            <ArrowUp size={11} />
          </button>
        ))}
      </div>
      <form
        className="assistant-input"
        onSubmit={(event) => {
          event.preventDefault();
          send(input);
        }}
      >
        <label className="sr-only" htmlFor={inputId}>
          비서에게 요청
        </label>
        <Textarea
          id={inputId}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="예: 밀린 답장 찾아줘"
          rows={2}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              send(input);
            }
          }}
        />
        <Button
          size="icon"
          type="submit"
          aria-label="비서 요청 보내기"
          disabled={busy || !input.trim()}
        >
          <ArrowUp size={17} />
        </Button>
      </form>
      <p className="assistant-footnote">
        정해진 응답으로 진행하는 체험입니다. 결과의 근거를 함께 확인하세요.
      </p>
    </div>
  );
}
export function AssistantPanel() {
  const { params, set } = useView();
  const returnFocus = useRef<HTMLElement | null>(null);
  return (
    <Dialog
      open={params.get("assistant") === "1"}
      onOpenChange={(open) => {
        if (!open) set({ assistant: null });
      }}
    >
      <DialogContent
        className="assistant-dialog"
        onOpenAutoFocus={() => {
          returnFocus.current = document.activeElement as HTMLElement;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restorePanelFocus(returnFocus.current, "[data-assistant-open]");
        }}
      >
        <DialogHeader>
          <span className="eyebrow">메일 속 업무를 한눈에</span>
          <DialogTitle className="assistant-title">
            <Sparkles size={20} />
            나의 메일 비서
          </DialogTitle>
          <DialogDescription>
            현재 계정과 선택한 메일을 참고합니다.
          </DialogDescription>
        </DialogHeader>
        <AssistantConversation />
      </DialogContent>
    </Dialog>
  );
}
