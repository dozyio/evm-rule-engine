// src/rules.ts
import { IBlockchainData, RuleResult } from "./types";

/**
 * Check if wallet balance is at least `minWei`.
 */
export function walletBalanceAtLeast(minWei: bigint) {
  return (data: IBlockchainData): RuleResult => {
    try {
      if (data.walletBalance == null) {
        return {
          name: `Wallet balance >= ${minWei} Wei`,
          passed: false,
          error: "Missing wallet balance"
        };
      }
      return {
        name: `Wallet balance >= ${minWei} Wei`,
        passed: data.walletBalance >= minWei
      };
    } catch (err: any) {
      return {
        name: `Wallet balance >= ${minWei} Wei`,
        passed: false,
        error: err.message
      };
    }
  };
}

/**
 * Check if contract balance is at least `minWei`.
 */
export function contractBalanceAtLeast(minWei: bigint) {
  return (data: IBlockchainData): RuleResult => {
    try {
      if (data.contractBalance == null) {
        return {
          name: `Contract balance >= ${minWei} Wei`,
          passed: false,
          error: "Missing contract balance"
        };
      }
      return {
        name: `Contract balance >= ${minWei} Wei`,
        passed: data.contractBalance >= minWei
      };
    } catch (err: any) {
      return {
        name: `Contract balance >= ${minWei} Wei`,
        passed: false,
        error: err.message
      };
    }
  };
}

/**
 * Check if number of transactions >= minTx.
 */
export function numTransactionsAtLeast(minTx: bigint) {
  return (data: IBlockchainData): RuleResult => {
    try {
      if (data.numTransactions == null) {
        return {
          name: `Number of transactions >= ${minTx}`,
          passed: false,
          error: "Missing number of transactions"
        };
      }
      return {
        name: `Number of transactions >= ${minTx}`,
        passed: data.numTransactions >= minTx
      };
    } catch (err: any) {
      return {
        name: `Number of transactions >= ${minTx}`,
        passed: false,
        error: err.message
      };
    }
  };
}

/**
 * Checks if user owns a particular NFT (contract + tokenId).
 */
export function ownsNFT(contractAddress: string, tokenId: bigint) {
  return (data: IBlockchainData): RuleResult => {
    try {
      const ownership = data.nftOwnership.find(
        (nft) =>
          nft.contractAddress.toLowerCase() === contractAddress.toLowerCase() &&
          nft.tokenId === tokenId
      );
      return {
        name: `User owns NFT ${contractAddress} #${tokenId}`,
        passed: !!ownership?.owned
      };
    } catch (err: any) {
      return {
        name: `User owns NFT ${contractAddress} #${tokenId}`,
        passed: false,
        error: err.message
      };
    }
  };
}

/**
 * Check if the user's first transaction is older than `days` days.
 */
export function firstTransactionOlderThan(days: number) {
  return (data: IBlockchainData): RuleResult => {
    try {
      if (!data.firstTransactionDate) {
        return {
          name: `First tx older than ${days} days`,
          passed: false,
          error: "Missing first transaction date"
        };
      }
      const now = new Date();
      const diffMs = now.getTime() - data.firstTransactionDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      return {
        name: `First tx older than ${days} days`,
        passed: diffDays >= days
      };
    } catch (err: any) {
      return {
        name: `First tx older than ${days} days`,
        passed: false,
        error: err.message
      };
    }
  };
}
