import hre, { network } from 'hardhat'
import { BigNumber, ContractReceipt } from 'ethers'
import {
  TransactionReceipt,
} from '@ethersproject/abstract-provider'

import {
  switchNetwork,
  addresses,
  log,
  getCrossDomainMessageHashesFromTx,
  getTransactionReceiptFromMsgHash,
  getTransactionReceiptFromMsgHashV2,
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

const bridge_L1_L2 = async () => {
  const AMOUNT = 10000000

  switchNetwork('l1')
  const [signer] = await hre.ethers.getSigners()
  switchNetwork('l2')
  const balance = new balanceLogger(signer.address)

  switchNetwork('l1')
  // Get Hub-Layer pre-deployed contracts.
  const l1ERC20Bridge = await hre.ethers.getContractAt(
    'IL1StandardBridge',
    addresses.l1.Proxy__OVM_L1StandardBridge,
  )

  // Get Verse-Layer pre-deployed contracts.
  switchNetwork('l2')

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
}

const bridge_L2_L1 = async () => {
  const bridgeTxs: string[] = []

  const AMOUNT = 1000
  switchNetwork('l1')
  const [signer] = await hre.ethers.getSigners()
  switchNetwork('l2')
  const balance = new balanceLogger(signer.address)

  const bridge = async () => {
    /**
   * Step 3
   */
    log(`[Verse-Layer] Burn and Withdraw OAS using L2ERC20Bridge...`)

    switchNetwork('l2')

    const l2ERC20Bridge = await hre.ethers.getContractAt(
      'IL2ERC20Bridge',
      addresses.l2.L2StandardBridge,
    )
    const tx2 = await l2ERC20Bridge.withdraw(
      addresses.l2.OVM_OAS,
      AMOUNT,
      2_000_000,
      '0x',
    )
    const receipt2 = await tx2.wait()

    await balance.update()
    log(
      'done',
      `    tx: ${tx2.hash} (gas: ${receipt2.gasUsed})`,
      `    balance on Hub-Layer  : ${balance.current('l1')}`,
      `    balance on Verse-Layer: ${balance.current('l2')}\n\n`,
    )
    return tx2.hash
  }
  
  for (let i = 0; i < 10; i++) {
    const tx2Hash = await bridge()
    bridgeTxs.push(tx2Hash)
  }

  console.log('bridgeTxs', bridgeTxs);
  return bridgeTxs;
}

const watch_L2_L1 = async (bridgeTx: string) => {
  /**
   * Step 4
   */
  log(
    '[Verse-Layer > Hub-Layer] Wait for the Relayer to relay the message(takes 1~2 minutes)...',
  )

  switchNetwork('l1')
  const [signer] = await hre.ethers.getSigners()
  switchNetwork('l2')
  const balance = new balanceLogger(signer.address)


  const start = new Date()
  let l2Hash = ''
  let l1Tx: TransactionReceipt = null

  while (true) {
    try {
      switchNetwork('l2')
      const [l2MsgHash] = await getCrossDomainMessageHashesFromTx(
        addresses.l2.L2CrossDomainMessenger,
        bridgeTx,
      )
      l2Hash = l2MsgHash

      switchNetwork('l1')
      const l1RelayTx = await getTransactionReceiptFromMsgHashV2(
        addresses.l1.Proxy__OVM_L1CrossDomainMessenger,
        l2MsgHash,
      )
      l1Tx = l1RelayTx
      break
    } catch (error) {
      continue;
    }
  }

  await balance.update()
  log(
    'done',
    `    elapsed: ${(new Date().getTime() - start.getTime()) / 1000} sec`,
    `    relayer tx: ${l1Tx.transactionHash} (gas: ${l1Tx.gasUsed})`,
    `    message hash: ${l2Hash}`,
    `    balance on Hub-Layer  : ${balance.current('l1')}`,
    `    balance on Verse-Layer: ${balance.current('l2')}\n\n`,
  )
}

const watch_L2_L1_Bridges = async (bridgeTxs: string[]) => {
  const start = new Date();
  console.log('start watching...');
  await Promise.all(bridgeTxs.map(tx => watch_L2_L1(tx)));

  console.log(`time: ${(new Date().getTime() - start.getTime()) / 1000} sec`);
}

const main = async () => {
  // await bridge_L1_L2()
  // await bridge_L2_L1()

  const bridgeTxs = await bridge_L2_L1()
  await watch_L2_L1_Bridges(bridgeTxs)
}


main()

// todo: set bridgeTxs from result of bridge_L2_L1
// const bridgeTxs = [
//   '0xce44df26330f257436cf10c688354a6fb2a0c8eaa71ca4e1a3ab8c5c6e27921c',
//   '0x5cbef904079cef25ea10a50e555d96277e402c089b7a3aa61929b2043e1b946a',
//   '0x6dd07be1ee3058e639c3e72b8c240c4198433834332ad33ea72559fb04c9560b',
//   '0x7fdeab9de2dc370ee2be5d517cfea24cda56197cbf5aed457419cf4582423e8d',
//   '0xab59878833777465d7c1bb66070026d8fa03c9925cafe9ab47f44b196ac3ea98',
//   '0x90483456985478424790fad4ef549a180f516e125ad7edad6750c64946bc34b8',
//   '0x7da22906bf068c33d5ca6a9ac238ec298724f07a4f56f5dbc93b12ca3a344475',
//   '0x15a3421f0a28a4859e46bb37773836b4a652a11b9f658bbd504fd2c195d91625',
//   '0x981305fd35bc67c7a1ff7ecf753616baf5c2440a5e1754c8867e1c6ad235e0a5',
//   '0x4d074c5481ad91bbb7f2dda7edd887cbf5735926832bb2f4c68c8371e777ffde'
// ];
// watch_L2_L1_Bridges(bridgeTxs)

