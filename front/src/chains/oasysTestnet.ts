import { defineChain } from 'viem'
import { ChainId } from '../types'

export const OasysTestnet = /*#__PURE__*/ defineChain({
  id: ChainId.OASYS_TESTNET,
  name: 'Oasys Testnet',
  nativeCurrency: { name: 'Oasys', symbol: 'OAS', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.oasys.games'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Oasys Testnet Explorer',
      url: 'https://explorer.testnet.oasys.games',
    },
  },
  testnet: true,
})
