import { notFound } from "next/navigation";
import { requireChatGPTUser } from "../../chatgpt-auth";
import { CaseOperationError } from "../../../lib/commercial-cases/contracts";
import { getCommercialCase } from "../../../lib/commercial-cases/service";
import CaseWorkspace from "./CaseWorkspace";

export const dynamic = "force-dynamic";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireChatGPTUser(`/casos/${id}`);

  try {
    const data = await getCommercialCase(id);
    return <CaseWorkspace initialData={JSON.parse(JSON.stringify(data)) as Record<string, unknown>} />;
  } catch (error) {
    if (error instanceof CaseOperationError && error.status === 404) notFound();
    throw error;
  }
}
