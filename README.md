# kb-price-email

KB부동산(kbland.kr) 공개 API로 관심 단지의 **평형별 KB시세 + 지난주 대비 증감**을 모아
HTML 표 이메일로 보내는 도구. TypeScript(tsx로 직접 실행, 빌드 단계 없음).

## 파일

| 파일 | 역할 |
|---|---|
| `kb.ts` | KB API 클라이언트 + 타입(`Target`/`Row`) + 공통 헬퍼(`won`/`fmtDate`/`fetchRow`) |
| `send.ts` | **메인.** 단지 시세 조회 → HTML 생성 → 네이버 SMTP 발송 |
| `report.ts` | 단지 하나의 **전 평형** 시세를 터미널 표로 출력 (새 단지 추가 시 평형/타입 확인용) |
| `email.html` | `npm run preview`가 생성하는 미리보기 본문 |

## 사용법

```bash
npm install            # 최초 1회 (tsx 등 의존성)

npm run preview        # 미리보기만 (발송 X, email.html 생성)
npm run report 118     # 특정 단지 전 평형 시세 (단지번호 = kbland.kr/c/<번호>)

# 실제 발송 (네이버 SMTP)
NAVER_USER=<네이버ID> NAVER_PASS=<앱비밀번호> npm run send

npm run typecheck      # 타입 검사
```

## 단지 추가/수정

`send.ts` 상단 `TARGETS` 배열에 한 줄씩:

```ts
{ danjiId: '118', 평: 14 }              // 공급 14평(내림) 매칭
{ danjiId: '1306', 전용: 59 }           // 전용 59㎡(내림) 매칭
{ danjiId: '15524', 평: 12, 타입: 'A' } // 같은 평형에 A/B 여럿일 때 타입 지정
```

평형/타입이 헷갈리면 `npm run report <단지번호>`로 그 단지 구성을 먼저 확인.

## 자동 발송 (GitHub Actions)

`.github/workflows/weekly.yml` — 매주 금 13:00 KST 자동 발송. `npm ci` → `npm run send`.
앱 비밀번호는 repo Secret `NAVER_PASS`로 주입(코드엔 없음). 단지/수신/주기 변경은
`send.ts`(또는 workflow) 수정 후 `git push`하면 다음 실행부터 반영.

## 데이터 출처 (KB 공개 API, 인증 불필요)

- `typInfo` — 단지의 평형(면적일련번호) 목록
- `complexMain` — 단지명
- `BasePrcInfoNew` — 평형별 매매/전세 일반가 + 주간 증감(`매매변동금액`/`전세변동금액`)

시세 기준일은 매주 금요일. 단위는 만원.

## 발송 전제조건 (네이버)

1. 네이버 메일 → 환경설정 → POP3/IMAP 설정 → **IMAP/SMTP 사용** ON
2. (2단계 인증 시) **애플리케이션 비밀번호** 발급 → `NAVER_PASS`로 사용
