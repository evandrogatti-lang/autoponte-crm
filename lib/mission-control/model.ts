import type {
  BusinessTemperature,
  ConfidenceAssessment,
  FlowEngineView,
  Momentum,
  OpportunityDNA,
  OpportunityStage,
  Recommendation,
} from "../ade";

export type TradeInRow = {
  id: string;
  name: string;
  city: string;
  brand: string;
  model: string;
  year: string;
  desiredVehicle: string;
  estimatedMin: number;
  estimatedMax: number;
  referencePrice?: number;
  mileage?: number;
  condition?: string;
  status: string;
  leadCategory: string;
  nextFollowUp: string;
  lastContactAt?: string;
  notes?: string;
  createdAt: Date;
};

export type MissionOpportunity = {
  id: string;
  name: string;
  city: string;
  interest: string;
  offered: string;
  value: number;
  priority: "Alta" | "Média" | "Normal";
  next: string;
  stage: OpportunityStage;
  source: string;
  probability: number;
  marginPotential: number;
  risk: "baixo" | "médio" | "alto";
  priorityScore: number;
  temperature: BusinessTemperature;
  momentum: Momentum;
  dna: OpportunityDNA;
  confidence: ConfidenceAssessment;
  recommendation: Recommendation;
  explanations: string[];
  warnings: string[];
  ageDays: number;
};

export type MissionRecommendation = {
  opportunityId: string;
  name: string;
  text: string;
  action: string;
  priorityScore: number;
};

export type MissionControlViewModel = {
  greeting: string;
  immediateActions: number;
  highPriority: number;
  operationScore: number;
  activeCount: number;
  proposalCount: number;
  activeValue: number;
  capitalNeeded: number;
  projectedMargin: number;
  conversion: number;
  averageTicket: number;
  businessTemperature: BusinessTemperature;
  flow: FlowEngineView;
  recommendations: MissionRecommendation[];
  opportunities: MissionOpportunity[];
};
