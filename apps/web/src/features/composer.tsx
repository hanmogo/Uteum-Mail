"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  ArrowUpRight,
  LoaderCircle,
  Paperclip,
  Save,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { usePrototype } from "@/lib/prototype/context";
import { SAMPLE_ATTACHMENT } from "@/lib/prototype/seed";
import { canAnalyze, canCollect } from "@/lib/prototype/model";
import { restorePanelFocus, useView } from "./shared";

export function DraftEditor() {
  const { state, store } = usePrototype();
  const { params, set } = useView();
  const id = params.get("draft");
  const draft = state.drafts.find((item) => item.id === id);
  const returnFocus = useRef<HTMLElement | null>(null);
  const account = state.accounts.find((item) => item.id === draft?.accountId);
  const locked =
    !!draft && ["sending", "unknown", "sent"].includes(draft.status);
  const update = (
    patch: Partial<
      Pick<
        NonNullable<typeof draft>,
        "accountId" | "to" | "cc" | "subject" | "body" | "attachments"
      >
    >,
  ) => {
    if (draft) store.command({ type: "draft-edit", id: draft.id, patch });
  };
  return (
    <Dialog
      open={!!id}
      onOpenChange={(open) => {
        if (!open) set({ draft: null });
      }}
    >
      <DialogContent
        className="composer-dialog"
        onOpenAutoFocus={() => {
          returnFocus.current = document.activeElement as HTMLElement;
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restorePanelFocus(returnFocus.current, "[data-draft-open]");
        }}
      >
        <DialogHeader>
          <span className="eyebrow">작성·초안 검토</span>
          <DialogTitle>
            {draft?.mode === "reply"
              ? "답장 작성"
              : draft?.mode === "forward"
                ? "메일 전달"
                : "새 메일 작성"}
          </DialogTitle>
          <DialogDescription>
            가상 초안입니다. 최종 내용을 확인하고 모의 발송을 눌러 주세요.
          </DialogDescription>
        </DialogHeader>
        {draft ? (
          <>
            <div className="compose-fields">
              <label className="compose-label" htmlFor="draft-account">
                보내는 계정
              </label>
              <SelectField
                id="draft-account"
                label="보내는 계정"
                value={draft.accountId}
                onChange={(value) => update({ accountId: value })}
                disabled={locked || draft.mode === "reply"}
                options={state.accounts.map((item) => ({
                  value: item.id,
                  label: `${item.provider} · ${item.address}`,
                }))}
              />
              <label className="compose-label" htmlFor="draft-to">
                받는 사람
              </label>
              <Input
                id="draft-to"
                value={draft.to}
                onChange={(event) => update({ to: event.target.value })}
                placeholder="recipient@company.example"
                disabled={locked}
              />
              <label className="compose-label" htmlFor="draft-cc">
                참조
              </label>
              <Input
                id="draft-cc"
                value={draft.cc}
                onChange={(event) => update({ cc: event.target.value })}
                placeholder="선택 사항"
                disabled={locked}
              />
              <label className="compose-label" htmlFor="draft-subject">
                제목
              </label>
              <Input
                id="draft-subject"
                value={draft.subject}
                onChange={(event) => update({ subject: event.target.value })}
                placeholder="메일 제목을 입력해 주세요"
                disabled={locked}
              />
            </div>
            {draft.threadId && (
              <Link
                className="source-strip"
                href={`/mail?account=${draft.accountId}&thread=${draft.threadId}`}
              >
                <ArrowUpRight size={14} />
                원문 대화 확인
              </Link>
            )}
            <label className="sr-only" htmlFor="draft-body">
              메일 본문
            </label>
            <Textarea
              className="draft-body"
              id="draft-body"
              value={draft.body}
              onChange={(event) => update({ body: event.target.value })}
              placeholder="안녕하세요. 여기에 메일을 작성해 주세요."
              disabled={locked}
            />
            <div className="draft-attachments">
              {draft.attachments.map((attachment) => (
                <span className="attachment-pill" key={attachment.id}>
                  <a href={attachment.path} target="_blank" rel="noreferrer">
                    <Paperclip size={13} />
                    {attachment.name}
                  </a>
                  {!locked && (
                    <button
                      aria-label="예시 첨부 제거"
                      onClick={() =>
                        update({
                          attachments: draft.attachments.filter(
                            (item) => item.id !== attachment.id,
                          ),
                        })
                      }
                    >
                      <X size={13} />
                    </button>
                  )}
                </span>
              ))}
              {!draft.attachments.length && !locked && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => update({ attachments: [SAMPLE_ATTACHMENT] })}
                >
                  <Paperclip size={14} />
                  예시 첨부 추가
                </Button>
              )}
            </div>
            <p
              className={`draft-notice ${["failed", "unknown", "retry"].includes(draft.status) ? "warning-text" : ""}`}
              role="status"
            >
              {draft.status === "preparing" && (
                <LoaderCircle className="spin" size={14} />
              )}
              {draft.notice}
              {draft.saved && <span className="saved-tag">저장됨</span>}
            </p>
            {!canCollect(account) && (
              <p className="warning-text">
                연결·기본 처리 허용이 필요합니다.{" "}
                <Link href={`/settings?account=${draft.accountId}`}>
                  설정 확인
                </Link>
              </p>
            )}
            <div className="composer-footer">
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    locked ||
                    draft.status === "preparing" ||
                    !canAnalyze(account)
                  }
                  onClick={() => store.prepareDraft(draft.id)}
                >
                  <Sparkles size={15} />
                  {draft.status === "preparing"
                    ? "초안 준비 중"
                    : "예시 초안 준비"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={draft.status === "sending"}
                  onClick={() =>
                    store.command({ type: "draft-save", id: draft.id })
                  }
                >
                  <Save size={15} />
                  저장
                </Button>
              </div>
              {draft.status === "unknown" ? (
                <Button onClick={() => store.confirmSend(draft.id)}>
                  모의 발송 결과 확인
                </Button>
              ) : draft.status === "sent" ? (
                <Button asChild>
                  <Link href={`/tasks?account=${draft.accountId}`}>
                    남은 업무 확인
                  </Link>
                </Button>
              ) : (
                <Button
                  disabled={
                    draft.status === "sending" ||
                    draft.status === "preparing" ||
                    !canCollect(account) ||
                    !draft.to.trim() ||
                    !draft.subject.trim() ||
                    !draft.body.trim()
                  }
                  onClick={() => store.sendDraft(draft.id)}
                >
                  {draft.status === "sending" ? (
                    <LoaderCircle size={15} className="spin" />
                  ) : (
                    <Send size={15} />
                  )}
                  {draft.status === "sending"
                    ? "모의 발송 중"
                    : draft.status === "failed"
                      ? "모의 발송 재시도"
                      : "모의 발송"}
                </Button>
              )}
            </div>
          </>
        ) : (
          <p>
            이 초안은 삭제되었거나 현재 자료에 없습니다. 닫고 다른 메일을 선택해
            주세요.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
