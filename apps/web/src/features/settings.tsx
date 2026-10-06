"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Check,
  ChevronRight,
  Link2,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Trash2,
  Unplug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SelectField } from "@/components/ui/select-field";
import { usePrototype } from "@/lib/prototype/context";
import { canCollect, inScope } from "@/lib/prototype/model";
import type { MailAccount, Permission } from "@/lib/prototype/types";
import { AccountDot, PageHeading, useView } from "./shared";

export function AccountSetupForm({
  account,
  onSaved,
}: {
  account: MailAccount;
  onSaved?: (id: string) => void;
}) {
  const { store } = usePrototype();
  const [purpose, setPurpose] = useState(account.purpose);
  const [basic, setBasic] = useState<Permission>(account.basic);
  const [ai, setAi] = useState<Permission>(account.ai);
  const [historyDays, setHistoryDays] = useState(account.historyDays);
  const [newMailAnalysis, setNewMailAnalysis] = useState(
    account.newMailAnalysis,
  );
  return (
    <form
      className="account-setup-form"
      onSubmit={async (event) => {
        event.preventDefault();
        const completion = store.configure(account.id, {
          purpose,
          basic,
          ai,
          historyDays,
          newMailAnalysis,
        });
        onSaved?.(account.id);
        await completion;
      }}
    >
      <div className="form-row">
        <div>
          <label htmlFor="account-purpose">계정 용도</label>
          <SelectField
            id="account-purpose"
            label="계정 용도"
            value={purpose}
            onChange={(value) => setPurpose(value as MailAccount["purpose"])}
            options={[
              { value: "personal", label: "개인용" },
              { value: "work", label: "업무용" },
              { value: "mixed", label: "개인·업무 혼합" },
            ]}
          />
        </div>
        <div>
          <label htmlFor="basic-permission">메일 기본 처리</label>
          <SelectField
            id="basic-permission"
            label="메일 기본 처리"
            value={basic}
            onChange={(value) => setBasic(value as Permission)}
            options={[
              { value: "allowed", label: "권한 확인 · 수집/표시 허용" },
              { value: "unknown", label: "권한 미확인 · 수집 대기" },
            ]}
          />
        </div>
      </div>
      <fieldset className="ai-choices">
        <legend>어떻게 시작할까요?</legend>
        {[
          {
            value: "allowed",
            title: "AI 사용",
            note: "중요 메일·업무 후보·초안을 체험해요",
            icon: Sparkles,
          },
          {
            value: "off",
            title: "메일만 보기",
            note: "열람·수동 편집·직접 작성만 사용해요",
            icon: ShieldCheck,
          },
          {
            value: "unknown",
            title: "AI 권한 미확인",
            note: "기본 처리 허용 시 메일만 표시해요",
            icon: Link2,
          },
        ].map(({ value, title, note, icon: Icon }) => (
          <label
            className={`ai-choice ${ai === value ? "selected" : ""}`}
            key={value}
          >
            <input
              type="radio"
              name="ai"
              value={value}
              checked={ai === value}
              onChange={() => setAi(value as Permission)}
            />
            <Icon size={18} />
            <span>
              <strong>{title}</strong>
              <small>{note}</small>
            </span>
            {ai === value && <Check size={15} />}
          </label>
        ))}
      </fieldset>
      <div className="form-row">
        <div>
          <label htmlFor="history-range">과거 메일 분석 범위</label>
          <SelectField
            id="history-range"
            label="과거 메일 분석 범위"
            value={String(historyDays)}
            onChange={(value) => setHistoryDays(Number(value) as 0 | 30)}
            options={[
              { value: "30", label: "최근 30일 · 체험 제안" },
              { value: "0", label: "과거 분석 안 함" },
            ]}
          />
        </div>
        <div className="new-analysis-option">
          <label className="check-label">
            <input
              type="checkbox"
              checked={newMailAnalysis}
              onChange={(event) => setNewMailAnalysis(event.target.checked)}
            />
            <span>새 메일 자동 분석 체험</span>
          </label>
          <small>운영 기본값은 아직 미정입니다.</small>
        </div>
      </div>
      <div className="setup-policy-note">
        <p>
          <strong>동기화 범위</strong>준비된 가상 계정의 메일 자료
        </p>
        <p>
          <strong>보관</strong>이 브라우저의 전용 체험 자료 · 운영 보관 기간
          미정
        </p>
        <p>
          <strong>동의 문구</strong>검토용 선택입니다. 업체·이전 국가·기간은
          출시 정책으로 확정하지 않습니다.
        </p>
      </div>
      {basic !== "allowed" && (
        <p className="warning-text">
          기본 처리 권한이 미확인이므로 이 계정은 수집 대기로 시작합니다.
        </p>
      )}
      <Button
        type="submit"
        disabled={
          account.connection === "disconnected" ||
          account.connection === "expired"
        }
      >
        {onSaved ? "선택한 설정으로 시작" : "계정 설정 저장"}
        <ChevronRight size={15} />
      </Button>
    </form>
  );
}
export function OnboardingPage() {
  const { state, store } = usePrototype();
  const { params, set, router } = useView();
  const selected = state.accounts.find(
    (account) => account.id === params.get("setup"),
  );
  return (
    <div className="page-content onboarding-page">
      <PageHeading
        eyebrow="WELCOME TO UTEUM"
        title="메일함에 여유를 더해 보세요."
        description="가상 계정을 연결하고, 내 방식에 맞게 시작하세요."
        actions={
          <Button
            variant="outline"
            onClick={async () => {
              await store.reset("normal", true);
              set({ setup: null, account: "all" });
            }}
          >
            처음부터 체험
          </Button>
        }
      />
      <div className="onboarding-intro">
        <span className="step-label">
          <span>1</span>가상 계정 선택
        </span>
        <span className="step-line" />
        <span className={`step-label ${selected ? "current" : ""}`}>
          <span>2</span>처리 범위 선택
        </span>
        <span className="step-line" />
        <span className="step-label">
          <span>3</span>메일 확인
        </span>
      </div>
      <p className="small-note">
        ‘처음부터 체험’은 현재 가상 설정과 자료를 초기화합니다. 실제 인증 정보는
        입력하지 않습니다.
      </p>
      <div className="provider-grid">
        {state.accounts.map((account) => (
          <button
            className={`provider-card ${selected?.id === account.id ? "selected" : ""}`}
            key={account.id}
            onClick={async () => {
              if (account.connection !== "connected")
                await store.command(
                  { type: "connect", id: account.id },
                  "가상 연결이 완료됐습니다. 처리 범위를 선택한 뒤 수집을 시작합니다.",
                );
              set({ setup: account.id });
            }}
          >
            <span className="provider-logo" style={{ color: account.color }}>
              {account.provider === "Gmail"
                ? "G"
                : account.provider === "네이버"
                  ? "N"
                  : account.provider === "다음"
                    ? "D"
                    : "K"}
            </span>
            <strong>{account.provider}</strong>
            <small>{account.address}</small>
            <span>
              {account.connection === "connected"
                ? "설정 확인"
                : "가상 계정 추가"}
              <Plus size={13} />
            </span>
          </button>
        ))}
      </div>
      {selected ? (
        <section className="panel setup-panel">
          <div className="panel-heading">
            <h2>
              <AccountDot account={selected} /> 시작 설정
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                store.command(
                  { type: "disconnect", id: selected.id },
                  "가상 연결 실패를 재현했습니다. 계정 카드를 다시 선택해 재시도할 수 있습니다.",
                )
              }
            >
              연결 실패 체험
            </Button>
          </div>
          {["expired", "disconnected"].includes(selected.connection) ? (
            <div className="connect-retry">
              <p>
                가상 연결을 확인하지 못했습니다. 인증 완료만으로 수집을 시작하지
                않습니다.
              </p>
              <Button
                onClick={() =>
                  store.command({ type: "connect", id: selected.id })
                }
              >
                가상 연결 재시도
              </Button>
            </div>
          ) : (
            <AccountSetupForm
              key={selected.id + selected.connection}
              account={selected}
              onSaved={(id) => router.push(`/today?account=${id}`)}
            />
          )}
        </section>
      ) : (
        <section className="onboarding-empty">
          <ShieldCheck size={22} />
          <h2>먼저 체험할 계정을 선택하세요</h2>
          <p>개인·업무용 권한과 AI 사용 범위를 따로 선택할 수 있어요.</p>
          <Button
            variant="outline"
            onClick={async () => {
              await store.reset();
              router.push("/today");
            }}
          >
            준비된 자료로 바로 체험
          </Button>
        </section>
      )}
    </div>
  );
}
export function SettingsPage() {
  const { state, store } = usePrototype();
  const { scope, router } = useView();
  const [editId, setEditId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const edited = state.accounts.find((account) => account.id === editId);
  const deletion = state.accounts.find((account) => account.id === deleteId);
  return (
    <div className="page-content">
      <PageHeading
        title="설정"
        description="계정별 AI 사용과 연결 상태, 보관 자료를 따로 관리하세요."
        actions={
          <Button asChild variant="outline">
            <Link href="/onboarding">
              <Plus size={15} />
              가상 계정 추가
            </Link>
          </Button>
        }
      />
      <div className="settings-section-label">
        <h2>메일 계정</h2>
        <p>AI 끄기·연결 해제·자료 삭제는 서로 다른 효과를 가집니다.</p>
      </div>
      <div className="settings-accounts">
        {state.accounts
          .filter((account) => inScope(account.id, scope))
          .map((account) => (
            <section className="panel settings-account" key={account.id}>
              <div className="settings-account-heading">
                <span
                  className="provider-logo small"
                  style={{ color: account.color }}
                >
                  {account.provider.slice(0, 1)}
                </span>
                <div>
                  <h3>
                    {account.provider}
                    <span
                      className={`tag ${canCollect(account) ? "tag-important" : "tag-warning"}`}
                    >
                      {canCollect(account)
                        ? "연결됨"
                        : account.connection === "expired"
                          ? "연결 만료"
                          : account.connection === "setup"
                            ? "설정 대기"
                            : account.connection === "disconnected"
                              ? "연결 해제"
                              : "수집 대기"}
                    </span>
                  </h3>
                  <p>
                    {account.address} ·{" "}
                    {account.purpose === "work"
                      ? "업무용"
                      : account.purpose === "mixed"
                        ? "혼합 용도"
                        : "개인용"}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditId(account.id)}
                  disabled={
                    !canCollect(account) &&
                    account.connection !== "setup" &&
                    account.connection !== "connected"
                  }
                >
                  범위 설정
                </Button>
              </div>
              <div className="settings-account-options">
                <div>
                  <span>
                    <Sparkles size={15} />
                    AI 분석
                  </span>
                  <small>
                    {account.ai === "allowed"
                      ? "새 분석 허용 · 기존 결과는 별도 보관"
                      : account.ai === "unknown"
                        ? "AI 권한 미확인 · 메일만 보기"
                        : "새 분석 중단 · 저장 결과 유지"}
                  </small>
                </div>
                <button
                  role="switch"
                  aria-label={account.provider + " AI 분석"}
                  aria-checked={account.ai === "allowed"}
                  className={`toggle-switch ${account.ai === "allowed" ? "on" : ""}`}
                  disabled={!canCollect(account)}
                  onClick={() =>
                    account.ai === "allowed"
                      ? store.command(
                          {
                            type: "account",
                            id: account.id,
                            patch: { ai: "off" },
                          },
                          "새 AI 분석을 중단했습니다. 저장된 결과는 유지됩니다.",
                        )
                      : store.configure(account.id, { ai: "allowed" })
                  }
                >
                  <span />
                </button>
              </div>
              <div className="settings-data-line">
                <span>
                  과거 분석: {account.historyDays ? "최근 30일" : "선택 안 함"}
                </span>
                <span>
                  새 메일 분석: {account.newMailAnalysis ? "켜짐" : "꺼짐"}
                </span>
                <span>
                  가상 메일{" "}
                  {
                    state.messages.filter(
                      (message) => message.accountId === account.id,
                    ).length
                  }
                  통
                </span>
              </div>
              {account.dataDeleted && (
                <p className="account-deleted-note">
                  이 계정의 보관 자료를 삭제했습니다. 새로고침 후에도 빈 상태가
                  유지됩니다.
                </p>
              )}
              <div className="settings-account-actions">
                {account.connection === "connected" ||
                account.connection === "setup" ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      store.command(
                        { type: "disconnect", id: account.id },
                        "계정 연결을 해제했습니다. 새 수집은 중단하고 보관 자료는 유지합니다.",
                      )
                    }
                  >
                    <Unplug size={14} />
                    연결 해제
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      await store.command({ type: "connect", id: account.id });
                      router.push(`/onboarding?setup=${account.id}`);
                    }}
                  >
                    <Link2 size={14} />
                    가상 재연결
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="danger-button"
                  onClick={() => setDeleteId(account.id)}
                >
                  <Trash2 size={14} />
                  보관 자료 삭제
                </Button>
              </div>
            </section>
          ))}
      </div>
      <section className="panel settings-demo">
        <div>
          <h2>체험 자료 관리</h2>
          <p>
            기준 날짜와 모든 가상 메일·초안·규칙·설정을 처음 상태로 복원합니다.
          </p>
        </div>
        <Button variant="outline" onClick={() => setResetOpen(true)}>
          <RotateCcw size={15} />
          데모 초기화
        </Button>
      </section>
      <p className="small-note">
        프로토타입은 이 브라우저의 가상 자료만 변경합니다. 운영의 동의 철회·보관
        기간·업체 및 백업 삭제는 후속 검증 대상입니다.
      </p>
      <Dialog
        open={!!editId}
        onOpenChange={(open) => {
          if (!open) setEditId(null);
        }}
      >
        <DialogContent className="settings-form-dialog">
          <DialogHeader>
            <DialogTitle>계정 처리 범위</DialogTitle>
            <DialogDescription>
              가상 계정의 기본 처리와 AI 허용을 따로 선택합니다.
            </DialogDescription>
          </DialogHeader>
          {edited && <AccountSetupForm key={edited.id} account={edited} />}
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deletion?.provider} 보관 자료를 삭제할까요?
            </DialogTitle>
            <DialogDescription>
              이 계정의 가상 메일·업무·초안·서비스·검색 근거를 제거합니다. 다른
              계정의 자료는 유지됩니다. AI 중단이나 연결 해제와는 별도입니다.
            </DialogDescription>
          </DialogHeader>
          <p className="small-note">
            삭제한 자료는 기본 데모 전체 초기화로 다시 체험할 수 있습니다.
          </p>
          <Button
            variant="destructive"
            onClick={async () => {
              if (deleteId)
                await store.command(
                  { type: "delete", id: deleteId },
                  "선택한 계정의 가상 자료와 관련 근거를 삭제했습니다. 다른 계정은 유지합니다.",
                );
              setDeleteId(null);
            }}
          >
            이 계정의 가상 자료 삭제
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>기본 체험 자료로 초기화</DialogTitle>
            <DialogDescription>
              모든 가상 메일·업무·초안·규칙·설정·이력을 원본으로 되돌립니다.
              현재 편집 내용은 초기화됩니다.
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={async () => {
              await store.reset();
              setResetOpen(false);
              router.push("/today");
            }}
          >
            데모 자료 초기화
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
