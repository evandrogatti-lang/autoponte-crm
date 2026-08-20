import { listPublicMarketplaceVehicles } from "../../../../lib/marketplace/public-vehicles";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requestedLimit = Number(url.searchParams.get("limit") || 24);
    const limit = Number.isFinite(requestedLimit) ? requestedLimit : 24;
    const items = await listPublicMarketplaceVehicles(limit);

    return Response.json({
      items,
      count: items.length,
      maxMatches: 70,
    });
  } catch (error) {
    console.error("public marketplace vehicles failed", error);
    return Response.json(
      { error: "Não foi possível carregar os veículos agora." },
      { status: 500 },
    );
  }
}
