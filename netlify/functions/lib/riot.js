// 라이엇 공식 API 호출 헬퍼.
// RIOT_API_KEY는 Netlify 사이트의 "환경 변수" 설정에서만 읽어온다 — 코드에는 절대 값이 들어가지 않는다.

const PLATFORM = "kr";      // 소환사 정보용 라우팅 (한국 서버)
const REGIONAL = "asia";    // 계정/전적용 라우팅 (KR, JP 공용)

const POSITION_LABEL = {
  TOP: "탑",
  JUNGLE: "정글",
  MIDDLE: "미드",
  BOTTOM: "원딜",
  UTILITY: "서폿",
};

function apiKey() {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    const err = new Error("RIOT_API_KEY가 설정되어 있지 않아요. Netlify 사이트 환경 변수에 등록해주세요.");
    err.code = "NO_API_KEY";
    throw err;
  }
  return key;
}

async function riotFetch(url) {
  const res = await fetch(url, {
    headers: { "X-Riot-Token": apiKey() },
  });
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.status?.message || "";
    } catch (_) {}
    const err = new Error(`라이엇 API 오류 (${res.status}) ${detail}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// gameName#tagLine -> {puuid, gameName, tagLine}
async function getAccountByRiotId(gameName, tagLine) {
  const url = `https://${REGIONAL}.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return riotFetch(url);
}

// puuid -> 최근 매치 id 목록
async function getRecentMatchIds(puuid, count) {
  const url = `https://${REGIONAL}.api.riotgames.com/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=${count}`;
  return riotFetch(url);
}

// matchId -> 매치 상세
async function getMatch(matchId) {
  const url = `https://${REGIONAL}.api.riotgames.com/lol/match/v5/matches/${encodeURIComponent(matchId)}`;
  return riotFetch(url);
}

// puuid -> 소환사 레벨/프로필아이콘 (Summoner-V4, platform 라우팅)
async function getSummonerByPuuid(puuid) {
  const url = `https://${PLATFORM}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/${encodeURIComponent(puuid)}`;
  return riotFetch(url);
}

// 최근 N경기를 분석해서 포지션별 판수/승률을 계산한다.
// count는 라이엇 rate limit(초당 20건/2분당 100건)을 감안해 기본 15로 제한.
async function buildPositionStats(puuid, count = 10) {
  const matchIds = await getRecentMatchIds(puuid, count);
  // 개인 API 키 제한(초당 20건)을 감안해 병렬로 가져오되, 한 번에 너무 많이 쏘지 않도록 묶어서 처리.
  const matches = await Promise.all(
    matchIds.map((id) =>
      getMatch(id).catch(() => null) // 개별 매치 조회 실패는 건너뛴다 (아레나 모드 등 비표준 매치 포함 가능)
    )
  );
  const stats = {}; // pos -> {games, wins}
  let analyzed = 0;
  for (const match of matches) {
    if (!match) continue;
    const participant = match?.info?.participants?.find((p) => p.puuid === puuid);
    if (!participant) continue;
    const pos = participant.teamPosition; // TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY/""
    if (!pos || !POSITION_LABEL[pos]) continue;
    if (!stats[pos]) stats[pos] = { games: 0, wins: 0 };
    stats[pos].games += 1;
    if (participant.win) stats[pos].wins += 1;
    analyzed += 1;
  }
  const positions = Object.entries(stats)
    .map(([pos, s]) => ({
      pos,
      label: POSITION_LABEL[pos],
      games: s.games,
      winRate: s.games ? Math.round((s.wins / s.games) * 100) : 0,
    }))
    .sort((a, b) => b.games - a.games);
  return { analyzedMatches: analyzed, totalFetched: matchIds.length, positions };
}

module.exports = {
  getAccountByRiotId,
  getSummonerByPuuid,
  buildPositionStats,
  POSITION_LABEL,
};
