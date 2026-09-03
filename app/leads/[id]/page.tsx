import { notFound } from "next/navigation";
import { requireSellerOperations } from "../../app-auth";
import { OpportunityWorkspace } from "../../../features/opportunity-workspace";
import { leadQualificationHref } from "../../../lib/commercial-navigation";
import { getOpportunityWorkspace } from "../../../lib/opportunities/service";

export const dynamic = "force-dynamic";

export default async function LeadQualificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireSellerOperations(leadQualificationHref(id));
  const lead = await getOpportunityWorkspace(id);
  if (!lead) notFound();
  return <OpportunityWorkspace initialData={lead} />;
}
