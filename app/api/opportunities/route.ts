import { revalidatePath } from "next/cache";
import { authorizeApi } from "../_access";
import { createManualOpportunity, parseManualOpportunityInput } from "../../../lib/opportunities/create";
import type { ManualOpportunityInput } from "../../../lib/opportunities/create";
import { DesiredVehicleValidationError } from "../../../lib/vehicles/fipe-validation";
import { TradeInFipeValidationError } from "../../../lib/vehicles/trade-in-fipe-validation";

export async function POST(request: Request) {
  const user = await authorizeApi(["opportunities.manage"]);
  if (user instanceof Response) return user;

  let input: ManualOpportunityInput;
  try {
    input = parseManualOpportunityInput(await request.json());
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Dados inválidos." }, { status: 400 });
  }

  try {
    const result = await createManualOpportunity(input, { displayName: user.displayName, email: user.email });
    revalidatePath("/crm");
    revalidatePath("/clientes");
    revalidatePath("/oportunidades");
    return Response.json({ id: result.id, href: `/oportunidades/${result.id}` }, { status: 201 });
  } catch (error) {
    if (error instanceof DesiredVehicleValidationError || error instanceof TradeInFipeValidationError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error("manual opportunity creation failed", error);
    return Response.json({ error: "Não foi possível salvar a oportunidade no Supabase." }, { status: 500 });
  }
}
