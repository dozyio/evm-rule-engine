// src/RuleEngine.ts
import { EvaluateResult, IBlockchainData, Rule, RuleResult } from "./types";

export class RuleEngine {
  private rules: Rule[] = [];

  public addRule(rule: Rule) {
    this.rules.push(rule);
  }

  public addRules(rules: Rule[]) {
    this.rules.push(...rules);
  }

  public async evaluate(data: IBlockchainData): Promise<EvaluateResult> {
    const results: RuleResult[] = [];

    let passed = true

    for (const rule of this.rules) {
      try {
        const result = rule(data);
        if (result instanceof Promise) {
          // If rule is async, await it
          const r = await result
          if (r.passed === false) {
            passed = false
          }
          results.push(r);
        } else {
          if (result.passed === false) {
            passed = false
          }

          results.push(result);
        }
      } catch (err: any) {
        passed = false
        results.push({
          name: "Unnamed Rule",
          passed: false,
          error: err.message
        });
      }
    }

    return {
      ruleResults: results,
      result: passed
    }
  }
}
