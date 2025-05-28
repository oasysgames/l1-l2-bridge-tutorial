import { defineChain } from 'viem'
import { chainConfig } from 'viem/op-stack'
import { ChainId } from '../types'

export const HomeVerse = /*#__PURE__*/ defineChain({
  ...chainConfig,
  id: ChainId.HOME_VERSE,
  version: 0,
  name: 'HOME Verse',
  nativeCurrency: { name: 'Oasys', symbol: 'OAS', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.mainnet.oasys.homeverse.games'],
    },
  },
  blockExplorers: {
    default: {
      name: 'HOME Verse Explorer',
      url: 'https://explorer.oasys.homeverse.games',
    },
  },
  contracts: {
    ...chainConfig.contracts,
    l1StandardBridge: {
      [ChainId.OASYS]: {
        address: '0x9245e19eB88de2534E03E764FB2a5f194e6d97AD',
      },
    },
    l1CrossDomainMessenger: {
      [ChainId.OASYS]: {
        address: '0xa04B03350eE9E3fdd1C2f63fAD5e0CabBb476594',
      },
    },
    portal: {
      [ChainId.OASYS]: {
        address: '0x',
      },
    },
    l2OutputOracle: {
      [ChainId.OASYS]: {
        address: '0x',
      },
    },
  },
})
