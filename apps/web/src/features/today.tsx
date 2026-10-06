"use client";

import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  ListChecks,
  Mail,
  Sparkles,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrototype } from "@/lib/prototype/context";
import { askAssistant } from "@/lib/prototype/assistant";
import { inScope } from "@/lib/prototype/model";
import {
  AccountDot,
  Avatar,
  CategoryBadge,
  Empty,
  PageHeading,
  PanelHeading,
  ProcessingNotice,
  dateLabel,
  mailHref,
  taskHref,
  useView,
} from "./shared";

export function TodayPage() {
  const { state, store } = usePrototype();
  const { scope, set } = useView();
  const suffix = "?account=" + scope;
  const messages = state.messages.filter(
    (item) => inScope(item.accountId, scope) && item.direction === "received",
  );
  const tasks = state.tasks.filter(
    (item) =>
      inScope(item.accountId, scope) &&
      ["active", "waiting", "proposed"].includes(item.status),
  );
  const important = [
    ...new Map(
      messages
        .filter((item) => item.important)
        .sort((a, b) => a.at.localeCompare(b.at))
        .map((item) => [item.threadId, item]),
    ).values(),
  ].sort((a, b) => b.at.localeCompare(a.at));
  const today = state.clock.slice(0, 10);
  const overdue = tasks.filter(
    (task) => task.deadline && task.deadline < today,
  );
  const due = tasks.filter(
    (task) => task.deadline === today || task.reminder === today,
  );
  const waiting = tasks.filter((task) => task.status === "waiting");
  const unverified = state.accounts.some(
    (account) =>
      inScope(account.id, scope) &&
      !account.dataDeleted &&
      !state.jobs.some(
        (job) => job.accountId === account.id && job.status === "completed",
      ),
  );
  const metrics = [
    {
      label: "중요 메일",
      value: messages.filter((item) => item.important).length,
      hint: "현재 중요 표시된 메일 기준",
      icon: Star,
      href: "/mail" + suffix + "&filter=important",
      tone: "accent",
    },
    {
      label: "오늘 확인할 일",
      value: unverified && !due.length ? "—" : due.length,
      hint: unverified
        ? "미분석 계정 · 상태 확인 필요"
        : "기한과 확인 예정일 기준",
      icon: ListChecks,
      href: "/tasks" + suffix + "&filter=today",
      tone: "",
    },
    {
      label: "답변 대기",
      value: unverified && !waiting.length ? "—" : waiting.length,
      hint: unverified
        ? "미분석 계정 · 상태 확인 필요"
        : "상대의 답변을 기다려요",
      icon: Mail,
      href: "/tasks" + suffix + "&filter=waiting",
      tone: "",
    },
    {
      label: "기한 지난 업무",
      value: unverified && !overdue.length ? "—" : overdue.length,
      hint: unverified
        ? "미분석 계정 · 상태 확인 필요"
        : overdue.length
          ? "변경 제안도 확인해 주세요"
          : "현재 지난 기한이 없어요",
      icon: Clock3,
      href: "/tasks" + suffix + "&filter=overdue",
      tone: overdue.length ? "urgent" : "",
    },
  ];
  return (
    <div className="page-content">
      <PageHeading
        eyebrow="YOUR DAILY BRIEF"
        title="지우님, 오늘도 가볍게 시작해요."
        description="여러 메일함의 중요한 소식과 해야 할 일을 한곳에 모았어요."
        actions={<span className="date-chip">10월 3일 토요일</span>}
      />
      <ProcessingNotice />
      <div className="metric-grid">
        {metrics.map(({ label, value, hint, icon: Icon, href, tone }) => (
          <Link className={`metric-card ${tone}`} key={label} href={href}>
            <span className="metric-top">
              <span>{label}</span>
              <Icon size={18} />
            </span>
            <strong>
              {value}
              {typeof value === "number" && <small>개</small>}
            </strong>
            <span className="metric-hint">
              {hint}
              <ArrowUpRight size={14} />
            </span>
          </Link>
        ))}
      </div>
      <div className="today-grid">
        <div className="today-main">
          <section className="panel">
            <PanelHeading
              title="먼저 확인할 메일"
              count={important.length}
              href={"/mail" + suffix + "&filter=important"}
            />
            {important.length ? (
              <div className="priority-mails">
                {important.map((message) => (
                  <Link
                    className="priority-mail"
                    key={message.id}
                    href={mailHref(message)}
                  >
                    <Avatar name={message.sender} />
                    <div className="mail-summary">
                      <div className="mail-summary-top">
                        <strong>{message.sender}</strong>
                        <span>{dateLabel(message.at)}</span>
                      </div>
                      <h3>
                        {
                          state.threads.find(
                            (thread) => thread.id === message.threadId,
                          )?.subject
                        }
                      </h3>
                      <p>
                        {message.body
                          .split("\n")
                          .filter(Boolean)
                          .slice(1)
                          .join(" ")
                          .slice(0, 100)}
                      </p>
                      <div className="mail-meta">
                        <AccountDot
                          account={state.accounts.find(
                            (account) => account.id === message.accountId,
                          )}
                        />
                        <CategoryBadge category={message.category} />
                        {state.tasks.some(
                          (task) =>
                            task.threadId === message.threadId &&
                            task.status === "proposed",
                        ) && (
                          <span className="tag task-proposed">업무 후보</span>
                        )}
                      </div>
                    </div>
                    <Star
                      className="important-star"
                      size={16}
                      fill="currentColor"
                    />
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                title="중요 메일이 아직 없어요"
                description="분석 상태를 확인하거나 메일에서 직접 중요 표시를 해 보세요."
                action={
                  <Button asChild variant="outline" size="sm">
                    <Link href={"/mail" + suffix}>메일 보기</Link>
                  </Button>
                }
              />
            )}
          </section>
          <section className="panel">
            <PanelHeading
              title="답변을 기다리고 있어요"
              count={unverified && !waiting.length ? undefined : waiting.length}
              href={"/tasks" + suffix + "&filter=waiting"}
            />
            {waiting.length ? (
              waiting.map((task) => (
                <Link
                  className="waiting-row"
                  key={task.id}
                  href={taskHref(task)}
                >
                  <span className="waiting-icon">
                    <Clock3 size={19} />
                  </span>
                  <div>
                    <strong>{task.title}</strong>
                    <p>
                      {task.counterpart} · 자동 회신 이후 실질적인 답변 대기
                    </p>
                  </div>
                  <span className="waiting-date">
                    {dateLabel(task.reminder)} 확인
                    <ArrowRight size={14} />
                  </span>
                </Link>
              ))
            ) : (
              <div className="quiet-empty">
                {unverified
                  ? "아직 답변 대기 여부를 확인하지 못했습니다. 분석·권한 상태를 확인해 주세요."
                  : "현재 저장 결과에 답변 대기 업무가 없습니다."}
              </div>
            )}
          </section>
        </div>
        <div className="today-aside">
          <section className="panel today-tasks">
            <PanelHeading title="확인할 업무" href={"/tasks" + suffix} />
            {tasks.length ? (
              <div>
                {tasks.slice(0, 4).map((task) => (
                  <Link
                    className="today-task-row"
                    key={task.id}
                    href={taskHref(task)}
                  >
                    <span
                      className={`task-checkbox ${task.status === "proposed" ? "proposed" : ""}`}
                    >
                      <Check size={11} />
                    </span>
                    <div>
                      <h3>{task.title}</h3>
                      <p>{task.counterpart}</p>
                      <span
                        className={
                          task.deadline && task.deadline < today
                            ? "due-overdue"
                            : "due-label"
                        }
                      >
                        {task.status === "proposed"
                          ? "후보 확인 필요"
                          : task.status === "waiting"
                            ? "답변 대기"
                            : dateLabel(task.deadline) + "까지"}
                      </span>
                      {task.proposal && (
                        <span className="change-hint">기한 변경 제안</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <Empty
                title={
                  unverified
                    ? "아직 업무를 확인하지 못했어요"
                    : "남은 업무가 없어요"
                }
                description={
                  unverified
                    ? "메일만 보기·미분석·실패 상태는 업무 없음과 다릅니다. 상태를 확인해 주세요."
                    : "현재 저장된 업무는 모두 완료하거나 제외했습니다."
                }
              />
            )}
          </section>
          <section className="assistant-card">
            <span className="assistant-card-icon">
              <Sparkles size={22} />
            </span>
            <h2>
              메일 속 업무,
              <br />
              비서와 함께 정리해요.
            </h2>
            <p>
              짧게 요청하고, 근거를 확인하세요.
              <br />
              답장 초안도 함께 준비할 수 있어요.
            </p>
            <button
              onClick={async () => {
                set({ assistant: "1" });
                await askAssistant(store, "밀린 답장 찾아줘", scope);
              }}
            >
              밀린 답장 찾아줘
              <ArrowUpRight size={15} />
            </button>
            <button onClick={() => set({ assistant: "1" })}>
              다른 질문 해보기
              <ArrowRight size={15} />
            </button>
            <small>준비된 응답을 사용하는 가상 체험</small>
          </section>
          <section className="connected-summary">
            <h2>
              연결한 메일 계정
              <span>
                {
                  state.accounts.filter((account) => inScope(account.id, scope))
                    .length
                }
              </span>
            </h2>
            {state.accounts
              .filter((account) => inScope(account.id, scope))
              .map((account) => (
                <Link href={`/settings?account=${account.id}`} key={account.id}>
                  <AccountDot account={account} />
                  <span>
                    {account.connection === "connected" &&
                    account.basic === "allowed"
                      ? "연결됨"
                      : "확인 필요"}
                  </span>
                </Link>
              ))}
          </section>
        </div>
      </div>
    </div>
  );
}
