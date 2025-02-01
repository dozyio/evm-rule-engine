import { expect } from "chai";
import fs from "fs";
import path from "path";
import {
  readRulesFile,
  createRulesFromDefinitions,
  rulesFromJsonFile
} from "../src/loadRules";
import { BuiltRule, Network, RuleDefinition } from "../src/types";
import { ethers } from "ethers";

describe("Load Rules", function() {
  let networks: Network[] = [];
  const CHAIN_ID_0 = "31337"
  const CHAIN_ID_0_ENDPOINT = 'http://127.0.0.1.8545'
  networks.push({ chainId: CHAIN_ID_0, provider: new ethers.JsonRpcProvider(CHAIN_ID_0_ENDPOINT) });

  describe("loadRulesFile()", function() {
    it("should load and parse a valid JSON file returning an array", function() {
      // Suppose we have a small fixture file or we can write one on the fly
      const tempJsonPath = path.join(__dirname, "tempRules.json");
      const mockJson = JSON.stringify([
        { type: "walletBalanceAtLeast", params: { minWei: "1000" } },
        { type: "numTransactionsAtLeast", params: { minCount: "5" } }
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
    });

    it("should throw an error if the top-level is not an array", function() {
      const tempJsonPath = path.join(__dirname, "tempBadRules.json");
      const mockJson = JSON.stringify({ type: "walletBalanceAtLeast" });
      fs.writeFileSync(tempJsonPath, mockJson, "utf8");

      expect(() => readRulesFile(tempJsonPath)).to.throw("top-level is not an array");

      fs.unlinkSync(tempJsonPath);
    });
  });

  describe("createRulesFromJson()", function() {
    it("should create valid rules from well-formed definitions", function() {
      const min = "1000"
      const address = "0x123"
      const tokenId = "123"

      const definitions: RuleDefinition[] = [
        { type: "walletBalanceAtLeast", chainId: CHAIN_ID_0, params: { minWei: min } },
        { type: "contractBalanceAtLeast", chainId: CHAIN_ID_0, params: { minWei: min, contractAddress: address } },
        { type: "erc20BalanceAtLeast", chainId: CHAIN_ID_0, params: { tokenAddress: address, minTokens: min } },
        { type: "hasNFT", chainId: CHAIN_ID_0, params: { nftAddress: address } },
        { type: "hasNFTTokenId", chainId: CHAIN_ID_0, params: { nftAddress: address, tokenId: tokenId } },
        { type: "numTransactionsAtLeast", chainId: CHAIN_ID_0, params: { minCount: min } },
        { type: "addressIsContract", chainId: CHAIN_ID_0, params: {} },
        { type: "addressIsEOA", chainId: CHAIN_ID_0, params: {} }
      ];

      const rules: BuiltRule[] = createRulesFromDefinitions(networks, definitions);
      expect(rules).to.have.lengthOf(8);

      expect(typeof rules[0].rule).to.eq("function");
      expect(typeof rules[0].definition).to.eq("object");
      expect(rules[0].definition.chainId).to.eq(CHAIN_ID_0);
      expect(rules[0].definition.type).to.eq("walletBalanceAtLeast");
      expect(rules[0].definition.params.minWei).to.eq(min);

      expect(typeof rules[1].rule).to.eq("function");
      expect(typeof rules[1].definition).to.eq("object");
      expect(rules[1].definition.chainId).to.eq(CHAIN_ID_0);
      expect(rules[1].definition.type).to.eq("contractBalanceAtLeast");
      expect(rules[1].definition.params.minWei).to.eq(min);
      expect(rules[1].definition.params.contractAddress).to.eq(address);

      expect(typeof rules[2].rule).to.eq("function");
      expect(typeof rules[2].definition).to.eq("object");
      expect(rules[2].definition.chainId).to.eq(CHAIN_ID_0);
      expect(rules[2].definition.type).to.eq("erc20BalanceAtLeast");
      expect(rules[2].definition.params.minTokens).to.eq(min);
      expect(rules[2].definition.params.tokenAddress).to.eq(address);

      expect(typeof rules[3].rule).to.eq("function");
      expect(typeof rules[3].definition).to.eq("object");
      expect(rules[3].definition.chainId).to.eq(CHAIN_ID_0);
      expect(rules[3].definition.type).to.eq("hasNFT");
      expect(rules[3].definition.params.nftAddress).to.eq(address);

      expect(typeof rules[4].rule).to.eq("function");
      expect(typeof rules[4].definition).to.eq("object");
      expect(rules[4].definition.chainId).to.eq(CHAIN_ID_0);
      expect(rules[4].definition.type).to.eq("hasNFTTokenId");
      expect(rules[4].definition.params.nftAddress).to.eq(address);
      expect(rules[4].definition.params.tokenId).to.eq(tokenId);

      expect(typeof rules[5].rule).to.eq("function");
      expect(typeof rules[5].definition).to.eq("object");
      expect(rules[5].definition.chainId).to.eq(CHAIN_ID_0);
      expect(rules[5].definition.type).to.eq("numTransactionsAtLeast");
      expect(rules[5].definition.params.minCount).to.eq(min);

      expect(typeof rules[6].rule).to.eq("function");
      expect(typeof rules[6].definition).to.eq("object");
      expect(rules[6].definition.chainId).to.eq(CHAIN_ID_0);
      expect(rules[6].definition.type).to.eq("addressIsContract");

      expect(typeof rules[7].rule).to.eq("function");
      expect(typeof rules[7].definition).to.eq("object");
      expect(rules[7].definition.chainId).to.eq(CHAIN_ID_0);
      expect(rules[7].definition.type).to.eq("addressIsEOA");
    });

    it("should throw an error for unknown rule types", function() {
      const definitions: RuleDefinition[] = [
        { type: "nonExistentRule", chainId: CHAIN_ID_0, params: { someParam: "123" } }
      ];
      expect(() => createRulesFromDefinitions(networks, definitions)).to.throw(/Unknown rule type/);
    });
  });

  describe("rulesFromJsonFile()", function() {
    it("should load and parse a valid JSON file returning an array", function() {
      // Suppose we have a small fixture file or we can write one on the fly
      const tempJsonPath = path.join(__dirname, "tempRules.json");
      const mockJson = JSON.stringify([
        { type: "walletBalanceAtLeast", chainId: CHAIN_ID_0, params: { minWei: "1000" } },
        { type: "numTransactionsAtLeast", chainId: CHAIN_ID_0, params: { minCount: "5" } }
      ]);

      // Write a temporary JSON file for testing
      fs.writeFileSync(tempJsonPath, mockJson, "utf8");

      const loaded = rulesFromJsonFile(networks, tempJsonPath);
      expect(loaded).to.be.an("array");
      expect(loaded).to.have.lengthOf(2);
      expect(loaded[0].definition.type).to.eq("walletBalanceAtLeast");
      expect(loaded[1].definition.type).to.eq("numTransactionsAtLeast");

      // Clean up
      fs.unlinkSync(tempJsonPath);
    });
  });
});
