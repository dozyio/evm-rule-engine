// src/ruleFactories.ts

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
import { BuiltRule, Network } from "./types";

export const ruleFactories: Record<string, (...args: any[]) => BuiltRule> = {
  walletBalanceAtLeast: (networks: Network[], chainId: string, minWei: string) =>
    walletBalanceAtLeast(networks , chainId, BigInt(minWei)),

  contractBalanceAtLeast: (networks: Network[], chainId: string, contractAddress: string, minWei: string) =>
    contractBalanceAtLeast(networks, chainId, contractAddress, BigInt(minWei)),

  erc20BalanceAtLeast: (networks: Network[], chainId: string, contractAddress: string, minTokens: string) =>
    erc20BalanceAtLeast(networks, chainId, contractAddress, BigInt(minTokens)),

  numTransactionsAtLeast: (networks: Network[], chainId: string, minCount: string) =>
    numTransactionsAtLeast(networks, chainId, BigInt(minCount)),

  ownsNFT: (networks: Network[], chainId: string, nftAddress: string) =>
    ownsNFT(networks, chainId, nftAddress),

  ownsNFTTokenId: (networks: Network[], chainId: string, nftAddress: string, tokenId: string) =>
    ownsNFTTokenId(networks, chainId, nftAddress, BigInt(tokenId)),

  addressIsContract: (networks: Network[], chainId: string) => addressIsContract(networks, chainId),

  addressIsEOA: (networks: Network[], chainId: string) => addressIsEOA(networks, chainId)
};
