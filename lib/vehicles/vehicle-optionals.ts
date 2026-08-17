export const VEHICLE_OPTIONAL_GROUPS = [
  {
    name: "Conforto",
    items: [
      "Ar-condicionado digital",
      "Ar-condicionado dual zone",
      "Banco do motorista elétrico",
      "Banco do passageiro elétrico",
      "Bancos em couro",
      "Aquecimento dos bancos dianteiros",
      "Ventilação dos bancos dianteiros",
      "Teto solar elétrico",
      "Teto panorâmico",
      "Chave presencial",
      "Partida por botão",
      "Piloto automático",
      "Piloto automático adaptativo",
      "Sensor de chuva",
      "Sensor crepuscular",
    ],
  },
  {
    name: "Segurança",
    items: [
      "Airbags frontais",
      "Airbags laterais",
      "Airbags de cortina",
      "Freios ABS",
      "Controle de estabilidade",
      "Controle de tração",
      "Assistente de partida em rampa",
      "Monitoramento de pressão dos pneus",
      "ISOFIX",
      "Alarme antifurto",
      'Travas elétricas',
      "Câmera de ré",
      "Sensores de estacionamento traseiros",
      "Sensores de estacionamento dianteiros",
      "Frenagem autônoma de emergência",
    ],
  },
  {
    name: "Tecnologia",
    items: [
      "Painel digital",
      "Computador de bordo",
      "Carregador por indução",
      "Tomada 12V traseira",
      "Tomada USB traseira",
      "Start-stop",
      "Acesso remoto por app",
      "Wi-Fi embarcado",
    ],
  },
  {
    name: "Multimídia",
    items: [
      "Central multimídia",
      "Apple CarPlay",
      "Android Auto",
      "Bluetooth",
      "Comando de voz",
      "Navegação GPS integrada",
      "Som premium",
    ],
  },
  {
    name: "Assistência ao motorista",
    items: [
      "Assistente de permanência em faixa",
      "Alerta de ponto cego",
      "Alerta de colisão frontal",
      "Alerta de tráfego cruzado traseiro",
      "Reconhecimento de placas",
      "Farol alto automático",
      "Câmera 360°",
      "Assistente de estacionamento",
    ],
  },
  {
    name: "Interior",
    items: [
      "Volante multifuncional",
      "Volante com ajuste de altura",
      "Volante com ajuste de profundidade",
      "Volante com revestimento em couro",
      "Retrovisor interno eletrocrômico",
      "Ar-condicionado traseiro",
      "Luz ambiente interna",
      "Apoio de braço traseiro",
    ],
  },
  {
    name: "Exterior",
    items: [
      "Faróis de LED",
      "DRL em LED",
      "Lanternas em LED",
      "Rodas de liga leve",
      "Rack de teto",
      "Engate reboque",
      "Película solar",
      "Retrovisores elétricos",
      "Rebatimento elétrico dos retrovisores",
    ],
  },
  {
    name: "Performance",
    items: [
      "Câmbio automático",
      "Câmbio CVT",
      "Paddle shift",
      "Modo Sport",
      "Tração integral",
      "Suspensão adaptativa",
      "Escapamento esportivo",
    ],
  },
] as const;

const OPTIONALS_DATA_VERSION = 1 as const;

type OptionalItemsPayload = {
  version: typeof OPTIONALS_DATA_VERSION;
  items: string[];
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function uniqueItems(items: string[]) {
  const seen = new Set<string>();
  const rows: string[] = [];
  for (const item of items) {
    const clean = item.trim();
    if (!clean) continue;
    const key = normalizeText(clean);
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(clean.slice(0, 120));
  }
  return rows;
}

export function vehicleOptionalCatalog() {
  return VEHICLE_OPTIONAL_GROUPS.flatMap((group) => group.items);
}

export function parseVehicleOptionalItems(raw: string) {
  const value = raw.trim();
  if (!value) return [];
  if (value.startsWith("{") || value.startsWith("[")) {
    try {
      const parsed = JSON.parse(value) as Partial<OptionalItemsPayload> | string[];
      if (Array.isArray(parsed)) {
        return uniqueItems(parsed.filter((item): item is string => typeof item === "string"));
      }
      if (parsed && typeof parsed === "object" && Array.isArray(parsed.items)) {
        return uniqueItems(parsed.items.filter((item): item is string => typeof item === "string"));
      }
    } catch {
      // Legacy plain text follows below.
    }
  }
  const tokens = value
    .split(/[\n;,]/g)
    .map((item) => item.trim())
    .filter(Boolean);
  return uniqueItems(tokens.length ? tokens : [value]);
}

export function serializeVehicleOptionalItems(items: string[]) {
  const rows = uniqueItems(items);
  if (!rows.length) return "";
  const payload: OptionalItemsPayload = { version: OPTIONALS_DATA_VERSION, items: rows };
  return JSON.stringify(payload);
}

