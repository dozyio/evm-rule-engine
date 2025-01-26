// test/ruleEngine.test.ts

import { expect } from "chai";
import { ethers } from "ethers";
import { addressIsContract, addressIsEOA, contractBalanceAtLeast, numTransactionsAtLeast, ownsNFT, walletBalanceAtLeast } from "../src/rules";
import { Rule, RuleConfig } from "../src/types";
import { RuleEngine } from "../src/RuleEngine";
import path from "path";
import fs from "fs";
import { createRulesFromJson, readRulesFile } from "../src/loadRules";

/**
 * We'll assume anvil is running at http://127.0.0.1:8545 with some funded accounts.
 * `anvil --port 8545`
 */
const RPC_URL = "http://127.0.0.1:8545";

describe("Rule Engine", function() {
  let provider: ethers.JsonRpcProvider;
  let signer0: ethers.Signer;
  let signer1: ethers.Signer;
  let signer2: ethers.Signer;
  let signer0Addr: string;
  let signer1Addr: string;
  let signer2Addr: string;
  let contractAddress: string;

  // We'll define a default RuleConfig used by each test
  const defaultConfig: RuleConfig = {
    rpcUrl: RPC_URL,
    network: "anvil",
  };

  before(async function() {
    provider = new ethers.JsonRpcProvider(RPC_URL);

    signer0 = await provider.getSigner(0); // account #0
    signer1 = await provider.getSigner(1); // account #1
    signer2 = await provider.getSigner(2); // account #1

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
      const engine = new RuleEngine();

      engine.addRules([
        addressIsEOA(),
        walletBalanceAtLeast(ethers.parseEther("1")),
        contractBalanceAtLeast(contractAddress, ethers.parseEther("1")),
        numTransactionsAtLeast(BigInt(1)),
      ]);

      const { result, ruleResults } = await engine.evaluate(defaultConfig, signer0Addr);

      // for (const r of ruleResults) {
      //   console.log(`Rule "${r.name}": passed=${r.passed}, error=${r.error}`);
      // }

      expect(ruleResults).to.have.lengthOf(4);

      expect(result).to.eq(true)
    });

    it("should fail when evaluating multiple rules with failing rule", async function() {
      const engine = new RuleEngine();

      engine.addRules([
        walletBalanceAtLeast(ethers.parseEther("1")),
        contractBalanceAtLeast(contractAddress, ethers.parseEther("2")),
      ]);

      const { result, ruleResults } = await engine.evaluate(defaultConfig, signer0Addr);

      // for (const r of ruleResults) {
      //   console.log(`Rule "${r.name}": passed=${r.passed}, error=${r.error}`);
      // }

      expect(ruleResults).to.have.lengthOf(2);

      expect(result).to.eq(false)
      const failingRule = ruleResults.find(r => !r.passed);
      expect(failingRule).to.exist;
      expect(failingRule?.name).to.match(/Contract balance >=/);
    });


    it("should mark the rule as failed if it throws an error", async function() {
      function forcedErrorRule(): Rule {
        return async () => {
          throw new Error("Forced test error");
        };
      }

      const engine = new RuleEngine();
      engine.addRules([
        {
          rule: forcedErrorRule(),
          definition: {
            type: 'custom',
            params: {}
          }
        }
      ]);

      const evaluation = await engine.evaluate(defaultConfig, signer0Addr);
      expect(evaluation.result).to.eq(false, "Overall result should be false if any rule throws");
      expect(evaluation.ruleResults[0].error).to.eq("Forced test error");
      expect(evaluation.ruleResults[0].passed).to.eq(false);
    });
  });

  describe("Load and Export", function() {
    it("should load rules into Rule Engine from json object", async function() {
      const mockJson = [
        { type: "walletBalanceAtLeast", minWei: "1000" },
        { type: "numTransactionsAtLeast", minCount: "5" }
      ];

      const engine = new RuleEngine();
      engine.addRules(createRulesFromJson(mockJson))

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

      const engine = new RuleEngine();
      engine.addRules(createRulesFromJson(mockJson))

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
      engine = new RuleEngine();
      engine.addRules(loaded) // only load the definitions, not the rules, should throw
      } catch (e) {
        thrown = true
      }

      expect(thrown).to.be.true
    });
  });
});
