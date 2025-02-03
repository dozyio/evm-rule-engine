// import fs from 'fs'
// import path from 'path'
// import { expect } from 'chai'
// import { readRulesFile } from '../src/loadRules'

describe('Load Rules', function () {
  // describe('loadRulesFile()', function () {
  //   it('should load and parse a valid JSON file returning an array', function () {
  //     // Suppose we have a small fixture file or we can write one on the fly
  //     const tempJsonPath = path.join(__dirname, 'tempRules.json')
  //     const mockJson = JSON.stringify([
  //       { type: 'walletBalanceAtLeast', params: { minWei: '1000' } },
  //       { type: 'numTransactionsAtLeast', params: { minCount: '5' } }
  //     ])
  //
  //     // Write a temporary JSON file for testing
  //     fs.writeFileSync(tempJsonPath, mockJson, 'utf8')
  //
  //     const loaded = readRulesFile(tempJsonPath)
  //     expect(loaded).to.be.an('array')
  //     expect(loaded).to.have.lengthOf(2)
  //     expect(loaded[0].type).to.eq('walletBalanceAtLeast')
  //     expect(loaded[1].type).to.eq('numTransactionsAtLeast')
  //
  //     // Clean up
  //     fs.unlinkSync(tempJsonPath)
  //   })
  //
  //   it('should throw an error if the top-level is not an array', function () {
  //     const tempJsonPath = path.join(__dirname, 'tempBadRules.json')
  //     const mockJson = JSON.stringify({ type: 'walletBalanceAtLeast' })
  //     fs.writeFileSync(tempJsonPath, mockJson, 'utf8')
  //
  //     expect(() => readRulesFile(tempJsonPath)).to.throw('top-level is not an array')
  //
  //     fs.unlinkSync(tempJsonPath)
  //   })
  // })

  // describe('rulesFromJsonFile()', function () {
  //   it('should load and parse a valid JSON file returning an array', function () {
  //     // Suppose we have a small fixture file or we can write one on the fly
  //     const tempJsonPath = path.join(__dirname, 'tempRules.json')
  //     const mockJson = JSON.stringify([
  //       { type: 'walletBalanceAtLeast', chainId: CHAIN_ID_0, params: { minWei: '1000' } },
  //       { type: 'numTransactionsAtLeast', chainId: CHAIN_ID_0, params: { minCount: '5' } }
  //     ])
  //
  //     // Write a temporary JSON file for testing
  //     fs.writeFileSync(tempJsonPath, mockJson, 'utf8')
  //
  //     const loaded = rulesFromJsonFile(networks, tempJsonPath)
  //     expect(loaded).to.be.an('array')
  //     expect(loaded).to.have.lengthOf(2)
  //     expect(loaded[0].definition.type).to.eq('walletBalanceAtLeast')
  //     expect(loaded[1].definition.type).to.eq('numTransactionsAtLeast')
  //
  //     // Clean up
  //     fs.unlinkSync(tempJsonPath)
  //   })
  // })
})
