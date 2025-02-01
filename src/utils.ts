import { Provider } from "ethers";
import { Network } from "./types";

export function getProviderByChainId(
  networks: Network[],
  chainId: string
): Provider | undefined {
  const network = networks.find((net) => net.chainId === chainId);
  return network?.provider;
}

