// src/types.ts

/**
 * Represents the on-chain data we gather for a user or contract
 * before running rules.
 */
export interface IBlockchainData {
  walletBalance: bigint;      // in Wei
  contractBalance: bigint;    // in Wei
  numTransactions: bigint;    // total transactions by the user
  nftOwnership: {
    contractAddress: string;
    tokenId: bigint;
    owned: boolean;
  }[];
  firstTransactionDate?: Date;
}

/**
 * The result of a single rule check.
 */
export interface RuleResult {
  name: string;
  passed: boolean;
  error?: string;
}

/**
 * A rule is either synchronous or async. It accepts IBlockchainData
 * and returns (or resolves) a RuleResult.
 */
export type Rule = (data: IBlockchainData) => Promise<RuleResult> | RuleResult;
