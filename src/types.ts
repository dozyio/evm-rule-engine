// src/types.ts

export interface RuleConfig {
  rpcUrl: string;      // e.g. "http://127.0.0.1:8545"
  network?: string;    // optional label or chain ID
}

export interface RuleDefinition {
  type: string;
  params: Record<string, any>;
}

export interface BuiltRule {
  rule: Rule;
  definition: RuleDefinition;
}

/**
 * The result of a single rule check.
 */
export interface RuleResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface EvaluateResult {
  ruleResults: RuleResult[]
  result: boolean
}

/**
 * A rule can be either sync or async
 */
export type Rule = (config: RuleConfig, address?: string) => Promise<RuleResult> | RuleResult;
