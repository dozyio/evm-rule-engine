// src/ruleFactories.ts

import {
  walletBalanceAtLeast,
  contractBalanceAtLeast,
  numTransactionsAtLeast,
  ownsNFT,
  addressIsContract,
  addressIsEOA
} from "./rules";
import { BuiltRule } from "./types";

export const ruleFactories: Record<string, (...args: any[]) => BuiltRule> = {
  walletBalanceAtLeast: (minWei: string) =>
    walletBalanceAtLeast(BigInt(minWei)),

  contractBalanceAtLeast: (contractAddress: string, minWei: string) =>
    contractBalanceAtLeast(contractAddress, BigInt(minWei)),

  numTransactionsAtLeast: (minCount: string) =>
    numTransactionsAtLeast(BigInt(minCount)),

  ownsNFT: (nftAddress: string, tokenId: string) =>
    ownsNFT(nftAddress, BigInt(tokenId)),

  addressIsContract: () => addressIsContract(),

  addressIsEOA: () => addressIsEOA()
};

