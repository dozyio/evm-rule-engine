// src/EVMRuleEngine.ts
import { z } from 'zod'
import { type BuiltRule, type EngineConfig, type EvaluateResult, type Networks } from './types.js'
import { builtRuleSchema, ruleDefinitionSchema } from './validator.js'

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
   * Validation helpers
   */
  private validateNetwork (chainId: string): void {
    if (!this.hasNetwork(chainId)) {
      throw new Error(`invalid rule - network ${chainId} not configured`)
    }
  }

  public validateBuiltRule (rule: BuiltRule): void {
    const result = builtRuleSchema.safeParse(rule)
    if (!result.success) {
      const errorMsg = result.error.errors.map(e => e.message).join(', ')
      throw new Error(`invalid rule - ${errorMsg}`)
    }

    this.validateNetwork(rule.definition.chainId)
  }

  public validateRulesJsonString (rules: string): boolean {
    try {
      const parsed = JSON.parse(rules)
      return this.validateRules(parsed)
    } catch {
      return false
    }
  }

  public validateRules (rules: object): boolean {
    try {
      const rulesArray = z.array(ruleDefinitionSchema).parse(rules)

      for (const rule of rulesArray) {
        this.validateNetwork(rule.chainId)
      }
      return true
    } catch {
      return false
    }
  }
}
