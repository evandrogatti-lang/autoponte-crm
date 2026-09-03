import { redirect } from "next/navigation";
import { commercialRoutes, withSearchParams, type CommercialSearchParams } from "../../lib/commercial-navigation";

export default async function LegacyOpportunitiesPage({ searchParams }: { searchParams: Promise<CommercialSearchParams> }) {
  redirect(withSearchParams(commercialRoutes.match, await searchParams));
}
