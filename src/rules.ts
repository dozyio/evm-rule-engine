// rules.ts
import { ethers } from "ethers";
import { Rule, RuleResult, RuleConfig, BuiltRule } from "./types";

/**
 * Checks if an EOA's wallet balance is >= `minWei`.
 */
export function walletBalanceAtLeast(minWei: bigint): BuiltRule {
  const rule = async (config: RuleConfig, address?: string): Promise<RuleResult> => {
    const ruleName = `Wallet balance >= ${minWei}`;
    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const balance = await provider.getBalance(address!);
      const passed = balance >= minWei;
      return { name: ruleName, passed };
    } catch (err: any) {
      return { name: ruleName, passed: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "walletBalanceAtLeast",
      params: {
        minWei: minWei.toString()
      }
    }
  };
}

/**
 * Checks if a specific contract's balance is >= `minWei`.
 */
export function contractBalanceAtLeast(contractAddress: string, minWei: bigint): BuiltRule {
  const rule = async (config: RuleConfig, _: string): Promise<RuleResult> => {
    const ruleName = `Contract balance >= ${minWei} at ${contractAddress}`;
    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const balance = await provider.getBalance(contractAddress);
      const passed = balance >= minWei;
      return { name: ruleName, passed };
    } catch (err: any) {
      return { name: ruleName, passed: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "contractBalanceAtLeast",
      params: {
        contractAddress,
        minWei: minWei.toString()
      }
    }
  };
}

/**
 * Checks if the user has sent at least `minCount` transactions (nonce >= minCount).
 */
export function numTransactionsAtLeast(minCount: bigint): BuiltRule {
  const rule = async (config: RuleConfig, address: string): Promise<RuleResult> => {
    const ruleName = `Number of transactions >= ${minCount}`;
    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const txCount = await provider.getTransactionCount(address);
      const txCountBig = BigInt(txCount);
      const passed = txCountBig >= minCount;
      return { name: ruleName, passed };
    } catch (err: any) {
      return { name: ruleName, passed: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "numTransactionsAtLeast",
      params: {
        minCount: minCount.toString()
      }
    }
  };
}

/**
 * Checks if `address` owns an ERC721 (tokenId) at `nftAddress`.
 */
export function ownsNFT(nftAddress: string, tokenId: bigint): BuiltRule {
  const rule = async (config: RuleConfig, address: string): Promise<RuleResult> => {
    const ruleName = `User owns NFT ${nftAddress} #${tokenId}`;
    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);

      // Minimal ERC721 ABI with just "ownerOf"
      const erc721Abi = [
        "function ownerOf(uint256 tokenId) external view returns (address)"
      ];

      const nftContract = new ethers.Contract(nftAddress, erc721Abi, provider);
      const actualOwner = await nftContract.ownerOf(tokenId);
      const passed = actualOwner.toLowerCase() === address.toLowerCase();
      return { name: ruleName, passed };
    } catch (err: any) {
      return { name: ruleName, passed: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "numTransactionsAtLeast",
      params: {
        nftAddress,
        tokenId: tokenId.toString()
      }
    }
  };
}

/**
 * Checks if the address is a contract.
 */
export function addressIsContract(): BuiltRule {
  const rule = async (config: RuleConfig, address: string): Promise<RuleResult> => {
    const ruleName = `Address is contract: ${address}`;
    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const code = await provider.getCode(address);
      // If code != "0x", then it's a contract.
      const passed = code !== "0x";
      return { name: ruleName, passed };
    } catch (err: any) {
      return { name: ruleName, passed: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "addressIsContract",
      params: {}
    }
  };
}

/**
 * Checks if the address is EOA.
 */
export function addressIsEOA(): BuiltRule {
  const rule = async (config: RuleConfig, address: string): Promise<RuleResult> => {
    const ruleName = `Address is EOA: ${address}`;
    try {
      const provider = new ethers.JsonRpcProvider(config.rpcUrl);
      const code = await provider.getCode(address);
      // If code === "0x", then it's a EOA.
      const passed = code === "0x";
      return { name: ruleName, passed };
    } catch (err: any) {
      return { name: ruleName, passed: false, error: err.message };
    }
  };

  return {
    rule,
    definition: {
      type: "addressIsEOA",
      params: {}
    }
  };
}
