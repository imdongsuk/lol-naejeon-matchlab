// 배포 후 라이엇 API 키가 제대로 설정됐는지 빠르게 확인하는 헬스체크용 엔드포인트.
// 브라우저에서 /api/ping 으로 바로 열어보면 된다.

exports.handler = async () => {
  const key = process.env.RIOT_API_KEY;
  if (!key) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: false, error: "RIOT_API_KEY가 설정되어 있지 않아요." }),
    };
  }
  try {
    const res = await fetch("https://kr.api.riotgames.com/lol/status/v4/platform-data", {
      headers: { "X-Riot-Token": key },
    });
    if (!res.ok) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ ok: false, error: `라이엇 API 응답 오류 (${res.status})` }),
      };
    }
    const data = await res.json();
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: true, server: data.name, incidents: (data.incidents || []).length }),
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify({ ok: false, error: e.message }),
    };
  }
};
