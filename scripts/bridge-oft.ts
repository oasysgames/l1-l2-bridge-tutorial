import hre from 'hardhat'
import { BigNumber } from 'ethers'
import { TransactionReceipt } from '@ethersproject/abstract-provider'

import {
  getCrossDomainMessageHashesFromTx,
  getTransactionReceiptFromMsgHash,
  switchNetwork,
  addresses,
  log,
} from './common'

// Get the token address on the Hub-Layer created by L1StandardERC20Factory.
const getL1ERC20AddressFromReceipt = (receipt: TransactionReceipt): string => {
  const logs = receipt.logs.filter(
    (x) =>
      x.address === addresses.l1.L1StandardERC20Factory &&
      x.topics[0] === hre.ethers.utils.id('ERC20Created(string,address)'),
  )
  for (const log of logs) {
    const [address] = hre.ethers.utils.defaultAbiCoder.decode(
      ['address'],
      log.topics[2],
    )
    return address
  }
}

// Get the token address on the Verse-Layer created by L2StandardTokenFactory.
const getL2ERC20AddressFromReceipt = (receipt: TransactionReceipt): string => {
  const logs = receipt.logs.filter(
    (x) =>
      x.address === addresses.l2.L2StandardTokenFactory &&
      x.topics[0] ===
        hre.ethers.utils.id('StandardL2TokenCreated(address,address)'),
  )
  for (const log of logs) {
    const [address] = hre.ethers.utils.defaultAbiCoder.decode(
      ['address'],
      log.topics[2],
    )
    return address
  }
}

const main = async () => {
  const oFT_NAME = 'Test oFT'
  const oFT_SYMBOL = 'ToFT'
  const oFT_AMOUNT = 1234

  // Get Hub-Layer pre-deployed contracts.
  switchNetwork('l1')
  const [signer] = await hre.ethers.getSigners()

  const l1ERC20Factory = (
    await hre.ethers.getContractFactory('L1StandardERC20Factory')
  ).attach(addresses.l1.L1StandardERC20Factory)

  const l1ERC20Bridge = await hre.ethers.getContractAt(
    'IL1StandardBridge',
    addresses.l1.Proxy__OVM_L1StandardBridge,
  )

  // Get Verse-Layer pre-deployed contracts.
  switchNetwork('l2')

  const l2ERC20Factory = await hre.ethers.getContractAt(
    'L2StandardTokenFactory',
    addresses.l2.L2StandardTokenFactory,
  )

  const l2ERC20Bridge = await hre.ethers.getContractAt(
    'IL2ERC20Bridge',
    addresses.l2.L2StandardBridge,
  )

  /**
   * Step 1
   */
  log('[Hub-Layer] Create oFT using L1StandardERC20Factory...')

  switchNetwork('l1')
  const tx1 = await l1ERC20Factory.createStandardERC20(oFT_NAME, oFT_SYMBOL)
  const receipt1 = await tx1.wait()
  const l1oft = await hre.ethers.getContractAt(
    'L1StandardERC20',
    getL1ERC20AddressFromReceipt(receipt1),
  )

  log(
    'done',
    `    tx: ${tx1.hash} (gas: ${receipt1.gasUsed})`,
    `    address: ${l1oft.address}\n\n`,
  )

  /**
   * Step 2
   */
  log('[Verse-Layer] Create oFT using L2StandardTokenFactory...')

  switchNetwork('l2')
  const tx2 = await l2ERC20Factory.createStandardL2Token(
    l1oft.address, // Need to pass token address on Hub-Layer.
    oFT_NAME,
    oFT_SYMBOL,
  )
  const receipt2 = await tx2.wait()
  const l2oft = await hre.ethers.getContractAt(
    'L2StandardERC20',
    getL2ERC20AddressFromReceipt(receipt2),
  )

  log(
    'done',
    `    tx: ${tx2.hash} (gas: ${receipt2.gasUsed})`,
    `    address: ${l2oft.address}\n\n`,
  )

  const getBalance = async (): Promise<BigNumber[]> => {
    switchNetwork('l1')
    const l1Balance = await l1oft.balanceOf(signer.address)

    switchNetwork('l2')
    const l2Balance = await l2oft.balanceOf(signer.address)

    return [l1Balance, l2Balance]
  }

  /**
   * Step 3
   */
  log('[Hub-Layer] Mint oFT...')

  switchNetwork('l1')
  const tx3 = await l1oft.mint(signer.address, oFT_AMOUNT)
  const receipt3 = await tx3.wait()

  let [l1Balance, l2Balance] = await getBalance()
  log(
    'done',
    `    tx: ${tx3.hash} (gas: ${receipt3.gasUsed})`,
    `    balance on Hub-Layer  : ${l1Balance}`,
    `    balance on Verse-Layer: ${l2Balance}\n\n`,
  )

  /**
   * Step 4
   */
  log('[Hub-Layer] Approve transferFrom of oFT to L1StandardBridge...')

  switchNetwork('l1')
  const tx4 = await l1oft.approve(l1ERC20Bridge.address, oFT_AMOUNT)
  const receipt4 = await tx4.wait()
  const allowance = await l1oft.allowance(signer.address, l1ERC20Bridge.address)

  log(
    'done',
    `    tx: ${tx4.hash} (gas: ${receipt4.gasUsed})`,
    `    allowance: ${allowance}\n\n`,
  )

  /**
   * Step 5
   */
  log('[Hub-Layer] Deposit and Lock oFT to L1StandardBridge...')

  switchNetwork('l1')
  const tx5 = await l1ERC20Bridge.depositERC20(
    l1oft.address,
    l2oft.address,
    oFT_AMOUNT,
    2_000_000,
    '0x',
  )
  const receipt5 = await tx5.wait()
  let start = new Date()

  ;[l1Balance, l2Balance] = await getBalance()
  log(
    'done',
    `    tx: ${tx5.hash} (gas: ${receipt5.gasUsed})`,
    `    balance on Hub-Layer  : ${l1Balance}`,
    `    balance on Verse-Layer: ${l2Balance}\n\n`,
  )

  /**
   * Step 6
   */
  log('[Hub-Layer > Verse-Layer] Wait for the Relayer to relay the message...')

  switchNetwork('l1')
  const [l1MsgHash] = await getCrossDomainMessageHashesFromTx(
    addresses.l1.Proxy__OVM_L1CrossDomainMessenger,
    tx5.hash,
  )

  switchNetwork('l2')
  const l2RelayTx = await getTransactionReceiptFromMsgHash(
    addresses.l2.L2CrossDomainMessenger,
    l1MsgHash,
  )

  ;[l1Balance, l2Balance] = await getBalance()
  log(
    'done',
    `    elapsed: ${(new Date().getTime() - start.getTime()) / 1000} sec`,
    `    relayer tx: ${l2RelayTx.transactionHash} (gas: ${l2RelayTx.gasUsed})`,
    `    message hash: ${l1MsgHash}`,
    `    balance on Hub-Layer  : ${l1Balance}`,
    `    balance on Verse-Layer: ${l2Balance}\n\n`,
  )

  /**
   * Step 7
   */
  log(`[Verse-Layer] Burn and Withdraw oFT using L2ERC20Bridge...`)

  switchNetwork('l2')
  const tx6 = await l2ERC20Bridge.withdraw(
    l2oft.address,
    oFT_AMOUNT,
    2_000_000,
    '0x',
  )
  const receipt6 = await tx6.wait()
  start = new Date()
  ;[l1Balance, l2Balance] = await getBalance()
  log(
    'done',
    `    tx: ${tx6.hash} (gas: ${receipt6.gasUsed})`,
    `    balance on Hub-Layer  : ${l1Balance}`,
    `    balance on Verse-Layer: ${l2Balance}\n\n`,
  )

  /**
   * Step 8
   */
  log(
    '[Verse-Layer > Hub-Layer] Wait for the Relayer to relay the message(takes 1~2 minutes)...',
  )

  switchNetwork('l2')
  const [l2MsgHash] = await getCrossDomainMessageHashesFromTx(
    addresses.l2.L2CrossDomainMessenger,
    tx6.hash,
  )

  switchNetwork('l1')
  const l1RelayTx = await getTransactionReceiptFromMsgHash(
    addresses.l1.Proxy__OVM_L1CrossDomainMessenger,
    l2MsgHash,
  )

  ;[l1Balance, l2Balance] = await getBalance()
  log(
    'done',
    `    elapsed: ${(new Date().getTime() - start.getTime()) / 1000} sec`,
    `    relayer tx: ${l1RelayTx.transactionHash} (gas: ${l1RelayTx.gasUsed})`,
    `    message hash: ${l2MsgHash}`,
    `    balance on Hub-Layer  : ${l1Balance}`,
    `    balance on Verse-Layer: ${l2Balance}\n\n`,
  )
}

main()
