// src/ruleFactories.ts

import { Provider } from "ethers";
import {
  walletBalanceAtLeast,
  contractBalanceAtLeast,
  numTransactionsAtLeast,
  ownsNFT,
  addressIsContract,
  addressIsEOA,
  ownsNFTTokenId,
  erc20BalanceAtLeast
} from "./rules";
import { BuiltRule } from "./types";

export const ruleFactories: Record<string, (...args: any[]) => BuiltRule> = {
  walletBalanceAtLeast: (provider: Provider, chainId: string, minWei: string) =>
    walletBalanceAtLeast(provider, chainId, BigInt(minWei)),

  contractBalanceAtLeast: (provider: Provider, chainId: string, contractAddress: string, minWei: string) =>
    contractBalanceAtLeast(provider, chainId, contractAddress, BigInt(minWei)),

  erc20BalanceAtLeast: (provider: Provider, chainId: string, contractAddress: string, minTokens: string) =>
    erc20BalanceAtLeast(provider, chainId, contractAddress, BigInt(minTokens)),

  numTransactionsAtLeast: (provider: Provider, chainId: string, minCount: string) =>
    numTransactionsAtLeast(provider, chainId, BigInt(minCount)),

  ownsNFT: (provider: Provider, chainId: string, nftAddress: string) =>
    ownsNFT(provider, chainId, nftAddress),

  ownsNFTTokenId: (provider: Provider, chainId: string, nftAddress: string, tokenId: string) =>
    ownsNFTTokenId(provider, chainId, nftAddress, BigInt(tokenId)),

  addressIsContract: (provider: Provider, chainId: string) => addressIsContract(provider, chainId),

  addressIsEOA: (provider: Provider, chainId: string) => addressIsEOA(provider, chainId)
};

