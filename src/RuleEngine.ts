// src/RuleEngine.ts
import { IBlockchainData, Rule, RuleResult } from "./types";

export class RuleEngine {
  private rules: Rule[] = [];

  public addRule(rule: Rule) {
    this.rules.push(rule);
  }

  public addRules(rules: Rule[]) {
    this.rules.push(...rules);
  }

  /**
   * Evaluate all rules, returning an array of RuleResult.
   * If a rule throws, catch it and record an error.
   */
  public async evaluate(data: IBlockchainData): Promise<RuleResult[]> {
    const results: RuleResult[] = [];

    for (const rule of this.rules) {
      try {
        const result = rule(data);
        if (result instanceof Promise) {
          // If rule is async, await it
          results.push(await result);
        } else {
          results.push(result);
        }
      } catch (err: any) {
        results.push({
          name: "Unnamed Rule",
          passed: false,
          error: err.message
        });
      }
    }

    return results;
  }
}
