const vehicleIntelligenceCodeLabels = {
  "pt-BR": {
    DCI_IDENTIFICATION_MISSING: "Dados de identificação ausentes",
    DCI_SPECIFICATIONS_MISSING: "Especificações do veículo ausentes",
    DCI_ORIGIN_MISSING: "Dados de origem ausentes",
    DCI_INSPECTION_MISSING: "Dados de avaliação técnica ausentes",
    DCI_DOCUMENTATION_MISSING: "Dados de documentação ausentes",
    DCI_FEATURES_MISSING: "Dados de opcionais ausentes",
    DCI_MEDIA_MISSING: "Dados de fotos e mídia ausentes",
    DCI_COMMERCIAL_MISSING: "Dados comerciais ausentes",
    DCI_MEDIA_UNAVAILABLE: "Fotos e mídia indisponíveis",
    DCI_RECORD_SUBSTANTIALLY_COMPLETE: "Cadastro do veículo substancialmente completo",
    DCI_EVIDENCE_INCOMPLETE: "Cadastro com evidências incompletas",
    DCQ_IDENTIFICATION_WEAK_EVIDENCE: "Evidências de identificação insuficientes",
    DCQ_SPECIFICATIONS_WEAK_EVIDENCE: "Evidências das especificações insuficientes",
    DCQ_ORIGIN_WEAK_EVIDENCE: "Evidências de origem insuficientes",
    DCQ_INSPECTION_WEAK_EVIDENCE: "Evidências da avaliação técnica insuficientes",
    DCQ_DOCUMENTATION_WEAK_EVIDENCE: "Evidências da documentação insuficientes",
    DCQ_FEATURES_WEAK_EVIDENCE: "Evidências de opcionais insuficientes",
    DCQ_MEDIA_WEAK_EVIDENCE: "Evidências de fotos e mídia insuficientes",
    DCQ_COMMERCIAL_WEAK_EVIDENCE: "Evidências comerciais insuficientes",
    DCQ_IDENTIFICATION_VERIFIED: "Identificação verificada",
    DCQ_SPECIFICATIONS_VERIFIED: "Especificações verificadas",
    DCQ_ORIGIN_VERIFIED: "Origem verificada",
    DCQ_INSPECTION_VERIFIED: "Avaliação técnica verificada",
    DCQ_DOCUMENTATION_VERIFIED: "Documentação verificada",
    DCQ_FEATURES_VERIFIED: "Opcionais verificados",
    DCQ_MEDIA_VERIFIED: "Fotos e mídia verificadas",
    DCQ_COMMERCIAL_VERIFIED: "Dados comerciais verificados",
    DCQ_INSUFFICIENT_VERIFIED_EVIDENCE: "Evidências verificadas insuficientes",
    VQI_MECHANICAL_UNAVAILABLE: "Dados mecânicos indisponíveis",
    VQI_STRUCTURAL_UNAVAILABLE: "Dados estruturais indisponíveis",
    VQI_DOCUMENTATION_HISTORY_UNAVAILABLE: "Dados de documentação e histórico indisponíveis",
    VQI_EXTERIOR_UNAVAILABLE: "Dados de conservação externa indisponíveis",
    VQI_INTERIOR_UNAVAILABLE: "Dados de conservação interna indisponíveis",
    VQI_WEAR_UNAVAILABLE: "Dados de pneus, freios e desgaste indisponíveis",
    VQI_PROVENANCE_MAINTENANCE_UNAVAILABLE: "Dados de proveniência e manutenção indisponíveis",
    VQI_DOCUMENTATION_REPORTED: "Documentação e histórico informados",
    VQI_INCOMPLETE_INSPECTION_EVIDENCE: "Evidências de inspeção incompletas",
    CVI_PRICE_VS_MARKET_UNAVAILABLE: "Dados de preço versus mercado indisponíveis",
    CVI_POTENTIAL_MARGIN_UNAVAILABLE: "Dados de margem potencial indisponíveis",
    CVI_LIQUIDITY_UNAVAILABLE: "Dados de liquidez indisponíveis",
    CVI_DEMAND_MATCH_UNAVAILABLE: "Dados de demanda/match indisponíveis",
    CVI_AGING_UNAVAILABLE: "Dados de tempo em estoque indisponíveis",
    CVI_LISTING_QUALITY_UNAVAILABLE: "Dados de qualidade do anúncio indisponíveis",
    CVI_CONFIGURATION_ATTRACTIVENESS_UNAVAILABLE: "Dados de atratividade da configuração indisponíveis",
    CVI_PARTIAL_COMMERCIAL_EVIDENCE: "Evidências comerciais parciais",
    CVI_MARKET_PRICE_AVAILABLE: "Preço de mercado disponível",
  },
} as const;

const unknownCodeLabels = {
  "pt-BR": "Informação de avaliação indisponível",
} as const;

export type VehicleIntelligenceLocale = keyof typeof vehicleIntelligenceCodeLabels;

export function formatVehicleIntelligenceCode(
  code: string,
  locale: VehicleIntelligenceLocale = "pt-BR",
): string {
  const labels: Readonly<Record<string, string>> = vehicleIntelligenceCodeLabels[locale];
  return labels[code] ?? unknownCodeLabels[locale];
}
