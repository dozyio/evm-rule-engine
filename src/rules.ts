import { ethers } from 'ethers'
import { type RuleResult, type BuiltRule, type Network, type RuleDefinition } from './types.js'
import { getProviderByChainId } from './utils.js'

const ruleFactories: Record<string, (...args: any[]) => BuiltRule> = {
  walletBalance: (networks: Network[], chainId: string, params: walletBalanceParams) =>
    walletBalance(networks, chainId, params),

  contractBalance: (networks: Network[], chainId: string, params: contractBalanceParams) =>
    contractBalance(networks, chainId, params),

  erc20Balance: (networks: Network[], chainId: string, params: erc20BalanceParams) =>
    erc20Balance(networks, chainId, params),

  numTransactions: (networks: Network[], chainId: string, params: numTransactionsParams) =>
    numTransactions(networks, chainId, params),

  hasNFT: (networks: Network[], chainId: string, params: hasNFTParams) =>
    hasNFT(networks, chainId, params),

  hasNFTTokenId: (networks: Network[], chainId: string, params: hasNFTTokenIdParams) =>
    hasNFTTokenId(networks, chainId, params),

  addressIsContract: (networks: Network[], chainId: string, params: addressIsContractParams) =>
    addressIsContract(networks, chainId, params),

  addressIsEOA: (networks: Network[], chainId: string, params: addressIsEOAParams) =>
    addressIsEOA(networks, chainId, params),

  callContract: (networks: Network[], chainId: string, params: callContractParams) =>
    callContract(networks, chainId, params)
}

/**
 * Given an array of raw JSON definitions, create `BuiltRule` instances
 * by mapping each definition's `type` to the appropriate factory function.
 */
export function createRulesFromDefinitions (networks: Network[], definitions: RuleDefinition[]): BuiltRule[] {
  const createdRules: BuiltRule[] = definitions.map((def) => {
    const { type, chainId, params } = def

    if (type === undefined) {
      throw new Error('Missing rule type')
    }

    if (chainId === undefined) {
      throw new Error('Missing chainId')
    }

    if (getProviderByChainId(networks, chainId) === undefined) {
      throw new Error(`Chain ID ${chainId} not found in networks`)
    }

    // Find a rule factory function by the "type" key
    const factory = ruleFactories[type]
    if (factory === undefined) {
      throw new Error(`Unknown rule type: "${type}"`)
    }

    // For each known type, call the factory with params
    switch (type) {
      case 'walletBalance':
      case 'contractBalance':
      case 'erc20Balance':
      case 'numTransactions':
      case 'hasNFT':
      case 'hasNFTTokenId':
      case 'addressIsContract':
      case 'addressIsEOA':
      case 'callContract':
        return factory(networks, chainId, params)

      default:
        throw new Error(`No constructor logic for rule type: "${type}"`)
    }
  })

  return createdRules
}

export interface walletBalanceParams {
  value: bigint
  compareType: 'eq' | 'gt' | 'gte' | 'lt' | 'lte'
}

/**
 * Checks if a wallet's balance satisfies the condition defined by compareType and value.
 */
export function walletBalance (networks: Network[], chainId: string, params: walletBalanceParams): BuiltRule {
  if (params.value === undefined || params.value === null) {
    throw new Error('`value` is required')
  }
  if (!['eq', 'gt', 'gte', 'lt', 'lte'].includes(params.compareType)) {
    throw new Error('`compareType` is required and must be one of eq, gt, gte, lt, lte')
  }

  const rule = async (address?: string): Promise<RuleResult> => {
    const ruleName = `Wallet balance ${params.compareType} ${params.value}`
    if (address === undefined || address === null || address === '') {
      throw new Error('`address` is required')
    }

    try {
      const provider = getProviderByChainId(networks, chainId)
      if (provider === undefined) {
        throw new Error(`No provider found for chainId: ${chainId}`)
      }
      const balance = await provider.getBalance(address)
      const balanceBig = BigInt(balance.toString())
      let success = false

      switch (params.compareType) {
        case 'eq':
          success = balanceBig === params.value
          break
        case 'gt':
          success = balanceBig > params.value
          break
        case 'gte':
          success = balanceBig >= params.value
          break
        case 'lt':
          success = balanceBig < params.value
          break
        case 'lte':
          success = balanceBig <= params.value
          break
        default:
          throw new Error(`Unsupported compareType: ${params.compareType}`)
      }

      return { name: ruleName, success }
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message }
    }
  }

  return {
    rule,
    definition: {
      type: 'walletBalance',
      params: {
        value: params.value.toString(),
        compareType: params.compareType
      },
      chainId
    }
  }
}

export interface contractBalanceParams {
  contractAddress: string
  value: bigint
  compareType: 'eq' | 'gt' | 'gte' | 'lt' | 'lte'
}

/**
 * Checks if a specific contract's balance satisfies the condition defined by compareType and value.
 */
export function contractBalance (networks: Network[], chainId: string, params: contractBalanceParams): BuiltRule {
  if (params.contractAddress === undefined || params.contractAddress === null) {
    throw new Error('`contractAddress` is required')
  }
  if (params.value === undefined || params.value === null) {
    throw new Error('`value` is required')
  }
  if (!['eq', 'gt', 'gte', 'lt', 'lte'].includes(params.compareType)) {
    throw new Error('`compareType` is required and must be one of eq, gt, gte, lt, lte')
  }

  const rule = async (): Promise<RuleResult> => {
    const ruleName = `Contract balance ${params.compareType} ${params.value} at ${params.contractAddress}`
    try {
      const provider = getProviderByChainId(networks, chainId)
      if (provider === undefined) {
        throw new Error(`No provider found for chainId: ${chainId}`)
      }
      const balance = await provider.getBalance(params.contractAddress)
      const balanceBig = BigInt(balance.toString())
      let success = false

      switch (params.compareType) {
        case 'eq':
          success = balanceBig === params.value
          break
        case 'gt':
          success = balanceBig > params.value
          break
        case 'gte':
          success = balanceBig >= params.value
          break
        case 'lt':
          success = balanceBig < params.value
          break
        case 'lte':
          success = balanceBig <= params.value
          break
        default:
          throw new Error(`Unsupported compareType: ${params.compareType}`)
      }

      return { name: ruleName, success }
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message }
    }
  }

  return {
    rule,
    definition: {
      type: 'contractBalance',
      params: {
        contractAddress: params.contractAddress,
        value: params.value.toString(),
        compareType: params.compareType
      },
      chainId
    }
  }
}

export interface erc20BalanceParams {
  tokenAddress: string
  value: bigint
  compareType: 'eq' | 'gt' | 'gte' | 'lt' | 'lte'
}

/**
 * Checks if `address` holds an ERC-20 balance that satisfies the condition defined by compareType and value.
 */
export function erc20Balance (networks: Network[], chainId: string, params: erc20BalanceParams): BuiltRule {
  if (params.tokenAddress === undefined || params.tokenAddress === null) {
    throw new Error('`tokenAddress` is required')
  }
  if (params.value === undefined || params.value === null) {
    throw new Error('`value` is required')
  }
  if (!['eq', 'gt', 'gte', 'lt', 'lte'].includes(params.compareType)) {
    throw new Error('`compareType` is required and must be one of eq, gt, gte, lt, lte')
  }

  const rule = async (address?: string): Promise<RuleResult> => {
    const ruleName = `ERC20 balance ${params.compareType} ${params.value} (token: ${params.tokenAddress})`
    if (address === undefined || address === null || address === '') {
      throw new Error('`address` is required')
    }
    try {
      const provider = getProviderByChainId(networks, chainId)
      if (provider === undefined) {
        throw new Error(`No provider found for chainId: ${chainId}`)
      }
      const abi = ['function balanceOf(address) view returns (uint256)']
      const contract = new ethers.Contract(params.tokenAddress, abi, provider)
      const balance = await contract.balanceOf(address)
      const balanceBig = BigInt(balance.toString())
      let success = false

      switch (params.compareType) {
        case 'eq':
          success = balanceBig === params.value
          break
        case 'gt':
          success = balanceBig > params.value
          break
        case 'gte':
          success = balanceBig >= params.value
          break
        case 'lt':
          success = balanceBig < params.value
          break
        case 'lte':
          success = balanceBig <= params.value
          break
        default:
          throw new Error(`Unsupported compareType: ${params.compareType}`)
      }

      return { name: ruleName, success }
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message }
    }
  }

  return {
    rule,
    definition: {
      type: 'erc20Balance',
      params: {
        tokenAddress: params.tokenAddress,
        value: params.value.toString(),
        compareType: params.compareType
      },
      chainId
    }
  }
}

export interface numTransactionsParams {
  value: bigint
  compareType: 'eq' | 'gt' | 'gte' | 'lt' | 'lte'
}

/**
 * Checks if the number of transactions (nonce) satisfies the condition defined by compareType and value.
 */
export function numTransactions (networks: Network[], chainId: string, params: numTransactionsParams): BuiltRule {
  if (params.value === undefined || params.value === null) {
    throw new Error('`value` is required')
  }
  if (!['eq', 'gt', 'gte', 'lt', 'lte'].includes(params.compareType)) {
    throw new Error('`compareType` is required and must be one of eq, gt, gte, lt, lte')
  }

  const rule = async (address?: string): Promise<RuleResult> => {
    const ruleName = `Number of transactions ${params.compareType} ${params.value}`
    if (address === undefined || address === null || address === '') {
      throw new Error('`address` is required')
    }
    try {
      const provider = getProviderByChainId(networks, chainId)
      if (provider === undefined) {
        throw new Error(`No provider found for chainId: ${chainId}`)
      }
      const txCount = await provider.getTransactionCount(address)
      const txCountBig = BigInt(txCount)
      let success = false

      switch (params.compareType) {
        case 'eq':
          success = txCountBig === params.value
          break
        case 'gt':
          success = txCountBig > params.value
          break
        case 'gte':
          success = txCountBig >= params.value
          break
        case 'lt':
          success = txCountBig < params.value
          break
        case 'lte':
          success = txCountBig <= params.value
          break
        default:
          throw new Error(`Unsupported compareType: ${params.compareType}`)
      }

      return { name: ruleName, success }
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message }
    }
  }

  return {
    rule,
    definition: {
      type: 'numTransactions',
      params: {
        value: params.value.toString(),
        compareType: params.compareType
      },
      chainId
    }
  }
}

export interface hasNFTParams {
  nftAddress: string
}

/**
 * Checks if `address` has at least 1 token in an ERC-721 collection (`nftAddress`).
 */
export function hasNFT (networks: Network[], chainId: string, params: hasNFTParams): BuiltRule {
  if (params.nftAddress === undefined || params.nftAddress === null) {
    throw new Error('`nftAddress` is required')
  }
  const rule = async (address?: string): Promise<RuleResult> => {
    const ruleName = `Address has at least 1 NFT from ${params.nftAddress}`
    if (address === undefined || address === null || address === '') {
      throw new Error('`address` is required')
    }
    try {
      const provider = getProviderByChainId(networks, chainId)
      if (provider === undefined) {
        throw new Error(`No provider found for chainId: ${chainId}`)
      }
      const abi = ['function balanceOf(address owner) view returns (uint256)']
      const contract = new ethers.Contract(params.nftAddress, abi, provider)
      const balance = await contract.balanceOf(address)
      const balanceBig = BigInt(balance.toString())
      const success = balanceBig >= 1n
      return { name: ruleName, success }
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message }
    }
  }
  return {
    rule,
    definition: {
      type: 'hasNFT',
      params: { nftAddress: params.nftAddress },
      chainId
    }
  }
}

export interface hasNFTTokenIdParams {
  nftAddress: string
  tokenId: bigint
}

/**
 * Checks if `address` has an ERC721 (tokenId) at `nftAddress`.
 */
export function hasNFTTokenId (networks: Network[], chainId: string, params: hasNFTTokenIdParams): BuiltRule {
  if (params.nftAddress === undefined || params.nftAddress === null) {
    throw new Error('`nftAddress` is required')
  }
  if (params.tokenId === undefined || params.tokenId === null) {
    throw new Error('`tokenId` is required')
  }
  const rule = async (address?: string): Promise<RuleResult> => {
    const ruleName = `Address has NFT ${params.nftAddress} #${params.tokenId}`
    if (address === undefined || address === null || address === '') {
      throw new Error('`address` is required')
    }
    try {
      const provider = getProviderByChainId(networks, chainId)
      if (provider === undefined) {
        throw new Error(`No provider found for chainId: ${chainId}`)
      }
      const abi = ['function ownerOf(uint256 tokenId) external view returns (address)']
      const nftContract = new ethers.Contract(params.nftAddress, abi, provider)
      const actualOwner = await nftContract.ownerOf(params.tokenId)
      const success = actualOwner.toLowerCase() === address.toLowerCase()
      return { name: ruleName, success }
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message }
    }
  }
  return {
    rule,
    definition: {
      type: 'hasNFTTokenId',
      params: { nftAddress: params.nftAddress, tokenId: params.tokenId.toString() },
      chainId
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface addressIsContractParams {}

/**
 * Checks if the address is a contract.
 */
export function addressIsContract (networks: Network[], chainId: string, params: addressIsContractParams): BuiltRule {
  const rule = async (address?: string): Promise<RuleResult> => {
    const ruleName = `Address is contract: ${address}`
    if (address === undefined || address === null || address === '') {
      throw new Error('`address` is required')
    }
    try {
      const provider = getProviderByChainId(networks, chainId)
      if (provider === undefined) {
        throw new Error(`No provider found for chainId: ${chainId}`)
      }
      const code = await provider.getCode(address)
      const success = code !== '0x'
      return { name: ruleName, success }
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message }
    }
  }
  return {
    rule,
    definition: {
      type: 'addressIsContract',
      params,
      chainId
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface addressIsEOAParams {}

/**
 * Checks if the address is EOA.
 */
export function addressIsEOA (networks: Network[], chainId: string, params: addressIsEOAParams): BuiltRule {
  const rule = async (address?: string): Promise<RuleResult> => {
    const ruleName = `Address is EOA: ${address}`
    if (address === undefined || address === null || address === '') {
      throw new Error('`address` is required')
    }
    try {
      const provider = getProviderByChainId(networks, chainId)
      if (provider === undefined) {
        throw new Error(`No provider found for chainId: ${chainId}`)
      }
      const code = await provider.getCode(address)
      const success = code === '0x'
      return { name: ruleName, success }
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message }
    }
  }
  return {
    rule,
    definition: {
      type: 'addressIsEOA',
      params,
      chainId
    }
  }
}

export interface callContractParams {
  contractAddress: string
  functionName: string
  abi: any[]
  requiredResult: any
  compareType: 'eq' | 'gt' | 'gte' | 'lt' | 'lte'
}

export function callContract (networks: Network[], chainId: string, params: callContractParams): BuiltRule {
  if (params.contractAddress === undefined || params.contractAddress === null) {
    throw new Error('`contractAddress` is required')
  }
  if (params.functionName === undefined || params.functionName === null) {
    throw new Error('`functionName` is required')
  }
  if (params.abi === undefined || params.abi === null || params.abi.length === 0) {
    throw new Error('`abi` is required')
  }

  const rule = async (...ruleParams: any[]): Promise<RuleResult> => {
    const ruleName = `callContract ${params.contractAddress} ${params.functionName}`
    try {
      const provider = getProviderByChainId(networks, chainId)
      if (provider === undefined) {
        throw new Error(`No provider found for chainId: ${chainId}`)
      }
      const contract = new ethers.Contract(params.contractAddress, params.abi, provider)
      const rawResult = await contract[params.functionName](...ruleParams)
      let success = false

      if (typeof rawResult === 'boolean') {
        if (typeof params.requiredResult !== 'boolean') {
          throw new Error('Contract returned boolean but \'requiredResult\' is not boolean.')
        }
        if (params.compareType !== 'eq') {
          throw new Error(`compareType '${params.compareType}' not supported for boolean comparison.`)
        }
        success = (rawResult === params.requiredResult)
      } else if (typeof rawResult === 'string') {
        if (typeof params.requiredResult !== 'string') {
          throw new Error('Contract returned string but \'requiredResult\' is not string.')
        }
        if (params.compareType === 'eq') {
          success = (rawResult === params.requiredResult)
        } else {
          throw new Error(`compareType '${params.compareType}' not supported for string comparison.`)
        }
      } else if (typeof rawResult === 'bigint' || typeof rawResult === 'number') {
        const resultAsBigInt: bigint = typeof rawResult === 'bigint' ? rawResult : BigInt(rawResult)
        const requiredAsBigInt: bigint = BigInt(params.requiredResult)
        switch (params.compareType) {
          case 'eq':
            success = (resultAsBigInt === requiredAsBigInt)
            break
          case 'gt':
            success = (resultAsBigInt > requiredAsBigInt)
            break
          case 'gte':
            success = (resultAsBigInt >= requiredAsBigInt)
            break
          case 'lt':
            success = (resultAsBigInt < requiredAsBigInt)
            break
          case 'lte':
            success = (resultAsBigInt <= requiredAsBigInt)
            break
          default:
            throw new Error(`Unsupported compareType: ${params.compareType}`)
        }
      } else {
        throw new Error(`Unsupported return type from contract function: ${typeof rawResult}`)
      }
      return { name: ruleName, success }
    } catch (err: any) {
      return { name: ruleName, success: false, error: err.message }
    }
  }

  return {
    rule,
    definition: {
      type: 'callContract',
      params: {
        contractAddress: params.contractAddress,
        functionName: params.functionName,
        abi: params.abi,
        requiredResult: params.requiredResult
      },
      chainId
    }
  }
}
