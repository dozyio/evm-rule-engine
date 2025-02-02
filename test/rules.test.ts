// test/rules.test.ts

import fs from "fs";
import { expect } from "chai";
import { ethers, JsonRpcProvider } from "ethers";
import { addressIsContract, addressIsEOA, callContract, callContractParams, contractBalanceAtLeast, erc20BalanceAtLeast, hasNFT, hasNFTTokenId, numTransactionsAtLeast, walletBalanceAtLeast } from "../src/rules";
import { EngineConfig } from "../src/types";

/**
 * We'll assume anvil is running at http://127.0.0.1:8545 with some funded accounts.
 * `anvil --port 8545`
 */

const CHAIN_ID_0 = "31337"
const CHAIN_ID_0_ENDPOINT = 'http://127.0.0.1:8545'
const CHAIN_ID_1 = "31338"
const CHAIN_ID_1_ENDPOINT = 'http://127.0.0.1:8546'
const engineConfig: EngineConfig = {
  networks: [
    {
      provider: new ethers.JsonRpcProvider(CHAIN_ID_0_ENDPOINT),
      chainId: CHAIN_ID_0
    },
    {
      provider: new ethers.JsonRpcProvider(CHAIN_ID_1_ENDPOINT),
      chainId: CHAIN_ID_1
    }
  ]
};


describe("Single Rules", function() {
  let provider: ethers.Provider;
  let signer0: ethers.Signer;
  let signer1: ethers.Signer;
  let signer2: ethers.Signer;
  let signer0Addr: string;
  let signer1Addr: string;
  let signer2Addr: string;
  let contractAddress: string;

  provider = engineConfig.networks[0].provider;

  before(async function() {
    signer0 = await (provider as JsonRpcProvider).getSigner(0); // account #0
    signer1 = await (provider as JsonRpcProvider).getSigner(1); // account #1
    signer2 = await (provider as JsonRpcProvider).getSigner(2); // account #1

    signer0Addr = await signer0.getAddress();
    signer1Addr = await signer1.getAddress();
    signer2Addr = await signer2.getAddress();

    // Deploy minimal contract with `receive()`
    const artifact = JSON.parse(fs.readFileSync("out/Minimal.sol/Minimal.json", "utf-8"));
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, signer0);
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
      const r = walletBalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { minWei: ethers.parseEther("1") });
      const result = await r.rule(signer0Addr);
      expect(result.success).to.be.true;
      if (!result.success) {
        console.error(`Error: ${result.error}`);
      }
    });

    it("should fail if the wallet has less than the required balance", async function() {
      const r = walletBalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { minWei: ethers.parseEther("1000000") });
      const result = await r.rule(signer0Addr);
      expect(result.success).to.be.false;
      expect(result.error).to.be.undefined;
    });
  });

  describe("contractBalanceAtLeast Rule", function() {
    it("should pass if contract balance is >= required Wei", async function() {
      const r = contractBalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { contractAddress, minWei: ethers.parseEther("1") })
      const result = await r.rule();
      expect(result.success).to.be.true;
    });

    it("should fail if the contract has less than the required Wei", async function() {
      const r = contractBalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { contractAddress, minWei: ethers.parseEther("2") })
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

      const r = numTransactionsAtLeast(engineConfig.networks, CHAIN_ID_0, { minCount: 1n })
      const result = await r.rule(signer1Addr);
      expect(result.success).to.be.true;
    });

    it("should fail based on the user's transaction count", async function() {
      const r = numTransactionsAtLeast(engineConfig.networks, CHAIN_ID_0, { minCount: 1n })
      const result = await r.rule(signer2Addr);
      expect(result.success).to.be.false;
    });
  });

  describe("hasNFT Rule", function() {
    let nftAddress: string;
    let nftContractUntyped: any

    before(async function() {
      const artifact = JSON.parse(fs.readFileSync("out/MockNFT.sol/MockNFT.json", "utf-8"));
      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, signer0);
      nftContractUntyped = await factory.deploy();
      await nftContractUntyped.waitForDeployment();

      nftAddress = await nftContractUntyped.getAddress();
    });

    it("should pass if user has the NFT", async function() {
      // Mint an NFT to signer1
      await (nftContractUntyped as any).mint(signer1);

      const r = hasNFT(engineConfig.networks, CHAIN_ID_0, { nftAddress })
      const result = await r.rule(signer1Addr);
      expect(result.success).to.be.true;
    });

    it("should fail if user does not have the NFT", async function() {
      const r = hasNFT(engineConfig.networks, CHAIN_ID_0, { nftAddress })
      const result = await r.rule(signer2Addr);
      expect(result.success).to.be.false;
    });
  });


  describe("hasNFTTokenId Rule", function() {
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

    it("should pass if user has the NFT token id", async function() {
      // Mint an NFT to user1
      await (nftContractUntyped as any).mint(signer1);

      const r = hasNFTTokenId(engineConfig.networks, CHAIN_ID_0, { nftAddress, tokenId })
      const result = await r.rule(signer1Addr);
      expect(result.success).to.be.true;
    });

    it("should fail if user does not have the NFT token id", async function() {
      const r = hasNFTTokenId(engineConfig.networks, CHAIN_ID_0, { nftAddress, tokenId })
      const result = await r.rule(signer2Addr);
      expect(result.success).to.be.false;
    });
  });

  describe("addressIsEOA Rule", function() {
    it("should pass if address is EOA", async function() {
      const r = addressIsEOA(engineConfig.networks, CHAIN_ID_0, {})
      const result = await r.rule(signer0Addr);
      expect(result.success).to.be.true;
    });

    it("should fail if address is not EOA", async function() {
      const r = addressIsEOA(engineConfig.networks, CHAIN_ID_0, {})
      const result = await r.rule(contractAddress);
      expect(result.success).to.be.false;
    });
  });

  describe("addressIsContract Rule", function() {
    it("should pass if address is a contract", async function() {
      const r = addressIsContract(engineConfig.networks, CHAIN_ID_0, {})
      const result = await r.rule(contractAddress);
      expect(result.success).to.be.true;
    });

    it("should fail if address is not a contract", async function() {
      const r = addressIsContract(engineConfig.networks, CHAIN_ID_0, {})
      const result = await r.rule(signer0Addr);
      expect(result.success).to.be.false;
    });
  });

  describe("erc20BalanceAtLeast Rule", function() {
    let erc20Address: string;
    let erc20Contract: any;

    before(async function() {
      const artifact = JSON.parse(
        fs.readFileSync("out/MockERC20.sol/MockToken.json", "utf-8")
      );

      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, signer0);
      erc20Contract = await factory.deploy();
      await erc20Contract.waitForDeployment();

      erc20Address = await erc20Contract.getAddress();

      // Check the deployer’s balance right after deployment
      await erc20Contract.balanceOf(signer0Addr);
      const erc20FromSigner0 = erc20Contract.connect(signer0);

      const tx = await erc20FromSigner0.transfer(signer1Addr, 100n * 100000000000000000n);
      await tx.wait();
    });

    it("should pass if user has the required token balance", async function() {
      // signer1 has 100 tokens
      const ruleInstance = erc20BalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { tokenAddress: erc20Address, minTokens: 50n * 100000000000000000n });
      const result = await ruleInstance.rule(signer1Addr);

      expect(result.success).to.be.true;
      if (!result.success) {
        console.error(`Error: ${result.error}`);
      }
    });

    it("should fail if user does not have the required token balance", async function() {
      // signer1 has 100 tokens, threshold is 101
      const ruleInstance = erc20BalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { tokenAddress: erc20Address, minTokens: 101n * 100000000000000000n });
      const result = await ruleInstance.rule(signer1Addr);

      expect(result.success).to.be.false;
      // If you want, you can also check that `result.error` is undefined (because
      // the call succeeded, just didn't meet the threshold)
      expect(result.error).to.be.undefined;
    });

    it("should pass exactly at the threshold", async function() {
      // signer1 has exactly 100 tokens, threshold is 100
      const ruleInstance = erc20BalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { tokenAddress: erc20Address, minTokens: 100n * 100000000000000000n });
      const result = await ruleInstance.rule(signer1Addr);

      expect(result.success).to.be.true;
    });
  });

  describe("callContract Whitelist Rule", function() {
    let whitelistContract: any;
    let whitelistAddress: string;
    let signer0: ethers.Signer;
    let signer1: ethers.Signer;
    let signer2: ethers.Signer;
    let signer0Addr: string;
    let signer1Addr: string;
    let signer2Addr: string;
    let artifact: any;

    before(async function() {
      // Set up signers (owner and another address)
      signer0 = await (provider as JsonRpcProvider).getSigner(0); // account #0
      signer1 = await (provider as JsonRpcProvider).getSigner(1); // account #1
      signer2 = await (provider as JsonRpcProvider).getSigner(2); // account #1
      signer0Addr = await signer0.getAddress();
      signer1Addr = await signer1.getAddress();
      signer2Addr = await signer2.getAddress();

      // Read the Whitelist contract artifact (adjust path as needed)
      artifact = JSON.parse(
        fs.readFileSync("out/Whitelist.sol/Whitelist.json", "utf-8")
      );

      const factory = new ethers.ContractFactory(
        artifact.abi,
        artifact.bytecode.object,
        signer0
      );
      whitelistContract = await factory.deploy();
      await whitelistContract.waitForDeployment();

      whitelistAddress = await whitelistContract.getAddress();

      // add signer1 to whitelist
      const txAdd = await whitelistContract.connect(signer0).addAddress(signer1Addr);
      await txAdd.wait();
    });

    it("should pass if user is whitelisted (requiredResult = true)", async function() {
      const params: callContractParams = {
        contractAddress: whitelistAddress,
        functionName: "isWhitelisted",
        abi: artifact.abi,
        requiredResult: true,
        compareType: "eq",
      };

      const r = callContract(engineConfig.networks, CHAIN_ID_0, params);
      const result = await r.rule(signer1Addr);

      expect(result.success).to.be.true;
      if (!result.success) {
        console.error(`Error: ${result.error}`);
      }
    });

    it("should fail if user is not whitelisted (requiredResult = true)", async function() {
      // signer2 was never whitelisted
      const params: callContractParams = {
        contractAddress: whitelistAddress,
        functionName: "isWhitelisted",
        abi: artifact.abi,
        requiredResult: true, // We want to test for failure, so true
        compareType: "eq",
      };

      const r = callContract(engineConfig.networks, CHAIN_ID_0, params);
      const result = await r.rule(signer2Addr);

      expect(result.success).to.be.false;
    });

    it("should pass if user is not whitelisted (requiredResult = false)", async function() {
      const params: callContractParams = {
        contractAddress: whitelistAddress,
        functionName: "isWhitelisted",
        abi: artifact.abi,
        requiredResult: false,  // We expect the function call to return false
        compareType: "eq",
      };

      const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
      const result = await ruleInstance.rule(signer2Addr);

      expect(result.success).to.be.true;
    });
  });

  describe("TestReturnTypes with callContract", function() {
    let testContract: any;
    let testContractAddress: string;
    let artifact: any;

    before(async function() {
      artifact = JSON.parse(
        fs.readFileSync("out/Testing.sol/TestReturnTypes.json", "utf-8")
      );

      const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, signer0);
      testContract = await factory.deploy();
      await testContract.waitForDeployment();

      testContractAddress = await testContract.getAddress();
    });

    // Now we add our tests below...
    describe("Boolean returns", function() {
      it("should pass when returnTrue == true (compare eq)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnTrue",
          abi: artifact.abi,
          requiredResult: true,
          compareType: "eq",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();
        // 'rule()' calls the contract function with no args;
        // if your function needed arguments, you'd pass them in: rule(arg1, arg2, ...)

        expect(result.success).to.be.true;
        if (!result.success) {
          console.error(result.error);
        }
      });

      it("should fail when returnTrue != false (compare eq)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnTrue",
          abi: artifact.abi,
          requiredResult: false,
          compareType: "eq",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.false; // Because the contract returns true, not false
      });

      it("should pass when returnFalse == false (compare eq)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnFalse",
          abi: artifact.abi,
          requiredResult: false,
          compareType: "eq",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.true;
      });

      it("should fail when returnFalse != true (compare eq)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnFalse",
          abi: artifact.abi,
          requiredResult: true,
          compareType: "eq",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.false;
      });
    });

    describe("String returns", function() {
      it("should pass when returnString == 'TEST' (compare eq)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnString",
          abi: artifact.abi,
          requiredResult: "TEST",
          compareType: "eq",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.true;  // The contract returns "TEST"
      });

      it("should fail when returnString != 'WRONG' (compare eq)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnString",
          abi: artifact.abi,
          requiredResult: "WRONG",
          compareType: "eq",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.false; // Because the contract actually returns "TEST"
      });
    });

    describe("Unsigned integer returns", function() {
      it("should pass when returnUint == 100 (compare eq)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnUint",
          abi: artifact.abi,
          requiredResult: 100, // or "100", as it will get converted to BigInt
          compareType: "eq",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.true;
      });

      it("should fail when returnUint == 101 (compare eq)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnUint",
          abi: artifact.abi,
          requiredResult: 101,
          compareType: "eq",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.false;
      });

      it("should pass when returnUint >= 100 (compare gte)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnUint",
          abi: artifact.abi,
          requiredResult: 100, // or "100", as it will get converted to BigInt
          compareType: "gte",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.true;
      });

      it("should fail when returnUint >= 101 (compare gte)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnUint",
          abi: artifact.abi,
          requiredResult: 101, // or "100", as it will get converted to BigInt
          compareType: "gte",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.false;
      });

      it("should pass when returnUint > 50 (compare gt)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnUint",
          abi: artifact.abi,
          requiredResult: 50,
          compareType: "gt",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.true; // 100 > 50
      });

      it("should fail when returnUint > 101 (compare gt)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnUint",
          abi: artifact.abi,
          requiredResult: 101,
          compareType: "gt",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.false; // 100 is not > 101
      });

      it("should pass when returnUint < 101 (compare lt)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnUint",
          abi: artifact.abi,
          requiredResult: 101,
          compareType: "lt",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.true; // < 101
      });

      it("should pass when returnUint <= 100 (compare lte)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnUint",
          abi: artifact.abi,
          requiredResult: 100,
          compareType: "lte",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.true; // 100 <= 100
      });

      it("should fail when returnUint <= 99 (compare lte)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnUint",
          abi: artifact.abi,
          requiredResult: 99,
          compareType: "lte",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.false; // 100 <= 99
      });
    });

    describe("Signed integer returns", function() {
      it("should pass when returnPositiveInt == 100 (compare eq)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnPositiveInt",
          abi: artifact.abi,
          requiredResult: 100,
          compareType: "eq",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.true; // matches 100
      });

      it("should fail when returnPositiveInt == 101 (compare eq)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnPositiveInt",
          abi: artifact.abi,
          requiredResult: 101,
          compareType: "eq",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.false; // does not match 101
      });

      it("should pass when returnPositiveInt > 99 (compare gt)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnPositiveInt",
          abi: artifact.abi,
          requiredResult: 99,
          compareType: "gt",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.true; // matches 100
      });

      it("should fail when returnPositiveInt > 100 (compare gt)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnPositiveInt",
          abi: artifact.abi,
          requiredResult: 100,
          compareType: "gt",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.false; // matches 100
      });

      it("should pass when returnPositiveInt >= 100 (compare gte)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnPositiveInt",
          abi: artifact.abi,
          requiredResult: 100,
          compareType: "gte",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.true; // matches 100
      });

      it("should pass when returnNegativeInt < 0 (compare lt)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnNegativeInt",
          abi: artifact.abi,
          requiredResult: 0,
          compareType: "lt",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.true;
      });

      it("should pass when returnNegativeInt <= 100 (compare lte)", async function() {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: "returnNegativeInt",
          abi: artifact.abi,
          requiredResult: -100,
          compareType: "lte",
        };

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params);
        const result = await ruleInstance.rule();

        expect(result.success).to.be.true;
      });
    });
  });
});
