import { defineChain } from 'viem'
import { chainConfig } from 'viem/op-stack'

import { ChainId, TokenIndex } from '../types'

export const TCGVerse = /*#__PURE__*/ defineChain({
	id: ChainId.TCG,
	version: 0,
	name: 'TCG Verse',
	nativeCurrency: { name: 'Oasys', symbol: 'OAS', decimals: 18 },
	rpcUrls: {
		default: {
			http: ['https://rpc.tcgverse.xyz'],
		},
	},
	blockExplorers: {
		default: {
			name: 'TCG Verse scan',
			url: 'https://explorer.tcgverse.xyz',
		},
	},
	contracts: {
		...chainConfig.contracts,
		l1StandardBridge: {
			[ChainId.OASYS]: {
				address: '0xa34a85ecb19c88d4965EcAfB10019E63050a1098',
			},
		},
		l1CrossDomainMessenger: {
			[ChainId.OASYS]: {
				address: '0xF02ae75EfB55ec727e81B6a417fC418CE0C7f557',
			},
		},
		portal: {
			[ChainId.OASYS]: {
				address: '0x',
			},
		},
	},
	erc20Addresses: {
		[TokenIndex.USDT]: '0x9e1028F5F1D5eDE59748FFceE5532509976840E0',
		[TokenIndex.TCGC]: '0xA29b548056c3fD0f68BAd9d4829EC4E66f22f796',
		// [TokenIndex.MCHC]: '0xcfD1D50ce23C46D3Cf6407487B2F8934e96DC8f9',
		// [TokenIndex.TOTEM]: '0xc8058960a9d7E7d81143BDBA38d19e6824165932',
		// [TokenIndex.DMT]: '0x35D48A789904E9b15705977192e5d95e2aF7f1D3',
		// [TokenIndex.USDCeLegacy]: '0x3bB4445D30AC020a84c1b5A8A2C6248ebC9779D0',
	},
})
