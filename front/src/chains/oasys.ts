import { defineChain } from 'viem'
import { ChainId } from '../types'

export const Oasys = /*#__PURE__*/ defineChain({
  id: ChainId.OASYS,
  name: 'Oasys',
  nativeCurrency: { name: 'Oasys', symbol: 'OAS', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.mainnet.oasys.games'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Oasys Mainnet Explorer',
      url: 'https://explorer.oasys.games',
    },
  },
})
