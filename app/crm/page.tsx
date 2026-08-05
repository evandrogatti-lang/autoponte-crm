import { desc } from "drizzle-orm";
import { requireChatGPTUser } from "../chatgpt-auth";
import { getDb } from "../../db";
import { tradeIns } from "../../db/schema";
import { buildMissionControl } from "../../lib/mission-control/mapper";
import type { TradeInRow } from "../../lib/mission-control/model";
import { DecisionRail, MissionBrief, MissionControlShell, OperationOverview, PipelineLive, QuickActions } from "../../components/mission-control";

export default async function CrmPage() {
  await requireChatGPTUser("/crm");
  let rows: TradeInRow[] = [];
  try {
    const live = await getDb().select().from(tradeIns).orderBy(desc(tradeIns.createdAt)).limit(100);
    rows = live.map(row => ({
      id: row.id,
      name: row.name,
      city: row.city,
      brand: row.brand,
      model: row.model,
      year: row.year,
      desiredVehicle: row.desiredVehicle,
      estimatedMin: row.estimatedMin,
      estimatedMax: row.estimatedMax,
      status: row.status,
      leadCategory: row.leadCategory,
      nextFollowUp: row.nextFollowUp,
      createdAt: row.createdAt,
    }));
  } catch {
    rows = [];
  }

  const model = buildMissionControl(rows);

  return <MissionControlShell>
    <MissionBrief model={model}/>
    <OperationOverview model={model}/>
    <QuickActions/>
    <div className="mc-main-grid">
      <PipelineLive model={model}/>
      <DecisionRail model={model}/>
    </div>
  </MissionControlShell>;
}
