import { defineChain } from 'viem'
import { chainConfig } from 'viem/op-stack'

import { ChainId, TokenIndex } from '../types'

export const SaakuruVerse = /*#__PURE__*/ defineChain({
	id: ChainId.SAAKURU,
	version: 1,
	name: 'Saakuru Verse',
	nativeCurrency: { name: 'Oasys', symbol: 'OAS', decimals: 18 },
	rpcUrls: {
		default: {
			http: ['https://rpc.saakuru.network'],
		},
	},
	blockExplorers: {
		default: {
			name: 'Saakuru Verse scan',
			url: 'https://explorer.saakuru.network',
		},
	},
	contracts: {
		...chainConfig.contracts,
		l1StandardBridge: {
			[ChainId.OASYS]: {
				address: '0x4FfA6d5745C2E78361ae91a36312524284F3D812',
			},
		},
		l1CrossDomainMessenger: {
			[ChainId.OASYS]: {
				address: '0xba6CB7A56057E55fAfD7f92d5716E0F48cFf727a',
			},
		},
		portal: {
			[ChainId.OASYS]: {
				address: '0xbA63529349fb6eC3D69bf1F7c988181d75484510',
			},
		},
		disputeGameFactory: {
			[ChainId.OASYS]: {
				address: '0x',
			},
		},
		l2OutputOracle: {
			[ChainId.OASYS]: {
				address: '0x14dC8d36E9aaEACae85e624e8F3bFc27c5FDA5a6',
			},
		},
	},
	erc20Addresses: {
		[TokenIndex.USDT]: '0x7c6b91D9Be155A6Db01f749217d76fF02A7227F2',
	},
})
