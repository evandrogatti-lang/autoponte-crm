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
  status: string;
  leadCategory: string;
  nextFollowUp: string;
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
  stage: "new" | "contacted" | "qualified" | "store" | "proposal" | "closed";
  source: string;
  probability: number;
  marginPotential: number;
  risk: "baixo" | "médio" | "alto";
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
  opportunities: MissionOpportunity[];
};
