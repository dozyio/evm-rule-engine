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
export function ownsNFT(provider: Provider, chainId: string, nftAddress: string, tokenId: bigint): BuiltRule {
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
