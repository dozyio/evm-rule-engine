// test/ruleEngine.test.ts

// import fs from 'fs'
// import path from 'path'
import { expect } from 'chai'
import { ethers, type JsonRpcProvider } from 'ethers'
import { EVMRuleEngine } from '../src/EVMRuleEngine.js'
import { addressIsEOA, contractBalance, createRulesFromDefinitions, numTransactions, walletBalance } from '../src/rules.js'
import { type EngineConfig, type Rule, type RuleDefinition } from '../src/types.js'
// import { rulesFromJsonFile } from '../src/utils'

/**
 * We'll assume 2 anvil instances are running
 * `anvil --port 8545 --chain-id 31337`
 * `anvil --port 8546 --chain-id 31338`
 */

const CHAIN_ID_0 = '31337'
const CHAIN_ID_0_ENDPOINT = 'http://127.0.0.1:8545'
const CHAIN_ID_1 = '31338'
const CHAIN_ID_1_ENDPOINT = 'http://127.0.0.1:8546'
const engineConfig: EngineConfig = {
  networks: [
    {
      provider: new ethers.JsonRpcProvider(CHAIN_ID_0_ENDPOINT),
      chainId: CHAIN_ID_0
    },
    {
      provider: new ethers.JsonRpcProvider(CHAIN_ID_1_ENDPOINT),
      chainId: CHAIN_ID_1
    }
  ]
}

describe('Rule Engine', function () {
  let provider: ethers.Provider // need a read/write provider
  let signer0: ethers.Signer
  let signer0Addr: string
  let contractAddress: string

  before(async function () {
    provider = engineConfig.networks[0].provider

    signer0 = await (provider as JsonRpcProvider).getSigner(0) // account #0
    signer0Addr = await signer0.getAddress()

    // Deploy minimal contract with `receive()`
    // see Minimal.sol
    // run `forge build && forge inspect Minimal bytecode`
    const MinimalContractBytecode =
      '0x6080604052348015600e575f5ffd5b50604480601a5f395ff3fe608060405236600a57005b5f5ffdfea264697066735822122049f1c634d3cea02d00596dd9b62bcbecb4f505abbd0cde4d94fe400d47116b5864736f6c634300081c0033'
    // Deploy via signer0
    const factory = new ethers.ContractFactory([], MinimalContractBytecode, signer0)
    const contract = await factory.deploy()
    await contract.waitForDeployment()

    contractAddress = await contract.getAddress()
    // Fund the contract
    await signer0.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther('1')
    })
  })

  describe('Evaluate', function () {
    it('should throw if no networks are configured', async function () {
      const config: EngineConfig = {
        networks: []
      }
      expect(() => new EVMRuleEngine(config)).to.throw('No networks configured')
    })

    it('should succeed when evaluating multiple rules with successful rules', async function () {
      const engine = new EVMRuleEngine(engineConfig)

      engine.addRules([
        addressIsEOA(engineConfig.networks, CHAIN_ID_0, {}),
        walletBalance(engineConfig.networks, CHAIN_ID_0, {
          value: ethers.parseEther('1'),
          compareType: 'gte'
        }),
        contractBalance(engineConfig.networks, CHAIN_ID_0, {
          contractAddress,
          value: ethers.parseEther('1'),
          compareType: 'gte'
        }),
        numTransactions(engineConfig.networks, CHAIN_ID_0, {
          value: BigInt(1),
          compareType: 'gte'
        })
      ])

      const { result, ruleResults } = await engine.evaluate(signer0Addr)

      expect(ruleResults).to.have.lengthOf(4)
      expect(result).to.eq(true)
    })

    it('should fail when evaluating multiple rules with failing rule', async function () {
      const engine = new EVMRuleEngine(engineConfig)

      engine.addRules([
        walletBalance(engineConfig.networks, CHAIN_ID_0, {
          value: ethers.parseEther('1'),
          compareType: 'gte'
        }),
        contractBalance(engineConfig.networks, CHAIN_ID_0, {
          contractAddress,
          value: ethers.parseEther('2'),
          compareType: 'gte'
        })
      ])

      const { result, ruleResults } = await engine.evaluate(signer0Addr)

      expect(ruleResults).to.have.lengthOf(2)
      expect(result).to.eq(false)
      const failingRule = ruleResults.find(r => !r.success)
      expect(failingRule?.name).to.match(/Contract balance/)
    })

    it('should mark the rule as failed if it throws an error', async function () {
      function forcedErrorRule (): Rule {
        return async () => {
          throw new Error('Forced test error')
        }
      }

      const engine = new EVMRuleEngine(engineConfig)
      engine.addRules([
        {
          rule: forcedErrorRule(),
          definition: {
            type: 'custom',
            params: {},
            chainId: CHAIN_ID_0
          }
        }
      ])

      const evaluation = await engine.evaluate(signer0Addr)
      expect(evaluation.result).to.eq(false, 'Overall result should be false if any rule throws')
      expect(evaluation.ruleResults[0].error).to.eq('Forced test error')
      expect(evaluation.ruleResults[0].success).to.eq(false)
    })

    it('should add a rule to the Rule Engine', async function () {
      const engine = new EVMRuleEngine(engineConfig)
      const rule = walletBalance(engineConfig.networks, CHAIN_ID_0, {
        value: ethers.parseEther('1'),
        compareType: 'gte'
      })
      engine.addRule(rule)
      expect(engine.getRuleDefinitions()).to.have.lengthOf(1)
    })

    it('should add multiple single rules to the Rule Engine', async function () {
      const engine = new EVMRuleEngine(engineConfig)
      const rule1 = walletBalance(engineConfig.networks, CHAIN_ID_0, {
        value: ethers.parseEther('1'),
        compareType: 'gte'
      })
      engine.addRule(rule1)
      const rule2 = walletBalance(engineConfig.networks, CHAIN_ID_0, {
        value: ethers.parseEther('1'),
        compareType: 'gte'
      })
      engine.addRule(rule2)
      expect(engine.getRuleDefinitions()).to.have.lengthOf(2)
    })

    it('should succeed when evaluating multiple rules from multiple chains', async function () {
      const engine = new EVMRuleEngine(engineConfig)

      engine.addRules([
        addressIsEOA(engineConfig.networks, CHAIN_ID_0, {}),
        addressIsEOA(engineConfig.networks, CHAIN_ID_1, {})
      ])

      const { result, ruleResults } = await engine.evaluate(signer0Addr)

      expect(ruleResults).to.have.lengthOf(2)
      expect(result).to.eq(true)
    })
  })

  describe('Load and Export', function () {
    it('should load rules into Rule Engine from json object', async function () {
      const mockJson: RuleDefinition[] = [
        { type: 'walletBalance', chainId: CHAIN_ID_0, params: { value: '1000', compareType: 'gte' } },
        { type: 'numTransactions', chainId: CHAIN_ID_1, params: { value: '5', compareType: 'gte' } }
      ]

      const engine = new EVMRuleEngine(engineConfig)
      engine.addRules(createRulesFromDefinitions(engineConfig.networks, mockJson))

      const rulesFromEngine = engine.getRuleDefinitions()
      expect(rulesFromEngine).to.be.an('array')
      expect(rulesFromEngine).to.have.lengthOf(2)
      expect(rulesFromEngine[0].type).to.eq('walletBalance')
      expect(rulesFromEngine[1].type).to.eq('numTransactions')
    })

    it('should load rules into Rule Engine from json object and export object', async function () {
      const mockJson: RuleDefinition[] = [
        { type: 'walletBalance', chainId: CHAIN_ID_0, params: { value: '1000', compareType: 'gte' } },
        { type: 'numTransactions', chainId: CHAIN_ID_1, params: { value: '5', compareType: 'gte' } }
      ]

      const engine = new EVMRuleEngine(engineConfig)
      engine.addRules(createRulesFromDefinitions(engineConfig.networks, mockJson))
      const exportedJson = engine.exportRulesAsJson()

      // console.log(exportedJson)
      expect(JSON.parse(exportedJson)).to.deep.equal(mockJson)
    })

    // it('should throw if loaded rules are invalid', async function () {
    //   const tempJsonPath = path.join(__dirname, 'tempRules.json')
    //   const mockJson = JSON.stringify([
    //     { type: 'walletBalance', chainId: CHAIN_ID_0, params: {} } // missing value/compareType
    //   ])
    //
    //   // Write a temporary JSON file for testing
    //   fs.writeFileSync(tempJsonPath, mockJson, 'utf8')
    //
    //   expect(() => rulesFromJsonFile(engineConfig.networks, tempJsonPath)).to.throw('`value` is required')
    //
    //   // Clean up
    //   fs.unlinkSync(tempJsonPath)
    // })
  })
})
