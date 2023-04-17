import hre, { network } from 'hardhat'
import { BigNumber, ContractReceipt } from 'ethers'

import {
  switchNetwork,
  addresses,
  log,
  getCrossDomainMessageHashesFromTx,
  getTransactionReceiptFromMsgHash,
} from './common'

type network = 'l1' | 'l2'

class balanceLogger {
  _hist: { [n in network]: BigNumber[] } = { l1: [], l2: [] }

  constructor(public signer: string) {}

  async update() {
    switchNetwork('l1')
    this._hist.l1.push(await hre.ethers.provider.getBalance(this.signer))

    switchNetwork('l2')
    this._hist.l2.push(await hre.ethers.provider.getBalance(this.signer))
  }

  current(n: network, l1Receipt?: ContractReceipt): string {
    const current = this._hist[n].slice(-1)[0] || BigNumber.from(0)
    const diff = this._diff(n, l1Receipt)
    return `${current}${diff}`
  }

  _diff(n: network, l1Receipt?: ContractReceipt): string {
    let [a, b] = this._hist[n].slice(-2)
    if (!a || !b) {
      return ''
    }

    let c = b.sub(a)
    if (!l1Receipt) {
      return c.gte('0') ? ` (+${c})` : ` (${c})`
    }

    const gasUsed = l1Receipt.gasUsed.mul(l1Receipt.effectiveGasPrice)
    c = c.add(gasUsed)
    return c.gte('0') ? ` (+${c})` : ` (${c}, gas: -${gasUsed})`
  }
}

const main = async () => {
  const AMOUNT = 1234

  switchNetwork('l1')
  const [signer] = await hre.ethers.getSigners()

  // Get Hub-Layer pre-deployed contracts.
  const l1ERC20Bridge = await hre.ethers.getContractAt(
    'IL1StandardBridge',
    addresses.l1.Proxy__OVM_L1StandardBridge,
  )

  // Get Verse-Layer pre-deployed contracts.
  switchNetwork('l2')

  const l2ERC20Bridge = await hre.ethers.getContractAt(
    'IL2ERC20Bridge',
    addresses.l2.L2StandardBridge,
  )

  const balance = new balanceLogger(signer.address)
  await balance.update()

  log(
    '[Hub-Layer & Verse-Layer] Initial Balance',
    `    balance on Hub-Layer  : ${balance.current('l1')}`,
    `    balance on Verse-Layer: ${balance.current('l2')}\n\n`,
  )

  /**
   * Step 1
   */
  log('[Hub-Layer] Deposit and Lock OAS to L1StandardBridge...')

  switchNetwork('l1')
  const tx1 = await l1ERC20Bridge.depositETH(2_000_000, '0x', { value: AMOUNT })
  const receipt1 = await tx1.wait()
  let start = new Date()

  await balance.update()
  log(
    'done',
    `    tx: ${tx1.hash} (gas: ${receipt1.gasUsed})`,
    `    balance on Hub-Layer  : ${balance.current('l1', receipt1)}`,
    `    balance on Verse-Layer: ${balance.current('l2')}\n\n`,
  )

  /**
   * Step 2
   */
  log('[Hub-Layer > Verse-Layer] Wait for the Relayer to relay the message...')

  switchNetwork('l1')
  const [l1MsgHash] = await getCrossDomainMessageHashesFromTx(
    addresses.l1.Proxy__OVM_L1CrossDomainMessenger,
    tx1.hash,
  )

  switchNetwork('l2')
  const l2RelayTx = await getTransactionReceiptFromMsgHash(
    addresses.l2.L2CrossDomainMessenger,
    l1MsgHash,
  )

  await balance.update()
  log(
    'done',
    `    elapsed: ${(new Date().getTime() - start.getTime()) / 1000} sec`,
    `    relayer tx: ${l2RelayTx.transactionHash} (gas: ${l2RelayTx.gasUsed})`,
    `    message hash: ${l1MsgHash}`,
    `    balance on Hub-Layer  : ${balance.current('l1')}`,
    `    balance on Verse-Layer: ${balance.current('l2')}\n\n`,
  )

  /**
   * Step 3
   */
  log(`[Verse-Layer] Burn and Withdraw OAS using L2ERC20Bridge...`)

  switchNetwork('l2')
  const tx2 = await l2ERC20Bridge.withdraw(
    addresses.l2.OVM_OAS,
    AMOUNT,
    2_000_000,
    '0x',
  )
  const receipt2 = await tx2.wait()
  start = new Date()

  await balance.update()
  log(
    'done',
    `    tx: ${tx2.hash} (gas: ${receipt2.gasUsed})`,
    `    balance on Hub-Layer  : ${balance.current('l1')}`,
    `    balance on Verse-Layer: ${balance.current('l2')}\n\n`,
  )

  /**
   * Step 4
   */
  log(
    '[Verse-Layer > Hub-Layer] Wait for the Relayer to relay the message(takes 1~2 minutes)...',
  )

  switchNetwork('l2')
  const [l2MsgHash] = await getCrossDomainMessageHashesFromTx(
    addresses.l2.L2CrossDomainMessenger,
    tx2.hash,
  )

  switchNetwork('l1')
  const l1RelayTx = await getTransactionReceiptFromMsgHash(
    addresses.l1.Proxy__OVM_L1CrossDomainMessenger,
    l2MsgHash,
  )

  await balance.update()
  log(
    'done',
    `    elapsed: ${(new Date().getTime() - start.getTime()) / 1000} sec`,
    `    relayer tx: ${l1RelayTx.transactionHash} (gas: ${l1RelayTx.gasUsed})`,
    `    message hash: ${l2MsgHash}`,
    `    balance on Hub-Layer  : ${balance.current('l1')}`,
    `    balance on Verse-Layer: ${balance.current('l2')}\n\n`,
  )
}

main()
