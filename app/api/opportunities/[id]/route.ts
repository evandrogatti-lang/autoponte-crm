import { revalidatePath } from "next/cache";
import { getChatGPTUser } from "../../../chatgpt-auth";
import { applyOpportunityCommand, getOpportunityWorkspace } from "../../../../lib/opportunities/service";
import { parseOpportunityCommand } from "../../../../lib/opportunities";
import type { OpportunityCommand } from "../../../../lib/opportunities";
import { OpportunityTransitionError } from "../../../../lib/opportunities/domain";
import { DesiredVehicleValidationError } from "../../../../lib/vehicles/fipe-validation";

type RouteContext = { params: Promise<{ id: string }> };

async function authenticatedUser() {
  const user = await getChatGPTUser();
  if (!user) return null;
  return { displayName: user.displayName, email: user.email };
}

export async function GET(_: Request, context: RouteContext) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "Não autorizado." }, { status: 401 });

  try {
    const { id } = await context.params;
    const opportunity = await getOpportunityWorkspace(id);
    if (!opportunity) return Response.json({ error: "Oportunidade não encontrada." }, { status: 404 });
    return Response.json(opportunity);
  } catch (error) {
    console.error("opportunity workspace read failed", error);
    return Response.json({ error: "Não foi possível carregar a oportunidade do Supabase." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const user = await authenticatedUser();
  if (!user) return Response.json({ error: "Não autorizado." }, { status: 401 });

  let command: OpportunityCommand;
  try {
    command = parseOpportunityCommand(await request.json());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Ação inválida." }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const opportunity = await applyOpportunityCommand(id, command, user);
    if (!opportunity) return Response.json({ error: "Oportunidade não encontrada." }, { status: 404 });

    revalidatePath("/crm");
    revalidatePath("/oportunidades");
    revalidatePath(`/oportunidades/${id}`);
    return Response.json(opportunity);
  } catch (error) {
    if (error instanceof DesiredVehicleValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof OpportunityTransitionError) {
      return Response.json({ error: error.message }, { status: 409 });
    }
    if (error instanceof Error && error.message === "OPPORTUNITY_NOT_FOUND") {
      return Response.json({ error: "Oportunidade não encontrada." }, { status: 404 });
    }
    console.error("opportunity workspace update failed", error);
    return Response.json({ error: "Não foi possível salvar a alteração no Supabase." }, { status: 500 });
  }
}
