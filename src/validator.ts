import { z } from 'zod'
import type { BuiltRule } from './types'

const compareTypeSchema = z.enum(['eq', 'gt', 'gte', 'lt', 'lte'])

// Params schemas for each rule type
const walletBalanceParamsSchema = z.object({
  value: z.string(),
  compareType: compareTypeSchema
})

const contractBalanceParamsSchema = z.object({
  contractAddress: z.string(),
  value: z.string(),
  compareType: compareTypeSchema
})

const erc20BalanceParamsSchema = z.object({
  tokenAddress: z.string(),
  value: z.string(),
  compareType: compareTypeSchema
})

const numTransactionsParamsSchema = z.object({
  value: z.string(),
  compareType: compareTypeSchema
})

const hasNFTParamsSchema = z.object({
  nftAddress: z.string()
})

const hasNFTTokenIdParamsSchema = z.object({
  nftAddress: z.string(),
  tokenId: z.string()
})

const addressIsContractParamsSchema = z.object({}) // Empty params
const addressIsEOAParamsSchema = z.object({}) // Empty params

const callContractParamsSchema = z.object({
  contractAddress: z.string(),
  functionName: z.string(),
  abi: z.array(z.any()),
  requiredResult: z.any(),
  compareType: compareTypeSchema
})

const ruleResultSchema = z.object({
  name: z.string(),
  success: z.boolean(),
  error: z.string().optional()
})

const ruleFunctionSchema = z.function()
  .args(z.string().optional())
  .returns(z.union([ruleResultSchema, z.promise(ruleResultSchema)]))

// A discriminated union based on the "type" property
export const ruleDefinitionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('walletBalance'),
    chainId: z.string(),
    params: walletBalanceParamsSchema
  }),
  z.object({
    type: z.literal('contractBalance'),
    chainId: z.string(),
    params: contractBalanceParamsSchema
  }),
  z.object({
    type: z.literal('erc20Balance'),
    chainId: z.string(),
    params: erc20BalanceParamsSchema
  }),
  z.object({
    type: z.literal('numTransactions'),
    chainId: z.string(),
    params: numTransactionsParamsSchema
  }),
  z.object({
    type: z.literal('hasNFT'),
    chainId: z.string(),
    params: hasNFTParamsSchema
  }),
  z.object({
    type: z.literal('hasNFTTokenId'),
    chainId: z.string(),
    params: hasNFTTokenIdParamsSchema
  }),
  z.object({
    type: z.literal('addressIsContract'),
    chainId: z.string(),
    params: addressIsContractParamsSchema
  }),
  z.object({
    type: z.literal('addressIsEOA'),
    chainId: z.string(),
    params: addressIsEOAParamsSchema
  }),
  z.object({
    type: z.literal('callContract'),
    chainId: z.string(),
    params: callContractParamsSchema
  }),
  z.object({
    type: z.literal('custom'),
    chainId: z.string(),
    params: z.object({})
  })
])

export const builtRuleSchema: z.ZodSchema<BuiltRule> = z.object({
  rule: ruleFunctionSchema,
  definition: ruleDefinitionSchema
})

export const rulesDefinitionArraySchema = z.array(ruleDefinitionSchema)
