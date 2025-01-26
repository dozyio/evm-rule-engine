// src/RuleEngine.ts
import { EvaluateResult, Rule, RuleConfig, RuleResult } from "./types";

export class RuleEngine {
  private rules: Rule[] = [];

  public addRule(rule: Rule) {
    this.rules.push(rule);
  }

  public addRules(rules: Rule[]) {
    this.rules.push(...rules);
  }

  public async evaluate(config: RuleConfig, address: string): Promise<EvaluateResult> {
    const results: RuleResult[] = [];

    // default to passed = true, if any rule fails mark as failed
    let passed = true

    for (const rule of this.rules) {
      try {
        const result = rule(config, address);
        if (result instanceof Promise) {
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
