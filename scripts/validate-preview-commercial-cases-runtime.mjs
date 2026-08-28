import postgres from "postgres";

const baseUrl = process.argv[2];
if (!baseUrl || !process.env.DATABASE_URL) throw new Error("Informe a URL do Preview e DATABASE_URL.");
const db = postgres(process.env.DATABASE_URL.replace(/^['"]|['"]$/g, ""), { prepare: false, max: 1 });
const authorized = { "oai-authenticated-user-email": "preview-validator@autoponte.local" };

try {
  const cases = await db`
    select id, pilot_code, status, final_outcome
    from commercial_cases
    order by pilot_code
  `;
  const [integrity] = await db`
    select
      count(*) filter (where v.id is null or cu.id is null)::int as broken_case_links,
      (select count(*)::int from vehicle_matches m
        left join commercial_cases c2 on c2.id=m.case_id
        left join vehicles mv on mv.id=m.vehicle_id
        where c2.id is null or (m.vehicle_id is not null and mv.id is null)) as broken_match_links
    from commercial_cases c
    left join vehicles v on v.id=c.vehicle_id
    left join customers cu on cu.id=c.customer_id
  `;

  const indexResponse = await fetch(`${baseUrl}/casos`, { headers: authorized, redirect: "manual" });
  const indexHtml = await indexResponse.text();
  const cardLinks = [...indexHtml.matchAll(/href="\/casos\/([^"]+)"/g)].map((match) => match[1]);
  const failures = [];

  for (const item of cases) {
    const direct = await fetch(`${baseUrl}/casos/${encodeURIComponent(item.id)}`, { headers: authorized, redirect: "manual" });
    if (direct.status !== 200) failures.push({ id: item.id, kind: "uuid", status: direct.status });

    const legacy = await fetch(`${baseUrl}/casos/${encodeURIComponent(item.pilot_code)}`, { headers: authorized, redirect: "manual" });
    const location = legacy.headers.get("location") ?? "";
    if (![307, 308].includes(legacy.status) || !location.endsWith(`/casos/${encodeURIComponent(item.id)}`)) {
      failures.push({ id: item.id, kind: "pilotCode", status: legacy.status, location });
    }
  }

  const representatives = {};
  for (const outcome of ["sold", "active_negotiation", "negotiation_lost", "awaiting_documents"]) {
    const item = cases.find((row) => row.final_outcome === outcome);
    if (!item) {
      representatives[outcome] = "missing";
      continue;
    }
    const response = await fetch(`${baseUrl}/casos/${encodeURIComponent(item.id)}`, { headers: authorized });
    const html = await response.text();
    representatives[outcome] = {
      status: response.status,
      managerFields: ["Cliente", "Veículo / negócio", "Status comercial", "Responsável", "Match atual", "Valor / proposta", "Troca", "Última interação", "PRÓXIMA AÇÃO", "BLOQUEIOS E ALERTAS", "Pagamento / financiamento"].every((label) => html.includes(label)),
      timeline: html.includes("Linha do tempo unificada"),
      navigation: html.includes("Negociações"),
    };
  }

  const anonymous = await fetch(`${baseUrl}/casos`, { redirect: "manual" });
  const result = {
    indexStatus: indexResponse.status,
    cases: cases.length,
    uniqueCardLinks: new Set(cardLinks).size,
    routeFailures: failures.length,
    representatives,
    anonymousStatus: anonymous.status,
    anonymousLocation: anonymous.headers.get("location"),
    ...integrity,
  };
  console.log(JSON.stringify(result, null, 2));

  if (indexResponse.status !== 200 || cases.length !== 50 || new Set(cardLinks).size !== 50 || failures.length || integrity.broken_case_links || integrity.broken_match_links) process.exitCode = 1;
} finally {
  await db.end();
}
