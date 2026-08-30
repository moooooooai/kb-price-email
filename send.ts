import nodemailer from 'nodemailer';
import fs from 'node:fs';
import puppeteer from 'puppeteer';
import { type Target, type Row, fetchRow, won, fmtDate } from './kb.ts';
import { geummaecatchLink } from './naver.ts';

const CARD_W = 480; // 카드 논리 폭(px). 이미지는 2x로 렌더해 선명하게.
const OVER_15 = 150000; // KB시세 15억(만원) 초과 강조 임계값

// ───────── 타깃: 단지번호 + 평형(공급평,내림) 또는 전용㎡ + 타입(선택) ─────────
// 구별로 묶어 표시 (순위 구분 없음). 같은 구는 하나로 병합.
interface Section { 구: string; rows: Row[]; head?: string }
const GROUPS: { 구: string; targets: Target[] }[] = [
  { 구: '서울 강남구', targets: [
    { danjiId: '118', 평: 14 },                    // 까치마을 14평 (수서동)
    { danjiId: '117', 평: 14 },                    // 수서신동아 14평 (수서동)
    { danjiId: '128', 평: 14 },                    // 대치 14평 (개포동)
  ] },
  { 구: '서울 송파구', targets: [
    { danjiId: '15524', 평: 12, 타입: 'A' },       // 리센츠 12A (잠실동)
    { danjiId: '1956', 평: 18 },                   // 가락우성 18평 (가락동)
  ] },
  { 구: '서울 마포구', targets: [
    { danjiId: '549997', 평: 17, 타입: 'A' },      // 마포더클래시 17평 A (아현동)
    { danjiId: '549997', 평: 17, 타입: 'B' },      // 마포더클래시 17평 B
    { danjiId: '1345', 전용: 54, 타입: 'A', 표시명: '마포현대' }, // 마포현대 21평A (전용54, 도화동)
    { danjiId: '1345', 전용: 59, 타입: 'B', 표시명: '마포현대' }, // 마포현대 21평B (전용59)
    { danjiId: '1345', 전용: 59, 타입: 'A', 표시명: '마포현대' }, // 마포현대 23평A (전용59)
    { danjiId: '1355', 전용: 59, 표시명: '도화현대홈타운' }, // 도화현대홈타운 전용59 (도화동, KB명 현대홈타운2차)
    { danjiId: '1361', 전용: 59 },                 // 마포쌍용황금 전용59 (용강동)
    { danjiId: '1352', 전용: 54, 표시명: '도화현대1차' }, // 도화현대1차 전용54 (도화동, KB명 도화동현대1차)
  ] },
  { 구: '서울 동작구', targets: [
    { danjiId: '1306', 전용: 59 },                 // 신동아리버파크 전용59 (노량진동)
    { danjiId: '1304', 전용: 59 },                 // 노량진우성 전용59 (노량진동)
    { danjiId: '1309', 전용: 59 },                 // 본동신동아 전용59 (본동)
  ] },
  { 구: '경기 성남 분당구', targets: [
    { danjiId: '4611', 평: 20 },                   // 이매촌 한신 20평 (이매동)
  ] },
  { 구: '서울 송파구', targets: [
    { danjiId: '1914', 전용: 45 },                 // 오금상아2차 전용45 (19평, 오금동)
  ] },
  { 구: '서울 강남구', targets: [
    { danjiId: '429058', 전용: 59 },               // 강남자곡힐스테이트 전용59 (25평 A, 자곡동)
    { danjiId: '429058', 전용: 51, 타입: 'A' },    // 강남자곡힐스테이트 전용51 A (22평)
    { danjiId: '429058', 전용: 51, 타입: 'B' },    // 강남자곡힐스테이트 전용51 B (22평)
  ] },
  { 구: '서울 성동구', targets: [
    { danjiId: '1764', 전용: 59, 표시명: '응봉대림2차' }, // 응봉대림2차 전용59 (응봉동)
    { danjiId: '1743', 전용: 71, 표시명: '청계벽산' }, // 청계벽산 전용71 (홍익동)
  ] },
  { 구: '서울 동작구', targets: [
    { danjiId: '1319', 평: 20, 표시명: '사당극동' }, // KB명 '극동' → 카드엔 사당극동 (사당동)
  ] },
  { 구: '서울 영등포구', targets: [
    { danjiId: '2192', 전용: 59 },                 // 영등포삼환 전용59 (26평, 영등포동)
    { danjiId: '2196', 전용: 59 },                 // 영등포푸르지오 전용59 (25평, 영등포동)
    { danjiId: '2284', 전용: 59 },                 // 양평한신 전용59 (양평동)
  ] },
  { 구: '서울 중구', targets: [
    { danjiId: '2539', 전용: 57 },                 // 약수하이츠 전용57 (24평, 신당동)
    { danjiId: '2540', 전용: 59, 타입: 'A' },      // 신당동삼성 전용59 A (24평)
    { danjiId: '2540', 전용: 59, 타입: 'B' },      // 신당동삼성 전용59 B (24평)
    { danjiId: '2540', 전용: 59, 타입: 'C' },      // 신당동삼성 전용59 C (24평)
    { danjiId: '2538', 전용: 59 },                 // 남산타운 전용59 (25평, 신당동)
  ] },
  { 구: '서울 강동구', targets: [
    { danjiId: '12822', 전용: 59 },                // 강동현대홈타운 전용59 (명일동)
    { danjiId: '21899', 전용: 59 },                // 둔촌푸르지오 전용59 (둔촌동)
    { danjiId: '309', 전용: 58 },                  // 선사현대 전용58 (24평B, 암사동)
    { danjiId: '309', 전용: 59 },                  // 선사현대 전용59 (24평A, 암사동)
    { danjiId: '33946', 전용: 49, 타입: 'A' },     // 래미안솔베뉴 전용49 A (21평, 명일동)
    { danjiId: '33946', 전용: 49, 타입: 'B' },     // 래미안솔베뉴 전용49 B (21평)
    { danjiId: '33946', 전용: 49, 타입: 'C' },     // 래미안솔베뉴 전용49 C (21평)
  ] },
  { 구: '경기 성남 분당구', targets: [
    { danjiId: '22183', 전용: 51 },                // 산운마을11단지 전용51 (운중동)
  ] },
  { 구: '서울 구로구', targets: [
    { danjiId: '808', 전용: 60, 표시명: '신도림동아3차' }, // 신도림동아3차 24평(전용60, 신도림동)
  ] },
];
// 수신자는 코드에 하드코딩하지 않고 env(MAIL_TO, 콤마 구분)에서 주입 — public repo 개인정보 노출 방지
const RECIPIENTS = (process.env.MAIL_TO ?? '').split(',').map((s) => s.trim()).filter(Boolean);
// ─────────────────────────────────────────────────────────────────────

// 증감 배지: 상승 빨강 / 하락 파랑 / 보합 회색
const deltaBadge = (v: number): string => {
  if (v === 0) return `<span style="display:inline-block;background-color:#f1f3f4;color:#9aa0a6;font-size:12px;font-weight:600;padding:3px 9px;border-radius:999px">보합</span>`;
  const up = v > 0;
  const bg = up ? '#fce8e6' : '#e8f0fe';
  const fg = up ? '#d93025' : '#1a73e8';
  return `<span style="display:inline-block;background-color:${bg};color:${fg};font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px">${up ? '▲' : '▼'} ${won(Math.abs(v))}</span>`;
};

// 카드 1장 내부 마크업 — 이미지로 렌더된다. 급매캐치 이동은 메일에서 바깥 <a>가 담당.
const cardInner = (r: Row): string => {
  const meta = `${r.평}평${r.타입 ? ' ' + r.타입 : ''}${r.전용 ? ` · 전용 ${r.전용}㎡` : ''}`;
  const body = r.error
    ? `<div style="margin-top:10px;font-size:14px;color:#d93025">${r.error}</div>`
    : `<div style="margin-top:12px">
              <span style="font-size:24px;font-weight:800;color:#202124;letter-spacing:-.5px">${won(r.매매)}</span>
              <span style="font-size:12px;color:#9aa0a6;margin-left:5px">KB시세</span>
              <span style="margin-left:8px">${deltaBadge(r.매매증감)}</span>
            </div>
            <div style="margin-top:8px;font-size:12px;color:#5f6368">최근 실거래 · <span style="color:#202124;font-weight:600">${r.실거래 || '–'}</span></div>`;
  const hint = r.급매링크
    ? `<div style="margin-top:14px;font-size:13px;font-weight:700;color:#e8590c">탭하면 급매캐치 급매 ›</div>`
    : '';
  // 15억 초과 단지는 빨간 배경 + 빨간 테두리로 강조
  const over = !r.error && (r.매매 ?? 0) > OVER_15;
  const cardBg = over ? '#fdecea' : '#ffffff';
  const cardStyle = over
    ? `background-color:${cardBg};border:1.5px solid #d93025;border-radius:14px`
    : `background-color:${cardBg};border-radius:14px;box-shadow:0 1px 3px rgba(0,0,0,.12)`;
  const flag = over
    ? `<span style="display:inline-block;margin-left:7px;vertical-align:2px;background-color:#d93025;color:#ffffff;font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px">15억 초과</span>`
    : '';
  return `
        <div class="shot" style="background-color:#f1f3f4;padding-bottom:12px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${cardBg}" style="${cardStyle}">
            <tr><td style="padding:16px 18px">
              <div style="font-size:17px;font-weight:700;color:#202124">${r.danjiName}${flag}</div>
              <div style="margin-top:3px;font-size:12px;color:#9aa0a6">${meta}</div>
              ${body}${hint}
            </td></tr>
          </table>
        </div>`;
};

// ── 메일/렌더 공통 블록: 타이틀·대분류·구 라벨·카드를 모두 이미지(.shot)로 찍는다 ──
type Block =
  | { kind: 'title' }
  | { kind: 'head'; text: string }   // 15억 초과 섹션 라벨
  | { kind: 'sub'; text: string }    // 구
  | { kind: 'card'; row: Row };

// 섹션 목록 → 렌더/메일 공통 블록 순서 (타이틀 → [head] → 구 → 카드들)
function buildBlocks(sections: Section[]): Block[] {
  const blocks: Block[] = [{ kind: 'title' }];
  for (const s of sections) {
    if (s.head) blocks.push({ kind: 'head', text: s.head });
    if (s.구) blocks.push({ kind: 'sub', text: s.구 });
    for (const r of s.rows) blocks.push({ kind: 'card', row: r });
  }
  return blocks;
}

// 상단 타이틀(노란 헤더)
const titleInner = (baseDate?: string): string => `
        <div class="shot" style="background-color:#f1f3f4;padding-bottom:6px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#ffbc00" style="background-color:#ffbc00;border-radius:14px">
            <tr><td style="padding:18px 20px;color:#1a1a1a;font-size:19px;font-weight:800">
              갈아타기 관심단지 리포트
              <div style="font-size:12px;font-weight:500;margin-top:3px;color:#5a4a00">기준 ${fmtDate(baseDate)} · 지난주 대비 증감</div>
            </td></tr>
          </table>
        </div>`;

// 대분류 헤더(검정 배경/노랑 글씨)
const headInner = (text: string): string => `
        <div class="shot" style="background-color:#f1f3f4;padding:20px 0 0">
          <div style="padding:9px 14px;background-color:#1a1a1a;color:#ffbc00;border-radius:10px;font-size:16px;font-weight:800">${text}</div>
        </div>`;

// 구 라벨(갈색)
const subInner = (text: string): string => `
        <div class="shot" style="background-color:#f1f3f4;padding:12px 0 2px">
          <div style="padding:0 2px;font-size:13px;font-weight:800;color:#7a5c00">${text}</div>
        </div>`;

// 블록 1개 → .shot HTML
const blockInner = (b: Block, baseDate?: string): string =>
  b.kind === 'title' ? titleInner(baseDate)
  : b.kind === 'head' ? headInner(b.text)
  : b.kind === 'sub' ? subInner(b.text)
  : cardInner(b.row);

// 모든 블록을 한 페이지에 올린 렌더용 HTML (puppeteer가 .shot 단위로 캡처)
const renderPageHtml = (blocks: Block[], baseDate?: string): string =>
  `<!doctype html><html lang="ko"><head><meta charset="utf-8"></head>
<body style="margin:0;width:${CARD_W}px;background-color:#f1f3f4;font-family:'Apple SD Gothic Neo','Malgun Gothic','Noto Sans CJK KR','Noto Sans KR',sans-serif">
${blocks.map((b) => blockInner(b, baseDate)).join('\n')}
</body></html>`;

// PNG 버퍼 목록 (blocks 순서와 1:1 동일)
async function renderCardImages(blocks: Block[], baseDate?: string): Promise<Buffer[]> {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: CARD_W, height: 800, deviceScaleFactor: 2 });
    await page.setContent(renderPageHtml(blocks, baseDate), { waitUntil: 'load' });
    const els = await page.$$('.shot');
    const out: Buffer[] = [];
    for (const el of els) out.push(Buffer.from(await el.screenshot({ type: 'png' })));
    return out;
  } finally {
    await browser.close();
  }
}

// 블록 1개 → 이미지 alt 텍스트
const blockAlt = (b: Block, baseDate?: string): string =>
  b.kind === 'title' ? `갈아타기 관심단지 리포트 · 기준 ${fmtDate(baseDate)}`
  : b.kind === 'head' ? b.text
  : b.kind === 'sub' ? b.text
  : `${b.row.danjiName} ${b.row.평}평${b.row.타입 ? ' ' + b.row.타입 : ''} · ${b.row.error ?? `KB시세 ${won(b.row.매매)}`}`;

// 메일 HTML: 모든 블록(타이틀·대분류·구·카드)을 이미지로 나열 + 각주. 카드 이미지는 <a>로 감싸 클릭 가능.
function buildEmail(
  blocks: Block[],
  baseDate: string | undefined,
  srcOf: (i: number) => string,
): string {
  const body = blocks.map((b, idx) => {
    const img = `<img src="${srcOf(idx)}" width="${CARD_W}" alt="${blockAlt(b, baseDate)}" style="display:block;width:100%;max-width:${CARD_W}px;height:auto;border:0">`;
    return b.kind === 'card' && b.row.급매링크
      ? `<a href="${b.row.급매링크}" style="text-decoration:none;display:block">${img}</a>`
      : img;
  }).join('\n');
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;background-color:#f1f3f4;font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f1f3f4" style="background-color:#f1f3f4;padding:16px 0 28px">
    <tr><td align="center" style="padding:0 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:${CARD_W}px;margin:0 auto">
        <tr><td style="padding:0">
          ${body}
          <div style="font-size:11px;color:#9aa0a6;padding:14px 6px 0;line-height:1.6">* KB시세=KB 일반거래가(매매 추정), 증감은 직전 주간 대비. 최근 실거래=KB 기준 해당 평형 최근 실거래(금액·층·계약일). 카드를 탭하면 급매캐치에서 급매물을 확인.</div>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ───────── 실행 ─────────
// 같은 구는 하나로 병합(순위 없음). Map이 첫 등장 순서 유지.
const byGu = new Map<string, Row[]>();
for (const g of GROUPS) {
  for (const t of g.targets) {
    const r = await fetchRow(t);
    r.급매링크 = geummaecatchLink(t.danjiId, r.전용 ? Math.floor(Number(r.전용)) : undefined); // band=전용형
    if (!byGu.has(g.구)) byGu.set(g.구, []);
    byGu.get(g.구)!.push(r);
  }
}
const sections: Section[] = [...byGu].map(([구, rows]) => ({ 구, rows }));

// KB시세 15억 초과 단지는 맨 앞 별도 대분류로 이동(중복 표시 없음). 카드 자체도 빨간 배경.
const over: Row[] = [];
for (const s of sections) {
  const keep: Row[] = [];
  for (const r of s.rows) {
    if (!r.error && (r.매매 ?? 0) > OVER_15) over.push(r);
    else keep.push(r);
  }
  s.rows = keep;
}
const ordered = sections.filter((s) => s.rows.length > 0);
if (over.length) ordered.unshift({ 구: '', rows: over, head: 'KB 시세 15억 초과 단지' });
sections.length = 0;
sections.push(...ordered);

const baseDate = sections.flatMap((s) => s.rows).find((r) => r.기준일)?.기준일;
for (const s of sections) {
  console.log(`[${s.head ?? s.구}]`);
  s.rows.forEach((r) => console.log(' -', r.danjiName, r.평 + '평', r.error || `매매 ${won(r.매매)}(${r.매매증감})`, r.실거래 ? `| 실거래 ${r.실거래}` : ''));
}

const blocks = buildBlocks(sections);
const cardCount = blocks.filter((b) => b.kind === 'card').length;
console.log('\n이미지 렌더 중…');
const cards = await renderCardImages(blocks, baseDate);
console.log(`이미지 ${cards.length}장 렌더 완료 (타이틀·헤더 ${cards.length - cardCount} + 카드 ${cardCount})`);

// 웹/미리보기용 자체포함 HTML(data URI 인라인) — 항상 생성. email.html + public/index.html(Pages 배포용).
const webHtml = buildEmail(blocks, baseDate, (idx) => `data:image/png;base64,${cards[idx].toString('base64')}`);
fs.writeFileSync('email.html', webHtml);
fs.mkdirSync('public', { recursive: true });
fs.writeFileSync('public/index.html', webHtml);

// 미리보기 모드: --dry 또는 자격증명 없으면 발송하지 않고 종료 (HTML은 위에서 이미 저장됨)
const USER = process.env.NAVER_USER, PASS = process.env.NAVER_PASS;
if (process.argv.includes('--dry') || !USER || !PASS) {
  console.log(USER && PASS
    ? '\n[--dry] 발송 생략 · email.html / public/index.html 저장'
    : '\n자격증명 없음 → HTML만 저장 (발송하려면 NAVER_USER / NAVER_PASS 설정)');
  process.exit(0);
}
if (RECIPIENTS.length === 0) {
  console.error('\n수신자 없음 → 발송 생략 (MAIL_TO 환경변수에 콤마 구분 이메일을 넣으세요). HTML은 저장됨.');
  process.exit(1);
}

const html = buildEmail(blocks, baseDate, (idx) => `cid:card_${idx}`);
const attachments = cards.map((content, idx) => ({ filename: `card_${idx}.png`, content, cid: `card_${idx}` }));

const transporter = nodemailer.createTransport({
  host: 'smtp.naver.com', port: 465, secure: true,
  auth: { user: USER, pass: PASS },
});
const info = await transporter.sendMail({
  from: `"갈아타기레이더" <${USER}@naver.com>`,
  to: RECIPIENTS.join(', '),
  subject: `[갈아타기] 관심단지 리포트 (기준 ${fmtDate(baseDate)})`,
  html,
  attachments,
});
console.log('발송 완료:', info.messageId, '→', RECIPIENTS.join(', '));
