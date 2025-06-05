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
    l2Erc721Bridge: {
      address: '0x6200000000000000000000000000000000000001',
    },
    l1StandardBridge: {
      [ChainId.OASYS_TESTNET]: {
        address: '0xa40e6C690abf299269d8B2012f81E546ECAf802f',
      },
    },
    l1Erc721Bridge: {
      [ChainId.OASYS_TESTNET]: {
        address: '0x1c7506b8F4E7f8aCF7eEFb755eF8100AC24EEccC',
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
