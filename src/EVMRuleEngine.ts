// src/EVMRuleEngine.ts
import { type BuiltRule, type EngineConfig, type EvaluateResult, type Networks } from './types.js'
import { builtRuleSchema, validateRules } from './validator.js'

export class EVMRuleEngine {
  private readonly rules: BuiltRule[] = []
  private readonly networks: Networks = []

  constructor (config: EngineConfig, rules: BuiltRule | BuiltRule[] = []) {
    if (config.networks === undefined || config.networks.length === 0) {
      throw new Error('No networks configured')
    }

    this.networks = config.networks

    if (Array.isArray(rules)) {
      this.addRules(rules)
    } else {
      this.addRule(rules)
    }
  }

  /**
   * Add a single BuiltRule.
   */
  public addRule (rule: BuiltRule): void {
    this.validateBuiltRule(rule)
    this.rules.push(rule)
  }

  /**
   * Add multiple BuiltRules at once.
   */
  public addRules (rules: BuiltRule[]): void {
    rules.forEach(r => {
      this.validateBuiltRule(r)
    })
    this.rules.push(...rules)
  }

  /**
   * Validation rules
   */
  public validateBuiltRule (r: BuiltRule): void {
    try {
      builtRuleSchema.parse(r)
    } catch (err: any) {
      // Aggregate the error messages from Zod and throw a single error.
      throw new Error('invalid rule - ' + err.errors.map((e: any) => e.message).join(', '))
    }

    if (!this.hasNetwork(r.definition.chainId)) {
      throw new Error(`invalid rule - network ${r.definition.chainId} not configured`)
    }
    // if (r.rule === undefined || typeof r.rule !== 'function') {
    //   throw new Error('invalid rule - rule missing')
    // }
    //
    // if (r.definition === undefined || typeof r.definition !== 'object') {
    //   throw new Error('invalid rule - definition missing')
    // }

    if (!this.hasNetwork(r.definition.chainId)) {
      throw new Error(`invalid rule - network ${r.definition.chainId} not configured`)
    }
  }

  private hasNetwork (chainId: string): boolean {
    return this.networks.some(n => n.chainId === chainId)
  }

  /**
   * Evaluate all rules against the given config + address.
   * If ANY rule fails, the overall result is false.
   */
  public async evaluate (address: string): Promise<EvaluateResult> {
    const promises = this.rules.map(async ({ rule }, index) => {
      return (async () => {
        try {
          const result = await rule(address)
          return result
        } catch (err: any) {
          return {
            name: `Rule #${index}`,
            success: false,
            error: err.message
          }
        }
      })()
    })

    const results = await Promise.all(promises)

    const success = results.every((res) => res.success)

    return {
      ruleResults: results,
      result: success
    }
  }

  /**
   * Return the definitions of all rules.
   */
  public getRuleDefinitions (): Array<Record<string, any>> {
    return this.rules.map((br) => {
      const { type, params, chainId } = br.definition
      return {
        type,
        chainId,
        params
      }
    })
  }

  /**
   * Return the definitions as a JSON string.
   */
  public exportRulesAsJsonString (): string {
    const definitions = this.getRuleDefinitions()
    return JSON.stringify(definitions)
  }

  /**
   * Validates that a JSON string is a valid rule set
   */
  public validateRulesJsonString (rules: string): boolean {
    try {
      const r = JSON.parse(rules)
      return validateRules(r)
    } catch (error) {
      return false
    }
  }
}
