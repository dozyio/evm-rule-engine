// test/rules.test.ts

// import fs from 'fs'
import { expect } from 'chai'
import { ethers, type JsonRpcProvider } from 'ethers'
import minimalArtifact from '../out/Minimal.sol/Minimal.json' with { type: 'json' }
import erc20Artifact from '../out/MockERC20.sol/MockToken.json' with { type: 'json' }
import nftArtifact from '../out/MockNFT.sol/MockNFT.json' with { type: 'json' }
import testArtifact from '../out/Testing.sol/TestReturnTypes.json' with { type: 'json' }
import whitelistArtifact from '../out/Whitelist.sol/Whitelist.json' with { type: 'json' }
import { addressIsContract, addressIsEOA, callContract, type callContractParams, contractBalanceAtLeast, erc20BalanceAtLeast, hasNFT, hasNFTTokenId, numTransactionsAtLeast, walletBalanceAtLeast, createRulesFromDefinitions } from '../src/rules.js'
import { type BuiltRule, type EngineConfig, type Network, type RuleDefinition } from '../src/types.js'

/**
 * We'll assume anvil is running at http://127.0.0.1:8545 with some funded accounts.
 * `anvil --port 8545`
 */

const CHAIN_ID_0 = '31337'
const CHAIN_ID_0_ENDPOINT = 'http://127.0.0.1:8545'
const CHAIN_ID_1 = '31338'
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
}

describe('Single Rules', function () {
  let signer0: ethers.Signer
  let signer1: ethers.Signer
  let signer2: ethers.Signer
  let signer0Addr: string
  let signer1Addr: string
  let signer2Addr: string
  let contractAddress: string

  const provider = engineConfig.networks[0].provider

  before(async function () {
    signer0 = await (provider as JsonRpcProvider).getSigner(0) // account #0
    signer1 = await (provider as JsonRpcProvider).getSigner(1) // account #1
    signer2 = await (provider as JsonRpcProvider).getSigner(2) // account #1

    signer0Addr = await signer0.getAddress()
    signer1Addr = await signer1.getAddress()
    signer2Addr = await signer2.getAddress()

    // Deploy minimal contract with `receive()`
    // const artifact = JSON.parse(fs.readFileSync('out/Minimal.sol/Minimal.json', 'utf-8'))
    const factory = new ethers.ContractFactory(minimalArtifact.abi, minimalArtifact.bytecode.object, signer0)
    const contract = await factory.deploy()
    await contract.waitForDeployment()

    contractAddress = await contract.getAddress()
    // Fund the contract
    await signer0.sendTransaction({
      to: contractAddress,
      value: ethers.parseEther('1')
    })
  })

  describe('walletBalanceAtLeast Rule', function () {
    it('should pass if the wallet has enough balance', async function () {
      // Anvil seeds accounts with 10,000 ETH
      const r = walletBalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { minWei: ethers.parseEther('1') })
      const result = await r.rule(signer0Addr)
      expect(result.success).to.eq(true)
    })

    it('should fail if the wallet has less than the required balance', async function () {
      const r = walletBalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { minWei: ethers.parseEther('1000000') })
      const result = await r.rule(signer0Addr)
      expect(result.success).to.eq(false)
      expect(result.error).to.eq(undefined)
    })
  })

  describe('contractBalanceAtLeast Rule', function () {
    it('should pass if contract balance is >= required Wei', async function () {
      const r = contractBalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { contractAddress, minWei: ethers.parseEther('1') })
      const result = await r.rule()
      expect(result.success).to.eq(true)
    })

    it('should fail if the contract has less than the required Wei', async function () {
      const r = contractBalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { contractAddress, minWei: ethers.parseEther('2') })
      const result = await r.rule()
      expect(result.success).to.eq(false)
    })
  })

  describe('numTransactionsAtLeast Rule', function () {
    it("should pass based on the user's transaction count", async function () {
      await signer1.sendTransaction({
        to: signer0Addr,
        value: ethers.parseEther('0.001')
      })

      const r = numTransactionsAtLeast(engineConfig.networks, CHAIN_ID_0, { minCount: 1n })
      const result = await r.rule(signer1Addr)
      expect(result.success).to.eq(true)
    })

    it("should fail based on the user's transaction count", async function () {
      const r = numTransactionsAtLeast(engineConfig.networks, CHAIN_ID_0, { minCount: 1n })
      const result = await r.rule(signer2Addr)
      expect(result.success).to.eq(false)
    })
  })

  describe('hasNFT Rule', function () {
    let nftAddress: string
    let nftContractUntyped: any

    before(async function () {
      const factory = new ethers.ContractFactory(nftArtifact.abi, nftArtifact.bytecode.object, signer0)
      nftContractUntyped = await factory.deploy()
      await nftContractUntyped.waitForDeployment()

      nftAddress = await nftContractUntyped.getAddress()
    })

    it('should pass if user has the NFT', async function () {
      // Mint an NFT to signer1
      await (nftContractUntyped).mint(signer1)

      const r = hasNFT(engineConfig.networks, CHAIN_ID_0, { nftAddress })
      const result = await r.rule(signer1Addr)
      expect(result.success).to.eq(true)
    })

    it('should fail if user does not have the NFT', async function () {
      const r = hasNFT(engineConfig.networks, CHAIN_ID_0, { nftAddress })
      const result = await r.rule(signer2Addr)
      expect(result.success).to.eq(false)
    })
  })

  describe('hasNFTTokenId Rule', function () {
    let nftAddress: string
    const tokenId = BigInt(1)
    let nftContractUntyped: any

    before(async function () {
      const factory = new ethers.ContractFactory(nftArtifact.abi, nftArtifact.bytecode.object, signer0)
      nftContractUntyped = await factory.deploy()
      await nftContractUntyped.waitForDeployment()

      nftAddress = await nftContractUntyped.getAddress()
    })

    it('should pass if user has the NFT token id', async function () {
      // Mint an NFT to user1
      await (nftContractUntyped).mint(signer1)

      const r = hasNFTTokenId(engineConfig.networks, CHAIN_ID_0, { nftAddress, tokenId })
      const result = await r.rule(signer1Addr)
      expect(result.success).to.eq(true)
    })

    it('should fail if user does not have the NFT token id', async function () {
      const r = hasNFTTokenId(engineConfig.networks, CHAIN_ID_0, { nftAddress, tokenId })
      const result = await r.rule(signer2Addr)
      expect(result.success).to.eq(false)
    })
  })

  describe('addressIsEOA Rule', function () {
    it('should pass if address is EOA', async function () {
      const r = addressIsEOA(engineConfig.networks, CHAIN_ID_0, {})
      const result = await r.rule(signer0Addr)
      expect(result.success).to.eq(true)
    })

    it('should fail if address is not EOA', async function () {
      const r = addressIsEOA(engineConfig.networks, CHAIN_ID_0, {})
      const result = await r.rule(contractAddress)
      expect(result.success).to.eq(false)
    })
  })

  describe('addressIsContract Rule', function () {
    it('should pass if address is a contract', async function () {
      const r = addressIsContract(engineConfig.networks, CHAIN_ID_0, {})
      const result = await r.rule(contractAddress)
      expect(result.success).to.eq(true)
    })

    it('should fail if address is not a contract', async function () {
      const r = addressIsContract(engineConfig.networks, CHAIN_ID_0, {})
      const result = await r.rule(signer0Addr)
      expect(result.success).to.eq(false)
    })
  })

  describe('erc20BalanceAtLeast Rule', function () {
    let erc20Address: string
    let erc20Contract: any

    before(async function () {
      const factory = new ethers.ContractFactory(erc20Artifact.abi, erc20Artifact.bytecode.object, signer0)
      erc20Contract = await factory.deploy()
      await erc20Contract.waitForDeployment()

      erc20Address = await erc20Contract.getAddress()

      // Check the deployer’s balance right after deployment
      await erc20Contract.balanceOf(signer0Addr)
      const erc20FromSigner0 = erc20Contract.connect(signer0)

      const tx = await erc20FromSigner0.transfer(signer1Addr, 100n * 100000000000000000n)
      await tx.wait()
    })

    it('should pass if user has the required token balance', async function () {
      // signer1 has 100 tokens
      const ruleInstance = erc20BalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { tokenAddress: erc20Address, minTokens: 50n * 100000000000000000n })
      const result = await ruleInstance.rule(signer1Addr)

      expect(result.success).to.eq(true)
    })

    it('should fail if user does not have the required token balance', async function () {
      // signer1 has 100 tokens, threshold is 101
      const ruleInstance = erc20BalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { tokenAddress: erc20Address, minTokens: 101n * 100000000000000000n })
      const result = await ruleInstance.rule(signer1Addr)

      expect(result.success).to.eq(false)
      // If you want, you can also check that `result.error` is undefined (because
      // the call succeeded, just didn't meet the threshold)
      expect(result.error).to.eq(undefined)
    })

    it('should pass exactly at the threshold', async function () {
      // signer1 has exactly 100 tokens, threshold is 100
      const ruleInstance = erc20BalanceAtLeast(engineConfig.networks, CHAIN_ID_0, { tokenAddress: erc20Address, minTokens: 100n * 100000000000000000n })
      const result = await ruleInstance.rule(signer1Addr)

      expect(result.success).to.eq(true)
    })
  })

  describe('callContract Whitelist Rule', function () {
    let whitelistContract: any
    let whitelistAddress: string
    let signer0: ethers.Signer
    let signer1: ethers.Signer
    let signer2: ethers.Signer
    let signer1Addr: string
    let signer2Addr: string

    before(async function () {
      // Set up signers (owner and another address)
      signer0 = await (provider as JsonRpcProvider).getSigner(0) // account #0
      signer1 = await (provider as JsonRpcProvider).getSigner(1) // account #1
      signer2 = await (provider as JsonRpcProvider).getSigner(2) // account #1
      signer1Addr = await signer1.getAddress()
      signer2Addr = await signer2.getAddress()

      const factory = new ethers.ContractFactory(
        whitelistArtifact.abi,
        whitelistArtifact.bytecode.object,
        signer0
      )
      whitelistContract = await factory.deploy()
      await whitelistContract.waitForDeployment()

      whitelistAddress = await whitelistContract.getAddress()

      // add signer1 to whitelist
      const txAdd = await whitelistContract.connect(signer0).addAddress(signer1Addr)
      await txAdd.wait()
    })

    it('should pass if user is whitelisted (requiredResult = true)', async function () {
      const params: callContractParams = {
        contractAddress: whitelistAddress,
        functionName: 'isWhitelisted',
        abi: whitelistArtifact.abi,
        requiredResult: true,
        compareType: 'eq'
      }

      const r = callContract(engineConfig.networks, CHAIN_ID_0, params)
      const result = await r.rule(signer1Addr)

      expect(result.success).to.eq(true)
    })

    it('should fail if user is not whitelisted (requiredResult = true)', async function () {
      // signer2 was never whitelisted
      const params: callContractParams = {
        contractAddress: whitelistAddress,
        functionName: 'isWhitelisted',
        abi: whitelistArtifact.abi,
        requiredResult: true, // We want to test for failure, so true
        compareType: 'eq'
      }

      const r = callContract(engineConfig.networks, CHAIN_ID_0, params)
      const result = await r.rule(signer2Addr)

      expect(result.success).to.eq(false)
    })

    it('should pass if user is not whitelisted (requiredResult = false)', async function () {
      const params: callContractParams = {
        contractAddress: whitelistAddress,
        functionName: 'isWhitelisted',
        abi: whitelistArtifact.abi,
        requiredResult: false, // We expect the function call to return false
        compareType: 'eq'
      }

      const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
      const result = await ruleInstance.rule(signer2Addr)

      expect(result.success).to.eq(true)
    })
  })

  describe('TestReturnTypes with callContract', function () {
    let testContract: any
    let testContractAddress: string

    before(async function () {
      const factory = new ethers.ContractFactory(testArtifact.abi, testArtifact.bytecode.object, signer0)
      testContract = await factory.deploy()
      await testContract.waitForDeployment()

      testContractAddress = await testContract.getAddress()
    })

    // Now we add our tests below...
    describe('Boolean returns', function () {
      it('should pass when returnTrue == true (compare eq)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnTrue',
          abi: testArtifact.abi,
          requiredResult: true,
          compareType: 'eq'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()
        // 'rule()' calls the contract function with no args;
        // if your function needed arguments, you'd pass them in: rule(arg1, arg2, ...)

        expect(result.success).to.eq(true)
      })

      it('should fail when returnTrue != false (compare eq)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnTrue',
          abi: testArtifact.abi,
          requiredResult: false,
          compareType: 'eq'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(false) // Because the contract returns true, not false
      })

      it('should pass when returnFalse == false (compare eq)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnFalse',
          abi: testArtifact.abi,
          requiredResult: false,
          compareType: 'eq'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(true)
      })

      it('should fail when returnFalse != true (compare eq)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnFalse',
          abi: testArtifact.abi,
          requiredResult: true,
          compareType: 'eq'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(false)
      })
    })

    describe('String returns', function () {
      it("should pass when returnString == 'TEST' (compare eq)", async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnString',
          abi: testArtifact.abi,
          requiredResult: 'TEST',
          compareType: 'eq'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(true) // The contract returns "TEST"
      })

      it("should fail when returnString != 'WRONG' (compare eq)", async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnString',
          abi: testArtifact.abi,
          requiredResult: 'WRONG',
          compareType: 'eq'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(false) // Because the contract actually returns "TEST"
      })
    })

    describe('Unsigned integer returns', function () {
      it('should pass when returnUint == 100 (compare eq)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnUint',
          abi: testArtifact.abi,
          requiredResult: 100, // or "100", as it will get converted to BigInt
          compareType: 'eq'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(true)
      })

      it('should fail when returnUint == 101 (compare eq)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnUint',
          abi: testArtifact.abi,
          requiredResult: 101,
          compareType: 'eq'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(false)
      })

      it('should pass when returnUint >= 100 (compare gte)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnUint',
          abi: testArtifact.abi,
          requiredResult: 100, // or "100", as it will get converted to BigInt
          compareType: 'gte'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(true)
      })

      it('should fail when returnUint >= 101 (compare gte)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnUint',
          abi: testArtifact.abi,
          requiredResult: 101, // or "100", as it will get converted to BigInt
          compareType: 'gte'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(false)
      })

      it('should pass when returnUint > 50 (compare gt)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnUint',
          abi: testArtifact.abi,
          requiredResult: 50,
          compareType: 'gt'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(true) // 100 > 50
      })

      it('should fail when returnUint > 101 (compare gt)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnUint',
          abi: testArtifact.abi,
          requiredResult: 101,
          compareType: 'gt'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(false) // 100 is not > 101
      })

      it('should pass when returnUint < 101 (compare lt)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnUint',
          abi: testArtifact.abi,
          requiredResult: 101,
          compareType: 'lt'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(true) // < 101
      })

      it('should pass when returnUint <= 100 (compare lte)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnUint',
          abi: testArtifact.abi,
          requiredResult: 100,
          compareType: 'lte'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(true) // 100 <= 100
      })

      it('should fail when returnUint <= 99 (compare lte)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnUint',
          abi: testArtifact.abi,
          requiredResult: 99,
          compareType: 'lte'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(false) // 100 <= 99
      })
    })

    describe('Signed integer returns', function () {
      it('should pass when returnPositiveInt == 100 (compare eq)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnPositiveInt',
          abi: testArtifact.abi,
          requiredResult: 100,
          compareType: 'eq'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(true) // matches 100
      })

      it('should fail when returnPositiveInt == 101 (compare eq)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnPositiveInt',
          abi: testArtifact.abi,
          requiredResult: 101,
          compareType: 'eq'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(false) // does not match 101
      })

      it('should pass when returnPositiveInt > 99 (compare gt)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnPositiveInt',
          abi: testArtifact.abi,
          requiredResult: 99,
          compareType: 'gt'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(true) // matches 100
      })

      it('should fail when returnPositiveInt > 100 (compare gt)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnPositiveInt',
          abi: testArtifact.abi,
          requiredResult: 100,
          compareType: 'gt'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(false) // matches 100
      })

      it('should pass when returnPositiveInt >= 100 (compare gte)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnPositiveInt',
          abi: testArtifact.abi,
          requiredResult: 100,
          compareType: 'gte'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(true) // matches 100
      })

      it('should pass when returnNegativeInt < 0 (compare lt)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnNegativeInt',
          abi: testArtifact.abi,
          requiredResult: 0,
          compareType: 'lt'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(true)
      })

      it('should pass when returnNegativeInt <= 100 (compare lte)', async function () {
        const params: callContractParams = {
          contractAddress: testContractAddress,
          functionName: 'returnNegativeInt',
          abi: testArtifact.abi,
          requiredResult: -100,
          compareType: 'lte'
        }

        const ruleInstance = callContract(engineConfig.networks, CHAIN_ID_0, params)
        const result = await ruleInstance.rule()

        expect(result.success).to.eq(true)
      })
    })
  })
})

describe('createRulesFromJson()', function () {
  const CHAIN_ID_0 = '31337'
  const CHAIN_ID_0_ENDPOINT = 'http://127.0.0.1.8545'
  const networks: Network[] = [
    { chainId: CHAIN_ID_0, provider: new ethers.JsonRpcProvider(CHAIN_ID_0_ENDPOINT) }
  ]

  it('should create valid rules from well-formed definitions', function () {
    const min = '1000'
    const address = '0x123'
    const tokenId = '123'

    const definitions: RuleDefinition[] = [
      { type: 'walletBalanceAtLeast', chainId: CHAIN_ID_0, params: { minWei: min } },
      { type: 'contractBalanceAtLeast', chainId: CHAIN_ID_0, params: { minWei: min, contractAddress: address } },
      { type: 'erc20BalanceAtLeast', chainId: CHAIN_ID_0, params: { tokenAddress: address, minTokens: min } },
      { type: 'hasNFT', chainId: CHAIN_ID_0, params: { nftAddress: address } },
      { type: 'hasNFTTokenId', chainId: CHAIN_ID_0, params: { nftAddress: address, tokenId } },
      { type: 'numTransactionsAtLeast', chainId: CHAIN_ID_0, params: { minCount: min } },
      { type: 'addressIsContract', chainId: CHAIN_ID_0, params: {} },
      { type: 'addressIsEOA', chainId: CHAIN_ID_0, params: {} },
      { type: 'callContract', chainId: CHAIN_ID_0, params: { contractAddress: address, functionName: 'test', abi: ['test'] } }
    ]

    const rules: BuiltRule[] = createRulesFromDefinitions(networks, definitions)
    expect(rules).to.have.lengthOf(9)

    expect(typeof rules[0].rule).to.eq('function')
    expect(typeof rules[0].definition).to.eq('object')
    expect(rules[0].definition.chainId).to.eq(CHAIN_ID_0)
    expect(rules[0].definition.type).to.eq('walletBalanceAtLeast')
    expect(rules[0].definition.params.minWei).to.eq(min)

    expect(typeof rules[1].rule).to.eq('function')
    expect(typeof rules[1].definition).to.eq('object')
    expect(rules[1].definition.chainId).to.eq(CHAIN_ID_0)
    expect(rules[1].definition.type).to.eq('contractBalanceAtLeast')
    expect(rules[1].definition.params.minWei).to.eq(min)
    expect(rules[1].definition.params.contractAddress).to.eq(address)

    expect(typeof rules[2].rule).to.eq('function')
    expect(typeof rules[2].definition).to.eq('object')
    expect(rules[2].definition.chainId).to.eq(CHAIN_ID_0)
    expect(rules[2].definition.type).to.eq('erc20BalanceAtLeast')
    expect(rules[2].definition.params.minTokens).to.eq(min)
    expect(rules[2].definition.params.tokenAddress).to.eq(address)

    expect(typeof rules[3].rule).to.eq('function')
    expect(typeof rules[3].definition).to.eq('object')
    expect(rules[3].definition.chainId).to.eq(CHAIN_ID_0)
    expect(rules[3].definition.type).to.eq('hasNFT')
    expect(rules[3].definition.params.nftAddress).to.eq(address)

    expect(typeof rules[4].rule).to.eq('function')
    expect(typeof rules[4].definition).to.eq('object')
    expect(rules[4].definition.chainId).to.eq(CHAIN_ID_0)
    expect(rules[4].definition.type).to.eq('hasNFTTokenId')
    expect(rules[4].definition.params.nftAddress).to.eq(address)
    expect(rules[4].definition.params.tokenId).to.eq(tokenId)

    expect(typeof rules[5].rule).to.eq('function')
    expect(typeof rules[5].definition).to.eq('object')
    expect(rules[5].definition.chainId).to.eq(CHAIN_ID_0)
    expect(rules[5].definition.type).to.eq('numTransactionsAtLeast')
    expect(rules[5].definition.params.minCount).to.eq(min)

    expect(typeof rules[6].rule).to.eq('function')
    expect(typeof rules[6].definition).to.eq('object')
    expect(rules[6].definition.chainId).to.eq(CHAIN_ID_0)
    expect(rules[6].definition.type).to.eq('addressIsContract')

    expect(typeof rules[7].rule).to.eq('function')
    expect(typeof rules[7].definition).to.eq('object')
    expect(rules[7].definition.chainId).to.eq(CHAIN_ID_0)
    expect(rules[7].definition.type).to.eq('addressIsEOA')

    expect(typeof rules[8].rule).to.eq('function')
    expect(typeof rules[8].definition).to.eq('object')
    expect(rules[8].definition.chainId).to.eq(CHAIN_ID_0)
    expect(rules[8].definition.type).to.eq('callContract')
    expect(rules[8].definition.params.contractAddress).to.eq(address)
    expect(rules[8].definition.params.functionName).to.eq('test')
    expect(rules[8].definition.params.abi).to.deep.eq(['test'])
  })

  it('should throw an error for unknown rule types', function () {
    const definitions: RuleDefinition[] = [
      { type: 'nonExistentRule', chainId: CHAIN_ID_0, params: { someParam: '123' } }
    ]
    expect(() => createRulesFromDefinitions(networks, definitions)).to.throw(/Unknown rule type/)
  })
})
