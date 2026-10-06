"use client";

import { useState } from "react";
import {
  ArrowRight,
  Pause,
  Play,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Star,
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
import { SelectField } from "@/components/ui/select-field";
import { usePrototype } from "@/lib/prototype/context";
import { inScope } from "@/lib/prototype/model";
import type { Rule, RuleConfig } from "@/lib/prototype/types";
import { Empty, PageHeading, dateLabel, useView } from "./shared";

export function RulesPage() {
  const { state, store } = usePrototype();
  const { scope, params } = useView();
  const [editing, setEditing] = useState<string | null>(
    params.get("keyword") ? "new" : null,
  );
  const rules = state.rules.filter(
    (rule) => rule.accountId === "all" || inScope(rule.accountId, scope),
  );
  const selected = state.rules.find((rule) => rule.id === editing);
  return (
    <div className="page-content">
      <PageHeading
        title="분류 규칙"
        description="자주 하는 정리는 규칙으로, 한 번의 표시는 그 메일에만 적용하세요."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus size={15} />
            규칙 추가
          </Button>
        }
      />
      <div className="rule-explainer">
        <span className="rule-explainer-icon">
          <SlidersHorizontal size={20} />
        </span>
        <div>
          <strong>조건이 맞는 메일에만 적용해요</strong>
          <p>
            계정·키워드·예외·기간을 확인하세요. 규칙 중지는 이미 적용한 메일을
            되돌리지 않습니다.
          </p>
        </div>
        <span className="tag">
          활성 {rules.filter((rule) => rule.enabled).length}개
        </span>
      </div>
      {rules.length ? (
        <div className="rule-list">
          {rules.map((rule) => (
            <section
              className={`panel rule-card ${!rule.enabled ? "paused" : ""}`}
              key={rule.id}
            >
              <div className="rule-card-heading">
                <span className="rule-icon">
                  <Star size={19} />
                </span>
                <div>
                  <h2>{rule.title}</h2>
                  <p>
                    {rule.accountId === "all"
                      ? "모든 계정"
                      : state.accounts.find(
                          (account) => account.id === rule.accountId,
                        )?.provider}{" "}
                    · {rule.enabled ? "활성" : "중지됨"}
                  </p>
                </div>
                <span className={`tag ${rule.enabled ? "tag-important" : ""}`}>
                  {rule.enabled
                    ? "향후 적용 " + (rule.future ? "켜짐" : "꺼짐")
                    : "중지"}
                </span>
              </div>
              <div className="rule-flow">
                <div>
                  <span>조건</span>
                  <strong>“{rule.keyword}” 모두 포함</strong>
                  <small>
                    {rule.exceptions ? "예외: " + rule.exceptions : "예외 없음"}
                  </small>
                </div>
                <ArrowRight size={16} />
                <div>
                  <span>동작</span>
                  <strong>
                    {rule.action === "important"
                      ? "중요 메일로 표시"
                      : "광고로 분류"}
                  </strong>
                  <small>
                    {rule.applyExisting
                      ? "현재 가상 메일에도 적용"
                      : "기존 메일 유지"}
                  </small>
                </div>
              </div>
              <div className="rule-card-footer">
                <small>
                  변경 {rule.changes.length}회 ·{" "}
                  {rule.changes.at(-1)
                    ? dateLabel(rule.changes.at(-1)!.at)
                    : "이력 없음"}
                </small>
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditing(rule.id)}
                  >
                    수정
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      store.command(
                        { type: "rule-toggle", id: rule.id },
                        rule.enabled
                          ? "규칙을 중지했습니다. 기존 메일은 유지됩니다."
                          : "규칙을 재개했습니다.",
                      )
                    }
                  >
                    {rule.enabled ? <Pause size={13} /> : <Play size={13} />}
                    {rule.enabled ? "중지" : "재개"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!rule.changes.length}
                    onClick={() =>
                      store.command(
                        { type: "rule-undo", id: rule.id },
                        "마지막 규칙 변경을 되돌렸습니다. 이후의 무관한 수동 수정은 보존했습니다.",
                      )
                    }
                  >
                    <RotateCcw size={13} />
                    되돌리기
                  </Button>
                </div>
              </div>
              <details className="rule-history">
                <summary>변경 이력 보기</summary>
                {rule.changes.map((change) => (
                  <p key={change.id}>
                    {dateLabel(change.at)} ·{" "}
                    {change.previous ? "규칙 변경" : "규칙 등록"} · 기존 메일{" "}
                    {change.applied.length}통에 적용
                  </p>
                ))}
              </details>
            </section>
          ))}
        </div>
      ) : (
        <section className="panel">
          <Empty
            title="첫 규칙을 만들어 보세요"
            description="예: 라온 스튜디오의 메일을 앞으로 중요하게 표시해 보세요. 비서에서 만든 규칙도 이곳에 나타납니다."
            action={
              <Button onClick={() => setEditing("new")}>
                <Plus size={14} />
                규칙 만들기
              </Button>
            }
          />
        </section>
      )}
      <p className="small-note">
        규칙 되돌리기는 해당 변경의 영향만 복원합니다. 수신 해제와 계정 연결
        해제는 별도 기능입니다.
      </p>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selected ? "규칙 수정" : "새 분류 규칙"}</DialogTitle>
            <DialogDescription>
              표시된 계정과 범위에만 적용합니다. 향후 적용과 현재 메일 변경을
              따로 선택하세요.
            </DialogDescription>
          </DialogHeader>
          <RuleForm
            key={editing}
            rule={selected}
            keyword={params.get("keyword") ?? "라온"}
            onDone={() => setEditing(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
function RuleForm({
  rule,
  keyword,
  onDone,
}: {
  rule?: Rule;
  keyword: string;
  onDone: () => void;
}) {
  const { state, store } = usePrototype();
  const { scope } = useView();
  const [config, setConfig] = useState<RuleConfig>(
    rule
      ? { ...rule }
      : {
          title: "라온 메일을 중요하게",
          keyword,
          accountId: scope,
          exceptions: "",
          action: "important",
          applyExisting: false,
          future: true,
          enabled: true,
        },
  );
  const update = (patch: Partial<RuleConfig>) =>
    setConfig((current) => ({ ...current, ...patch }));
  return (
    <form
      className="stack-form"
      onSubmit={async (event) => {
        event.preventDefault();
        await store.command(
          {
            type: "rule-save",
            id: rule?.id ?? "rule-" + (state.sequence + 1),
            config,
          },
          "규칙을 저장했습니다. 적용 범위를 확인해 주세요.",
        );
        onDone();
      }}
    >
      <label htmlFor="rule-title">규칙 이름</label>
      <Input
        id="rule-title"
        value={config.title}
        onChange={(event) => update({ title: event.target.value })}
        required
      />
      <label htmlFor="rule-account">적용 계정</label>
      <SelectField
        id="rule-account"
        label="규칙 적용 계정"
        value={config.accountId}
        onChange={(value) => update({ accountId: value })}
        options={[
          { value: "all", label: "모든 계정" },
          ...state.accounts.map((account) => ({
            value: account.id,
            label: account.provider,
          })),
        ]}
      />
      <label htmlFor="rule-keyword">
        제목·보낸 사람·본문에 포함할 키워드 (공백으로 구분, 모두 일치)
      </label>
      <Input
        id="rule-keyword"
        value={config.keyword}
        onChange={(event) => update({ keyword: event.target.value })}
        required
      />
      <label htmlFor="rule-exceptions">예외 키워드</label>
      <Input
        id="rule-exceptions"
        value={config.exceptions}
        onChange={(event) => update({ exceptions: event.target.value })}
        placeholder="쉼표로 구분 · 예: 주문, 보안"
      />
      <label htmlFor="rule-action">수행할 동작</label>
      <SelectField
        id="rule-action"
        label="규칙 동작"
        value={config.action}
        onChange={(value) => update({ action: value as RuleConfig["action"] })}
        options={[
          { value: "important", label: "중요 메일로 표시" },
          { value: "promotion", label: "광고로 분류" },
        ]}
      />
      <label className="check-label">
        <input
          type="checkbox"
          checked={config.future}
          onChange={(event) => update({ future: event.target.checked })}
        />
        <span>앞으로 들어오는 가상 메일에 적용</span>
      </label>
      <label className="check-label">
        <input
          type="checkbox"
          checked={config.applyExisting}
          onChange={(event) => update({ applyExisting: event.target.checked })}
        />
        <span>현재 가상 메일에도 적용</span>
      </label>
      <p className="small-note">
        현재 자료는 고정된 최근 메일입니다. 운영의 과거 적용 기간은 이 선택으로
        확정하지 않습니다.
      </p>
      <Button
        type="submit"
        disabled={!config.title.trim() || !config.keyword.trim()}
      >
        규칙 저장
      </Button>
    </form>
  );
}
