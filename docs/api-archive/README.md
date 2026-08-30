# PLATO API archive

이 디렉터리는 PLATO(`plato.pusan.ac.kr`)와 구 PLATO
(`dev-plato.pusan.ac.kr`)에서 **관찰 가능한 HTTP 계약**을 정리한 개발용
자료다. 서버 소스나 공식 OpenAPI 명세가 아니므로, “사이트의 모든 내부 API”를
완전하게 열거한다고 주장하지 않는다.

## 현재 포함 범위

- 공개 페이지와 사용자가 제공한 로그인 후 HTML에서 확인한 링크·폼
- 화면이 로드하는 공개 RequireJS 번들에서 발견한 action 엔드포인트
- PLATO Classic 확장 프로그램이 실제로 사용하는 읽기 요청
- 강좌 목록을 읽을 때 필요한 DOM 구조의 비식별 예시

`endpoints.json`의 각 항목에는 발견 근거(`evidence`), 신뢰도
(`confidence`), 상태 변경 가능성(`effect`) 및 자동 재조회 허용 여부
(`safeToProbe`)가 있다. `safeToProbe: false`인 항목은 자동 탐색에서 호출하지
않는다. 런타임에서도 예외는 사용자가 알림 패널의 새로고침 버튼을 직접 누른
경우의 읽기 전용 `coursemostype=lists` POST뿐이다.

## 파일

- `endpoints.json`: 핵심 엔드포인트 카탈로그
- `bundle-discovery.md`: 공개 번들에서 발견한 전체 경로 부록
- `redaction-policy.md`: 쿠키·토큰·개인정보 제거 규칙
- `schemas/course.schema.json`: 두 사이트에서 공통으로 사용할 정규화 강좌 형식
- `fixtures/`: 원문 대신 저장한 비식별 응답 구조 예시
- `../../scripts/discover-api-bundles.mjs`: 공개 JS 번들 재탐색 도구(GET 전용)
- `../../scripts/validate-api-archive.mjs`: 문서 구조 및 비밀정보 혼입 검사

## 중요한 해석

PLATO의 `action.php` 계열은 REST API라기보다 `type` 등의 selector를 받는
Moodle AJAX 컨트롤러에 가깝다. 같은 URL이 조회와 변경을 모두 처리할 수
있으므로 selector별 의미가 확인되지 않은 action은 절대 자동 호출하지 않는다.
글쓰기·댓글·메시지 발송, 알림 삭제, 수강 신청·취소, 사용자 설정 변경 action은
탐색 도구와 확장 프로그램 모두 호출하지 않는다.

알림 `lists`는 조회임에도 POST만 지원한다. 이미 페이지에 렌더링된 알림을 먼저
사용하고, 사용자가 새로고침을 명시적으로 요청한 경우에만 고정된 `lists`
selector와 현재 세션 키로 한 번 조회한다. 같은 controller의 `delete`와
`deleteAll`을 비롯한 다른 selector는 재사용하지 않는다.

강좌 조회는 URL 역할과 학기 경계를 먼저 확정한 뒤 읽기 경로를 선택한다.

1. `/local/ubion/allcourse/regular/index.php?year=YYYY&semester=SS`를 강좌 조회의
   유일한 기준 화면으로 사용한다. 2026학년도 2학기 이전 학기는 구 PLATO,
   2026학년도 2학기 및 그 이후는 PLATO의 현재 목록을 사용한다.
2. 기존 `/my/?plato_classic_view=past-courses&year=YYYY&semester=SS` 주소는 같은
   조건의 교과과정 주소로 `replace` 전달한다.
3. 구 PLATO 세션이 있으면 인증된 GET 결과를 기준 화면에 합쳐 표시한다. 인증을
   확인할 수 없으면 자동 이동하지 않고 동일 학기의
   `/local/ubion/user/index.php?year=YYYY&semester=SS` 버튼을 표시한다.
4. 읽은 HTML은 `schemas/course.schema.json` 형태로 정규화한다.

학기 코드는 관찰된 값 기준으로 `10`(1학기), `20`(2학기)이며, 구 확장 코드가
허용하는 계절·특수학기 후보는 `11`, `12`, `21`, `22`다. 후보 코드는 서버의
공식 보장을 뜻하지 않는다.

## 공개 GET 실측

2026-08-31에 로그인·폼 제출 없이 다음 공개 강좌 조회 경로를 확인했다. 아래
필드는 화면의 GET 폼이나 페이지 이동 링크에 실제로 존재한 이름이며, 빈 값을
임의로 조합해 대량 요청한다는 뜻은 아니다.

- PLATO 지정강좌: `/local/ubonline/index.php`의 `cgroup`, `curriculum`,
  `keyword`, `viewtype`; 상세는 `/local/ubonline/view.php?id=...`
- PLATO PNU ON: `/local/opencontent/index.php`의 `keyword`, `category`,
  `subcategory`, `sort`; 상세는 `/local/opencontent/view.php?id=...`
- 구 PLATO 자율강좌: `/local/ubeclass/`의 `period`, `classify`, `keyfield`,
  `keyword`, `page`
- 구 PLATO 지정강좌: `/local/ubonline/`의 `searchtype`, `section`, `undo`,
  `keyword`, `progress[]`, `category[]`, 수강·학습 기간 필드와 `page`
- 구 PLATO 교수·학습: `/local/ubteaching/`의 `section`, `viewtype`, `year`,
  `progress[]`, `category[]`, `keyword`, `ordertype`, `page`
- 구 PLATO 공개 콘텐츠 검색: `/local/oer/search.php?keyword=...`

구 공개 페이지에 함께 포함된 숨은 POST 폼과 action URL은 존재 여부와 필드명만
기록했으며 제출하지 않았다. 상세 필드와 관찰값은 `endpoints.json`을 기준으로
한다.

## 갱신 절차

```powershell
node scripts/discover-api-bundles.mjs > bundle-scan.json
node scripts/validate-api-archive.mjs
```

첫 명령의 출력은 검토용이다. 새 URL을 발견해도 즉시 자동화 대상으로 삼지
말고, GET인지·인증이 필요한지·상태를 바꾸는지 먼저 확인한 뒤
`endpoints.json`에 수동 반영한다. 원문 HTML이나 응답을 보관할 때는
`redaction-policy.md`를 먼저 적용한다.

## 조사 기준일과 근거

- 기준일: 2026-08-31 (Asia/Seoul)
- PLATO 공개 페이지 및 RequireJS revision `1788088812`
- 구 PLATO 공개 페이지 및 RequireJS revision `1787752721`
- 신·구 PLATO 공개 강좌 GET 폼과 링크의 비변경 탐색
- 사용자가 제공한 신·구 PLATO 로그인 후 HTML 스냅샷
- 현재 PLATO Classic 소스의 네트워크 호출
