// src/rules.ts
import { ethers, Provider } from "ethers";
import { RuleResult, BuiltRule } from "./types";

/**
 * Checks if an EOA's wallet balance is >= `minWei`.
 */
export function walletBalanceAtLeast(provider: Provider, chainId: string, minWei: bigint): BuiltRule {
  const rule = async (address?: string): Promise<RuleResult> => {
    const ruleName = `Wallet balance >= ${minWei}`;
    try {
      const balance = await provider.getBalance(address!);
      const success = balance >= minWei;
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
        minWei: minWei.toString()
      },
      chainId,
    },
  };
}

/**
 * Checks if a specific contract's balance is >= `minWei`.
 */
export function contractBalanceAtLeast(provider: Provider, chainId: string, contractAddress: string, minWei: bigint): BuiltRule {
  const rule = async (_: string): Promise<RuleResult> => {
    const ruleName = `Contract balance >= ${minWei} at ${contractAddress}`;
    try {
      const balance = await provider.getBalance(contractAddress);
      const success = balance >= minWei;
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
        contractAddress,
        minWei: minWei.toString()
      },
      chainId
    }
  };
}

/**
 * Checks if `address` holds at least `minTokens` of ERC-20 `tokenAddress`.
 */
export function erc20BalanceAtLeast(
  provider: Provider,
  chainId: string,
  tokenAddress: string,
  minTokens: bigint
): BuiltRule {
  const rule = async (address: string): Promise<RuleResult> => {
    const ruleName = `ERC20 balance >= ${minTokens} (token: ${tokenAddress})`;
    try {
      // Minimal ERC-20 ABI with balanceOf
      const erc20Abi = ["function balanceOf(address) view returns (uint256)"];
      const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
      const balance = await contract.balanceOf(address);

      // Compare as BigInt
      const balanceBig = BigInt(balance.toString());
      const success = balanceBig >= minTokens;

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
        tokenAddress,
        minTokens: minTokens.toString(),
      },
      chainId,
    },
  };
}

/**
 * Checks if `address` has at least 1 token in an ERC-721 collection (`nftAddress`).
 */
export function ownsNFT(
  provider: Provider,
  chainId: string,
  nftAddress: string
): BuiltRule {
  const rule = async (address: string): Promise<RuleResult> => {
    const ruleName = `User owns at least 1 NFT from ${nftAddress}`;
    try {
      // Minimal ERC-721 ABI with balanceOf
      const erc721Abi = ["function balanceOf(address owner) view returns (uint256)"];
      const contract = new ethers.Contract(nftAddress, erc721Abi, provider);
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
      type: "ownsAnyNFT",
      params: {
        nftAddress,
      },
      chainId,
    },
  };
}

/**
 * Checks if the user has sent at least `minCount` transactions (nonce >= minCount).
 */
export function numTransactionsAtLeast(provider: Provider, chainId: string, minCount: bigint): BuiltRule {
  const rule = async (address: string): Promise<RuleResult> => {
    const ruleName = `Number of transactions >= ${minCount}`;
    try {
      const txCount = await provider.getTransactionCount(address);
      const txCountBig = BigInt(txCount);
      const success = txCountBig >= minCount;
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
        minCount: minCount.toString()
      },
      chainId
    }
  };
}

/**
 * Checks if `address` owns an ERC721 (tokenId) at `nftAddress`.
 */
export function ownsNFTTokenId(provider: Provider, chainId: string, nftAddress: string, tokenId: bigint): BuiltRule {
  const rule = async (address: string): Promise<RuleResult> => {
    const ruleName = `User owns NFT ${nftAddress} #${tokenId}`;
    try {
      // Minimal ERC721 ABI with just "ownerOf"
      const erc721Abi = [
        "function ownerOf(uint256 tokenId) external view returns (address)"
      ];

      const nftContract = new ethers.Contract(nftAddress, erc721Abi, provider);
      const actualOwner = await nftContract.ownerOf(tokenId);
      const success = actualOwner.toLowerCase() === address.toLowerCase();
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
        nftAddress,
        tokenId: tokenId.toString()
      },
      chainId
    }
  };
}

/**
 * Checks if the address is a contract.
 */
export function addressIsContract(provider: Provider, chainId: string): BuiltRule {
  const rule = async (address: string): Promise<RuleResult> => {
    const ruleName = `Address is contract: ${address}`;
    try {
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
      params: {},
      chainId
    }
  };
}

/**
 * Checks if the address is EOA.
 */
export function addressIsEOA(provider: Provider, chainId: string): BuiltRule {
  const rule = async (address: string): Promise<RuleResult> => {
    const ruleName = `Address is EOA: ${address}`;
    try {
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
      params: {},
      chainId
    },
  };
}
