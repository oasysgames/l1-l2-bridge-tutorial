import { defineChain } from 'viem'
import { chainConfig } from 'viem/op-stack'
import { ChainId } from '../types'

export const HomeVerseTestnet = /*#__PURE__*/ defineChain({
  ...chainConfig,
  id: ChainId.HOME_VERSE_TESTNET,
  version: 0,
  name: 'HOME Verse Testnet',
  nativeCurrency: { name: 'Oasys', symbol: 'OAS', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.oasys.homeverse.games'],
    },
  },
  blockExplorers: {
    default: {
      name: 'HOME Verse Testnet Explorer',
      url: 'https://explorer.testnet.oasys.homeverse.games',
    },
  },
  contracts: {
    ...chainConfig.contracts,
    l1StandardBridge: {
      [ChainId.OASYS_TESTNET]: {
        address: '0xb4Ca1bf8f3eF20445d6105dC9085A83300c8B5C7',
      },
    },
    l1CrossDomainMessenger: {
      [ChainId.OASYS_TESTNET]: {
        address: '0x730C6E2B19d55e59AdB51C50E0444ddea73d3C4e',
      },
    },
    portal: {
      [ChainId.OASYS_TESTNET]: {
        address: '0x',
      },
    },
    l2OutputOracle: {
      [ChainId.OASYS_TESTNET]: {
        address: '0x',
      },
    },
  },
  testnet: true,
})
