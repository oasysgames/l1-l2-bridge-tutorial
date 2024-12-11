import { defineChain } from 'viem'
import { chainConfig } from 'viem/op-stack'

import { ChainId } from '../types'

export const OasysTestnet = defineChain({
  ...chainConfig,
  id: ChainId.OASYS_TESTNET,
  name: 'Oasys testnet',
  nativeCurrency: { name: 'Oasys', symbol: 'OAS', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.oasys.games'],
    },
    public: {
      http: ['https://rpc.testnet.oasys.games'],
    },
  },
  contracts: {
    ...chainConfig.contracts,
    multicall3: {
      address: '0xCC65BeF5A01140a6fc7eEf4Bd6967228B6137e4b',
    },
  },
})
