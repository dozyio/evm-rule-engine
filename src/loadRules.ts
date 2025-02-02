import fs from "fs";
import path from "path";
import { ruleFactories } from "./ruleFactories";
import { BuiltRule, Network, RuleDefinition } from "./types";
import { getProviderByChainId } from "./utils";

/**
 * Reads the rule definitions from a JSON file.
 * Returns the raw JSON array, without converting to `BuiltRules`
 */
export function readRulesFile(jsonFilePath: string): RuleDefinition[] {
  const absolutePath = path.resolve(jsonFilePath);
  const fileData = fs.readFileSync(absolutePath, "utf8");

  const rawDefinitions = JSON.parse(fileData) as RuleDefinition[];
  if (!Array.isArray(rawDefinitions)) {
    throw new Error("Invalid JSON: top-level is not an array.");
  }

  return rawDefinitions;
}

/**
 * Given an array of raw JSON definitions, create `BuiltRule` instances
 * by mapping each definition's `type` to the appropriate factory function.
 */
export function createRulesFromDefinitions(networks: Network[], definitions: RuleDefinition[]): BuiltRule[] {
  const createdRules: BuiltRule[] = definitions.map((def) => {
    const { type, chainId, params } = def;

    if (type === undefined) {
      throw new Error("Missing rule type");
    }

    if (chainId === undefined) {
      throw new Error("Missing chainId");
    }

    if (getProviderByChainId(networks, chainId) === undefined) {
      throw new Error(`Chain ID ${chainId} not found in networks`);
    }

    // Find a rule factory function by the "type" key
    const factory = ruleFactories[type];
    if (!factory) {
      throw new Error(`Unknown rule type: "${type}"`);
    }

    // For each known type, call the factory with the needed params
    switch (type) {
      case "walletBalanceAtLeast":
        return factory(networks, chainId, params);

      case "contractBalanceAtLeast":
        return factory(networks, chainId, params);

      case "erc20BalanceAtLeast":
        return factory(networks, chainId, params);

      case "hasNFT":
        return factory(networks, chainId, params);

      case "hasNFTTokenId":
        return factory(networks, chainId, params);

      case "numTransactionsAtLeast":
        return factory(networks, chainId, params);

      case "addressIsContract":
      case "addressIsEOA":
        return factory(networks, chainId, params);

      default:
        throw new Error(`No constructor logic for rule type: "${type}"`);
    }
  });

  return createdRules;
}

/**
 * Helper function that combines `readRulesFile()` and `createRulesFromJson()`.
 */
export function rulesFromJsonFile(networks: Network[], jsonFilePath: string): BuiltRule[] {
  const rawDefinitions = readRulesFile(jsonFilePath);
  return createRulesFromDefinitions(networks, rawDefinitions);
}
