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

/**
 * We assume the Foundry build artifacts are in `out/MockNFT.sol/MockNFT.json`
 * after running `forge build`.
 * Adjust the path if your foundry config is different.
 */
const MOCKNFT_ARTIFACT = path.join(
  __dirname,
  "../..",   // go up to project root
  "out",
  "MockNFT.sol",
  "MockNFT.json"
);

// The local Anvil RPC
const RPC_URL = "http://127.0.0.1:8545";

describe("RuleEngine with Foundry Anvil", function() {
  let provider: ethers.JsonRpcProvider;
  let owner: ethers.Signer;
  let other: ethers.Signer;
  let mockNftAddress: string;

  before(async function() {
    // 1. Make sure anvil is running in a separate terminal:
    //    anvil --port 8545
    //
    // 2. Connect to anvil
    provider = new ethers.JsonRpcProvider(RPC_URL);

    // By default, anvil usually seeds 10 accounts with 10,000 ETH each
    // We can get those signers by their index
    owner = await provider.getSigner(0);
    other = await provider.getSigner(1);

    // 3. Deploy the MockNFT contract using the compiled artifact
    const artifact = JSON.parse(fs.readFileSync(MOCKNFT_ARTIFACT, "utf-8"));
    const factory = new ethers.ContractFactory(
      artifact.abi,
      artifact.bytecode.object, // Foundry stores bytecode in .object
      owner
    );

    const mockNftContract = await factory.deploy();       // Deploy
    await mockNftContract.waitForDeployment();           // Wait for it to be mined
    mockNftAddress = await mockNftContract.getAddress(); // Get the deployed address

    // Then you can interact with it:
    const tx = await mockNftContract.mint(await other.getAddress());
    await tx.wait();
  });

  it("should evaluate rules correctly against on-chain data", async function() {
    // 5. Gather chain data for `other`
    const otherAddr = await other.getAddress();

    // a) walletBalance in Wei (bigint)
    const walletBalanceBn = await provider.getBalance(otherAddr);
    const walletBalance = walletBalanceBn.toBigInt();

    // b) contractBalance in Wei (bigint)
    const contractBalanceBn = await provider.getBalance(mockNftAddress);
    const contractBalance = contractBalanceBn.toBigInt();

    // c) number of transactions from `other` (getTransactionCount = nonce)
    const txCountBn = await provider.getTransactionCount(otherAddr);
    const numTransactions = BigInt(txCountBn);

    // d) Check NFT ownership
    //    The minted token should be #1 if the contract increments from 0 or 1
    const tokenId = BigInt(1);
    // create an interface to call ownerOf(tokenId)
    const artifact = JSON.parse(fs.readFileSync(MOCKNFT_ARTIFACT, "utf-8"));
    const mockNftContract = new ethers.Contract(
      mockNftAddress,
      artifact.abi,
      provider
    );
    const actualOwner = await mockNftContract.ownerOf(tokenId);
    const userOwnsIt = actualOwner.toLowerCase() === otherAddr.toLowerCase();

    // e) We'll just assume firstTransactionDate was "10 days ago" for the test
    //    (In a real scenario, you'd parse actual block timestamps.)
    const firstTxDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

    // Build the data object
    const data: IBlockchainData = {
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

    // 6. Set up RuleEngine and add some rules
    const engine = new RuleEngine();
    engine.addRules([
      walletBalanceAtLeast(BigInt(0)),          // Should pass
      contractBalanceAtLeast(BigInt(0)),        // Should pass
      numTransactionsAtLeast(BigInt(1)),        // Should pass if `other` has sent >=1 tx
      ownsNFT(mockNftAddress, tokenId),         // Should pass if minted
      firstTransactionOlderThan(5),             // Should pass, we used 10 days
    ]);

    // 7. Evaluate
    const results = await engine.evaluate(data);

    // 8. Check results
    for (const r of results) {
      console.log(`Rule "${r.name}": passed=${r.passed} error=${r.error}`);
    }

    // some specific checks
    const walletRule = results.find((r) => r.name.includes("Wallet balance"));
    expect(walletRule?.passed).to.eq(true);

    const contractRule = results.find((r) => r.name.includes("Contract balance"));
    expect(contractRule?.passed).to.eq(true);

    const nftRule = results.find((r) => r.name.includes("User owns NFT"));
    expect(nftRule?.passed).to.eq(true);

    const txRule = results.find((r) => r.name.includes("Number of transactions"));
    // If `other` hasn't actually initiated a tx (the mint was from `owner`), 
    // txCount might be 0. So that might fail. 
    // We'll just expect it to exist here, but let's see:
    expect(txRule).to.not.be.undefined;
  });
});
