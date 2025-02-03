import { type Provider } from 'ethers'
// import { readRulesFile } from './loadRules'
// import { createRulesFromDefinitions } from './rules'
import { type Network } from './types.js'

export function getProviderByChainId (
  networks: Network[],
  chainId: string
): Provider | undefined {
  const network = networks.find((net) => net.chainId === chainId)
  return network?.provider
}

/**
 * Helper function that combines `readRulesFile()` and `createRulesFromJson()`.
 */
// export function rulesFromJsonFile (networks: Network[], jsonFilePath: string): BuiltRule[] {
//   const rawDefinitions = readRulesFile(jsonFilePath)
//   return createRulesFromDefinitions(networks, rawDefinitions)
// }
