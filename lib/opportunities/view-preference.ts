export type OpportunityView = "list" | "details" | "cards";

export const OPPORTUNITY_VIEW_STORAGE_KEY = "autoponte-opportunity-view";

export function resolveOpportunityView(value: string | null): OpportunityView {
  switch (value) {
    case "list":
    case "table":
      return "list";
    case "cards":
      return "cards";
    case "details":
    case "compact":
    default:
      return "details";
  }
}
