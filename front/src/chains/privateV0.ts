import { defineChain } from 'viem'
import { chainConfig } from 'viem/op-stack'
import { ChainId } from '../types'

export const PrivateV0 = /*#__PURE__*/ defineChain({
  ...chainConfig,
  id: ChainId.PRIVATE_V0,
  version: 0,
  name: 'Private v0',
  nativeCurrency: { name: 'Oasys', symbol: 'OAS', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:18545'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Private v0 Explorer',
      url: 'http://127.0.0.1:4001',
    },
  },
  contracts: {
    ...chainConfig.contracts,
    l1StandardBridge: {
      [ChainId.PRIVATE_L1]: {
        address: '0xA16517A9796bAc73eFA7d07269F9818b7978dc2A',
      },
    },
    l1CrossDomainMessenger: {
      [ChainId.PRIVATE_L1]: {
        address: '0xb6B18AA53111D21F9bc892F04815930030C42EFD',
      },
    },
    portal: {
      [ChainId.PRIVATE_L1]: {
        address: '0x',
      },
    },
    l2OutputOracle: {
      [ChainId.PRIVATE_L1]: {
        address: '0x',
      },
    },
  },
  testnet: true,
})
