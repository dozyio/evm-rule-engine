import { type Provider } from 'ethers'
import { type Network } from './types.js'

export function getProviderByChainId (
  networks: Network[],
  chainId: string
): Provider | undefined {
  const network = networks.find((net) => net.chainId === chainId)
  return network?.provider
}
