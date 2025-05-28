import { defineChain } from 'viem'
import { chainConfig } from 'viem/op-stack'
import { ChainId } from '../types'

export const TcgVerseTestnet = /*#__PURE__*/ defineChain({
  ...chainConfig,
  id: ChainId.TCG_VERSE_TESTNET,
  version: 1,
  name: 'TCG Verse Testnet',
  nativeCurrency: { name: 'Oasys', symbol: 'OAS', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.tcgverse.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'TCG Verse Testnet Explorer',
      url: 'https://explorer.testnet.tcgverse.xyz',
    },
  },
  contracts: {
    ...chainConfig.contracts,
    l1StandardBridge: {
      [ChainId.OASYS_TESTNET]: {
        address: '0xa40e6C690abf299269d8B2012f81E546ECAf802f',
      },
    },
    l1CrossDomainMessenger: {
      [ChainId.OASYS_TESTNET]: {
        address: '0x0Bb4216B0622C01CB6fFB87A6781D6F71e182de4',
      },
    },
    portal: {
      [ChainId.OASYS_TESTNET]: {
        address: '0x172f47ED34D80a244002325970e12082B42AFf94',
      },
    },
    l2OutputOracle: {
      [ChainId.OASYS_TESTNET]: {
        address: '0xD81994Ce9eeBB5dEdEEBD56F63b5851234C80CdC',
      },
    },
  },
  testnet: true,
})
