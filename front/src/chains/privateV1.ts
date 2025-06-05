import { defineChain } from 'viem'
import { chainConfig } from 'viem/op-stack'
import { ChainId } from '../types'

export const PrivateV1 = /*#__PURE__*/ defineChain({
  ...chainConfig,
  id: ChainId.PRIVATE_V1,
  version: 1,
  name: 'Private v1',
  nativeCurrency: { name: 'Oasys', symbol: 'OAS', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['http://127.0.0.1:18545'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Private v1 Explorer',
      url: 'http://127.0.0.1:4001',
    },
  },
  contracts: {
    ...chainConfig.contracts,
    l2Erc721Bridge: {
      address: '0x6200000000000000000000000000000000000001',
    },
    l1StandardBridge: {
      [ChainId.PRIVATE_L1]: {
        address: '0x2ecb238aeed84eB40F07144210B8260825B882F2', // Sample
      },
    },
    l1Erc721Bridge: {
      [ChainId.PRIVATE_L1]: {
        address: '0x87bd16B5c85afa2D93111F6b76C4097378EFE138', // Sample
      },
    },
    l1CrossDomainMessenger: {
      [ChainId.PRIVATE_L1]: {
        address: '0x09d0b2A42d28e60f98A9D8755E7347b8870eA01c', // Sample
      },
    },
    portal: {
      [ChainId.PRIVATE_L1]: {
        address: '0x4F56b7f2DD89e2A45C1CC177Edf0DcD6F64681a7', // Sample
      },
    },
    l2OutputOracle: {
      [ChainId.PRIVATE_L1]: {
        address: '0xAC62C88a7e3B821C265Cae3aa3f066404feFC490', // Sample
      },
    },
  },
  testnet: true,
})
