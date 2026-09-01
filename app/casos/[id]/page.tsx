import { notFound } from "next/navigation";
import { requireCurrentAppUser } from "../../app-auth";
import { requirePermission } from "../../../lib/access-control";
import { CaseOperationError } from "../../../lib/commercial-cases/contracts";
import { getCommercialCase } from "../../../lib/commercial-cases/service";
import CaseWorkspace from "./CaseWorkspace";

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireCurrentAppUser(`/casos/${id}`);
  await requirePermission(user, "seller_operations.manage");

  let data;
  try {
    data = await getCommercialCase(id);
  } catch (error) {
    if (error instanceof CaseOperationError && error.status === 404) notFound();
    throw error;
  }

  return <CaseWorkspace initialData={JSON.parse(JSON.stringify(data)) as Record<string, unknown>} />;
}
