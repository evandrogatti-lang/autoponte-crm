import { redirect } from "next/navigation";
import { commercialRoutes, withSearchParams, type CommercialSearchParams } from "../../../lib/commercial-navigation";

export default async function LegacyNewOpportunityPage({ searchParams }: { searchParams: Promise<CommercialSearchParams> }) {
  redirect(withSearchParams(commercialRoutes.newLead, await searchParams));
}
