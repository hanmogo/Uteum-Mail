import { readFileSync, writeFileSync } from "node:fs";

const [split, caseId, outputPath, ...extra] = process.argv.slice(2);
const suites = {
  dev: "gpt-decisions-routing-v1.dev-cases.json",
  eval: "gpt-decisions-routing-v1.eval-cases.json",
};

try {
  if (!Object.hasOwn(suites, split ?? "") || !caseId || extra.length) {
    throw new Error(
      "사용법: node docs/fixtures/prepare-gpt-decisions-request.mjs <dev|eval> <사례 ID> [새 출력 파일]",
    );
  }

  const readJson = (name) =>
    JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
  const suite = readJson(suites[split]);
  const item = suite.cases.find((candidate) => candidate.id === caseId);
  if (!item) throw new Error("사례를 찾을 수 없습니다: " + caseId);

  // 평가용 요청 조립기다. 서버 분기나 모델 판단을 구현·실행하지 않는다.
  if (item.expected.call_decisions !== true) {
    process.stderr.write(
      caseId + ": 서버 사전 분기 사례이므로 API 요청을 만들지 않습니다. 기대 경로: " +
      item.expected.decision + "\n",
    );
    process.exit(2);
  }

  const request = readJson("gpt-decisions-routing-v1.request.json");
  request.input[0].content[0].data = item.input_data;
  const serialized = JSON.stringify(request, null, 2) + "\n";
  if (outputPath) {
    // 기존 파일을 덮어쓰지 않으며 UTF-8로 저장한다.
    writeFileSync(outputPath, serialized, { encoding: "utf8", flag: "wx" });
  } else {
    process.stdout.write(serialized);
  }
} catch (error) {
  process.stderr.write(error.message + "\n");
  process.exitCode = 1;
}
