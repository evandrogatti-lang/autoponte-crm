import type { OpportunityAssessment, OpportunityStage } from "../ade";
import type { DesiredVehicleProfileInput } from "../vehicles/desired-profile";

export const opportunityStatuses = [
  "pre_evaluated",
  "new",
  "contacted",
  "qualified",
  "sent_to_store",
  "proposal",
  "closed",
  "lost",
] as const;

export type OpportunityStatus = (typeof opportunityStatuses)[number];

export type OpportunityEventView = {
  id: string;
  eventType: string;
  title: string;
  description: string;
  actorName: string;
  actorEmail: string;
  createdAt: string;
};

export type OpportunityWorkspaceData = {
  id: string;
  status: OpportunityStatus;
  stage: OpportunityStage;
  stageLabel: string;
  statusLabel: string;
  leadCategory: string;
  client: {
    name: string;
    whatsapp: string;
    email: string;
    city: string;
  };
  desiredVehicle: string;
  desiredVehicleProfile: DesiredVehicleProfileInput & { searchScope: "brand" | "model" | "version" | "legacy" };
  tradeIn: {
    brand: string;
    model: string;
    version: string;
    year: string;
    mileage: number;
    condition: string;
    referencePrice: number;
    fipeCode: string;
    fipeMonth: string;
    estimatedMin: number;
    estimatedMax: number;
    estimatedMidpoint: number;
    photoKeys: string[];
  };
  commercial: {
    marginPotential: number;
    nextAction: string;
    nextFollowUp: string;
    lastContactAt: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
  };
  assessment: OpportunityAssessment;
  events: OpportunityEventView[];
};

export type OpportunityCommand =
  | { action: "stage"; status: OpportunityStatus }
  | { action: "edit_client"; name: string; whatsapp: string; email: string; city: string }
  | { action: "edit_demand"; desiredVehicle: DesiredVehicleProfileInput }
  | { action: "contact"; channel: string; summary: string }
  | { action: "note"; note: string }
  | { action: "next_action"; label: string; dueAt: string };
