import { notFound } from "next/navigation";
import { requireCurrentAppUser } from "../../app-auth";
import { OpportunityWorkspace } from "../../../features/opportunity-workspace";
import { readNegotiationWorkspace } from "../../../lib/negotiation/service";
import { TenantAccessError } from "../../../lib/tenant-context";

export const dynamic = "force-dynamic";

type NegotiationPageProps = { params: Promise<{ negotiationId: string }> };

export default async function NegotiationPage({ params }: NegotiationPageProps) {
  const { negotiationId } = await params;
  if (typeof negotiationId !== "string" || !negotiationId.trim()) notFound();
  await requireCurrentAppUser(`/negociacoes/${encodeURIComponent(negotiationId)}`);
  let workspace;
  try {
    workspace = await readNegotiationWorkspace(negotiationId);
  } catch (error) {
    if (error instanceof TenantAccessError) notFound();
    throw error;
  }
  if (!workspace) notFound();
  return <OpportunityWorkspace canonicalData={workspace} />;
}
