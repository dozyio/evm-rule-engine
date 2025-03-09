import { expect } from 'chai'
import { rulesDefinitionArraySchema } from '../src/validator.js'

describe('Zod Validator for Rules', () => {
  describe('Valid Definitions', () => {
    it('should validate a walletBalance rule', () => {
      const validWalletBalanceRule = {
        type: 'walletBalance',
        chainId: '1',
        params: {
          value: '1000000000000000000',
          compareType: 'gte'
        }
      }
      expect(() => rulesDefinitionArraySchema.parse([validWalletBalanceRule])).to.not.throw()
    })

    it('should validate a contractBalance rule', () => {
      const validContractBalanceRule = {
        type: 'contractBalance',
        chainId: '1',
        params: {
          contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
          value: '1000000000000000000',
          compareType: 'gt'
        }
      }
      expect(() => rulesDefinitionArraySchema.parse([validContractBalanceRule])).to.not.throw()
    })

    it('should validate an erc20Balance rule', () => {
      const validERC20BalanceRule = {
        type: 'erc20Balance',
        chainId: '1',
        params: {
          tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdef',
          value: '500000000000000000',
          compareType: 'eq'
        }
      }
      expect(() => rulesDefinitionArraySchema.parse([validERC20BalanceRule])).to.not.throw()
    })

    it('should validate a numTransactions rule', () => {
      const validNumTransactionsRule = {
        type: 'numTransactions',
        chainId: '1',
        params: {
          value: '10',
          compareType: 'lt'
        }
      }
      expect(() => rulesDefinitionArraySchema.parse([validNumTransactionsRule])).to.not.throw()
    })

    it('should validate a hasNFT rule', () => {
      const validHasNFTRule = {
        type: 'hasNFT',
        chainId: '1',
        params: {
          nftAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdef'
        }
      }
      expect(() => rulesDefinitionArraySchema.parse([validHasNFTRule])).to.not.throw()
    })

    it('should validate a hasNFTTokenId rule', () => {
      const validHasNFTTokenIdRule = {
        type: 'hasNFTTokenId',
        chainId: '1',
        params: {
          nftAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdef',
          tokenId: '1'
        }
      }
      expect(() => rulesDefinitionArraySchema.parse([validHasNFTTokenIdRule])).to.not.throw()
    })

    it('should validate an addressIsContract rule', () => {
      const validAddressIsContractRule = {
        type: 'addressIsContract',
        chainId: '1',
        params: {}
      }
      expect(() => rulesDefinitionArraySchema.parse([validAddressIsContractRule])).to.not.throw()
    })

    it('should validate an addressIsEOA rule', () => {
      const validAddressIsEOARule = {
        type: 'addressIsEOA',
        chainId: '1',
        params: {}
      }
      expect(() => rulesDefinitionArraySchema.parse([validAddressIsEOARule])).to.not.throw()
    })

    it('should validate a callContract rule', () => {
      const validCallContractRule = {
        type: 'callContract',
        chainId: '1',
        params: {
          contractAddress: '0x1234567890abcdef1234567890abcdef12345678',
          functionName: 'balanceOf',
          abi: [{}],
          requiredResult: '100',
          compareType: 'eq'
        }
      }
      expect(() => rulesDefinitionArraySchema.parse([validCallContractRule])).to.not.throw()
    })
  })

  describe('Invalid Definitions', () => {
    it('should fail when "type" is missing', () => {
      const missingTypeRule = {
        chainId: '1',
        params: {
          value: '1000',
          compareType: 'gte'
        }
      }
      expect(() => rulesDefinitionArraySchema.parse([missingTypeRule])).to.throw()
    })

    it('should fail when "chainId" is missing', () => {
      const missingChainIdRule = {
        type: 'walletBalance',
        params: {
          value: '1000',
          compareType: 'gte'
        }
      }
      expect(() => rulesDefinitionArraySchema.parse([missingChainIdRule])).to.throw()
    })

    it('should fail when required params field is missing', () => {
      const missingParamsFieldRule = {
        type: 'walletBalance',
        chainId: '1',
        params: {
          // "value" is missing
          compareType: 'gte'
        }
      }
      expect(() => rulesDefinitionArraySchema.parse([missingParamsFieldRule])).to.throw()
    })

    it('should fail when "compareType" is invalid', () => {
      const invalidCompareTypeRule = {
        type: 'walletBalance',
        chainId: '1',
        params: {
          value: '1000',
          compareType: 'invalid' // not one of the allowed enum values
        }
      }
      expect(() => rulesDefinitionArraySchema.parse([invalidCompareTypeRule])).to.throw()
    })

    it('should fail for an unknown rule type', () => {
      const unknownTypeRule = {
        type: 'unknownRule',
        chainId: '1',
        params: {}
      }
      expect(() => rulesDefinitionArraySchema.parse([unknownTypeRule])).to.throw()
    })

    it('should fail when a numeric parameter is not a string', () => {
      // For example, "value" should be a string representing a bigint.
      const nonStringValueRule = {
        type: 'numTransactions',
        chainId: '1',
        params: {
          value: 10, // should be a string
          compareType: 'eq'
        }
      }
      expect(() => rulesDefinitionArraySchema.parse([nonStringValueRule])).to.throw()
    })
  })
})
