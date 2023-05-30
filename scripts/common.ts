import hre from 'hardhat'
import {
  TransactionReceipt,
  Log,
  Filter,
} from '@ethersproject/abstract-provider'

const log = (...lines: string[]) => process.stdout.write(lines.join('\n'))

// Switch Hardhat network.
const switchNetwork = (name: 'l1' | 'l2') => hre.changeNetwork(name)

// List of contract addresses.
const addresses = {
  l1: {
    // Oasys pre-deployed contracts.
    L1StandardERC20Factory: '0x5200000000000000000000000000000000000004',
    L1StandardERC721Factory: '0x5200000000000000000000000000000000000005',

    // Sand Verse Contracts. Address is different for each Verse-Layer.
    Proxy__OVM_L1CrossDomainMessenger:
      '0xa04B03350eE9E3fdd1C2f63fAD5e0CabBb476594',
    Proxy__OVM_L1StandardBridge: '0x9245e19eB88de2534E03E764FB2a5f194e6d97AD',
    Proxy__OVM_L1ERC721Bridge: '0x8D736Ad22D106dE9Cf50D0D18D571041a47DD333',

    // Local verse
    // Proxy__OVM_L1CrossDomainMessenger:
    //   '0xb6B18AA53111D21F9bc892F04815930030C42EFD',
    // Proxy__OVM_L1StandardBridge: '0xA16517A9796bAc73eFA7d07269F9818b7978dc2A',
    // Proxy__OVM_L1ERC721Bridge: '0x1931994b20c8E7BbA4eE7d6032fae4aEE64e929d',
  },
  l2: {
    // Verse-Layer pre-deployed Contracts. Same address for all Verse-Layers.
    OVM_OAS: '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000',
    L2CrossDomainMessenger: '0x4200000000000000000000000000000000000007',
    L2StandardBridge: '0x4200000000000000000000000000000000000010',
    L2StandardTokenFactory: '0x4200000000000000000000000000000000000012',
    L2ERC721Bridge: '0x6200000000000000000000000000000000000001',
  },
} as const

// Get hash value of CrossDomainMessage.
const getCrossDomainMessageHashesFromTx = async (
  messengerAddress: string,
  txHash: string,
): Promise<string[]> => {
  const receipt = await hre.ethers.provider.getTransactionReceipt(txHash)
  if (!receipt) {
    return []
  }

  // https://github.com/oasysgames/oasys-optimism/blob/efc5337e47936b2bbe2ea1a2c5281a210e0fe15e/packages/contracts/contracts/libraries/bridge/ICrossDomainMessenger.sol#L12-L18
  const sentMessageEventId = hre.ethers.utils.id(
    'SentMessage(address,address,bytes,uint256,uint256)',
  )

  // https://github.com/oasysgames/oasys-optimism/blob/efc5337e47936b2bbe2ea1a2c5281a210e0fe15e/packages/contracts/contracts/L2/messaging/IL2CrossDomainMessenger.sol#L22-L28
  const l2CrossDomainMessengerRelayinterface = new hre.ethers.utils.Interface([
    'function relayMessage(address _target,address _sender,bytes memory _message,uint256 _messageNonce)',
  ])

  const msgHashes = []
  for (const log of receipt.logs) {
    if (
      log.address === messengerAddress &&
      log.topics[0] === sentMessageEventId
    ) {
      const [sender, message, messageNonce] =
        hre.ethers.utils.defaultAbiCoder.decode(
          ['address', 'bytes', 'uint256'],
          log.data,
        )

      const [target] = hre.ethers.utils.defaultAbiCoder.decode(
        ['address'],
        log.topics[1],
      )

      const encodedMessage =
        l2CrossDomainMessengerRelayinterface.encodeFunctionData(
          'relayMessage',
          [target, sender, message, messageNonce],
        )

      msgHashes.push(
        hre.ethers.utils.solidityKeccak256(['bytes'], [encodedMessage]),
      )
    }
  }
  return msgHashes
}

// Get receipt of CrossDomainMessage relayed by relayer.
const getTransactionReceiptFromMsgHash = async (
  messengerAddress: string,
  msgHash: string,
): Promise<undefined | TransactionReceipt> => {
  const POLL_INTERVAL = 1000
  const BLOCKS_TO_FETCH = 1500

  // https://github.com/oasysgames/oasys-optimism/blob/efc5337e47936b2bbe2ea1a2c5281a210e0fe15e/packages/contracts/contracts/libraries/bridge/ICrossDomainMessenger.sol#L19
  const RELAYED_MESSAGE = hre.ethers.utils.id(`RelayedMessage(bytes32)`)

  // https://github.com/oasysgames/oasys-optimism/blob/efc5337e47936b2bbe2ea1a2c5281a210e0fe15e/packages/contracts/contracts/libraries/bridge/ICrossDomainMessenger.sol#L20
  const FAILED_RELAYED_MESSAGE = hre.ethers.utils.id(
    `FailedRelayedMessage(bytes32)`,
  )

  let matches: Log[] = []

  // scan for transaction with specified message
  while (matches.length === 0) {
    const blockNumber = await hre.ethers.provider.getBlockNumber()
    const startingBlock = Math.max(blockNumber - BLOCKS_TO_FETCH, 0)
    const successFilter: Filter = {
      address: messengerAddress,
      topics: [RELAYED_MESSAGE],
      fromBlock: startingBlock,
    }
    const failureFilter: Filter = {
      address: messengerAddress,
      topics: [FAILED_RELAYED_MESSAGE],
      fromBlock: startingBlock,
    }
    const successLogs = await hre.ethers.provider.getLogs(successFilter)
    const failureLogs = await hre.ethers.provider.getLogs(failureFilter)
    const logs = successLogs.concat(failureLogs)
    matches = logs.filter((log: Log) => log.topics[1] === msgHash)

    // pause awhile before trying again
    await new Promise((r) => setTimeout(r, POLL_INTERVAL))
  }

  // Message was relayed in the past
  if (matches.length > 0) {
    if (matches.length > 1) {
      throw Error('Found multiple transactions relaying the same message hash.')
    }
    return await hre.ethers.provider.getTransactionReceipt(
      matches[0].transactionHash,
    )
  }

  return undefined
}

const getTransactionReceiptFromMsgHashV2 = async (
  messengerAddress: string,
  msgHash: string,
): Promise<undefined | TransactionReceipt> => {
  const POLL_INTERVAL = 1000
  const BLOCKS_TO_FETCH = 5760 // 1 day

  // https://github.com/oasysgames/oasys-optimism/blob/efc5337e47936b2bbe2ea1a2c5281a210e0fe15e/packages/contracts/contracts/libraries/bridge/ICrossDomainMessenger.sol#L19
  const RELAYED_MESSAGE = hre.ethers.utils.id(`RelayedMessage(bytes32)`)

  // https://github.com/oasysgames/oasys-optimism/blob/efc5337e47936b2bbe2ea1a2c5281a210e0fe15e/packages/contracts/contracts/libraries/bridge/ICrossDomainMessenger.sol#L20
  const FAILED_RELAYED_MESSAGE = hre.ethers.utils.id(
    `FailedRelayedMessage(bytes32)`,
  )

  let matches: Log[] = []

  // scan for transaction with specified message
  const blockNumber = await hre.ethers.provider.getBlockNumber()
  const startingBlock = Math.max(blockNumber - BLOCKS_TO_FETCH, 0)
  console.log('msgHash', msgHash); //ここが時間と共に変わる模様
  const successFilter: Filter = {
    address: messengerAddress,
    topics: [RELAYED_MESSAGE],
    fromBlock: startingBlock,
  }
  const failureFilter: Filter = {
    address: messengerAddress,
    topics: [FAILED_RELAYED_MESSAGE],
    fromBlock: startingBlock,
  }
  const successLogs = await hre.ethers.provider.getLogs(successFilter)
  const failureLogs = await hre.ethers.provider.getLogs(failureFilter)
  const logs = successLogs.concat(failureLogs)
  matches = logs.filter((log: Log) => log.topics[1] === msgHash)

  // Message was relayed in the past
  if (matches.length > 0) {
    if (matches.length > 1) {
      throw Error('Found multiple transactions relaying the same message hash.')
    }
    return await hre.ethers.provider.getTransactionReceipt(
      matches[0].transactionHash,
    )
  } else if (matches.length === 0) {
    throw Error('Not found transaction relaying.')
  }
  return undefined
}

export {
  getCrossDomainMessageHashesFromTx,
  getTransactionReceiptFromMsgHash,
  getTransactionReceiptFromMsgHashV2,
  switchNetwork,
  addresses,
  log,
}
