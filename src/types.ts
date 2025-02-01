// src/types.ts

import { Provider } from "ethers";

// A rule can be either sync or async
export type Rule = (address?: string) => Promise<RuleResult> | RuleResult;

export interface RuleDefinition {
  type: string;
  chainId: string;
  params: Record<string, any>;
}

export interface BuiltRule {
  rule: Rule;
  definition: RuleDefinition;
}

// The result of a single rule check.
export interface RuleResult {
  name: string;
  success: boolean;
  error?: string;
}

// The result of multiple rules
export interface EvaluateResult {
  ruleResults: RuleResult[]
  result: boolean
}

export interface Network {
  provider: Provider;
  chainId: string;
}

export interface EngineConfig {
  networks: Network[]
}
