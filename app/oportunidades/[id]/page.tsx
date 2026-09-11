import { redirect } from "next/navigation";
import { leadQualificationHref, withSearchParams, type CommercialSearchParams } from "../../../lib/commercial-navigation";

export default async function LegacyOpportunityPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<CommercialSearchParams> }) {
  const { id } = await params;
  redirect(withSearchParams(leadQualificationHref(id), await searchParams));
}
