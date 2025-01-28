// test/rules.test.ts

import fs from "fs";
import { expect } from "chai";
import { ethers } from "ethers";
import { addressIsContract, addressIsEOA, contractBalanceAtLeast, numTransactionsAtLeast, ownsNFT, ownsNFTTokenId, walletBalanceAtLeast } from "../src/rules";

/**
 * We'll assume anvil is running at http://127.0.0.1:8545 with some funded accounts.
 * `anvil --port 8545`
 */
const RPC_URL = "http://127.0.0.1:8545";
const CHAIN_ID_0 = "31337"

describe("Single Rules", function() {
  let provider: ethers.JsonRpcProvider;
  let signer0: ethers.Signer;
  let signer1: ethers.Signer;
  let signer2: ethers.Signer;
  let signer0Addr: string;
  let signer1Addr: string;
  let signer2Addr: string;
  let contractAddress: string;

  before(async function() {
    provider = new ethers.JsonRpcProvider(RPC_URL);

    signer0 = await provider.getSigner(0); // account #0
    signer1 = await provider.getSigner(1); // account #1
    signer2 = await provider.getSigner(2); // account #1

    signer0Addr = await signer0.getAddress();
    signer1Addr = await signer1.getAddress();
    signer2Addr = await signer2.getAddress();

    // Deploy minimal contract with `receive()`
    // see Minimal.sol
    // run `forge build && forge inspect Minimal bytecode`
    const MinimalContractBytecode = "0x6080604052348015600e575f5ffd5b50604480601a5f395ff3fe608060405236600a57005b5f5ffdfea264697066735822122049f1c634d3cea02d00596dd9b62bcbecb4f505abbd0cde4d94fe400d47116b5864736f6c634300081c0033"
    // Deploy via signer0
    const factory = new ethers.ContractFactory([], MinimalContractBytecode, signer0);
    const contract = await factory.deploy();
    await contract.waitForDeployment();

    contractAddress = await contract.getAddress();
    // Fund the contract
    await signer0.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther("1"),
    });
  });

  describe("walletBalanceAtLeast Rule", function() {
    it("should pass if the wallet has enough balance", async function() {
      // Anvil seeds accounts with 10,000 ETH
      const r = walletBalanceAtLeast(provider, CHAIN_ID_0, ethers.parseEther("1"));
      const result = await r.rule(signer0Addr);
      expect(result.success).to.be.true;
      if (!result.success) {
        console.error(`Error: ${result.error}`);
      }
    });

    it("should fail if the wallet has less than the required balance", async function() {
      const r = walletBalanceAtLeast(provider, CHAIN_ID_0, ethers.parseEther("1000000"));
      const result = await r.rule(signer0Addr);
      expect(result.success).to.be.false;
      expect(result.error).to.be.undefined;
    });
  });

  describe("contractBalanceAtLeast Rule", function() {
    it("should pass if contract balance is >= required Wei", async function() {
      const r = contractBalanceAtLeast(provider, CHAIN_ID_0, contractAddress, ethers.parseEther("1"))
      const result = await r.rule();
      expect(result.success).to.be.true;
    });

    it("should fail if the contract has less than the required Wei", async function() {
      const r = contractBalanceAtLeast(provider, CHAIN_ID_0, contractAddress, ethers.parseEther("2"))
      const result = await r.rule();
      expect(result.success).to.be.false;
    });
  });

  describe("numTransactionsAtLeast Rule", function() {
    it("should pass based on the user's transaction count", async function() {
      await signer1.sendTransaction({
        to: signer0Addr,
        value: ethers.parseEther("0.001"),
      });

      const r = numTransactionsAtLeast(provider, CHAIN_ID_0, BigInt(1))
      const result = await r.rule(signer1Addr);
      expect(result.success).to.be.true;
    });

    it("should fail based on the user's transaction count", async function() {
      const r = numTransactionsAtLeast(provider, CHAIN_ID_0, BigInt(1))
      const result = await r.rule(signer2Addr);
      expect(result.success).to.be.false;
    });
  });

  describe("ownsNFT Rule", function() {
    let nftAddress: string;
    let nftContractUntyped: any

    before(async function() {
      const artifact = JSON.parse(fs.readFileSync("out/MockNFT.sol/MockNFT.json", "utf-8"));
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, signer0);
      nftContractUntyped = await factory.deploy();
      await nftContractUntyped.waitForDeployment();

      nftAddress = await nftContractUntyped.getAddress();
    });

    it("should pass if user owns the NFT", async function() {
      // Mint an NFT to user1
      await (nftContractUntyped as any).mint(signer1);

      const r = ownsNFT(provider, CHAIN_ID_0, nftAddress)
      const result = await r.rule(signer1Addr);
      expect(result.success).to.be.true;
    });

    it("should fail if user does not own the NFT", async function() {
      const r = ownsNFT(provider, CHAIN_ID_0, nftAddress)
      const result = await r.rule(signer2Addr);
      expect(result.success).to.be.false;
    });
  });


  describe("ownsNFTTokenId Rule", function() {
    let nftAddress: string;
    let tokenId = BigInt(1);
    let nftContractUntyped: any

    before(async function() {
      const artifact = JSON.parse(fs.readFileSync("out/MockNFT.sol/MockNFT.json", "utf-8"));
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, signer0);
      nftContractUntyped = await factory.deploy();
      await nftContractUntyped.waitForDeployment();

      nftAddress = await nftContractUntyped.getAddress();
    });

    it("should pass if user owns the NFT token id", async function() {
      // Mint an NFT to user1
      await (nftContractUntyped as any).mint(signer1);

      const r = ownsNFTTokenId(provider, CHAIN_ID_0, nftAddress, tokenId)
      const result = await r.rule(signer1Addr);
      expect(result.success).to.be.true;
    });

    it("should fail if user does not own the NFT token id", async function() {
      const r = ownsNFTTokenId(provider, CHAIN_ID_0, nftAddress, tokenId)
      const result = await r.rule(signer2Addr);
      expect(result.success).to.be.false;
    });
  });

  describe("addressIsEOA Rule", function() {
    it("should pass if address is EOA", async function() {
      const r = addressIsEOA(provider, CHAIN_ID_0)
      const result = await r.rule(signer0Addr);
      expect(result.success).to.be.true;
    });

    it("should fail if address is not EOA", async function() {
      const r = addressIsEOA(provider, CHAIN_ID_0)
      const result = await r.rule(contractAddress);
      expect(result.success).to.be.false;
    });
  });

  describe("addressIsContract Rule", function() {
    it("should pass if address is a contract", async function() {
      const r = addressIsContract(provider, CHAIN_ID_0)
      const result = await r.rule(contractAddress);
      expect(result.success).to.be.true;
    });

    it("should fail if address is not a contract", async function() {
      const r = addressIsContract(provider, CHAIN_ID_0)
      const result = await r.rule(signer0Addr);
      expect(result.success).to.be.false;
    });
  });
});
