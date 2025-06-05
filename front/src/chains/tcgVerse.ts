import { defineChain } from 'viem'
import { chainConfig } from 'viem/op-stack'
import { ChainId } from '../types'

export const TcgVerse = /*#__PURE__*/ defineChain({
  ...chainConfig,
  id: ChainId.TCG_VERSE,
  version: 1,
  name: 'TCG Verse',
  nativeCurrency: { name: 'Oasys', symbol: 'OAS', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.tcgverse.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'TCG Verse Explorer',
      url: 'https://explorer.tcgverse.xyz',
    },
  },
  contracts: {
    ...chainConfig.contracts,
    l2Erc721Bridge: {
      address: '0x6200000000000000000000000000000000000001',
    },
    l1StandardBridge: {
      [ChainId.OASYS]: {
        address: '0xa34a85ecb19c88d4965EcAfB10019E63050a1098',
      },
    },
    l1Erc721Bridge: {
      [ChainId.OASYS]: {
        address: '0x8C9Ea59ed25689Cc2d9F1449Dcde6319231AEC45',
      },
    },
    l1CrossDomainMessenger: {
      [ChainId.OASYS]: {
        address: '0xF02ae75EfB55ec727e81B6a417fC418CE0C7f557',
      },
    },
    portal: {
      [ChainId.OASYS]: {
        address: '0x2d53Aa3734E57Ee8C34190A256CE747362697B63',
      },
    },
    l2OutputOracle: {
      [ChainId.OASYS]: {
        address: '0x88cd3eF1250B6cb57d3bfB21A54b96c3c5710794',
      },
    },
  },
})
