import { redirect } from "next/navigation";
import { negotiationHref, withSearchParams, type CommercialSearchParams } from "../../../lib/commercial-navigation";

export default async function LegacyCasePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<CommercialSearchParams> }) {
  const { id } = await params;
  redirect(withSearchParams(negotiationHref(id), await searchParams));
}
