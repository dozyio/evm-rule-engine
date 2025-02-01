// src/ruleFactories.ts

import {
  walletBalanceAtLeast,
  contractBalanceAtLeast,
  erc20BalanceAtLeast,
  numTransactionsAtLeast,
  hasNFT,
  hasNFTTokenId,
  addressIsContract,
  addressIsEOA,
  walletBalanceAtLeastParams,
  contractBalanceAtLeastParams,
  erc20BalanceAtLeastParams,
  numTransactionsAtLeastParams,
  hasNFTParams,
  hasNFTTokenIdParams,
  addressIsContractParams,
  addressIsEOAParams
} from "./rules";
import { BuiltRule, Network } from "./types";

export const ruleFactories: Record<string, (...args: any[]) => BuiltRule> = {
  walletBalanceAtLeast: (networks: Network[], chainId: string, params: walletBalanceAtLeastParams) =>
    walletBalanceAtLeast(networks, chainId, params),

  contractBalanceAtLeast: (networks: Network[], chainId: string, params: contractBalanceAtLeastParams) =>
    contractBalanceAtLeast(networks, chainId, params),

  erc20BalanceAtLeast: (networks: Network[], chainId: string, params: erc20BalanceAtLeastParams) =>
    erc20BalanceAtLeast(networks, chainId, params),

  numTransactionsAtLeast: (networks: Network[], chainId: string, params: numTransactionsAtLeastParams) =>
    numTransactionsAtLeast(networks, chainId, params),

  hasNFT: (networks: Network[], chainId: string, params: hasNFTParams) =>
    hasNFT(networks, chainId, params),

  hasNFTTokenId: (networks: Network[], chainId: string, params: hasNFTTokenIdParams) =>
    hasNFTTokenId(networks, chainId, params),

  addressIsContract: (networks: Network[], chainId: string, params: addressIsContractParams) => addressIsContract(networks, chainId, params),

  addressIsEOA: (networks: Network[], chainId: string, params: addressIsEOAParams) => addressIsEOA(networks, chainId, params)
};
