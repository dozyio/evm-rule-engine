// src/RuleEngine.ts
import { BuiltRule, EvaluateResult, RuleConfig, RuleDefinition, RuleResult } from "./types";

export class RuleEngine {
  private rules: BuiltRule[] = [];

  constructor(rules: BuiltRule | BuiltRule[] = []) {
    if (Array.isArray(rules)) {
      this.addRules(rules);
    } else {
      this.addRule(rules);
    }
  }

  /**
   * Add a single BuiltRule.
   */
  public addRule(rule: BuiltRule): void {
    this.validateRule(rule)
    this.rules.push(rule);
  }

  /**
    * Add multiple BuiltRules at once.
    */
  public addRules(rules: BuiltRule[]): void {
    rules.forEach(r => {
      this.validateRule(r)
    })
    this.rules.push(...rules);
  }

  /**
    * Validation rule for rule and definition
    */
  public validateRule(r: BuiltRule) {
    if (r.rule === undefined || typeof r.rule !== "function") {
      throw new Error("invalid rule - rule missing")
    }
    if (r.definition === undefined || typeof r.definition !== "object") {
      throw new Error("invalid rule - definition missing")
    }
  }

  /**
   * Evaluate all rules against the given config + address.
   * If ANY rule fails, the overall result is false.
   */
  public async evaluate(config: RuleConfig, address: string): Promise<EvaluateResult> {
    const results: RuleResult[] = [];

    let passed = true // default to true; if any rule fails, we mark false

    for (const { rule } of this.rules) {
      try {
        const result = rule(config, address);
        const resolved = result instanceof Promise ? await result : result;
        if (!resolved.passed) {
          passed = false;
        }
        results.push(resolved);
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

  /**
   * Return the definitions of all rules.
   */
  public getRuleDefinitions(): Record<string, any>[] {
    return this.rules.map((br) => {
      const { type, params } = br.definition;
      return {
        type,
        ...params
      };
    });
  }

  /**
    * Return the definitions as a JSON string.
    */
  public exportRulesAsJson(indent: number = 2): string {
    const definitions = this.getRuleDefinitions();
    return JSON.stringify(definitions, null, indent);
  }
}
