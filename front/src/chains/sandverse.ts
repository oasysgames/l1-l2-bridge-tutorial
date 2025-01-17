import { defineChain } from 'viem'
import { chainConfig } from 'viem/op-stack'

import { ChainId } from '../types'

export const SandVerse = defineChain({
  ...chainConfig,
  id: ChainId.SANDVERSE,
  version: 1,
  name: 'Sand Verse',
  nativeCurrency: { name: 'Oasys', symbol: 'OAS', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.sandverse.oasys.games'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Sand Verse scan',
      url: '',
    },
  },
  contracts: {
    ...chainConfig.contracts,
    l1StandardBridge: {
      [ChainId.OASYS_TESTNET]: {
        address: '0x9245e19eB88de2534E03E764FB2a5f194e6d97AD',
      },
    },
    l1CrossDomainMessenger: {
      [ChainId.OASYS_TESTNET]: {
        address: '0xa04B03350eE9E3fdd1C2f63fAD5e0CabBb476594',
      },
    },
    portal: {
			[ChainId.OASYS_TESTNET]: {
				address: '0xd1F4638035B367D7874b6fdc118bFD44bF62FA42',
			},
		},
		disputeGameFactory: {
			[ChainId.OASYS_TESTNET]: {
				address: '0x',
			},
		},
		l2OutputOracle: {
			[ChainId.OASYS_TESTNET]: {
				address: '0x018286121c03e7B8dB00fe5cd3CA3f9979c8F51d',
			},
		},
  },
})
