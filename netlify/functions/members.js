// 클럽 멤버 목록을 Netlify Blobs(서버 저장소)에 저장/조회한다.
// 누가 링크를 열어도 같은 데이터가 보이는 게 핵심 — localStorage가 아니라 서버 저장소를 쓴다.

const { getStore } = require("@netlify/blobs");
const { getAccountByRiotId, getSummonerByPuuid, buildPositionStats } = require("./lib/riot");

function json(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    },
    body: JSON.stringify(body),
  };
}

function membersStore() {
  // Netlify의 zero-config 자동 주입이 이 배포 환경에서는 동작하지 않아서
  // SITE_ID / NETLIFY_FUNCTIONS_TOKEN을 직접 넘겨준다 (둘 다 Netlify Functions에 기본 제공됨).
  return getStore({
    name: "members",
    siteID: process.env.SITE_ID,
    token: process.env.NETLIFY_FUNCTIONS_TOKEN,
  });
}

exports.handler = async (event) => {
  const store = membersStore();

  try {
    if (event.httpMethod === "GET") {
      const { blobs } = await store.list();
      const members = [];
      for (const b of blobs) {
        const val = await store.get(b.key, { type: "json" });
        if (val) members.push(val);
      }
      members.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));
      return json({ members });
    }

    if (event.httpMethod === "POST") {
      let payload;
      try {
        payload = JSON.parse(event.body || "{}");
      } catch (e) {
        return json({ error: "잘못된 요청 형식이에요." }, 400);
      }
      const name = (payload.name || "").trim();
      const gameName = (payload.gameName || "").trim();
      const tagLine = (payload.tagLine || "").replace(/^#/, "").trim();
      if (!name || !gameName || !tagLine) {
        return json({ error: "이름과 라이엇 ID(게임이름#태그)를 모두 입력해주세요." }, 400);
      }

      let account;
      try {
        account = await getAccountByRiotId(gameName, tagLine);
      } catch (e) {
        return json({ error: `라이엇 계정을 찾지 못했어요: ${e.message}` }, e.status === 404 ? 404 : 502);
      }

      let summoner = null;
      try {
        summoner = await getSummonerByPuuid(account.puuid);
      } catch (e) {
        // 소환사 레벨/아이콘은 부가정보라 실패해도 계속 진행
      }

      let statsResult;
      try {
        statsResult = await buildPositionStats(account.puuid, 10);
      } catch (e) {
        return json({ error: `전적 조회 중 문제가 발생했어요: ${e.message}` }, 502);
      }

      const id = account.puuid;
      const record = {
        id,
        name,
        riotGameName: account.gameName,
        riotTagLine: account.tagLine,
        puuid: account.puuid,
        summonerLevel: summoner ? summoner.summonerLevel : null,
        profileIconId: summoner ? summoner.profileIconId : null,
        positions: statsResult.positions,
        analyzedMatches: statsResult.analyzedMatches,
        updatedAt: new Date().toISOString(),
      };
      await store.setJSON(id, record);
      return json({ member: record });
    }

    if (event.httpMethod === "DELETE") {
      const id = event.queryStringParameters && event.queryStringParameters.id;
      if (!id) return json({ error: "삭제할 id가 필요해요." }, 400);
      await store.delete(id);
      return json({ ok: true });
    }

    return json({ error: "지원하지 않는 요청이에요." }, 405);
  } catch (e) {
    if (e.code === "NO_API_KEY") {
      return json({ error: e.message }, 500);
    }
    return json({ error: `서버 오류: ${e.message}` }, 500);
  }
};
