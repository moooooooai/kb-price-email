// 사용법: tsx report.ts [단지기본일련번호]   (기본 118 = 까치마을)
// 단지 하나의 전 평형 시세를 터미널 표로 출력 — 새 단지 추가 시 평형/타입 확인용
import { getAreas, getDanjiName, getPrice, won, fmtDate } from "./kb.ts";

const danjiId = process.argv[2] || "118";

const delta = (v: number | undefined): string => {
  const n = Number(v) || 0;
  if (n === 0) return "–";
  return (n > 0 ? "▲ " : "▼ ") + won(Math.abs(n));
};

const [areas, danjiName] = await Promise.all([
  getAreas(danjiId),
  getDanjiName(danjiId),
]);
const sorted = [...areas].sort(
  (a, b) => Math.floor(Number(a.공급면적평)) - Math.floor(Number(b.공급면적평)),
);

interface Line {
  평: string;
  면적: string;
  타입: string;
  기준일?: string;
  매매?: number;
  매매증감?: number;
}
const rows: Line[] = [];
for (const a of sorted) {
  const x = await getPrice(danjiId, a.면적일련번호, danjiName);
  if (!x) continue;
  rows.push({
    평: `${Math.floor(Number(a.공급면적평))}평${a.주택형타입내용 ? " " + a.주택형타입내용 : ""}`,
    면적: `${a.전용면적}/${a.공급면적}`,
    타입: a.주택형타입내용 || "",
    기준일: x.시세기준년월일,
    매매: x.매매일반거래가,
    매매증감: x.매매변동금액,
  });
}

const visW = (s: string): number =>
  [...s].reduce((n, c) => n + (/[가-힣▲▼–]/.test(c) ? 2 : 1), 0);
const pad = (s: string, w: number): string =>
  s + " ".repeat(Math.max(0, w - visW(s)));
const W = [9, 16, 12, 12];
const head = ["평형", "전용/공급", "매매", "└증감"];

console.log(
  `\n■ ${danjiName} (단지 ${danjiId}) — 평형별 KB시세 · 기준 ${fmtDate(rows[0]?.기준일)} (지난주 대비 증감)\n`,
);
console.log(head.map((h, i) => pad(h, W[i])).join(""));
console.log("─".repeat(W.reduce((a, b) => a + b, 0)));
for (const r of rows) {
  const cells = [r.평, r.면적, won(r.매매), delta(r.매매증감)];
  console.log(cells.map((c, i) => pad(c, W[i])).join(""));
}
console.log("");
