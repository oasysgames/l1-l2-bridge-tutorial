import { parseEventLogs, TransactionReceipt, keccak256, PublicClient } from 'viem'
import { SentMessageEventAbi } from '../abis'
import { encodeCrossDomainMessage } from './encoding'

/**
 * @param r
 * @param value
 * @returns 
 */
export function getMessageHash(r: TransactionReceipt, value: bigint): string {
  const logs = parseEventLogs({
    abi: SentMessageEventAbi,
    eventName: 'SentMessage',
    logs: r.logs,
  })

  const log = logs[0] as any

  const target = log.args[0] as `0x${string}`
  const sender = log.args[1] as `0x${string}`
  const message = log.args[2] as `0x${string}`
  const messageNonce = log.args[3] as bigint
  const gasLimit = log.args[4] as bigint

  console.log('SentMessage', log.args)

  const hash = keccak256(encodeCrossDomainMessage(messageNonce, sender, target, value, gasLimit, message))

  return hash
}

const RelayedMessageEventABI = [
  {
		anonymous: false,
		inputs: [
			{ indexed: true, internalType: 'bytes32', name: 'msgHash', type: 'bytes32' },
		],
		name: 'RelayedMessage',
		type: 'event',
	},
]

/**
 * 
 * @param publicClient 
 * @param contractAddr 
 * @param receipt 
 * @param value 
 * @returns 
 */
export async function waitForRelayedMessage(publicClient: PublicClient, contractAddr: `0x${string}`, receipt: TransactionReceipt, value: bigint): Promise<`0x${string}`> {
  const msgHash = getMessageHash(receipt, value)
  console.log('Got msgHash', msgHash)
  console.log('Watch event', publicClient.chain?.rpcUrls, 'Contract: ', contractAddr, 'From block number:', receipt.blockNumber)

  const txHash = await new Promise<`0x${string}`>((res) => {
    const unwatch = publicClient.watchContractEvent({
      address: contractAddr,
      abi: RelayedMessageEventABI,
      eventName: 'RelayedMessage',
      args: { msgHash },
      onLogs: logs => {
        console.log(logs)
        unwatch()
        res((logs[0] as any).transactionHash)
      },
      pollingInterval: 30000, // 30s
    })
  })

  return txHash
}
