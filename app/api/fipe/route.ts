import { getFipeBrands, getFipeModels, getFipeQuote, getFipeYears } from "../../../lib/fipe";

export async function GET(request: Request) {
  try {
    const params = new URL(request.url).searchParams;
    const resource = params.get("resource");
    const brand = params.get("brand") ?? "";
    const model = params.get("model") ?? "";
    const year = params.get("year") ?? "";

    const data = resource === "brands"
      ? await getFipeBrands()
      : resource === "models"
        ? await getFipeModels(brand)
        : resource === "years"
          ? await getFipeYears(brand, model)
          : resource === "quote"
            ? await getFipeQuote(brand, model, year)
            : null;

    if (!data) return Response.json({ error: "Consulta FIPE inválida." }, { status: 400 });
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=3600" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível consultar a FIPE.";
    return Response.json({ error: message }, { status: message.includes("inválido") ? 400 : 503 });
  }
}
