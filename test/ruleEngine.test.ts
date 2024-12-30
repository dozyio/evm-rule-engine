// test/ruleEngine.test.ts

import { expect } from "chai";
import { ethers } from "ethers";
import fs from "fs";
import path from "path";

import { RuleEngine } from "../src/RuleEngine";
import {
  walletBalanceAtLeast,
  contractBalanceAtLeast,
  numTransactionsAtLeast,
  ownsNFT,
  firstTransactionOlderThan,
} from "../src/rules";
import { IBlockchainData } from "../src/types";
import { MockNFT } from "../typechain-types/MockNFT";

// We'll assume Foundry build artifacts end up here after `forge build`.
const MOCKNFT_ARTIFACT = path.join(
  __dirname,
  "../",
  "out",
  "MockNFT.sol",
  "MockNFT.json"
);

// The local Anvil RPC
const RPC_URL = "http://127.0.0.1:8545";

describe("RuleEngine with Foundry Anvil", function () {
  let provider: ethers.JsonRpcProvider;
  let owner: ethers.Signer;
  let other: ethers.Signer;
  let mockNftAddress: string;

  // We'll store this so all tests can reuse it
  let data: IBlockchainData;

  before(async function () {
    // 1. Ensure `anvil --port 8545` is running
    provider = new ethers.JsonRpcProvider(RPC_URL);

    // 2. Get signers (Anvil seeds ~10 accounts with 10,000 ETH)
    owner = await provider.getSigner(0);
    other = await provider.getSigner(1);

    // 3. Deploy the MockNFT contract
    const artifact = JSON.parse(fs.readFileSync(MOCKNFT_ARTIFACT, "utf-8"));
    const factory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode.object, 
      owner
    );

    const untypedContract = await factory.deploy();
    await untypedContract.waitForDeployment();
    const mockNftContract = untypedContract as unknown as MockNFT;

    // 4. Get deployed address & mint NFT
    mockNftAddress = await mockNftContract.getAddress();
    const tx = await mockNftContract.mint(await other.getAddress());
    await tx.wait();

    // 5. Gather data for the `other` user
    const ownerAddr = await owner.getAddress();
    const otherAddr = await other.getAddress();

    // a) walletBalance in Wei (bigint)
    const walletBalance = await provider.getBalance(ownerAddr);

    // b) contractBalance in Wei (bigint)
    const contractBalance = await provider.getBalance(mockNftAddress);

    // c) number of transactions (nonce)
    const txCountBn = await provider.getTransactionCount(ownerAddr);
    const numTransactions = BigInt(txCountBn);

    // d) Check NFT ownership
    const tokenId = BigInt(1);
    const mockNftReadOnly = new ethers.Contract(
      mockNftAddress,
      artifact.abi,
      provider
    );
    const actualOwner = await mockNftReadOnly.ownerOf(tokenId);
    const userOwnsIt = actualOwner.toLowerCase() === otherAddr.toLowerCase();

    // e) We'll just mock firstTransactionDate as "10 days ago"
    const firstTxDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    data = {
      walletBalance,
      contractBalance,
      numTransactions,
      nftOwnership: [
        {
          contractAddress: mockNftAddress,
          tokenId,
          owned: userOwnsIt,
        },
      ],
      firstTransactionDate: firstTxDate,
    };
  }).timeout(10_000);

  describe("Individual Rule Checks", function () {
    it("walletBalanceAtLeast(BigInt(1)) should pass", async function () {
      const rule = walletBalanceAtLeast(BigInt(1));
      const result = await rule(data);
      expect(result.passed).to.eq(true);
      if (!result.passed) {
        console.log(`Error: ${result.error}`);
      }
    });

    it("walletBalanceAtLeast(BigInt(9999999999999999999999)) should fail", async function () {
      const rule = walletBalanceAtLeast(BigInt("9999999999999999999999"));
      const result = await rule(data);
      expect(result.passed).to.eq(false);
    });

    it("contractBalanceAtLeast(BigInt(0)) should pass", async function () {
      const rule = contractBalanceAtLeast(BigInt(0));
      const result = await rule(data);
      expect(result.passed).to.eq(true);
      if (!result.passed) {
        console.log(`Error: ${result.error}`);
      }
    });

    it("numTransactionsAtLeast(BigInt(1)) should pass", async function () {
      const rule = numTransactionsAtLeast(BigInt(1));
      const result = await rule(data);
      expect(result.passed).to.eq(true);
    });

    it("numTransactionsAtLeast(BigInt(1000)) should fail", async function () {
      const rule = numTransactionsAtLeast(BigInt("1000"));
      const result = await rule(data);
      expect(result.passed).to.eq(false);
    });

    it("ownsNFT should pass if minted tokenId 1 to `other`", async function () {
      const tokenId = BigInt(1);
      const rule = ownsNFT(mockNftAddress, tokenId);
      const result = await rule(data);
      expect(result.passed).to.eq(true);
    });

    it("ownsNFT should fail if minted tokenId 2 to `other`", async function () {
      const tokenId = BigInt(2);
      const rule = ownsNFT(mockNftAddress, tokenId);
      const result = await rule(data);
      expect(result.passed).to.eq(false);
    });

    it("firstTransactionOlderThan(5) should pass (mocked 10 days ago)", async function () {
      const rule = firstTransactionOlderThan(5);
      const result = await rule(data);
      expect(result.passed).to.eq(true);
    });
  });

  describe("Evaluate All Rules in One Go", function () {
    it("should evaluate multiple rules with RuleEngine", async function () {
      const engine = new RuleEngine();

      engine.addRules([
        walletBalanceAtLeast(BigInt(0)),
        contractBalanceAtLeast(BigInt(0)),
        numTransactionsAtLeast(BigInt(1)),
        ownsNFT(mockNftAddress, BigInt(1)),
        firstTransactionOlderThan(5),
      ]);

      const result = await engine.evaluate(data);

      // for (const r of result.ruleResults) {
      //   console.log(`Rule "${r.name}": passed=${r.passed}, error=${r.error}`);
      // }

      expect(result.ruleResults).to.have.lengthOf(5);

      expect(result.result).to.eq(true)
    });
  });
});
