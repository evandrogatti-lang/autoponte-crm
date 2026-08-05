export type AIWorkload = "rule" | "cached" | "background" | "premium";

export type AIRequest<TInput> = {
  feature: string;
  tenantId: string;
  input: TInput;
  cacheKey?: string;
  estimatedValueCents?: number;
  maxCostCents?: number;
};

export type AIResult<TOutput> = {
  output: TOutput;
  source: "rule" | "cache" | "model";
  workload: AIWorkload;
  estimatedCostCents: number;
  cacheHit: boolean;
};

export interface AIAdapter<TInput, TOutput> {
  run(input: TInput): Promise<{ output: TOutput; estimatedCostCents: number }>;
}

export interface AICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

export interface AIBudgetStore {
  remainingCents(tenantId: string): Promise<number>;
  record(tenantId: string, feature: string, costCents: number): Promise<void>;
}

export type RuleResolver<TInput, TOutput> = (input: TInput) => Promise<TOutput | null> | TOutput | null;

export class AIOrchestrator {
  constructor(private readonly cache: AICache, private readonly budgets: AIBudgetStore) {}

  async execute<TInput, TOutput>(
    request: AIRequest<TInput>,
    options: {
      rule?: RuleResolver<TInput, TOutput>;
      adapter: AIAdapter<TInput, TOutput>;
      ttlSeconds?: number;
      workload?: AIWorkload;
    },
  ): Promise<AIResult<TOutput>> {
    const ruleOutput = await options.rule?.(request.input);
    if (ruleOutput !== null && ruleOutput !== undefined) {
      return { output: ruleOutput, source: "rule", workload: "rule", estimatedCostCents: 0, cacheHit: false };
    }

    if (request.cacheKey) {
      const cached = await this.cache.get<TOutput>(request.cacheKey);
      if (cached !== null) {
        return { output: cached, source: "cache", workload: "cached", estimatedCostCents: 0, cacheHit: true };
      }
    }

    const remaining = await this.budgets.remainingCents(request.tenantId);
    const hardLimit = Math.min(request.maxCostCents ?? remaining, remaining);
    if (hardLimit <= 0) throw new Error("AI_BUDGET_EXHAUSTED");

    const modelResult = await options.adapter.run(request.input);
    if (modelResult.estimatedCostCents > hardLimit) throw new Error("AI_REQUEST_OVER_BUDGET");

    await this.budgets.record(request.tenantId, request.feature, modelResult.estimatedCostCents);
    if (request.cacheKey) await this.cache.set(request.cacheKey, modelResult.output, options.ttlSeconds ?? 86400);

    return {
      output: modelResult.output,
      source: "model",
      workload: options.workload ?? "premium",
      estimatedCostCents: modelResult.estimatedCostCents,
      cacheHit: false,
    };
  }
}
