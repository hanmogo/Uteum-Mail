"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Check,
  ChevronDown,
  FlaskConical,
  Inbox,
  LayoutDashboard,
  ListChecks,
  Mail,
  Menu,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { usePrototype } from "@/lib/prototype/context";
import { SCENARIO_LABELS, type Scenario } from "@/lib/prototype/types";
import { AccountDot, useView } from "@/features/shared";
import { DraftEditor } from "@/features/composer";
import { AssistantPanel } from "@/features/assistant-panel";

const NAV = [
  { href: "/today", label: "오늘", icon: LayoutDashboard },
  { href: "/mail", label: "통합 메일함", icon: Inbox },
  { href: "/tasks", label: "할 일", icon: ListChecks },
  { href: "/services", label: "서비스·수신 관리", icon: ShieldCheck },
  { href: "/search", label: "검색", icon: Search },
  { href: "/rules", label: "분류 규칙", icon: SlidersHorizontal },
  { href: "/settings", label: "설정", icon: Settings },
];
function Logo() {
  return (
    <Link className="brand" href="/today" aria-label="Uteum Mail 오늘">
      <span className="brand-mark">
        <Mail size={20} strokeWidth={1.8} />
      </span>
      <span>
        uteum<span className="brand-mail"> mail</span>
      </span>
    </Link>
  );
}
export function AppShell({ children }: { children: React.ReactNode }) {
  const { state, store, hydrated, notice, storageWarning } = usePrototype();
  const { scope, set, pathname, router } = useView();
  const [menuOpen, setMenuOpen] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);
  const [scenario, setScenario] = useState<Scenario>("normal");
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(store.clearNotice, 6000);
    return () => window.clearTimeout(timer);
  }, [notice, store]);
  const unread = state.messages.filter(
    (message) =>
      message.direction === "received" &&
      !message.read &&
      (scope === "all" || message.accountId === scope),
  ).length;
  const activeTasks = state.tasks.filter(
    (task) =>
      ["active", "waiting", "proposed"].includes(task.status) &&
      (scope === "all" || task.accountId === scope),
  ).length;
  const openComposer = async () => {
    setMenuOpen(false);
    const id = await store.createDraft(
      scope === "all"
        ? (state.accounts.find(
            (account) =>
              account.connection === "connected" && account.basic === "allowed",
          )?.id ?? "gmail")
        : scope,
    );
    set({ draft: id, assistant: null });
  };
  const navigation = (
    <>
      <div className="sidebar-top">
        <Logo />
        <Button
          className="compose-button"
          onClick={openComposer}
          data-draft-open
        >
          <Plus size={17} />새 메일 작성
        </Button>
      </div>
      <nav aria-label="주요 메뉴" className="main-nav">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href + (scope !== "all" ? "?account=" + scope : "")}
            className={pathname === href ? "nav-item active" : "nav-item"}
            aria-current={pathname === href ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {href === "/mail" && unread > 0 && (
              <span className="nav-count">{unread}</span>
            )}
            {href === "/tasks" && activeTasks > 0 && (
              <span className="nav-count subtle">{activeTasks}</span>
            )}
          </Link>
        ))}
      </nav>
      <div className="sidebar-accounts">
        <span className="sidebar-label">메일 계정</span>
        {state.accounts.map((account) => (
          <button
            key={account.id}
            className={`sidebar-account ${scope === account.id ? "selected" : ""}`}
            onClick={() => {
              set({
                account: account.id,
                thread: null,
                task: null,
                message: null,
              });
              setMenuOpen(false);
            }}
          >
            <AccountDot account={account} />
            <span className="sidebar-account-caption">
              {account.purpose === "work"
                ? "업무"
                : account.purpose === "mixed"
                  ? "스튜디오"
                  : "개인"}
            </span>
            {account.connection === "connected" &&
            account.basic === "allowed" ? (
              <Check size={12} className="account-check" aria-label="연결됨" />
            ) : (
              <span className="connection-dot" aria-label="연결 확인 필요" />
            )}
          </button>
        ))}
        <Link
          href="/onboarding"
          className="add-account"
          onClick={() => setMenuOpen(false)}
        >
          <Plus size={14} />
          가상 계정 추가
        </Link>
      </div>
      <div className="sidebar-bottom">
        <div className="private-note">
          <ShieldCheck size={15} />
          <span>내 메일에, 더 많은 여유</span>
        </div>
        <Link href="/settings" className="profile-link">
          <span className="profile-avatar">지</span>
          <span>
            <strong>이지우</strong>
            <small>가상 체험 계정</small>
          </span>
          <ChevronDown size={15} />
        </Link>
      </div>
    </>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        본문으로 이동
      </a>
      <aside className="sidebar">{navigation}</aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-start">
            <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mobile-menu"
                  aria-label="메뉴 열기"
                >
                  <Menu size={21} />
                </Button>
              </DialogTrigger>
              <DialogContent className="navigation-dialog">
                <DialogHeader className="sr-only">
                  <DialogTitle>메일 메뉴</DialogTitle>
                  <DialogDescription>
                    전체 화면과 가상 계정 선택
                  </DialogDescription>
                </DialogHeader>
                {navigation}
              </DialogContent>
            </Dialog>
            <span className="workspace-name">내 워크스페이스</span>
            <span className="topbar-divider" />
            <div className="scope-control">
              <SelectField
                label="계정 범위"
                value={scope}
                onChange={(value) =>
                  set({
                    account: value,
                    thread: null,
                    task: null,
                    message: null,
                  })
                }
                options={[
                  { value: "all", label: "모든 계정" },
                  ...state.accounts.map((account) => ({
                    value: account.id,
                    label: account.provider + " · " + account.label,
                  })),
                ]}
              />
            </div>
          </div>
          <div className="topbar-actions">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                router.push(
                  "/search" + (scope !== "all" ? "?account=" + scope : ""),
                )
              }
              aria-label="검색 열기"
            >
              <Search size={17} />
              <span className="desktop-label">검색</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="assistant-open"
              onClick={() => set({ assistant: "1", draft: null })}
              data-assistant-open
            >
              <Sparkles size={15} />
              비서
            </Button>
          </div>
        </header>
        <div className="demo-strip">
          <span>
            <Badge variant="secondary">PROTOTYPE</Badge>
            <span>
              가상 데이터 체험 · 실제 계정 연결과 발송은 이루어지지 않습니다
            </span>
          </span>
          <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
            <DialogTrigger asChild>
              <button className="demo-trigger">
                <FlaskConical size={13} />
                체험 설정
              </button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>체험 시나리오</DialogTitle>
                <DialogDescription>
                  선택한 시나리오로 시작하면 현재 가상 메일·초안·규칙·설정이
                  원본 자료로 초기화됩니다. 기준 시각은 2026.10.03 09:00입니다.
                </DialogDescription>
              </DialogHeader>
              <SelectField
                label="체험 시나리오"
                value={scenario}
                onChange={(value) => setScenario(value as Scenario)}
                options={Object.entries(SCENARIO_LABELS).map(
                  ([value, label]) => ({ value, label }),
                )}
              />
              <Button
                onClick={async () => {
                  await store.reset(scenario);
                  setDemoOpen(false);
                }}
              >
                선택한 시나리오 시작
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await store.reset();
                  setScenario("normal");
                  setDemoOpen(false);
                }}
              >
                기본 자료로 초기화
              </Button>
            </DialogContent>
          </Dialog>
        </div>
        {storageWarning && (
          <div className="storage-warning" role="alert">
            {storageWarning}
          </div>
        )}
        <main id="main-content" tabIndex={-1}>
          {hydrated ? (
            children
          ) : (
            <div className="boot-screen">
              저장된 체험 자료를 확인하고 있습니다.
            </div>
          )}
        </main>
        <footer className="workspace-footer">
          <span>Uteum Mail</span>
          <span>가상 자료 기준 · 2026.10.03 09:00 KST</span>
        </footer>
      </div>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          <span>{notice}</span>
          <button aria-label="알림 닫기" onClick={store.clearNotice}>
            <X size={15} />
          </button>
        </div>
      )}
      <DraftEditor />
      <AssistantPanel />
    </div>
  );
}
