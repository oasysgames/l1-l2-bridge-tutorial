import { Address, createPublicClient, createWalletClient, custom, erc20Abi, formatEther, http, parseUnits, PublicClient, TransactionReceipt, WalletClient } from 'viem'
import { getL2TransactionHashes, getWithdrawals, publicActionsL1, publicActionsL2 } from 'viem/op-stack'

import { OasysTestnet, SandVerse, Oasys, SaakuruVerse, TCGVerse } from './chains'
import { l1StandardBridgeAbi, l2StandardBridgeAbi, portal2Abi } from './abis'
import { waitForRelayedMessage } from './utils'

/**
 * SWITCH TO OTHER CHAINS HERE (L1Chain, L2Chain)
 * 
 * Start select (L1Chain, L2Chain)
 */

const L1Chain = OasysTestnet
const L2Chain = SandVerse
// const L1Chain = Oasys
// const L2Chain = SaakuruVerse
// const L2Chain = TCGVerse

/**
 * End select (L1Chain, L2Chain)
 */

const publicClientL1 = createPublicClient({
  chain: L1Chain,
  transport: http()
}).extend(publicActionsL1())

const publicClientL2 = createPublicClient({
  chain: L2Chain,
  transport: http()
}).extend(publicActionsL2())

/**
 * For v1 only (not used)
 * @param withdrawalHash 
 * @param eventName 
 * @returns 
 */
async function waitForWithdrawalL1Tx(receipt: TransactionReceipt, eventName: 'WithdrawalFinalized' | 'WithdrawalProven'): Promise<`0x${string}`> {
  const portalAddress = L2Chain.contracts.portal[L1Chain.id].address

  const [withdrawal] = getWithdrawals(receipt)
  const withdrawalHash = withdrawal.withdrawalHash

  // const { nonce, sender, target, data, value, gasLimit } = withdrawal
  // const msgHash = getMessageHash(receipt, 10000000000000000n)
  // console.log('msgHash', msgHash, keccak256(withdrawal.data))
  // const time = await publicClientL1.getTimeToFinalize({
  //   withdrawalHash,
  //   targetChain: L2Chain,
  // })

  const txHash = await new Promise<`0x${string}`>((res) => {
    const unwatch = publicClientL1.watchContractEvent({
      address: portalAddress,
      abi: portal2Abi,
      eventName,
      args: { withdrawalHash },
      onLogs: logs => {
        console.log(eventName, logs)
        unwatch()
        res(logs[0].transactionHash)
      }
    })
  })

  // const status = await publicClientL1.getWithdrawalStatus({
  //   receipt,
  //   targetChain: L2Chain,
  // })

  return txHash
}

/**
 * 
 * @param client 
 * @param tokenAddr 
 * @param addr 
 * @returns 
 */
async function getErc20Balance(client: PublicClient, tokenAddr: Address, addr: Address): Promise<string> {
  const data = await client.readContract({
    abi: erc20Abi,
    address: tokenAddr,
    functionName: 'balanceOf',
    args: [addr || '0x'],
  })

  const amount = formatEther(data)

  return amount
}

// for Withdraw
const l2StandardBridgeAddr = '0x4200000000000000000000000000000000000010'
const l2OASLegacyAddr = '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000'

export class BridgeSDK {
  walletClient: WalletClient

  constructor(private isL2 = false) {
    this.walletClient = createWalletClient({
      chain: isL2 ? L2Chain : L1Chain,
      transport: custom((window as any).ethereum!)
    })
  }

  async connectMetamask(): Promise<string> {
    await this.walletClient.switchChain({ id: this.isL2 ? L2Chain.id : L1Chain.id })
    const [address] = await this.walletClient.getAddresses()
    console.log('connectMetamask', address)

    return address
  }

  getVerseVersion(): number {
    return L2Chain.version
  }

  async getConnectedNetwork(): Promise<[number, string]> {
    return this.getNetwork(this.walletClient)
  }

  async getL1Network(): Promise<[number, string]> {
    return this.getNetwork(publicClientL1 as PublicClient)
  }

  async getL2Network(): Promise<[number, string]> {
    return this.getNetwork(publicClientL2 as PublicClient)
  }

  private async getNetwork(client: PublicClient | WalletClient): Promise<[number, string]> {
    const chainId = await client.getChainId()
    const chainName = client.chain?.name || 'unknown'

    return [chainId, chainName]
  }

  async getBalances(addr: Address): Promise<{l1: string, l2: string}> {
    const balances = {l1: '', l2: ''}
    balances.l1 = formatEther(await publicClientL1.getBalance({address: addr}))
    balances.l2 = formatEther(await publicClientL2.getBalance({address: addr}))

    return balances
  }

  async getErc20Balances(addr: Address, l1ContractAddr: Address, l2ContractAddr: Address): Promise<{l1: string, l2: string}> {
    const balances = {l1: '', l2: ''}

    balances.l1 = await getErc20Balance(publicClientL1 as PublicClient, l1ContractAddr, addr)
    balances.l2 = await getErc20Balance(publicClientL2 as PublicClient, l2ContractAddr, addr)

    return balances
  }

  /**
   * For v1 only (not used)
   * @param l1DepositReceipt 
   * @returns 
   */
  async waitForL2Deposit(l1DepositReceipt: TransactionReceipt): Promise<TransactionReceipt> {
    // Get the L2 transaction hash from the L1 transaction receipt.
    const [l2Hash] = getL2TransactionHashes(l1DepositReceipt)
  
    // Wait for the L2 transaction to be processed.
    const l2Receipt = await publicClientL2.waitForTransactionReceipt({
      hash: l2Hash
    })
    console.log('Done l2 tx', l2Hash)
  
    return l2Receipt
  }

  /**
   * Deposit native
   * 
   * @param amount 
   * @param address 
   */
  async depositOAS(amount: string, address: Address): Promise<TransactionReceipt> {
    const l1StandardBridgeAddr = L2Chain.contracts.l1StandardBridge[L1Chain.id].address
    const parsedAmount = parseUnits(amount ?? '0', 18)

    const { request } = await publicClientL1.simulateContract({
      address: l1StandardBridgeAddr,
      value: parsedAmount,
      abi: l1StandardBridgeAbi,
      functionName: 'depositETH',
      args: [parseUnits('2', 6), '0x'],
      account: address,
    })

    const hash = await this.walletClient.writeContract(request)

    // Wait for L1 transaction to be processed.
    const receipt = await publicClientL1.waitForTransactionReceipt({ hash })

    return receipt
  }

  /**
   * Approve ERC20
   * 
   * @param l1ContractAddr
   * @param amount 
   */
  async approveERC20(l1ContractAddr: Address, amount: string): Promise<TransactionReceipt> {
    const l1StandardBridgeAddr = L2Chain.contracts.l1StandardBridge[L1Chain.id].address
    const parsedAmount = parseUnits(amount ?? '0', 18)
    const [account] = await this.walletClient.getAddresses()
    const { request } = await publicClientL1.simulateContract({
      address: l1ContractAddr,
      abi: erc20Abi,
      functionName: 'approve',
      args: [l1StandardBridgeAddr, parsedAmount],
      account
    })

    const hash = await this.walletClient.writeContract(request)

    const receipt = await publicClientL1.waitForTransactionReceipt({ hash })

    return receipt
  }

  /**
   * Deposit ERC20
   * 
   * @param l1ContractAddr 
   * @param l2ContractAddr 
   * @param amount 
   */
  async depositERC20(l1ContractAddr: Address, l2ContractAddr: Address, amount: string): Promise<TransactionReceipt> {
    const l1StandardBridgeAddr = L2Chain.contracts.l1StandardBridge[L1Chain.id].address
    const parsedAmount = parseUnits(amount ?? '0', 18)
    // get address from wallet
    const [address] = await this.walletClient.getAddresses()

    // simulate contract write
    const { request } = await publicClientL1.simulateContract({
      address: l1StandardBridgeAddr, //'0x',
      abi: l1StandardBridgeAbi,
      functionName: 'depositERC20',
      args: [l1ContractAddr, l2ContractAddr, parsedAmount, parseUnits('2', 6), '0x'],
      account: address,
    })

    // execute contract write
    const hash = await this.walletClient.writeContract(request)

    // Wait for L1 transaction to be processed.
    const receipt = await publicClientL1.waitForTransactionReceipt({ hash })

    return receipt
  }

  /**
   * Withdraw native
   * 
   * @param amount 
   * @param address 
   * @returns 
   */
  async withdrawOAS(amount: string, address: Address): Promise<TransactionReceipt> {
    return this.withdraw(amount, address)
  }

  /**
   * Withdraw (both native and ERC20)
   * 
   * @param amount 
   * @param account 
   * @param l2TokenAddr 
   * @returns 
   */
  async withdraw(amount: string, account: Address, l2TokenAddr?: Address): Promise<TransactionReceipt> {
    const parsedAmount = parseUnits(amount ?? '0', 18)
    const isNative = !l2TokenAddr
    l2TokenAddr = l2TokenAddr || l2OASLegacyAddr

    // in case native token and verse v1, need to pass value, otherwise 0
    const value = (isNative && L2Chain.version) ? parsedAmount : BigInt(0)
    console.log('Withdraw value', value)

    const { request } = await publicClientL2.simulateContract({
      address: l2StandardBridgeAddr, //'0x',
      abi: l2StandardBridgeAbi,
      functionName: 'withdraw',
      value,
      args: [l2TokenAddr, parsedAmount, 0, '0x'],
      account,
    })

    // execute contract write
    const hash = await this.walletClient.writeContract(request)

    const receipt = await publicClientL2.waitForTransactionReceipt({ hash })

    // Wait until the withdrawal is ready to prove (v1).
    // const { output, withdrawal } = await publicClientL1.waitToProve({
    //   receipt,
    //   targetChain: L2Chain,
    // })

    return receipt
  }

  async waitForDepositL2Tx(txReceipt: TransactionReceipt, amount: string): Promise<`0x${string}`> {
    const contractAddr = '0x4200000000000000000000000000000000000007'
    const value = parseUnits(amount ?? '0', 18)

    return waitForRelayedMessage(publicClientL2 as PublicClient, contractAddr, txReceipt, value)
  }

  async waitForWithdrawalL1Tx(txReceipt: TransactionReceipt, amount: string): Promise<`0x${string}`> {
    const l1CrossDomainMessengerAddr = L2Chain.contracts.l1CrossDomainMessenger[L1Chain.id].address
    const value = parseUnits(amount ?? '0', 18)

    return waitForRelayedMessage(publicClientL1 as PublicClient, l1CrossDomainMessengerAddr, txReceipt, value)
  }
}
