import { parseEventLogs, parseAbiItem, TransactionReceipt, keccak256, PublicClient, Address } from 'viem'
import { SentMessageEventAbi } from '../abis'
import { encodeCrossDomainMessage } from './encoding'
import type { Abi, AbiEvent } from 'abitype'

interface WatchLogsOptions {
  client: PublicClient
  address: Address
  abi: Abi
  eventName: string
  args?: Partial<Record<string, any>>
  fromBlock?: bigint
  pollingInterval?: number // ms
  onLogs?: (logs: Awaited<ReturnType<PublicClient['getContractEvents']>>) => void
}

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

  const target = log.args[0] as Address
  const sender = log.args[1] as Address
  const message = log.args[2] as `0x${string}`
  const messageNonce = log.args[3] as bigint
  const gasLimit = log.args[4] as bigint

  console.info('Message contents:', log.args)

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
export async function waitForRelayedMessage(publicClient: PublicClient, contractAddr: Address, receipt: TransactionReceipt, value: bigint): Promise<`0x${string}`> {
  const msgHash = getMessageHash(receipt, value)

  console.info('Got msgHash:', msgHash)
  console.info('Start watching `RelayedMessage` event:', contractAddr)

  const txHash = await new Promise<`0x${string}`>((res) => {
    // Since using Filter with `publicClient.watchContractEvent` can be unreliable, watching events using getLogs instead.
    const unwatch = watchLogsWithPolling({
      client: publicClient,
      address: contractAddr,
      abi: RelayedMessageEventABI as Abi,
      eventName: 'RelayedMessage',
      args: { msgHash },
      onLogs: logs => {
        console.info('Message relayed:', logs)
        unwatch()
        res((logs[0] as any).transactionHash)
      },
    })
  })

  return txHash
}

/**
 * Watch contract events by polling eth_getLogs via getContractEvents.
 * @param options Configuration for polling.
 * @returns A function to stop polling.
 */
export function watchLogsWithPolling(options: WatchLogsOptions) {
  const {
    client,
    address,
    abi,
    eventName,
    args,
    onLogs,
    pollingInterval = 30_000,
  } = options

  let stopped = false

  const initialize = async (): Promise<bigint> => {
    if (options.fromBlock !== undefined) {
      return options.fromBlock
    }
    // get current block and start from next block
    const latest = await client.getBlockNumber()
    return latest + 1n
  }

  const start = async () => {
    let lastCheckedBlock = await initialize()

    const poll = async () => {
      if (stopped) return
      try {
        const latestBlock = await client.getBlockNumber()
        if (latestBlock >= lastCheckedBlock) {
          const logs = await client.getContractEvents({
            abi,
            address,
            eventName,
            args,
            fromBlock: lastCheckedBlock,
            toBlock: latestBlock,
          })
          // only call callback if provided
          if (onLogs && logs.length > 0) {
            onLogs(logs)
          }
          lastCheckedBlock = latestBlock + 1n
        }
      } catch (error) {
        console.error('Polling error:', error)
      } finally {
        if (!stopped) setTimeout(poll, pollingInterval)
      }
    }

    poll()
  }

  start()

  return () => {
    stopped = true
  }
}
