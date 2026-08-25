import postgres from "postgres";
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
const db=postgres(process.env.DATABASE_URL,{prepare:false,max:1});
try {
  const [summary]=await db.unsafe(`select count(*)::int cases,
    count(*) filter(where final_outcome='sold')::int sold,
    count(*) filter(where final_outcome in ('negotiation_lost','proposal_rejected'))::int lost,
    count(*) filter(where final_outcome in ('active_negotiation','awaiting_documents'))::int active
    from commercial_cases where pilot_code like 'P1-%'`);
  const [integrity]=await db.unsafe(`select
    count(*) filter(where c.vehicle_id is null or c.customer_id is null or c.opportunity_id is null or c.seller_profile_id is null)::int broken_links,
    count(*) filter(where c.final_outcome='sold' and (k.id is null or d.id is null))::int incomplete_sales
    from commercial_cases c left join commercial_contracts k on k.case_id=c.id and k.status='signed'
    left join vehicle_deliveries d on d.case_id=c.id and d.status='delivered' where c.pilot_code like 'P1-%'`);
  const [match]=await db.unsafe(`select count(*)::int candidates,
    count(*) filter(where nullif(reasons,'[]') is not null)::int explained,
    count(*) filter(where nullif(outcome,'') is not null)::int outcomes
    from vehicle_matches where case_id in(select id from commercial_cases where pilot_code like 'P1-%')`);
  const [operations]=await db.unsafe(`select
    count(distinct c.id) filter(where e.id is not null)::int cases_with_timeline,
    count(distinct c.id) filter(where i.id is not null)::int cases_with_intent,
    count(distinct c.id) filter(where a.id is not null)::int cases_with_assignment,
    count(*) filter(where pub.status='published' and (v.document_status<>'approved' or photos.approved_photos<4 or open_work.open_count>0))::int invalid_publications,
    count(*) filter(where p.id is not null and (p.match_id is null or m.case_id<>p.case_id or m.vehicle_id<>p.vehicle_id))::int untraceable_proposals
    from commercial_cases c join vehicles v on v.id=c.vehicle_id
    left join vehicle_lifecycle_events e on e.case_id=c.id
    left join customer_intents i on i.case_id=c.id
    left join seller_assignments a on a.opportunity_id=c.opportunity_id
    left join vehicle_publications pub on pub.case_id=c.id
    left join lateral(select count(*)::int approved_photos from vehicle_media vm where vm.case_id=c.id and vm.media_type='photo' and vm.status='approved') photos on true
    left join lateral(select count(*)::int open_count from vehicle_work_orders wo where wo.case_id=c.id and wo.status in('open','in_progress')) open_work on true
    left join proposals p on p.case_id=c.id left join vehicle_matches m on m.id=p.match_id
    where c.pilot_code like 'P1-%'`);
  const result={summary,integrity,match,operations,status:summary.cases===10&&integrity.broken_links===0&&integrity.incomplete_sales===0&&match.candidates===10&&match.explained===10&&match.outcomes===10&&operations.cases_with_timeline===10&&operations.cases_with_intent===10&&operations.cases_with_assignment===10&&operations.invalid_publications===0&&operations.untraceable_proposals===0?'PASS':'FAIL'};
  console.log(JSON.stringify(result,null,2)); if(result.status!=='PASS') process.exitCode=1;
} finally { await db.end(); }
