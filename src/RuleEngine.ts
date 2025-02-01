// src/RuleEngine.ts
import { BuiltRule, EngineConfig, EvaluateResult, Network, RuleResult } from "./types";

export class RuleEngine {
  private rules: BuiltRule[] = [];
  private networks: Network[] = [];

  constructor(config: EngineConfig, rules: BuiltRule | BuiltRule[] = []) {
    if (config.networks === undefined || config.networks.length === 0) {
      throw new Error("No networks configured")
    }

    this.networks = config.networks

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
    * Validation rules
    */
  public validateRule(r: BuiltRule) {
    if (r.rule === undefined || typeof r.rule !== "function") {
      throw new Error("invalid rule - rule missing")
    }

    if (r.definition === undefined || typeof r.definition !== "object") {
      throw new Error("invalid rule - definition missing")
    }

    if (!this.hasNetwork(r.definition.chainId)) {
      throw new Error(`invalid rule - network ${r.definition.chainId} not configured`)
    }
  }

  private hasNetwork(chainId: string): boolean {
    return this.networks.some(n => n.chainId === chainId);
  }

  /**
   * Evaluate all rules against the given config + address.
   * If ANY rule fails, the overall result is false.
   */
  public async evaluate(address: string): Promise<EvaluateResult> {
    // const results: RuleResult[] = [];
    //
    // let success = true // default to true; if any rule fails, we mark false
    //
    // for (const { rule } of this.rules) {
    //   try {
    //     const result = rule(address);
    //     const resolved = result instanceof Promise ? await result : result;
    //     if (!resolved.success) {
    //       success = false;
    //     }
    //     results.push(resolved);
    //   } catch (err: any) {
    //     success = false
    //     results.push({
    //       name: "Unnamed Rule",
    //       success: false,
    //       error: err.message
    //     });
    //   }
    // }
    //
    // return {
    //   ruleResults: results,
    //   result: success
    // }
    // Build an array of Promises for each rule execution
    const promises = this.rules.map(({ rule }, index) => {
      return (async () => {
        try {
          const result = await rule(address);
          return result;
        } catch (err: any) {
          return {
            name: `Rule #${index}`,
            success: false,
            error: err.message
          };
        }
      })();
    });

    // Execute all rule checks concurrently
    const results = await Promise.all(promises);

    // Calculate the overall success
    const success = results.every((res) => res.success);

    return {
      ruleResults: results,
      result: success
    };
  }

  /**
   * Return the definitions of all rules.
   */
  public getRuleDefinitions(): Record<string, any>[] {
    return this.rules.map((br) => {
      const { type, params, chainId } = br.definition;
      return {
        type,
        chainId,
        params
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
