import { defineChain } from 'viem'
import { oasys } from 'viem/chains'

import { ChainId, TokenIndex } from '../types'

export const Oasys = defineChain({
	...oasys,
	id: ChainId.OASYS,
	rpcUrls: {
		default: {
			http: ['https://rpc.mainnet.oasys.games'],
		},
	},
	contracts: {
		...oasys.contracts,
		multicall3: {
			address: '0x75780EBc1fC6abfaCf6e34F936DF3F7Ee634EbC0',
		},
	},
	erc20Addresses: {
		[TokenIndex.USDT]: '0xDc3af65eCBD339309Ec55F109CB214E0325c5eD4',
		[TokenIndex.TCGC]: '0xdDB07cc0f2F9fB7899DbA5a21964f3C6D2740e44',
	},
})
