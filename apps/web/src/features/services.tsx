"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, MailMinus, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePrototype } from "@/lib/prototype/context";
import { inScope } from "@/lib/prototype/model";
import {
  AccountDot,
  Empty,
  PageHeading,
  dateLabel,
  mailHref,
  useView,
} from "./shared";

const STATUS = {
  active: "수신 중",
  requesting: "요청 중",
  requested: "요청 접수 · 확인 전",
  confirmed: "해제 확인됨",
  failed: "요청 실패",
  manual: "직접 설정 필요",
};
export function ServicesPage() {
  const { state, store } = usePrototype();
  const { scope } = useView();
  const [selected, setSelected] = useState<string[]>([]);
  const [manualId, setManualId] = useState<string | null>(null);
  const subscriptions = state.subscriptions.filter((item) =>
    inScope(item.accountId, scope),
  );
  const manual = state.subscriptions.find((item) => item.id === manualId);
  return (
    <div className="page-content">
      <PageHeading
        title="서비스·수신 관리"
        description="메일로 확인한 서비스를 살펴보고, 필요한 소식만 남겨 보세요."
        actions={
          <Button
            disabled={!selected.length}
            onClick={async () => {
              await Promise.all(selected.map((id) => store.unsubscribe(id)));
              setSelected([]);
            }}
          >
            <MailMinus size={15} />
            선택한 마케팅 해제 {selected.length > 0 && `(${selected.length})`}
          </Button>
        }
      />
      <div className="service-safety-note">
        <ShieldCheck size={21} />
        <div>
          <strong>광고를 줄여도, 필요한 안내는 유지해요</strong>
          <p>
            마케팅만 해제합니다. 주문·거래·보안 안내와 메일 계정 연결은
            유지됩니다.
          </p>
        </div>
      </div>
      {subscriptions.length ? (
        <div className="service-grid">
          {subscriptions.map((item) => {
            const service = state.services.find(
              (service) => service.id === item.serviceId,
            )!;
            const account = state.accounts.find(
              (account) => account.id === item.accountId,
            );
            const message = state.messages.find(
              (message) => message.id === service.messageId,
            );
            return (
              <section className="panel service-card" key={item.id}>
                <div className="service-card-top">
                  <label className="service-check">
                    <input
                      type="checkbox"
                      aria-label={service.name + " 선택"}
                      checked={selected.includes(item.id)}
                      disabled={[
                        "requesting",
                        "requested",
                        "confirmed",
                      ].includes(item.status)}
                      onChange={(event) =>
                        setSelected((values) =>
                          event.target.checked
                            ? [...values, item.id]
                            : values.filter((value) => value !== item.id),
                        )
                      }
                    />
                    <span className="service-logo">
                      {service.name.slice(0, 1)}
                    </span>
                  </label>
                  <span className={`tag subscription-${item.status}`}>
                    {STATUS[item.status]}
                  </span>
                </div>
                <h2>{service.name}</h2>
                <p className="service-description">{service.description}</p>
                <div className="service-source">
                  <AccountDot account={account} />
                  <span>
                    {service.source === "connection"
                      ? "가상 연동 확인"
                      : service.source === "manual"
                        ? "수동 확인"
                        : "메일 근거 · 추정"}
                  </span>
                  <small>{dateLabel(service.checkedAt)} 확인</small>
                </div>
                <div className="kept-notifications">
                  <Check size={13} />
                  주문·보안 안내 유지
                </div>
                {message && (
                  <Link href={mailHref(message)} className="text-link">
                    근거 메일 확인
                    <ArrowUpRight size={12} />
                  </Link>
                )}
                <div className="service-card-actions">
                  {item.status === "confirmed" ? (
                    <p className="success-text">
                      <Check size={15} />
                      가상 해제 결과를 확인했어요
                    </p>
                  ) : item.status === "requested" ? (
                    <Button
                      variant="outline"
                      onClick={() =>
                        store.command(
                          { type: "subscription-confirm", id: item.id },
                          "가상 마케팅 해제 결과를 확인했습니다.",
                        )
                      }
                    >
                      해제 결과 확인
                    </Button>
                  ) : item.status === "manual" ? (
                    <Button
                      variant="outline"
                      onClick={() => setManualId(item.id)}
                    >
                      직접 설정 안내
                    </Button>
                  ) : (
                    <Button
                      variant={
                        item.status === "failed" ? "outline" : "secondary"
                      }
                      disabled={item.status === "requesting"}
                      onClick={() => store.unsubscribe(item.id)}
                    >
                      {item.status === "requesting"
                        ? "요청 중…"
                        : item.status === "failed"
                          ? "해제 요청 재시도"
                          : "마케팅 해제"}
                    </Button>
                  )}
                </div>
                {item.history.length > 0 && (
                  <details className="service-history">
                    <summary>처리 이력 {item.history.length}개</summary>
                    {item.history.map((entry) => (
                      <p key={entry.id}>
                        {dateLabel(entry.at)} · {entry.text}
                      </p>
                    ))}
                  </details>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="표시할 서비스가 없어요"
            description="현재 체험 계정에는 준비된 서비스 자료가 없습니다. 기본 체험 자료로 초기화하면 수신 관리 흐름을 볼 수 있어요."
          />
        </section>
      )}
      <p className="small-note">
        요청 접수는 해제 완료와 다릅니다. 이미 해제한 마케팅의 자동
        재가입·되돌리기는 제공하지 않습니다.
      </p>
      <Dialog
        open={!!manualId}
        onOpenChange={(open) => {
          if (!open) setManualId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>직접 설정이 필요한 서비스</DialogTitle>
            <DialogDescription>
              자동 해제를 지원하지 않는 가상 서비스입니다. 실제 서비스 설정
              화면으로 이동하지 않습니다.
            </DialogDescription>
          </DialogHeader>
          <ol className="manual-instructions">
            <li>서비스의 알림 설정에서 마케팅 수신을 찾습니다.</li>
            <li>주문·보안 안내를 유지하고 마케팅만 끕니다.</li>
            <li>설정 완료 후 해제 결과를 확인합니다.</li>
          </ol>
          <Button
            onClick={async () => {
              if (manual)
                await store.command(
                  { type: "subscription-confirm", id: manual.id },
                  "직접 설정 완료의 가상 확인을 기록했습니다.",
                );
              setManualId(null);
            }}
          >
            직접 설정 완료로 모의 확인
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
