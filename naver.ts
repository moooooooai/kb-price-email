// 네이버 부동산 단지 링크 생성(스크래핑 없음). 실거래가는 KB API에서 가져오므로
// 여기선 "유저가 호가를 직접 확인"할 링크만 만든다.
//
// 우선순위:
//  1) complexNo + 평형  → fin.land 단지 매매 매물탭 + 해당 평형 선택 (딥링크)
//  2) complexNo만       → fin.land 단지 페이지
//  3) 둘 다 없음        → m.land 검색 결과
//
// 평형/평형목록은 네이버 고유 내부 평형번호(pyeongTypeNumber)이며 KB 평형과 무관.
//  - 평형(transactionPyeongTypeNumber): 선택(강조)할 평형 번호
//  - 평형목록(articlePyeongTypeNumbers): 매물 표시할 평형 번호 목록 "3-4-2" (생략 시 평형 단일)
interface NaverInfo { 동: string; complexNo?: number; q?: string; 평형?: number; 평형목록?: string; url?: string }

// danjiId(KB) → 네이버 검색 동 + 단지번호(확인된 것만) + 검색어 오버라이드(KB명이 모호할 때)
export const NAVER: Record<string, NaverInfo> = {
  '118':    { 동: '수서동', complexNo: 641, 평형: 1 },          // 까치마을 (14평)
  '117':    { 동: '수서동', complexNo: 671, 평형: 1, q: '수서신동아 수서동' }, // 수서신동아 (14평, KB명 "신동아")
  '128':    { 동: '개포동', complexNo: 483, 평형: 1 },          // 대치 (14평)
  '15524':  { 동: '잠실동', complexNo: 22746, 평형: 10, 평형목록: '1' }, // 리센츠 (12평 A)
  '1306':   { 동: '노량진동', complexNo: 3280, 평형: 2 },       // 신동아리버파크 (전용59)
  '1304':   { 동: '노량진동', complexNo: 362, 평형: 1 },         // 노량진우성 (전용59)
  '1309':   { 동: '본동', complexNo: 372, 평형: 4, 평형목록: '2' }, // 본동신동아 (전용59)
  '4611':   { 동: '이매동', complexNo: 2578, 평형: 1, q: '이매촌한신 이매동' }, // 이매촌한신 (20평, KB명 괄호)
  '1956':   { 동: '가락동', complexNo: 348, 평형: 1, q: '가락우성 가락동' }, // 가락우성 (18평, KB명 괄호)
  '549997': { 동: '아현동', complexNo: 148651, 평형: 2, 평형목록: '2-1' }, // 마포더클래시 (17평 A·B)
  '309':    { 동: '암사동', complexNo: 3118, 평형: 2, 평형목록: '2-1' }, // 선사현대 (전용58·59)
  '2192':   { 동: '영등포동', complexNo: 967, 평형: 1 },        // 영등포삼환 (전용59)
  '2196':   { 동: '영등포동', complexNo: 3457, 평형: 1 },       // 영등포푸르지오 (전용59)
  '2284':   { 동: '양평동', complexNo: 735, 평형: 1 },           // 양평한신 (전용59)
  '22183':  { 동: '운중동', complexNo: 27863, url: 'https://fin.land.naver.com/complexes/27863?articleTradeTypes=A1&isVilla=false&tab=article&articlePyeongTypeNumbers=3-2-1' }, // 산운마을11단지 (전용51) — 강조번호 없이 3·2·1 평형목록 URL 그대로
  '1914':   { 동: '오금동', complexNo: 628, url: 'https://fin.land.naver.com/complexes/628?articlePyeongTypeNumbers=1&articleTradeTypes=A1&tab=article&articleSortingType=PRICE_ASC' }, // 오금상아2차 (전용45) — 강조번호 없이 URL 그대로
  '429058': { 동: '자곡동', complexNo: 105735, 평형: 2, 평형목록: '2-1-3' }, // 강남자곡힐스테이트 (전용59·51A·51B)
  '2539':   { 동: '신당동', complexNo: 1238, 평형: 2 },         // 약수하이츠 (전용57)
  '2540':   { 동: '신당동', complexNo: 1237, 평형: 3, 평형목록: '3-4-2' }, // 신당동삼성 (59 A/B/C)
  '2538':   { 동: '신당동', complexNo: 3833, 평형: 2 },         // 남산타운 (전용59)
  '1319':   { 동: '사당동', complexNo: 374 },                   // 사당극동(KB명 극동) (20평) — 평형 딥링크는 네이버 평형번호 확인 필요
  '12822':  { 동: '명일동', complexNo: 9682, url: 'https://fin.land.naver.com/complexes/9682?tab=article&articlePyeongTypeNumbers=1&articleTradeTypes=A1-B1&transactionPyeongTypeNumber=2&transactionTradeType=A1&articleSortingType=PRICE_ASC' }, // 강동현대홈타운 (전용59)
  '1764':   { 동: '응봉동', complexNo: 571, url: 'https://fin.land.naver.com/complexes/571?articlePyeongTypeNumbers=1&articleTradeTypes=A1&tab=article&articleSortingType=PRICE_ASC' }, // 응봉대림2차 (전용59)
  '1743':   { 동: '홍익동', complexNo: 573, url: 'https://fin.land.naver.com/complexes/573?articleSortingType=PRICE_ASC&articleTradeTypes=A1&tab=article&articlePyeongTypeNumbers=2' }, // 청계벽산 (전용71)
  '1345':   { 동: '도화동', complexNo: 3290, url: 'https://fin.land.naver.com/complexes/3290?articleSortingType=PRICE_ASC&articleTradeTypes=A1&tab=article&articlePyeongTypeNumbers=1-5-7' }, // 마포현대 (전용54·59A·59B)
  '1355':   { 동: '도화동', complexNo: 841, url: 'https://fin.land.naver.com/complexes/841?isVilla=false&tab=article&articleTradeTypes=A1&articlePyeongTypeNumbers=2&articleSortingType=PRICE_ASC' }, // 도화현대홈타운 (전용59)
  '1361':   { 동: '용강동', complexNo: 1148, url: 'https://fin.land.naver.com/complexes/1148?articleSortingType=PRICE_ASC&articleTradeTypes=A1&tab=article&articlePyeongTypeNumbers=1' }, // 마포쌍용황금 (전용59)
  '1352':   { 동: '도화동', complexNo: 407, url: 'https://fin.land.naver.com/complexes/407?articleTradeTypes=A1&tab=article&articlePyeongTypeNumbers=1' }, // 도화현대1차 (전용54)
  '21899':  { 동: '둔촌동', complexNo: 27212, url: 'https://fin.land.naver.com/complexes/27212?articlePyeongTypeNumbers=1&articleTradeTypes=A1&tab=article&articleSortingType=PRICE_ASC' }, // 둔촌푸르지오 (전용59)
};

/** 급매캐치 단지·평형(전용형) 딥링크. 네이버 complexNo를 그대로 사용(band=전용형). */
export function geummaecatchLink(danjiId: string, band?: number): string | undefined {
  const info = NAVER[danjiId];
  if (!info?.complexNo) return undefined;
  const base = `https://www.geummaecatch.com/complex/${info.complexNo}`;
  return band != null
    ? `${base}/dong/__all__?band=${encodeURIComponent(band + '형')}`
    : base;
}
