export type OpportunityStage = "new" | "contacted" | "qualified" | "store" | "proposal" | "closed";
export type TemperatureLevel = "cold" | "warm" | "hot" | "critical";
export type Momentum = "accelerating" | "stable" | "decelerating";
export type RecommendationUrgency = "now" | "today" | "soon" | "routine";

export type OpportunitySignals = {
  id: string;
  stage: OpportunityStage;
  leadCategory?: string;
  estimatedMin: number;
  estimatedMax: number;
  referencePrice?: number;
  createdAt: Date | string;
  nextFollowUp?: string;
  lastContactAt?: string;
  desiredVehicle?: string;
  condition?: string;
  mileage?: number;
  notes?: string;
};

export type OpportunityDNA = {
  chance: number;
  margin: number;
  urgency: number;
  engagement: number;
  competition: number;
  timing: number;
  priorityScore: number;
};

export type ConfidenceAssessment = {
  score: number;
  level: "low" | "medium" | "high";
  completeness: number;
  agreement: number;
  missingSignals: string[];
};

export type BusinessTemperature = {
  score: number;
  level: TemperatureLevel;
  label: string;
};

export type Explainability = {
  reasons: string[];
  warnings: string[];
};

export type Recommendation = {
  action: string;
  channel: "WhatsApp" | "Telefone" | "CRM" | "Proposta";
  urgency: RecommendationUrgency;
  rationale: string;
};

export type OpportunityAssessment = {
  dna: OpportunityDNA;
  confidence: ConfidenceAssessment;
  temperature: BusinessTemperature;
  momentum: Momentum;
  explainability: Explainability;
  recommendation: Recommendation;
  ageDays: number;
};

export type FlowOpportunityInput = {
  id: string;
  stage: OpportunityStage;
  value: number;
  probability: number;
  priorityScore: number;
  ageDays: number;
  temperature: BusinessTemperature;
  momentum: Momentum;
};

export type FlowStage = {
  key: OpportunityStage;
  label: string;
  count: number;
  value: number;
  averageProbability: number;
  averagePriority: number;
  accelerating: number;
  decelerating: number;
  temperature: BusinessTemperature;
};

export type FlowEngineView = {
  health: {
    score: number;
    label: "Crítico" | "Atenção" | "Saudável" | "Excelente";
    summary: string;
  };
  bottleneck: {
    stage: OpportunityStage | null;
    label: string;
    reason: string;
  };
  stages: FlowStage[];
  activeValue: number;
  weightedProbability: number;
};
