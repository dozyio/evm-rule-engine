import fs from "fs";
import path from "path";
import { ruleFactories } from "./ruleFactories";
import { BuiltRule, Network } from "./types";

/**
 * Reads and parses the rule definitions from a JSON file.
 * Returns the raw JSON array, without converting to `BuiltRules`
 */
export function readRulesFile(jsonFilePath: string): any[] {
  const absolutePath = path.resolve(jsonFilePath);
  const fileData = fs.readFileSync(absolutePath, "utf8");

  const rawDefinitions = JSON.parse(fileData);
  if (!Array.isArray(rawDefinitions)) {
    throw new Error("Invalid JSON: top-level is not an array.");
  }

  return rawDefinitions;
}

/**
 * Given an array of raw JSON definitions, create `BuiltRule` instances
 * by mapping each definition's `type` to the appropriate factory function.
 */
export function createRulesFromJson(networks: Network[], chainId: string, definitions: any[]): BuiltRule[] {
  const createdRules: BuiltRule[] = definitions.map((def) => {
    const { type, ...params } = def;

    // Find a rule factory function by the "type" key
    const factory = ruleFactories[type];
    if (!factory) {
      throw new Error(`Unknown rule type: "${type}"`);
    }

    // For each known type, call the factory with the needed params
    switch (type) {
      case "walletBalanceAtLeast":
        return factory(networks, chainId, params.minWei);

      case "contractBalanceAtLeast":
        return factory(networks, chainId, params.contractAddress, params.minWei);

      case "numTransactionsAtLeast":
        return factory(networks, chainId, params.minCount);

      case "ownsNFT":
        return factory(networks, chainId, params.nftAddress, params.tokenId);

      case "addressIsContract":
      case "addressIsEOA":
        return factory(networks, chainId);

      default:
        throw new Error(`No constructor logic for rule type: "${type}"`);
    }
  });

  return createdRules;
}

/**
 * Helper function that combines `loadRulesFile()` and `createRulesFromJson()`.
 */
export function loadRulesFromJsonFile(networks: Network[], chainId: string, jsonFilePath: string): BuiltRule[] {
  const rawDefinitions = readRulesFile(jsonFilePath);
  return createRulesFromJson(networks, chainId, rawDefinitions);
}
