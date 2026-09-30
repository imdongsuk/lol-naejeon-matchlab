# 롤내전 매치랩 — 실전적 연동 (v1)

라이엇 공식 API에 연동해서, 멤버가 라이엇 ID(게임이름#태그)를 등록하면
최근 경기를 분석해 포지션별 판수·승률을 서버(Netlify Blobs)에 저장합니다.
localStorage가 아니라 서버 저장소라서, 누가 이 사이트를 열어도 같은 데이터를 봐요.

## 배포 방법 (GitHub → Netlify 연결)

1. 이 폴더 안의 파일들을 GitHub 저장소(`lol-naejeon-matchlab`)에 그대로 업로드합니다.
   폴더 구조를 그대로 유지해야 해요 (`netlify/functions/...`, `public/...` 등).
2. Netlify에서 "Add new site" → "Import an existing project" → 방금 그 GitHub 저장소 선택.
3. 빌드 설정은 `netlify.toml`에 이미 다 들어있어서 그대로 두면 됩니다
   (Publish directory: `public`, Functions directory: `netlify/functions`).
4. 배포된 사이트의 **Site configuration → Environment variables**에서
   `RIOT_API_KEY` 라는 이름으로 라이엇 개발자 포털에서 받은 키 값을 등록합니다.
   (이 키는 24시간마다 만료되니, 매일 새로 발급받아서 값만 갱신해주면 돼요.)
5. `/api/ping` 주소로 들어가보면 `{"ok":true,...}` 가 뜨는지로 연동이 잘 됐는지 확인할 수 있어요.
6. 메인 페이지(`/`)에서 이름 + 라이엇 ID를 입력해서 실제로 전적이 불러와지는지 테스트합니다.

## 파일 구성

- `netlify.toml` — Netlify 빌드/함수 설정
- `netlify/functions/lib/riot.js` — 라이엇 API 호출 공용 함수
- `netlify/functions/members.js` — 멤버 등록/조회 (서버 저장소 Netlify Blobs 사용)
- `netlify/functions/ping.js` — API 키/연동 상태 확인용
- `public/index.html` — 멤버 연동 테스트 화면
