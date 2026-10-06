"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Pencil,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePrototype } from "@/lib/prototype/context";
import { inScope } from "@/lib/prototype/model";
import type { Task } from "@/lib/prototype/types";
import {
  AccountDot,
  Empty,
  PageHeading,
  ProcessingNotice,
  TaskBadge,
  dateLabel,
  mailHref,
  useView,
} from "./shared";

export function TasksPage() {
  const { state, store } = usePrototype();
  const { params, scope, set } = useView();
  const filter = params.get("filter") ?? "open";
  const [editing, setEditing] = useState(false);
  const today = state.clock.slice(0, 10);
  const scoped = state.tasks.filter((item) => inScope(item.accountId, scope));
  const tasks = scoped.filter((task) =>
    filter === "open"
      ? !["completed", "excluded"].includes(task.status)
      : filter === "today"
        ? !["completed", "excluded"].includes(task.status) &&
          (task.deadline === today || task.reminder === today)
        : filter === "overdue"
          ? !!task.deadline &&
            task.deadline < today &&
            !["completed", "excluded"].includes(task.status)
          : task.status === filter,
  );
  const selected = scoped.find((item) => item.id === params.get("task"));
  return (
    <div className="page-content">
      <PageHeading
        title="할 일"
        description="메일에서 시작된 요청을 확인하고, 하나씩 마무리하세요."
        actions={
          <span className="date-chip">
            <CalendarDays size={14} />
            10월 3일 기준
          </span>
        }
      />
      <ProcessingNotice />
      <div className="tasks-filter-bar filter-chips">
        {[
          ["open", "진행 중 전체"],
          ["proposed", "업무 후보"],
          ["waiting", "답변 대기"],
          ["completed", "완료"],
          ["excluded", "제외"],
          ["today", "오늘 확인"],
          ["overdue", "기한 경과"],
        ].map(([value, label]) => (
          <button
            key={value}
            className={filter === value ? "selected" : ""}
            aria-pressed={filter === value}
            onClick={() => set({ filter: value, task: null })}
          >
            {label}
            <span>
              {value === "proposed"
                ? scoped.filter((task) => task.status === "proposed").length
                : ""}
            </span>
          </button>
        ))}
      </div>
      <div className={`tasks-workbench ${selected ? "has-detail" : ""}`}>
        <section className="panel tasks-list">
          <div className="panel-heading">
            <h2>
              {filter === "proposed"
                ? "채택할 업무를 확인해 주세요"
                : "현재 계정의 업무"}
              <span className="count-bubble">{tasks.length}</span>
            </h2>
          </div>
          {tasks.length ? (
            tasks.map((task) => (
              <button
                className={`task-list-row ${selected?.id === task.id ? "selected" : ""}`}
                key={task.id}
                onClick={() => set({ task: task.id })}
              >
                <span
                  className={`task-checkbox ${task.status === "completed" ? "checked" : task.status === "proposed" ? "proposed" : ""}`}
                >
                  {task.status === "completed" && <Check size={13} />}
                </span>
                <div>
                  <div className="task-row-title">
                    <h3>{task.title}</h3>
                    <TaskBadge status={task.status} />
                  </div>
                  <p>
                    {task.counterpart} ·{" "}
                    {task.kind === "reply"
                      ? "답장"
                      : task.kind === "deliver"
                        ? "자료 전달"
                        : "회신 확인"}
                  </p>
                  <div className="mail-meta">
                    <AccountDot
                      account={state.accounts.find(
                        (item) => item.id === task.accountId,
                      )}
                    />
                    <span
                      className={
                        task.deadline &&
                        task.deadline < today &&
                        task.status !== "completed"
                          ? "due-overdue"
                          : "due-label"
                      }
                    >
                      <CalendarDays size={12} />
                      {task.deadline
                        ? dateLabel(task.deadline) + "까지"
                        : "기한 미정"}
                    </span>
                    {task.proposal && (
                      <span className="change-hint">기한 변경 제안</span>
                    )}
                  </div>
                </div>
                <ArrowUpRight size={15} />
              </button>
            ))
          ) : (
            <Empty
              title="이 보기에 표시할 업무가 없어요"
              description="다른 필터를 선택하거나 분석 상태를 확인해 주세요. 아직 분석하지 않은 상태는 업무 없음과 다릅니다."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => set({ filter: "open" })}
                >
                  전체 진행 업무 보기
                </Button>
              }
            />
          )}
        </section>
        <section className="panel task-detail">
          {selected ? (
            <>
              <div className="task-detail-top">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mobile-back"
                  onClick={() => set({ task: null })}
                >
                  <ArrowLeft size={15} />
                  목록
                </Button>
                <TaskBadge status={selected.status} />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="업무 수정"
                  onClick={() => setEditing(true)}
                >
                  <Pencil size={15} />
                </Button>
              </div>
              <h2>{selected.title}</h2>
              <p className="task-counterpart">{selected.counterpart}</p>
              <dl className="task-facts">
                <div>
                  <dt>메일 계정</dt>
                  <dd>
                    <AccountDot
                      account={state.accounts.find(
                        (item) => item.id === selected.accountId,
                      )}
                    />
                  </dd>
                </div>
                <div>
                  <dt>기한</dt>
                  <dd
                    className={
                      selected.deadline && selected.deadline < today
                        ? "due-overdue"
                        : ""
                    }
                  >
                    {dateLabel(selected.deadline)}
                  </dd>
                </div>
                <div>
                  <dt>다시 확인할 날</dt>
                  <dd>
                    {selected.reminder
                      ? dateLabel(selected.reminder)
                      : "설정하지 않음"}
                  </dd>
                </div>
              </dl>
              <div className="task-evidence-note">
                <Sparkles size={15} />
                <p>{selected.note}</p>
              </div>
              {selected.proposal && (
                <div className="deadline-proposal">
                  <span className="eyebrow">기한 변경 제안</span>
                  <p>
                    {dateLabel(selected.deadline)}
                    <ArrowUpRight size={14} />
                    <strong>{dateLabel(selected.proposal.deadline)}</strong>
                  </p>
                  <Link
                    href={mailHref(
                      state.messages.find(
                        (message) =>
                          message.id === selected.proposal?.messageId,
                      )!,
                    )}
                  >
                    변경을 요청한 원문 확인
                    <ArrowUpRight size={12} />
                  </Link>
                  <div>
                    <Button
                      size="sm"
                      onClick={() =>
                        store.command(
                          { type: "deadline", id: selected.id, accept: true },
                          "기한 변경 제안을 채택했습니다.",
                        )
                      }
                    >
                      변경 채택
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        store.command(
                          { type: "deadline", id: selected.id, accept: false },
                          "기존 기한을 유지했습니다.",
                        )
                      }
                    >
                      기존 기한 유지
                    </Button>
                  </div>
                </div>
              )}
              <div className="evidence-links">
                <h3>근거 메일</h3>
                {selected.messageIds.map((id) => {
                  const message = state.messages.find(
                    (message) => message.id === id,
                  );
                  return message ? (
                    <Link href={mailHref(message)} key={id}>
                      <span>
                        {message.sender}
                        <small>{dateLabel(message.at, true)}</small>
                      </span>
                      <ArrowUpRight size={14} />
                    </Link>
                  ) : (
                    <p key={id}>원문을 확인할 수 없습니다.</p>
                  );
                })}
              </div>
              <div className="task-action-buttons">
                {selected.status === "proposed" ? (
                  <>
                    <Button
                      onClick={() =>
                        store.command(
                          {
                            type: "task",
                            id: selected.id,
                            patch: { status: "active" },
                          },
                          "업무 후보를 채택했습니다.",
                        )
                      }
                    >
                      <Check size={15} />
                      후보 채택
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() =>
                        store.command(
                          {
                            type: "task",
                            id: selected.id,
                            patch: { status: "excluded" },
                          },
                          "후보를 제외했습니다. 제외 보기에서 복원할 수 있습니다.",
                        )
                      }
                    >
                      <X size={14} />
                      제외
                    </Button>
                  </>
                ) : ["completed", "excluded"].includes(selected.status) ? (
                  <Button
                    variant="outline"
                    onClick={() =>
                      store.command(
                        { type: "task", id: selected.id, restore: true },
                        "업무를 복원했습니다.",
                      )
                    }
                  >
                    <RotateCcw size={14} />
                    복원
                  </Button>
                ) : (
                  <Button
                    onClick={() =>
                      store.command(
                        {
                          type: "task",
                          id: selected.id,
                          patch: { status: "completed" },
                        },
                        "직접 완료한 업무로 표시했습니다.",
                      )
                    }
                  >
                    <Check size={15} />
                    업무 완료
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={async () => {
                    const id = await store.createDraft(
                      selected.accountId,
                      selected.threadId,
                      "reply",
                      selected.id,
                    );
                    set({ draft: id });
                    await store.prepareDraft(id);
                  }}
                >
                  <Sparkles size={14} />
                  답장 초안
                </Button>
              </div>
              <p className="small-note">
                읽음·답장·발송은 업무 완료와 별도로 처리합니다.
              </p>
              <div className="task-history">
                <h3>처리 이력</h3>
                {selected.history.length ? (
                  selected.history.map((item) => (
                    <p key={item.id}>
                      <span>{dateLabel(item.at)}</span>
                      {item.text}
                    </p>
                  ))
                ) : (
                  <p className="muted">아직 변경 이력이 없습니다.</p>
                )}
              </div>
              <Dialog open={editing} onOpenChange={setEditing}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>업무 수정</DialogTitle>
                    <DialogDescription>
                      제목·기한·확인 예정일을 직접 수정합니다.
                    </DialogDescription>
                  </DialogHeader>
                  <TaskEditForm
                    task={selected}
                    onDone={() => setEditing(false)}
                  />
                </DialogContent>
              </Dialog>
            </>
          ) : (
            <Empty
              title="요청과 근거를 함께 확인하세요"
              description="업무를 선택하면 원문·기한 변경·처리 이력을 볼 수 있어요."
            />
          )}
        </section>
      </div>
    </div>
  );
}
function TaskEditForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const { store } = usePrototype();
  return (
    <form
      className="stack-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        await store.command(
          {
            type: "task",
            id: task.id,
            patch: {
              title: String(form.get("title")),
              deadline: String(form.get("deadline")),
              reminder: String(form.get("reminder")),
            },
          },
          "업무 내용을 수정했습니다.",
        );
        onDone();
      }}
    >
      <label htmlFor="task-edit-title">업무 제목</label>
      <Input
        name="title"
        id="task-edit-title"
        defaultValue={task.title}
        required
      />
      <label htmlFor="task-edit-deadline">기한</label>
      <Input
        name="deadline"
        id="task-edit-deadline"
        type="date"
        defaultValue={task.deadline}
      />
      <label htmlFor="task-edit-reminder">확인 예정일</label>
      <Input
        name="reminder"
        id="task-edit-reminder"
        type="date"
        defaultValue={task.reminder}
      />
      <Button type="submit">수정 저장</Button>
    </form>
  );
}
