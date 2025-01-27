// test/ruleEngine.test.ts

import { expect } from "chai";
import { ethers, JsonRpcProvider } from "ethers";
import { addressIsContract, addressIsEOA, contractBalanceAtLeast, numTransactionsAtLeast, ownsNFT, walletBalanceAtLeast } from "../src/rules";
import { EngineConfig, Rule } from "../src/types";
import { RuleEngine } from "../src/RuleEngine";
import path from "path";
import fs from "fs";
import { createRulesFromJson, readRulesFile } from "../src/loadRules";

/**
 * We'll assume 2 anvil instances are running
 * `anvil --port 8545 --chain-id 31337`
 * `anvil --port 8546 --chain-id 31338`
 */

const CHAIN_ID_0 = "31337"
const CHAIN_ID_1 = "31338"
const engineConfig: EngineConfig = {
  networks: [
    {
      provider: new ethers.JsonRpcProvider("http://127.0.0.1:8545"),
      chainId: CHAIN_ID_0
    },
    {
      provider: new ethers.JsonRpcProvider("http://127.0.0.1:8546"),
      chainId: CHAIN_ID_1
    }
  ]
};

describe("Rule Engine", function() {
  let provider: ethers.Provider; // need a read/write provider
  let signer0: ethers.Signer;
  let signer1: ethers.Signer;
  let signer2: ethers.Signer;
  let signer0Addr: string;
  let signer1Addr: string;
  let signer2Addr: string;
  let contractAddress: string;

  before(async function() {
    provider = engineConfig.networks[0].provider

    signer0 = await (provider as JsonRpcProvider).getSigner(0); // account #0
    signer1 = await (provider as JsonRpcProvider).getSigner(1); // account #1
    signer2 = await (provider as JsonRpcProvider).getSigner(2); // account #1

    signer0Addr = await signer0.getAddress();
    signer1Addr = await signer1.getAddress();
    signer2Addr = await signer2.getAddress();

    // Deploy minimal contract with `receive()`
    // see Minimal.sol
    // run `forge build && forge inspect Minimal bytecode`
    const MinimalContractBytecode = "0x6080604052348015600e575f5ffd5b50604480601a5f395ff3fe608060405236600a57005b5f5ffdfea264697066735822122049f1c634d3cea02d00596dd9b62bcbecb4f505abbd0cde4d94fe400d47116b5864736f6c634300081c0033"
    // Deploy via signer0
    const factory = new ethers.ContractFactory([], MinimalContractBytecode, signer0);
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    contractAddress = await contract.getAddress();
    // Fund the contract
    await signer0.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1"),
    });
  });

  describe("Evaluate", function() {
    it("should pass when evaluating multiple rules with successful rules", async function() {
      const engine = new RuleEngine(engineConfig);

      engine.addRules([
        addressIsEOA(provider, CHAIN_ID_0),
        walletBalanceAtLeast(provider, CHAIN_ID_0, ethers.parseEther("1")),
        contractBalanceAtLeast(provider, CHAIN_ID_0, contractAddress, ethers.parseEther("1")),
        numTransactionsAtLeast(provider, CHAIN_ID_0, BigInt(1)),
      ]);

      const { result, ruleResults } = await engine.evaluate(signer0Addr);

      // for (const r of ruleResults) {
      //   console.log(`Rule "${r.name}": success=${r.success}, error=${r.error}`);
      // }

      expect(ruleResults).to.have.lengthOf(4);

      expect(result).to.eq(true)
    });

    it("should fail when evaluating multiple rules with failing rule", async function() {
      const engine = new RuleEngine(engineConfig);

      engine.addRules([
        walletBalanceAtLeast(provider, CHAIN_ID_0, ethers.parseEther("1")),
        contractBalanceAtLeast(provider, CHAIN_ID_0, contractAddress, ethers.parseEther("2")),
      ]);

      const { result, ruleResults } = await engine.evaluate(signer0Addr);

      // for (const r of ruleResults) {
      //   console.log(`Rule "${r.name}": success=${r.success}, error=${r.error}`);
      // }

      expect(ruleResults).to.have.lengthOf(2);

      expect(result).to.eq(false)
      const failingRule = ruleResults.find(r => !r.success);
      expect(failingRule).to.exist;
      expect(failingRule?.name).to.match(/Contract balance >=/);
    });


    it("should mark the rule as failed if it throws an error", async function() {
      function forcedErrorRule(): Rule {
        return async () => {
          throw new Error("Forced test error");
        };
      }

      const engine = new RuleEngine(engineConfig);
      engine.addRules([
        {
          rule: forcedErrorRule(),
          definition: {
            type: 'custom',
            params: {},
            chainId: CHAIN_ID_0
          }
        }
      ]);

      const evaluation = await engine.evaluate(signer0Addr);
      expect(evaluation.result).to.eq(false, "Overall result should be false if any rule throws");
      expect(evaluation.ruleResults[0].error).to.eq("Forced test error");
      expect(evaluation.ruleResults[0].success).to.eq(false);
    });
  });

  describe("Load and Export", function() {
    it("should load rules into Rule Engine from json object", async function() {
      const mockJson = [
        { type: "walletBalanceAtLeast", minWei: "1000" },
        { type: "numTransactionsAtLeast", minCount: "5" }
      ];

      const engine = new RuleEngine(engineConfig);
      engine.addRules(createRulesFromJson(provider, CHAIN_ID_0, mockJson))

      const rulesFromEngine = engine.getRuleDefinitions()
      expect(rulesFromEngine).to.be.an("array")
      expect(rulesFromEngine).to.have.lengthOf(2);
      expect(rulesFromEngine[0].type).to.eq("walletBalanceAtLeast");
      expect(rulesFromEngine[1].type).to.eq("numTransactionsAtLeast");
    });

    it("should load rules into Rule Engine from json object and export object", async function() {
      const mockJson = [
        { type: "walletBalanceAtLeast", minWei: "1000" },
        { type: "numTransactionsAtLeast", minCount: "5" }
      ];

      const engine = new RuleEngine(engineConfig);
      engine.addRules(createRulesFromJson(provider, CHAIN_ID_0, mockJson))

      const exportedJson = engine.exportRulesAsJson()
      expect(JSON.parse(exportedJson)).to.deep.equal(mockJson);
    });

    it("should throw if loaded rules are invalid", async function() {
      const tempJsonPath = path.join(__dirname, "tempRules.json");
      const mockJson = JSON.stringify([
        { type: "walletBalanceAtLeast", minWei: "1000" },
        { type: "numTransactionsAtLeast", minCount: "5" }
      ]);

      // Write a temporary JSON file for testing
      fs.writeFileSync(tempJsonPath, mockJson, "utf8");

      const loaded = readRulesFile(tempJsonPath);
      expect(loaded).to.be.an("array");
      expect(loaded).to.have.lengthOf(2);
      expect(loaded[0].type).to.eq("walletBalanceAtLeast");
      expect(loaded[1].type).to.eq("numTransactionsAtLeast");

      // Clean up
      fs.unlinkSync(tempJsonPath);

      let engine: RuleEngine | undefined = undefined
      let thrown = false

      try {
      engine = new RuleEngine(engineConfig);
      engine.addRules(loaded) // only load the definitions, not the rules, should throw
      } catch (e) {
        thrown = true
      }

      expect(thrown).to.be.true
    });
  });
});
