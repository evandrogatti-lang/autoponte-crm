import { getChatGPTUser } from "../../../../chatgpt-auth";
import { requirePermission } from "../../../../../lib/access-control";
import { endpointSourceForEvidenceType, hasForgedTrustFields, isVqiEvidenceType, VQI_EVIDENCE_PERMISSION } from "../../../../../lib/vehicle-intelligence/evidence";
import { ingestTrustedVehicleEvidence, VehicleEvidenceError } from "../../../../../lib/vehicle-intelligence/evidence-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getChatGPTUser();
  if (!actor) return Response.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const user = await requirePermission(actor, VQI_EVIDENCE_PERMISSION);
    const raw = await request.json() as Record<string, unknown>;
    if (hasForgedTrustFields(raw)) {
      throw new VehicleEvidenceError("Fonte, confiança e verificação são atribuídas exclusivamente pelo servidor.");
    }
    const evidenceType = String(raw.evidenceType ?? "");
    if (!isVqiEvidenceType(evidenceType)) throw new VehicleEvidenceError("Tipo de evidência VQI inválido.");
    const { id: vehicleId } = await params;
    const result = await ingestTrustedVehicleEvidence({
      vehicleId,
      evidenceType,
      value: raw.value,
      externalRef: typeof raw.externalRef === "string" ? raw.externalRef : undefined,
      metadata: raw.metadata && typeof raw.metadata === "object" && !Array.isArray(raw.metadata) ? raw.metadata as Record<string, unknown> : undefined,
      supersedesObservationId: typeof raw.supersedesObservationId === "string" ? raw.supersedesObservationId : undefined,
    }, {
      source: endpointSourceForEvidenceType(evidenceType),
      actor: { id: user.id, email: user.email },
    });
    return Response.json(result, { status: result.idempotent ? 200 : 201 });
  } catch (error) {
    if (error instanceof VehicleEvidenceError) return Response.json({ error: error.message }, { status: error.status });
    const message = error instanceof Error ? error.message : "Não foi possível registrar a evidência.";
    const forbidden = message.includes("permissão") || message.includes("Perfil de acesso");
    return Response.json({ error: message }, { status: forbidden ? 403 : 400 });
  }
}
