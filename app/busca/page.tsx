    import { desc } from "drizzle-orm";
import { requireSellerOperations } from "../app-auth";
import { getDb } from "../../db";
import { buyerProfiles, tradeIns } from "../../db/schema";
import { partners } from "../../db/partner-schema";
import { vehicles } from "../../db/vehicle-schema";
import { InventoryShell } from "../../features/vehicle-registry/components/InventoryShell";

export const dynamic = "force-dynamic";

export default async function GlobalSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireSellerOperations("/busca");

  const { q = "" } = await searchParams;
  const query = q.trim().toLocaleLowerCase("pt-BR");

  const [tradeRows, profileRows, vehicleRows, partnerRows] =
    await Promise.all([
      getDb()
        .select()
        .from(tradeIns)
        .orderBy(desc(tradeIns.updatedAt))
        .limit(500),

      getDb()
        .select()
        .from(buyerProfiles)
        .orderBy(desc(buyerProfiles.createdAt))
        .limit(500),

      getDb()
        .select()
        .from(vehicles)
        .orderBy(desc(vehicles.updatedAt))
        .limit(1000),

      getDb()
        .select({
          id: partners.id,
          name: partners.name,
        })
        .from(partners),
    ]);

  const partnerMap = new Map(
    partnerRows.map((partner) => [partner.id, partner.name])
  );

  const clientResults = [
    ...tradeRows.map((row) => ({
      id: row.id,
      name: row.name,
      whatsapp: row.whatsapp,
      email: row.email,
      city: row.city,
      source: "trade" as const,
    })),
    ...profileRows.map((row) => ({
      id: row.id,
      name: row.name,
      whatsapp: row.whatsapp,
      email: row.email,
      city: row.city,
      source: "profile" as const,
    })),
  ].filter((row) => {
    if (!query) return false;

    const haystack = [
      row.name,
      row.whatsapp,
      row.email,
      row.city,
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return haystack.includes(query);
  });

  const vehicleResults = vehicleRows.filter((vehicle) => {
    if (!query) return false;

    const haystack = [
      vehicle.brand,
      vehicle.model,
      vehicle.plate,
      vehicle.stockCode,
      vehicle.ownerName,
      partnerMap.get(vehicle.partnerId),
    ]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("pt-BR");

    return haystack.includes(query);
  });

 return (
  <InventoryShell
    breadcrumb={
      <>
        Central de Operações
        <span>›</span>
        Busca global
      </>
    }
  >
    <main style={{ padding: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Busca global</h1>

          <p style={{ marginTop: "6px", opacity: 0.7 }}>
            Pesquise clientes, veículos, placas e códigos de estoque.
          </p>
        </div>

        <a
          href="/crm"
          style={{
            textDecoration: "none",
            padding: "10px 14px",
            border: "1px solid #d1d5db",
            borderRadius: "8px",
            color: "inherit",
          }}
        >
          ← Voltar ao CRM
        </a>
      </div>

      {query && (
        <p style={{ marginBottom: "24px" }}>
          Resultados para <strong>“{q}”</strong>
        </p>
      )}

      {!query ? (
        <div
          style={{
            padding: "24px",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
          }}
        >
          Digite um termo na busca global para começar.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "20px",
          }}
        >
          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              Clientes ({clientResults.length})
            </h2>

            {clientResults.length === 0 ? (
              <p style={{ opacity: 0.65 }}>
                Nenhum cliente encontrado.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {clientResults.map((client) => (
                  <a
                    key={`${client.source}-${client.id}`}
                    href={`/clientes?q=${encodeURIComponent(client.name)}`}
                    style={{
                      display: "block",
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <strong>{client.name}</strong>

                    <div
                      style={{
                        fontSize: "13px",
                        marginTop: "4px",
                        opacity: 0.7,
                      }}
                    >
                      {client.city || "Cidade não informada"}
                      {" · "}
                      {client.whatsapp ||
                        client.email ||
                        "Sem contato informado"}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>

          <section
            style={{
              border: "1px solid #e5e7eb",
              borderRadius: "12px",
              padding: "18px",
            }}
          >
            <h2 style={{ marginTop: 0 }}>
              Veículos ({vehicleResults.length})
            </h2>

            {vehicleResults.length === 0 ? (
              <p style={{ opacity: 0.65 }}>
                Nenhum veículo encontrado.
              </p>
            ) : (
              <div style={{ display: "grid", gap: "10px" }}>
                {vehicleResults.map((vehicle) => (
                  <a
                    key={vehicle.id}
                    href={`/veiculos/${vehicle.id}`}
                    style={{
                      display: "block",
                      padding: "12px",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                      textDecoration: "none",
                      color: "inherit",
                    }}
                  >
                    <strong>
                      {vehicle.brand} {vehicle.model}
                    </strong>

                    <div
                      style={{
                        fontSize: "13px",
                        marginTop: "4px",
                        opacity: 0.7,
                      }}
                    >
                      {vehicle.plate ||
                        vehicle.stockCode ||
                        "Sem placa ou código"}
                    </div>
                  </a>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  </InventoryShell>
);
}
