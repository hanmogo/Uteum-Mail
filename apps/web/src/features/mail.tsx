"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Forward,
  MailOpen,
  Paperclip,
  Reply,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import { SelectField } from "@/components/ui/select-field";
import { usePrototype } from "@/lib/prototype/context";
import {
  inScope,
  searchMessages,
  subjectFor,
  threadMessages,
} from "@/lib/prototype/model";
import type { Category } from "@/lib/prototype/types";
import { CATEGORY_LABELS } from "@/lib/prototype/types";
import {
  AccountDot,
  Avatar,
  CategoryBadge,
  Empty,
  PageHeading,
  ProcessingNotice,
  dateLabel,
  useView,
} from "./shared";

export function MailPage() {
  const { state, store } = usePrototype();
  const { params, scope, set } = useView();
  const [query, setQuery] = useState("");
  const view = params.get("view") ?? "inbox";
  const filter = params.get("filter") ?? "all";
  const scoped = state.messages.filter((message) =>
    inScope(message.accountId, scope),
  );
  const matches = new Set(
    searchMessages(state, query, scope).map((message) => message.id),
  );
  const filtered = scoped.filter(
    (message) =>
      message.direction === (view === "sent" ? "sent" : "received") &&
      matches.has(message.id) &&
      (filter === "important"
        ? message.important
        : filter === "unread"
          ? !message.read
          : filter === "promotion"
            ? message.category === "promotion"
            : true),
  );
  const rows = [
    ...new Map(
      filtered
        .sort((a, b) => a.at.localeCompare(b.at))
        .map((message) => [message.threadId, message]),
    ).values(),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const drafts = state.drafts.filter(
    (draft) => inScope(draft.accountId, scope) && draft.status !== "sent",
  );
  const thread = state.threads.find(
    (item) =>
      item.id === params.get("thread") && inScope(item.accountId, scope),
  );
  const conversation = thread ? threadMessages(state, thread.id) : [];
  const selected =
    conversation.find((item) => item.id === params.get("message")) ??
    conversation.filter((item) => item.direction === "received").at(-1) ??
    conversation.at(-1);
  const account = state.accounts.find((item) => item.id === thread?.accountId);
  const compose = async (mode: "reply" | "forward") => {
    if (!thread || !account) return;
    const id = await store.createDraft(
      account.id,
      thread.id,
      mode,
      state.tasks.find((task) => task.threadId === thread.id)?.id,
    );
    set({ draft: id, assistant: null });
  };
  return (
    <div className="page-content mail-page">
      <PageHeading
        title="통합 메일함"
        description="계정마다 흩어진 메일을 한곳에서 확인하세요."
        actions={
          <span className="subtle-counter">
            {
              scoped.filter(
                (item) => item.direction === "received" && !item.read,
              ).length
            }
            통 읽지 않음
          </span>
        }
      />
      <ProcessingNotice />
      <section className={`mail-workbench panel ${thread ? "has-detail" : ""}`}>
        <div className="mail-list-pane">
          <Tabs
            value={view}
            onValueChange={(value) =>
              set({ view: value, thread: null, message: null })
            }
          >
            <TabsList className="mail-tabs">
              <TabsTrigger value="inbox">받은 메일</TabsTrigger>
              <TabsTrigger value="sent">보낸 메일</TabsTrigger>
              <TabsTrigger value="drafts">
                초안 <span className="tab-count">{drafts.length}</span>
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="list-search">
            <Search size={16} />
            <Input
              aria-label="메일함 내 검색"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="제목, 보낸 사람, 본문 검색"
            />
          </div>
          {view !== "drafts" && (
            <div className="filter-chips">
              {[
                ["all", "전체"],
                ["important", "중요"],
                ["unread", "안 읽음"],
                ["promotion", "광고"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => set({ filter: value })}
                  className={filter === value ? "selected" : ""}
                  aria-pressed={filter === value}
                >
                  {label}
                </button>
              ))}
              <span>{rows.length}개 대화</span>
            </div>
          )}
          <div className="mail-list">
            {view === "drafts" ? (
              drafts.length ? (
                drafts
                  .filter(
                    (draft) =>
                      !query ||
                      `${draft.subject} ${draft.body}`.includes(query),
                  )
                  .map((draft) => (
                    <button
                      className="draft-list-row"
                      key={draft.id}
                      onClick={() => set({ draft: draft.id })}
                    >
                      <span className="tag">초안</span>
                      <strong>{draft.subject || "제목 없는 초안"}</strong>
                      <p>{draft.body.slice(0, 90) || "본문을 작성해 주세요"}</p>
                      <span>
                        {draft.saved ? "저장됨" : "편집 중"} ·{" "}
                        {
                          state.accounts.find(
                            (item) => item.id === draft.accountId,
                          )?.provider
                        }
                      </span>
                    </button>
                  ))
              ) : (
                <Empty
                  title="저장한 초안이 없어요"
                  description="새 메일을 작성하거나 메일에서 답장을 시작해 보세요."
                />
              )
            ) : rows.length ? (
              rows.map((message) => (
                <div
                  key={message.id}
                  className={`mail-list-row ${thread?.id === message.threadId ? "selected" : ""} ${!message.read ? "unread" : ""}`}
                >
                  <button
                    className="mail-select"
                    onClick={() =>
                      set({ thread: message.threadId, message: message.id })
                    }
                  >
                    <span className="mail-row-head">
                      <strong>{message.sender}</strong>
                      <span>{dateLabel(message.at)}</span>
                    </span>
                    <h3>{subjectFor(state, message)}</h3>
                    <p>{message.body.replaceAll("\n", " ").slice(0, 110)}</p>
                    <span className="mail-meta">
                      <AccountDot
                        account={state.accounts.find(
                          (item) => item.id === message.accountId,
                        )}
                      />
                      <CategoryBadge category={message.category} />
                      {!message.read && (
                        <span className="unread-dot" aria-label="읽지 않음" />
                      )}
                    </span>
                  </button>
                  <button
                    className={`star-toggle ${message.important ? "on" : ""}`}
                    aria-label={
                      message.important ? "중요 표시 해제" : "중요 표시"
                    }
                    aria-pressed={message.important}
                    onClick={() =>
                      store.command(
                        {
                          type: "message",
                          id: message.id,
                          patch: { important: !message.important },
                        },
                        "중요도를 변경했습니다. 메일 유형과 업무 상태는 유지됩니다.",
                      )
                    }
                  >
                    <Star
                      size={16}
                      fill={message.important ? "currentColor" : "none"}
                    />
                  </button>
                </div>
              ))
            ) : (
              <Empty
                title="표시할 메일이 없어요"
                description={
                  query
                    ? "다른 검색어나 필터로 확인해 보세요."
                    : "현재 계정과 필터에 맞는 가상 메일이 없습니다."
                }
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setQuery("");
                      set({ filter: "all" });
                    }}
                  >
                    필터 초기화
                  </Button>
                }
              />
            )}
          </div>
        </div>
        <div className="mail-detail-pane">
          {thread && selected ? (
            <>
              <div className="mail-detail-toolbar">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mobile-back"
                  onClick={() => set({ thread: null, message: null })}
                >
                  <ArrowLeft size={16} />
                  목록
                </Button>
                <div className="toolbar-group">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      store.command(
                        {
                          type: "message",
                          id: selected.id,
                          patch: { read: !selected.read },
                        },
                        "읽음 상태를 변경했습니다. 업무 완료와는 별개입니다.",
                      )
                    }
                  >
                    <MailOpen size={16} />
                    {selected.read ? "안 읽음으로" : "읽음으로"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => set({ assistant: "1", draft: null })}
                  >
                    <Sparkles size={16} />
                    비서
                  </Button>
                </div>
                <button
                  className={`star-toggle inline ${selected.important ? "on" : ""}`}
                  aria-label={
                    selected.important
                      ? "선택 메일 중요 해제"
                      : "선택 메일 중요 표시"
                  }
                  onClick={() =>
                    store.command({
                      type: "message",
                      id: selected.id,
                      patch: { important: !selected.important },
                    })
                  }
                >
                  <Star
                    size={17}
                    fill={selected.important ? "currentColor" : "none"}
                  />
                </button>
              </div>
              <div className="mail-detail-title">
                <div className="mail-meta">
                  <AccountDot account={account} />
                  <CategoryBadge category={selected.category} />
                  {selected.important && (
                    <span className="tag tag-important">
                      <Star size={10} />
                      중요
                    </span>
                  )}
                </div>
                <h2>{thread.subject}</h2>
                <div className="classification-control">
                  <span>선택 메일 분류</span>
                  <SelectField
                    label="선택 메일 분류"
                    value={selected.category}
                    onChange={(value) =>
                      store.command(
                        {
                          type: "message",
                          id: selected.id,
                          patch: { category: value as Category },
                        },
                        "분류를 변경했습니다. 중요도는 유지됩니다.",
                      )
                    }
                    options={Object.entries(CATEGORY_LABELS).map(
                      ([value, label]) => ({ value, label }),
                    )}
                  />
                  <Link
                    href={`/rules?account=${account?.id}&keyword=${encodeURIComponent(selected.sender.split(" · ")[1] ?? selected.sender)}`}
                  >
                    규칙 만들기
                    <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
              {state.tasks
                .filter(
                  (task) =>
                    task.threadId === thread.id &&
                    !["completed", "excluded"].includes(task.status),
                )
                .map((task) => (
                  <Link
                    className="mail-task-link"
                    href={`/tasks?account=${task.accountId}&task=${task.id}`}
                    key={task.id}
                  >
                    <Check size={14} />
                    {task.title}
                    <span>
                      {task.status === "proposed" ? "후보 확인" : "남은 업무"}
                      <ArrowUpRight size={13} />
                    </span>
                  </Link>
                ))}
              <div className="conversation">
                {conversation.map((message) => (
                  <article
                    className={`message-card ${selected.id === message.id ? "source-selected" : ""}`}
                    key={message.id}
                  >
                    <div className="message-header">
                      <Avatar name={message.sender} />
                      <div>
                        <strong>{message.sender}</strong>
                        <small>
                          {message.address}
                          <br />
                          받는 사람: {message.to}
                        </small>
                      </div>
                      <time>
                        {dateLabel(message.at, true)}
                        {message.direction === "sent" && (
                          <span className="tag">보낸 메일</span>
                        )}
                      </time>
                    </div>
                    <p className="message-body">{message.body}</p>
                    {message.attachments.map((attachment) => (
                      <a
                        className="attachment-preview"
                        href={attachment.path}
                        target="_blank"
                        rel="noreferrer"
                        key={attachment.id}
                      >
                        <Paperclip size={17} />
                        <span>
                          <strong>{attachment.name}</strong>
                          <small>{attachment.size} · 가상 첨부 미리보기</small>
                        </span>
                        <ArrowUpRight size={14} />
                      </a>
                    ))}
                  </article>
                ))}
              </div>
              <div className="reply-actions">
                <Button variant="outline" onClick={() => compose("reply")}>
                  <Reply size={15} />
                  답장
                </Button>
                <Button variant="outline" onClick={() => compose("forward")}>
                  <Forward size={15} />
                  전달
                </Button>
                <Button
                  onClick={async () => {
                    const id = await store.createDraft(
                      account!.id,
                      thread.id,
                      "reply",
                      state.tasks.find((task) => task.threadId === thread.id)
                        ?.id,
                    );
                    set({ draft: id });
                    await store.prepareDraft(id);
                  }}
                >
                  <Sparkles size={15} />
                  답장 초안 준비
                </Button>
              </div>
            </>
          ) : (
            <Empty
              title="차분히, 한 통씩 확인해요"
              description="목록에서 메일을 선택하면 대화와 관련 업무를 함께 볼 수 있어요."
            />
          )}
        </div>
      </section>
    </div>
  );
}
