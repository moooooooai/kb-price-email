// KB부동산(kbland.kr) 공개 API 클라이언트 + 공통 포맷 헬퍼 (인증 불필요)

export interface Target {
  danjiId: string;
  평?: number;   // 공급면적평(내림)으로 매칭
  전용?: number; // 전용면적㎡(내림)으로 매칭 (평 대신)
  타입?: string; // 같은 평형에 A/B/C 여럿일 때 주택형타입 지정
  표시명?: string; // 카드에 표시할 단지명(지정 시 KB 공식명 대신 사용)
}

export interface Row {
  danjiName: string;
  평: number | string;
  타입: string;
  전용?: string;
  기준일?: string;
  매매?: number;
  매매증감: number;
  전세?: number;
  전세증감: number;
  error?: string;
  실거래?: string;   // 네이버 최근 실거래가 (send 시점 주입)
  네이버링크?: string;
}

interface TypInfoArea {
  면적일련번호: number;
  공급면적: string;
  전용면적: string;
  공급면적평: string;
  주택형타입내용?: string;
}
interface RecentDeal {
  거래금액?: number;   // 만원
  거래층?: string;
  계약년월일?: string; // "20260529"
}
interface PriceRow {
  시세기준년월일?: string;
  공급면적평수?: number;
  매매일반거래가?: number;
  매매변동금액?: number;
  전세일반거래가?: number;
  전세변동금액?: number;
  최근실거래가?: RecentDeal;
}
interface Envelope<T> {
  dataBody?: { data?: T };
}

const BASE = 'https://api.kbland.kr';
const HEADERS = { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' };

export const get = <T>(url: string): Promise<T> =>
  fetch(encodeURI(url), { headers: HEADERS }).then((r) => r.json() as Promise<T>);

/** 만원 단위 숫자 → "15억 5,000" (음수 부호 유지) */
export const won = (v: number | string | undefined | null): string => {
  const n = Number(v) || 0;
  const eok = Math.floor(Math.abs(n) / 10000);
  const man = Math.abs(n) % 10000;
  const s = (eok ? `${eok}억` : '') + (man ? ` ${man.toLocaleString()}` : eok ? '' : '0');
  return (n < 0 ? '-' : '') + s.trim();
};

/** "20260612" → "2026.06.12" */
export const fmtDate = (s?: string): string =>
  s ? `${s.slice(0, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : '';

/** "20260612" → "26.06.12" */
export const shortDate = (s?: string): string =>
  s ? `${s.slice(2, 4)}.${s.slice(4, 6)}.${s.slice(6, 8)}` : '';

/** 단지의 평형(면적일련번호) 목록 */
export async function getAreas(danjiId: string): Promise<TypInfoArea[]> {
  const j = await get<Envelope<TypInfoArea[]>>(`${BASE}/land-complex/complex/typInfo?단지기본일련번호=${danjiId}`);
  return j.dataBody?.data ?? [];
}

/** 단지명 (KB 공식명) */
export async function getDanjiName(danjiId: string): Promise<string> {
  const j = await get<Envelope<{ 단지명?: string }>>(`${BASE}/land-complex/complex/complexMain?단지기본일련번호=${danjiId}`);
  return j.dataBody?.data?.단지명 || `단지${danjiId}`;
}

/** 한 평형(면적일련번호)의 시세 + 주간 증감 */
export async function getPrice(danjiId: string, areaId: number, danjiName: string): Promise<PriceRow | undefined> {
  const j = await get<Envelope<{ 시세?: PriceRow[]; 최근실거래가?: RecentDeal }>>(
    `${BASE}/land-price/price/BasePrcInfoNew?단지기본일련번호=${danjiId}&면적일련번호=${areaId}&단지명=${danjiName}`,
  );
  const data = j.dataBody?.data;
  const row = data?.시세?.[0];
  // 최근실거래가는 data 최상위에 있음 → 시세 행에 병합
  return row ? { ...row, 최근실거래가: data?.최근실거래가 } : undefined;
}

/** Target(단지+평형/전용/타입) → 시세 한 줄 */
export async function fetchRow(t: Target): Promise<Row> {
  const [areas, kbName] = await Promise.all([getAreas(t.danjiId), getDanjiName(t.danjiId)]);
  const danjiName = t.표시명 || kbName;
  const area = areas.find((a) => {
    const okSize = t.전용 != null
      ? Math.floor(Number(a.전용면적)) === t.전용
      : Math.floor(Number(a.공급면적평)) === t.평;
    const okType = !t.타입 || (a.주택형타입내용 || '') === t.타입;
    return okSize && okType;
  });
  if (!area) {
    return { danjiName, 평: t.평 ?? `전용${t.전용}`, 타입: t.타입 ?? '', 매매증감: 0, 전세증감: 0, error: '해당 평형/타입 없음' };
  }
  const x = await getPrice(t.danjiId, area.면적일련번호, kbName);
  const rd = x?.최근실거래가;
  const 실거래 = rd?.거래금액
    ? `${won(rd.거래금액)}${rd.거래층 ? ` · ${rd.거래층}층` : ''}${rd.계약년월일 ? ` · ${shortDate(rd.계약년월일)}` : ''}`
    : undefined;
  return {
    danjiName,
    평: Math.floor(Number(area.공급면적평)),
    타입: area.주택형타입내용 || '',
    전용: area.전용면적,
    기준일: x?.시세기준년월일,
    매매: x?.매매일반거래가,
    매매증감: x?.매매변동금액 ?? 0,
    전세: x?.전세일반거래가,
    전세증감: x?.전세변동금액 ?? 0,
    실거래,
  };
}
