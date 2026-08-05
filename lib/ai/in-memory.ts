import type { AIBudgetStore, AICache } from "./orchestrator";

export class MemoryAICache implements AICache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();
  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item || item.expiresAt < Date.now()) return null;
    return item.value as T;
  }
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

export class MemoryAIBudgetStore implements AIBudgetStore {
  private spent = new Map<string, number>();
  constructor(private readonly monthlyBudgetCents = 30000) {}
  async remainingCents(tenantId: string): Promise<number> {
    return Math.max(0, this.monthlyBudgetCents - (this.spent.get(tenantId) ?? 0));
  }
  async record(tenantId: string, _feature: string, costCents: number): Promise<void> {
    this.spent.set(tenantId, (this.spent.get(tenantId) ?? 0) + costCents);
  }
}
