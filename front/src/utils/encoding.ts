// Reference https://github.com/oasysgames/oasys-opstack/tree/v1.1.0/packages/core-utils/src/optimism/encoding.ts

import { encodeFunctionData, parseAbi, Address } from 'viem'

const nonceMask = 0x0000ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn

/**
 * Encodes the version into the nonce.
 *
 * @param nonce
 * @param version
 */
export const encodeVersionedNonce = (
  nonce: bigint,
  version: bigint
): bigint => {
  return version | (nonce >> 240n)
}

/**
 * Decodes the version from the nonce and returns the unversioned nonce as well
 * as the version. The version is encoded in the first byte of
 * the nonce. Note that this nonce is the nonce held in the
 * CrossDomainMessenger.
 *
 * @param nonce
 */
export const decodeVersionedNonce = (
  nonce: bigint
): {
  version: bigint
  nonce: bigint
} => {
  return {
    version: nonce >> 240n,
    nonce: nonce & nonceMask,
  }
}

/**
 * Encodes a V1 cross domain message. This message format was used before
 * bedrock and does not support value transfer because ETH was represented as an
 * ERC20 natively.
 *
 * @param target    The target of the cross domain message
 * @param sender    The sender of the cross domain message
 * @param data      The data passed along with the cross domain message
 * @param nonce     The cross domain message nonce
 */
export const encodeCrossDomainMessageV0 = (
  target: Address,
  sender: Address,
  data: `0x${string}`,
  nonce: bigint
) => {
  return encodeFunctionData({
    abi: parseAbi(['function relayMessage(address,address,bytes,uint256)']),
    functionName: 'relayMessage',
    args: [target, sender, data, nonce]
  })
}

/**
 * Encodes a V1 cross domain message. This message format shipped with bedrock
 * and supports value transfer with native ETH.
 *
 * @param nonce     The cross domain message nonce
 * @param sender    The sender of the cross domain message
 * @param target    The target of the cross domain message
 * @param value     The value being sent with the cross domain message
 * @param gasLimit  The gas limit of the cross domain execution
 * @param data      The data passed along with the cross domain message
 */
export const encodeCrossDomainMessageV1 = (
  nonce: bigint,
  sender: Address,
  target: Address,
  value: bigint,
  gasLimit: bigint,
  data: `0x${string}`
) => {
  const abi = parseAbi(['function relayMessage(uint256 nonce,address sender,address target,uint256 value,uint256 gasLimit,bytes data)'])
  return encodeFunctionData({
    abi,
    functionName: 'relayMessage',
    args: [nonce, sender, target, value, gasLimit, data]
  })
}

/**
 * Encodes a cross domain message. The version byte in the nonce determines
 * the serialization format that is used.
 *
 * @param nonce     The cross domain message nonce
 * @param sender    The sender of the cross domain message
 * @param target    The target of the cross domain message
 * @param value     The value being sent with the cross domain message
 * @param gasLimit  The gas limit of the cross domain execution
 * @param data      The data passed along with the cross domain message
 */
export const encodeCrossDomainMessage = (
  nonce: bigint,
  sender: Address,
  target: Address,
  value: bigint,
  gasLimit: bigint,
  data: `0x${string}`,
) => {
  const { version } = decodeVersionedNonce(nonce)
  if (version === 0n) {
    return encodeCrossDomainMessageV0(target, sender, data, nonce)
  } else if (version === 1n) {
    if (value === undefined || gasLimit === undefined) {
      throw new Error(`No value or gasLimit provided for v1`)
    }
    return encodeCrossDomainMessageV1(
      nonce,
      sender,
      target,
      value,
      gasLimit,
      data
    )
  }
  throw new Error(`unknown version ${version.toString()}`)
}
