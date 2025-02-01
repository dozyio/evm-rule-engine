import { expect } from "chai";
import fs from "fs";
import path from "path";
import {
  readRulesFile,
  createRulesFromJson
} from "../src/loadRules";
import { BuiltRule, Network } from "../src/types";
import { ethers } from "ethers";

describe("Load Rules", function() {
  describe("loadRulesFile()", function() {
    it("should load and parse a valid JSON file returning an array", function() {
      // Suppose we have a small fixture file or we can write one on the fly
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
    let networks: Network[] = [];
    const CHAIN_ID_0 = "31337"
    const CHAIN_ID_0_ENDPOINT = 'http://127.0.0.1.8545'
    networks.push({ chainId: CHAIN_ID_0, provider: new ethers.JsonRpcProvider(CHAIN_ID_0_ENDPOINT) });
    let provider: ethers.Provider;

    it("should create valid rules from well-formed definitions", function() {
      const definitions = [
        { type: "walletBalanceAtLeast", minWei: "1000" },
        { type: "numTransactionsAtLeast", minCount: "5" },
        { type: "addressIsContract" }
      ];

      const rules: BuiltRule[] = createRulesFromJson(networks, CHAIN_ID_0, definitions);
      expect(rules).to.have.lengthOf(3);

      // Each entry in `rules` is a function. We can do a basic check:
      expect(typeof rules[0].rule).to.eq("function");
      expect(typeof rules[0].definition).to.eq("object");
      // expect(rules[0].definition).to.deep.eq({ type: "walletBalanceAtLeast", minWei: "1000" });
      expect(typeof rules[1].rule).to.eq("function");
      expect(typeof rules[1].definition).to.eq("object");
      expect(typeof rules[2].rule).to.eq("function");
      expect(typeof rules[2].definition).to.eq("object");
    });

    it("should throw an error for unknown rule types", function() {
      const definitions = [
        { type: "nonExistentRule", someParam: "123" }
      ];
      expect(() => createRulesFromJson(networks, CHAIN_ID_0, definitions)).to.throw(/Unknown rule type/);
    });

    it("should throw if required parameters are missing", function() {
      // For instance, "walletBalanceAtLeast" expects a `minWei` string
      const definitions = [
        { type: "walletBalanceAtLeast" }
      ];
      // This will likely cause a runtime error in the switch-case if
      // `params.minWei` is undefined. You can catch that or let it throw.
      expect(() => createRulesFromJson(networks, CHAIN_ID_0, definitions)).to.throw();
    });
  });
});
