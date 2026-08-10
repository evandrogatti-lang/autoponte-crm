import { notFound } from "next/navigation";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { OpportunityWorkspace } from "../../../features/opportunity-workspace";
import { getOpportunityWorkspace } from "../../../lib/opportunities/service";

export const dynamic = "force-dynamic";

type OpportunityPageProps = { params: Promise<{ id: string }> };

export default async function OpportunityPage({ params }: OpportunityPageProps) {
  const { id } = await params;
  await requireChatGPTUser(`/oportunidades/${id}`);
  const opportunity = await getOpportunityWorkspace(id);
  if (!opportunity) notFound();
  return <OpportunityWorkspace initialData={opportunity} />;
}
