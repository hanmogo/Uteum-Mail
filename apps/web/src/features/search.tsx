"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePrototype } from "@/lib/prototype/context";
import { searchMessages, subjectFor } from "@/lib/prototype/model";
import {
  AccountDot,
  CategoryBadge,
  Empty,
  PageHeading,
  dateLabel,
  mailHref,
  useView,
} from "./shared";
import { AssistantConversation } from "./assistant-panel";

export function SearchPage() {
  const { state, store } = usePrototype();
  const { scope, params, set } = useView();
  const [input, setInput] = useState("");
  const [term, setTerm] = useState("");
  const mode = params.get("mode") ?? "search";
  const messages = searchMessages(state, term, scope);
  const search = async (value: string) => {
    await store.query((snapshot) => searchMessages(snapshot, value, scope));
    setInput(value);
    setTerm(value.trim());
  };
  return (
    <div className="page-content">
      <PageHeading
        title="검색·비서"
        description="원문을 직접 찾거나, 짧은 요청으로 메일 속 업무를 확인하세요."
      />
      <div className="search-mode-tabs">
        <button
          className={mode === "search" ? "active" : ""}
          onClick={() => set({ mode: "search" })}
        >
          <Search size={16} />
          메일 검색
        </button>
        <button
          className={mode === "assistant" ? "active" : ""}
          onClick={() => set({ mode: "assistant" })}
        >
          <Sparkles size={16} />
          메일 비서
        </button>
      </div>
      {mode === "assistant" ? (
        <section className="panel full-assistant">
          <AssistantConversation />
        </section>
      ) : (
        <>
          <form
            className="search-box panel"
            onSubmit={(event) => {
              event.preventDefault();
              search(input);
            }}
          >
            <Search size={21} />
            <label className="sr-only" htmlFor="global-mail-query">
              메일 검색어
            </label>
            <Input
              id="global-mail-query"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="제목, 보낸 사람, 본문, 업무 키워드"
            />
            <Button type="submit">검색</Button>
          </form>
          <div className="suggested-searches">
            <span>체험 키워드</span>
            {["견적", "계약서", "촬영", "광고"].map((value) => (
              <button key={value} onClick={() => search(value)}>
                {value}
              </button>
            ))}
          </div>
          <section className="panel search-results">
            {!term ? (
              <Empty
                title="찾고 싶은 메일을 검색해 보세요"
                description="현재 선택한 계정 범위의 가상 제목·본문·상대·업무를 검색합니다."
              />
            ) : messages.length ? (
              <>
                <div className="panel-heading">
                  <h2>
                    “{term}” 검색 결과
                    <span className="count-bubble">{messages.length}</span>
                  </h2>
                  <small>가상 자료의 키워드 검색</small>
                </div>
                {messages.map((message) => (
                  <Link
                    className="search-result"
                    key={message.id}
                    href={mailHref(message)}
                  >
                    <div>
                      <div className="mail-meta">
                        <AccountDot
                          account={state.accounts.find(
                            (account) => account.id === message.accountId,
                          )}
                        />
                        <CategoryBadge category={message.category} />
                        <span>{dateLabel(message.at)}</span>
                      </div>
                      <h3>{subjectFor(state, message)}</h3>
                      <p>
                        {message.sender} ·{" "}
                        {message.body.replaceAll("\n", " ").slice(0, 160)}
                      </p>
                    </div>
                    <ArrowUpRight size={16} />
                  </Link>
                ))}
              </>
            ) : (
              <Empty
                title="일치하는 결과가 없어요"
                description="다른 키워드나 계정 범위를 선택해 보세요. 의미 기반 검색은 후속 구현 단계에서 검증합니다."
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
