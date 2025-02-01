// src/rules.ts
import { ethers } from "ethers";
import { RuleResult, BuiltRule, Network } from "./types";
import { getProviderByChainId } from "./utils";

export interface walletBalanceAtLeastParams {
  minWei: bigint;
}

/**
 * Checks if an EOA's wallet balance is >= `minWei`.
 */
export function walletBalanceAtLeast(networks: Network[], chainId: string, params: walletBalanceAtLeastParams): BuiltRule {
  if (params.minWei === undefined || params.minWei === null) {
    throw new Error("`minWei` is required");
  }

  const rule = async (address?: string): Promise<RuleResult> => {
    const ruleName = `Wallet balance >= ${params.minWei}`;
    try {
      const provider = getProviderByChainId(networks, chainId);
      if (!provider) {
        throw new Error(`No provider found for chainId: ${chainId}`);
      }

      const balance = await provider.getBalance(address!);
      const success = balance >= params.minWei;
      return { name: ruleName, success };
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "walletBalanceAtLeast",
      params: {
        minWei: params.minWei.toString()
      },
      chainId,
    },
  };
}

export interface contractBalanceAtLeastParams {
  contractAddress: string;
  minWei: bigint;
}

/**
 * Checks if a specific contract's balance is >= `minWei`.
 */
export function contractBalanceAtLeast(networks: Network[], chainId: string, params: contractBalanceAtLeastParams): BuiltRule {
  if (params.contractAddress === undefined || params.contractAddress === null) {
    throw new Error("`contractAddress` is required");
  }

  if (params.minWei === undefined || params.minWei === null) {
    throw new Error("`minWei` is required");
  }

  const rule = async (_: string): Promise<RuleResult> => {
    const ruleName = `Contract balance >= ${params.minWei} at ${params.contractAddress}`;
    try {
      const provider = getProviderByChainId(networks, chainId);
      if (!provider) {
        throw new Error(`No provider found for chainId: ${chainId}`);
      }

      const balance = await provider.getBalance(params.contractAddress);
      const success = balance >= params.minWei;
      return { name: ruleName, success };
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "contractBalanceAtLeast",
      params: {
        contractAddress: params.contractAddress,
        minWei: params.minWei.toString()
      },
      chainId
    }
  };
}

export interface erc20BalanceAtLeastParams {
  tokenAddress: string;
  minTokens: bigint;
}

/**
 * Checks if `address` holds at least `minTokens` of ERC-20 `tokenAddress`.
 */
export function erc20BalanceAtLeast(networks: Network[], chainId: string, params: erc20BalanceAtLeastParams): BuiltRule {
  if (params.tokenAddress === undefined || params.tokenAddress === null) {
    throw new Error("`tokenAddress` is required");
  }

  if (params.minTokens === undefined || params.minTokens === null) {
    throw new Error("`minTokens` is required");
  }

  const rule = async (address: string): Promise<RuleResult> => {
    const ruleName = `ERC20 balance >= ${params.minTokens} (token: ${params.tokenAddress})`;
    try {
      const provider = getProviderByChainId(networks, chainId);
      if (!provider) {
        throw new Error(`No provider found for chainId: ${chainId}`);
      }

      // Minimal ERC-20 ABI with balanceOf
      const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
      const contract = new ethers.Contract(params.tokenAddress, erc20Abi, provider);
      const balance = await contract.balanceOf(address);

      // Compare as BigInt
      const balanceBig = BigInt(balance.toString());
      const success = balanceBig >= params.minTokens;

      return { name: ruleName, success };
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "erc20BalanceAtLeast",
      params: {
        tokenAddress: params.tokenAddress,
        minTokens: params.minTokens.toString(),
      },
      chainId,
    },
  };
}

export interface hasNFTParams {
  nftAddress: string;
}

/**
 * Checks if `address` has at least 1 token in an ERC-721 collection (`nftAddress`).
 */
export function hasNFT(networks: Network[], chainId: string, params: hasNFTParams): BuiltRule {
  if (params.nftAddress === undefined || params.nftAddress === null) {
    throw new Error("`nftAddress` is required");
  }

  const rule = async (address: string): Promise<RuleResult> => {
    const ruleName = `Address has at least 1 NFT from ${params.nftAddress}`;
    try {
      const provider = getProviderByChainId(networks, chainId);
      if (!provider) {
        throw new Error(`No provider found for chainId: ${chainId}`);
      }

      // Minimal ERC-721 ABI with balanceOf
      const erc721Abi = ["function balanceOf(address owner) view returns (uint256)"];
      const contract = new ethers.Contract(params.nftAddress, erc721Abi, provider);
      const balance = await contract.balanceOf(address);

      const balanceBig = BigInt(balance.toString());
      const success = balanceBig >= 1n;

      return { name: ruleName, success };
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "hasNFT",
      params: {
        nftAddress: params.nftAddress,
      },
      chainId,
    },
  };
}

export interface hasNFTTokenIdParams {
  nftAddress: string;
  tokenId: bigint;
}
/**
 * Checks if `address` has an ERC721 (tokenId) at `nftAddress`.
 */
export function hasNFTTokenId(networks: Network[], chainId: string, params: hasNFTTokenIdParams): BuiltRule {
  if (params.nftAddress === undefined || params.nftAddress === null) {
    throw new Error("`nftAddress` is required");
  }

  if (params.tokenId === undefined || params.tokenId === null) {
    throw new Error("`tokenId` is required");
  }

  const rule = async (address: string): Promise<RuleResult> => {
    const ruleName = `Address has NFT ${params.nftAddress} #${params.tokenId}`;
    try {
      const provider = getProviderByChainId(networks, chainId);
      if (!provider) {
        throw new Error(`No provider found for chainId: ${chainId}`);
      }

      // Minimal ERC721 ABI with just "ownerOf"
      const erc721Abi = [
        "function ownerOf(uint256 tokenId) external view returns (address)"
      ];

      const nftContract = new ethers.Contract(params.nftAddress, erc721Abi, provider);
      const actualOwner = await nftContract.ownerOf(params.tokenId);
      const success = actualOwner.toLowerCase() === address.toLowerCase();
      return { name: ruleName, success };
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "hasNFTTokenId",
      params: {
        nftAddress: params.nftAddress,
        tokenId: params.tokenId.toString()
      },
      chainId
    }
  };
}

export interface numTransactionsAtLeastParams {
  minCount: bigint;
}

/**
 * Checks if the user has sent at least `minCount` transactions (nonce >= minCount).
 */
export function numTransactionsAtLeast(networks: Network[], chainId: string, params: numTransactionsAtLeastParams): BuiltRule {
  if (params.minCount === undefined || params.minCount === null) {
    throw new Error("`minCount` is required");
  }

  const rule = async (address: string): Promise<RuleResult> => {
    const ruleName = `Number of transactions >= ${params.minCount}`;
    try {
      const provider = getProviderByChainId(networks, chainId);
      if (!provider) {
        throw new Error(`No provider found for chainId: ${chainId}`);
      }

      const txCount = await provider.getTransactionCount(address);
      const txCountBig = BigInt(txCount);
      const success = txCountBig >= params.minCount;
      return { name: ruleName, success };
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "numTransactionsAtLeast",
      params: {
        minCount: params.minCount.toString()
      },
      chainId
    }
  };
}

export interface addressIsContractParams { }

/**
 * Checks if the address is a contract.
 */
export function addressIsContract(networks: Network[], chainId: string, params: addressIsContractParams): BuiltRule {
  const rule = async (address: string): Promise<RuleResult> => {
    const ruleName = `Address is contract: ${address}`;
    try {
      const provider = getProviderByChainId(networks, chainId);
      if (!provider) {
        throw new Error(`No provider found for chainId: ${chainId}`);
      }

      const code = await provider.getCode(address);
      // If code != "0x", then it's a contract.
      const success = code !== "0x";
      return { name: ruleName, success };
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "addressIsContract",
      params,
      chainId
    }
  };
}

export interface addressIsEOAParams { }
/**
 * Checks if the address is EOA.
 */
export function addressIsEOA(networks: Network[], chainId: string, params: addressIsEOAParams): BuiltRule {
  const rule = async (address: string): Promise<RuleResult> => {
    const ruleName = `Address is EOA: ${address}`;
    try {
      const provider = getProviderByChainId(networks, chainId);
      if (!provider) {
        throw new Error(`No provider found for chainId: ${chainId}`);
      }

      const code = await provider.getCode(address);
      // If code === "0x", then it's a EOA.
      const success = code === "0x";
      return { name: ruleName, success };
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "addressIsEOA",
      params,
      chainId
    },
  };
}
