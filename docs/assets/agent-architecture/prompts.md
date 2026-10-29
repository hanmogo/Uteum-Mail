# Agent architecture image prompts

Generated with the built-in image generation tool on 2026-10-12. Both files are original generations with opaque backgrounds.

## llm-only.png

Create a finished architecture infographic for a Korean nontechnical project report. Landscape canvas about 1536x1024, opaque warm white (#FAFBF8), crisp clean flat vector-like appearance, restrained sage green (#DCE9DE), charcoal (#25342B), light gray borders, small gold accent (#E2BC68). Large highly legible Korean sans-serif typography; generous margins and spacing; no decorative robots, no code, no logos, no watermark, no photographs. Precise straight thin arrow connectors. Minimal rounded rectangular cards. All visible text must be ONLY the exact Korean/English text in quotation marks specified below. No extra subtitles or invented technical details. Draw a real readable diagram, not a screenshot of an app. A0 through A4 are roles, and the middle four role cards are alternatives chosen as needed, NOT sequential stages.
Title top left: "LLM만 사용하는 구조". Small subtitle: "초기 기획안".
Diagram centered, vertical flow, all arrows down:
1) Small card "사용자 요청".
2) Larger sage card "A0 · 요청 해석과 작업 배분" with model badge "Sol".
3) Center annotation "필요한 역할만 실행", then a single branch to FOUR cards in one horizontal row:
card 1: "A1 · 메일 분류", badge "Luna", smaller line "유형·중요도·답장 필요 판단";
card 2: "A2 · 업무 추적", badge "Luna", smaller line "대화·할 일·기한 연결";
card 3: "A3 · 수신 관리", badge "Luna", smaller line "유지할 안내·해제 범위 판단";
card 4: "A4 · 답장 작성", badge "Sol", smaller line "답장 초안 작성".
4) The four role cards converge downward to a single wide gray card "서버 확인" with smaller line "권한·최신 상태·중복·사용자 지시 확인".
5) One final centered card "결과 표시·승인된 작업 실행".
Two concise footer notes, not connected as nodes: "A1~A3는 필요하면 Sol이 재검토합니다." and "메일 발송은 사용자의 최종 승인을 거칩니다."
Use large cards, readable Korean, ample white space. No additional branches or arrows.

## decision-model.png

Create a finished architecture infographic for a Korean nontechnical project report. Landscape canvas about 1536x1024, opaque warm white (#FAFBF8), crisp clean flat vector-like appearance, restrained sage green (#DCE9DE), charcoal (#25342B), light gray borders, small gold accent (#E2BC68). Large highly legible Korean sans-serif typography; generous margins and spacing; no decorative robots, no code, no logos, no watermark, no photographs. Precise straight thin arrow connectors. Minimal rounded rectangular cards. All visible text must be ONLY the exact Korean/English text in quotation marks specified below. No extra subtitles or invented technical details. Draw a real readable diagram, not a screenshot of an app. A0 through A4 are roles, and the middle four role cards are alternatives chosen as needed, NOT sequential stages.
Title top left: "결정모델을 도입한 구조". Small subtitle: "검증된 범위에 적용하는 설계안".
Diagram centered, vertical flow, all main arrows down:
1) Small card "사용자 요청".
2) Larger sage card "A0 · 요청 해석과 작업 배분" with model badge "Sol".
3) Center annotation "필요한 역할만 실행", then a single branch to FOUR cards in one horizontal row:
card 1 highlighted with a subtle gold outline: "A1 · 메일 분류", two compact internal lines: "분류·중요도·답장 필요 → Jev" and "요약 → Luna";
card 2: "A2 · 업무 추적", badge "Luna", smaller line "대화·할 일·기한 연결";
card 3: "A3 · 수신 관리", badge "Luna", smaller line "유지할 안내·해제 범위 판단";
card 4: "A4 · 답장 작성", badge "Sol", smaller line "답장 초안 작성".
4) The four role cards converge downward to a single wide gray card "서버 확인" with smaller line "권한·최신 상태·중복·사용자 지시 확인".
5) One final centered card "결과 표시·승인된 작업 실행".
A small separate dashed-outline callout, placed to the right of A0 with no confusing solid main arrows: heading "추가 검토", line "Jev가 처리 경로를 선택하면", line "일부 요청은 A0를 생략".
Two concise footer notes, not connected as nodes: "Jev 판단이 불확실하거나 실패하면 기존 LLM으로 처리합니다." and "요약·답장 작성과 메일 발송 승인 절차는 유지합니다."
Use large cards, readable Korean, ample white space. Show Jev only inside A1 and the dashed optional callout; do not make Jev responsible for all roles. No other branches.
