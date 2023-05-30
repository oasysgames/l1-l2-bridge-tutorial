import hre, { network } from 'hardhat'
import { BigNumber, ContractReceipt, Wallet, providers, Contract } from 'ethers'

import {
  switchNetwork,
  addresses,
  log,
  getCrossDomainMessageHashesFromTx,
  getTransactionReceiptFromMsgHash,
} from './common'

import L2StandardBridge from '../artifacts/contracts/L2/messaging/IL2ERC20Bridge.sol/IL2ERC20Bridge.json'
import L1StandardBridge from '../artifacts/contracts/L1/messaging/IL1StandardBridge.sol/IL1StandardBridge.json'
import { IL1StandardBridge, IL2ERC20Bridge } from '../typechain-types'

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

type BridgeTransactionData = {
  wallet: Wallet,
  txHash: string,
}

const bridge_L1_L2 = async () => {
  const AMOUNT = 10000000

  const bridgeTxs: BridgeTransactionData[] = []
  /**
   * Step 1
   */
  log('[Hub-Layer] Deposit and Lock OAS to L1StandardBridge...')

  switchNetwork('l1')
  const L1_RPC_URL = 'http://localhost:8545';
  const provider = new providers.JsonRpcProvider(L1_RPC_URL);
  const wallets: Wallet[] = [
    new Wallet(`${process.env.PRIVATE_KEY}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_4}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_5}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_6}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_7}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_8}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_9}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_10}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_11}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_12}`, provider),
  ];
  const nonces = await Promise.all(wallets.map(x => x.getTransactionCount()));
  
  const promises = [];
  const sendTx = async (i: number) => {
    try {
      const wallet = wallets[i];

      const balance = new balanceLogger(wallet.address)
      await balance.update()

      const l1ERC20BridgeContract = new Contract(
        addresses.l1.Proxy__OVM_L1StandardBridge,
        L1StandardBridge.abi,
        wallet,
      ) as IL1StandardBridge;
      const tx1 = await l1ERC20BridgeContract.depositETH(2_000_000, '0x', { value: AMOUNT })
      const receipt1 = await tx1.wait()
      nonces[i]++;

      await balance.update()
      log(
        'done',
        `    tx: ${tx1.hash} (gas: ${receipt1.gasUsed})`,
        `    balance on Hub-Layer  : ${balance.current('l1', receipt1)}`,
        `    balance on Verse-Layer: ${balance.current('l2')}\n\n`,
      )
      bridgeTxs.push({
        wallet,
        txHash: tx1.hash,
      });
    } catch (err) {
      console.error(err);
    }
  }

  for (let i = 0; i < wallets.length; i++) {
    promises.push(sendTx(i));
  }
  await Promise.all(promises);

  return bridgeTxs;
}

const watch_L1_L2 = async (bridgeTransactionData: BridgeTransactionData) => {
  /**
   * Step 2
   */
  log('[Hub-Layer > Verse-Layer] Wait for the Relayer to relay the message...')

  const start = new Date()

  switchNetwork('l1')
  const tx1Hash = bridgeTransactionData.txHash;
  const [l1MsgHash] = await getCrossDomainMessageHashesFromTx(
    addresses.l1.Proxy__OVM_L1CrossDomainMessenger,
    tx1Hash,
  )

  switchNetwork('l2')
  const l2RelayTx = await getTransactionReceiptFromMsgHash(
    addresses.l2.L2CrossDomainMessenger,
    l1MsgHash,
  )

  const balance = new balanceLogger(bridgeTransactionData.wallet.address)

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

const watch_L1_L2_Bridges = async () => {
  const bridgeTxs = await bridge_L1_L2()
  const start = new Date();
  console.log('start watching...');
  await Promise.all(bridgeTxs.map(tx => watch_L1_L2(tx)));

  console.log(`time: ${(new Date().getTime() - start.getTime()) / 1000} sec`);
}

const bridge_L2_L1 = async () => {
  const bridgeTxs: BridgeTransactionData[] = []
  /**
   * Step 3
   */
  log(`[Verse-Layer] Burn and Withdraw OAS using L2ERC20Bridge...`)

  switchNetwork('l2')
  const AMOUNT = 1000
  const L2_RPC_URL = 'http://localhost:18545';
  const provider = new providers.JsonRpcProvider(L2_RPC_URL);
  const wallets: Wallet[] = [
    new Wallet(`${process.env.PRIVATE_KEY}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_4}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_5}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_6}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_7}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_8}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_9}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_10}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_11}`, provider),
    // new Wallet(`${process.env.PRIVATE_KEY_12}`, provider),
  ];
  const nonces = await Promise.all(wallets.map(x => x.getTransactionCount()));
  
  const promises = [];
  const sendTx = async (i: number) => {
    try {
      const wallet = wallets[i];

      const balance = new balanceLogger(wallet.address)
      await balance.update()

      const l2ERC20BridgeContract = new Contract(
        addresses.l2.L2StandardBridge,
        L2StandardBridge.abi,
        wallet,
      ) as IL2ERC20Bridge;
      const tx2 = await l2ERC20BridgeContract.withdraw(
        addresses.l2.OVM_OAS,
        AMOUNT,
        2_000_000,
        '0x',
      )
      const receipt2 = await tx2.wait()
      nonces[i]++;

      await balance.update()
      log(
        'done',
        `    tx: ${tx2.hash} (gas: ${receipt2.gasUsed})`,
        `    balance on Hub-Layer  : ${balance.current('l1')}`,
        `    balance on Verse-Layer: ${balance.current('l2')}\n\n`,
      )
      bridgeTxs.push({
        wallet: wallet,
        txHash: tx2.hash,
      });
    } catch (err) {
      console.error(err);
    }
  }

  for (let i = 0; i < wallets.length; i++) {
    promises.push(sendTx(i));
  }
  await Promise.all(promises);

  return bridgeTxs;
}

const watch_L2_L1 = async (bridgeTransactionData: BridgeTransactionData) => {
  /**
   * Step 4
   */
  log(
    '[Verse-Layer > Hub-Layer] Wait for the Relayer to relay the message(takes 1~2 minutes)...',
  )

  const start = new Date()
  switchNetwork('l2')
  const tx2Hash = bridgeTransactionData.txHash;
  const [l2MsgHash] = await getCrossDomainMessageHashesFromTx(
    addresses.l2.L2CrossDomainMessenger,
    tx2Hash,
  )

  switchNetwork('l1')
  const l1RelayTx = await getTransactionReceiptFromMsgHash(
    addresses.l1.Proxy__OVM_L1CrossDomainMessenger,
    l2MsgHash,
  )

  const balance = new balanceLogger(bridgeTransactionData.wallet.address)

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

const watch_L2_L1_Bridges = async () => {
  const bridgeTxs = await bridge_L2_L1()
  const start = new Date();
  console.log('start watching...');
  await Promise.all(bridgeTxs.map(tx => watch_L2_L1(tx)));

  console.log(`time: ${(new Date().getTime() - start.getTime()) / 1000} sec`);
}

watch_L1_L2_Bridges()
watch_L2_L1_Bridges()
