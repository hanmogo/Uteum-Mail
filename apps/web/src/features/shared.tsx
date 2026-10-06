"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrototype } from "@/lib/prototype/context";
import type { MailAccount, Message, Task } from "@/lib/prototype/types";
import { CATEGORY_LABELS, TASK_LABELS } from "@/lib/prototype/types";

export function useView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { state } = usePrototype();
  const requested = params.get("account") ?? "all";
  const scope =
    requested === "all" || state.accounts.some((item) => item.id === requested)
      ? requested
      : "all";
  function set(values: Record<string, string | null>, replace = false) {
    const next = new URLSearchParams(params.toString());
    Object.entries(values).forEach(([key, value]) => {
      if (value === null) next.delete(key);
      else next.set(key, value);
    });
    const url = pathname + (next.size ? "?" + next.toString() : "");
    if (replace) router.replace(url, { scroll: false });
    else router.push(url, { scroll: false });
  }
  return { params, scope, set, router, pathname };
}
export function restorePanelFocus(
  previous: HTMLElement | null,
  selector: string,
) {
  const visible = (element: HTMLElement | null) =>
    !!element?.isConnected &&
    element !== document.body &&
    element.getClientRects().length > 0;
  const fallback = Array.from(
    document.querySelectorAll<HTMLElement>(selector),
  ).find((element) => visible(element));
  (visible(previous)
    ? previous
    : (fallback ?? document.getElementById("main-content"))
  )?.focus();
}
export function mailHref(
  message: Pick<Message, "accountId" | "threadId" | "id">,
) {
  return `/mail?account=${message.accountId}&thread=${message.threadId}&message=${message.id}`;
}
export function taskHref(task: Pick<Task, "accountId" | "id">) {
  return `/tasks?account=${task.accountId}&task=${task.id}`;
}
export function dateLabel(value: string, time = false) {
  if (!value) return "기한 미정";
  const date = new Date(
    value.length === 10 ? value + "T09:00:00+09:00" : value,
  );
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    ...(time ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(date);
}
export function AccountDot({
  account,
  name = true,
}: {
  account?: MailAccount;
  name?: boolean;
}) {
  if (!account) return null;
  return (
    <span className="account-label">
      <span className="account-dot" style={{ background: account.color }} />
      {name && account.provider}
    </span>
  );
}
export function Avatar({
  name,
  large = false,
}: {
  name: string;
  large?: boolean;
}) {
  return (
    <span
      className={`avatar ${large ? "avatar-large" : ""}`}
      aria-hidden="true"
    >
      {name.slice(0, 1)}
    </span>
  );
}
export function CategoryBadge({ category }: { category: Message["category"] }) {
  return (
    <span className={`tag tag-${category}`}>{CATEGORY_LABELS[category]}</span>
  );
}
export function TaskBadge({ status }: { status: Task["status"] }) {
  return <span className={`tag task-${status}`}>{TASK_LABELS[status]}</span>;
}
export function Empty({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Inbox size={26} />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="heading-actions">{actions}</div>}
    </div>
  );
}
export function PanelHeading({
  title,
  count,
  href,
  children,
}: {
  title: string;
  count?: number;
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="panel-heading">
      <h2>
        {title}
        {count !== undefined && <span className="count-bubble">{count}</span>}
      </h2>
      {href ? (
        <Link className="text-link" href={href}>
          모두 보기 <ArrowRight size={13} />
        </Link>
      ) : (
        children
      )}
    </div>
  );
}
export function ProcessingNotice() {
  const { state, store } = usePrototype();
  const { scope } = useView();
  const jobs = state.jobs
    .filter((item) => scope === "all" || item.accountId === scope)
    .filter((item) => item.status !== "completed");
  const accounts = state.accounts.filter(
    (account) =>
      (scope === "all" || scope === account.id) &&
      (account.connection !== "connected" || account.basic !== "allowed"),
  );
  const inactive = state.accounts.filter(
    (account) =>
      (scope === "all" || scope === account.id) &&
      account.connection === "connected" &&
      account.basic === "allowed" &&
      (account.ai !== "allowed" ||
        (!account.dataDeleted &&
          !state.jobs.some((job) => job.accountId === account.id))),
  );
  if (!jobs.length && !accounts.length && !inactive.length) return null;
  return (
    <div className="processing-notices">
      {jobs.map((job) => (
        <div
          className={`notice-bar ${job.status === "pending" ? "" : "notice-warning"}`}
          key={job.id}
        >
          {job.status === "pending" && (
            <LoaderCircle className="spin" size={16} />
          )}
          <span>
            <strong>
              {
                state.accounts.find((account) => account.id === job.accountId)
                  ?.provider
              }{" "}
              ·{" "}
              {job.status === "pending"
                ? "확인 중"
                : job.status === "retry"
                  ? "다시 확인 필요"
                  : "분석 실패"}
            </strong>
            {job.note}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => store.analyze(job.accountId)}
          >
            분석 재시도
          </Button>
        </div>
      ))}
      {accounts.map((account) => (
        <div className="notice-bar notice-warning" key={account.id}>
          <span>
            <strong>
              {account.provider} ·{" "}
              {account.connection === "expired"
                ? "연결 만료"
                : account.connection === "setup"
                  ? "시작 설정 대기"
                  : account.connection === "disconnected"
                    ? "연결 해제"
                    : "수집 대기"}
            </strong>
            새 수집 상태가 확인되지 않았습니다. 보관 자료는 열람할 수 있습니다.
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/settings?account=${account.id}`}>설정 확인</Link>
          </Button>
        </div>
      ))}
      {inactive.map((account) => (
        <div className="notice-bar" key={"inactive-" + account.id}>
          <span>
            <strong>
              {account.provider} ·{" "}
              {account.ai === "off"
                ? "메일만 보기"
                : account.ai === "unknown"
                  ? "AI 권한 미확인"
                  : "과거 메일 미분석"}
            </strong>
            {account.ai === "allowed"
              ? "과거 메일의 업무는 아직 확인하지 않았습니다."
              : "새 AI 분석을 실행하지 않습니다. 메일과 저장된 결과는 계속 볼 수 있습니다."}
          </span>
          <Button asChild variant="outline" size="sm">
            <Link href={`/settings?account=${account.id}`}>범위 설정</Link>
          </Button>
        </div>
      ))}
    </div>
  );
}
