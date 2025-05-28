import { Address, createPublicClient, createWalletClient, custom, erc20Abi, formatEther, http, parseUnits, PublicClient, TransactionReceipt, WalletClient } from 'viem'
import { chainConfig, publicActionsL1, publicActionsL2 } from 'viem/op-stack'

import * as Chains from './chains'
import { l1StandardBridgeAbi, l2StandardBridgeAbi } from './abis'
import { waitForRelayedMessage } from './utils'

/**
 * SWITCH TO OTHER CHAINS HERE (L1Chain, L2Chain)
 * 
 * Start select (L1Chain, L2Chain)
 */

const L1Chain = Chains.OasysTestnet
const L2Chain = Chains.SandVerse

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

const l2OASLegacyAddr = '0xDeadDeAddeAddEAddeadDEaDDEAdDeaDDeAD0000'

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
    const [address] = await this.walletClient.requestAddresses()
    console.info('Metamask connected:', address)

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

  async getBalances(l1Account: Address, l2Account: Address): Promise<{l1: string, l2: string}> {
    const balances = {l1: '', l2: ''}
    balances.l1 = formatEther(await publicClientL1.getBalance({address: l1Account}))
    balances.l2 = formatEther(await publicClientL2.getBalance({address: l2Account}))

    return balances
  }

  async getErc20Balances(l1Account: Address, l2Account: Address, l1ContractAddr: Address, l2ContractAddr: Address): Promise<{l1: string, l2: string}> {
    const balances = {l1: '', l2: ''}

    balances.l1 = await getErc20Balance(publicClientL1 as PublicClient, l1ContractAddr, l1Account)
    balances.l2 = await getErc20Balance(publicClientL2 as PublicClient, l2ContractAddr, l2Account)

    return balances
  }

  /**
   * Deposit native
   * 
   * @param amount
   */
  async depositOAS(amount: string): Promise<TransactionReceipt> {
    const l1StandardBridgeAddr = L2Chain.contracts.l1StandardBridge[L1Chain.id].address
    const parsedAmount = parseUnits(amount ?? '0', 18)
    // get address from wallet
    const [account] = await this.walletClient.getAddresses()

    const { request } = await publicClientL1.simulateContract({
      address: l1StandardBridgeAddr,
      value: parsedAmount,
      abi: l1StandardBridgeAbi,
      functionName: 'depositETH',
      args: [parseUnits('2', 6), '0x'],
      account,
    })

    const hash = await this.walletClient.writeContract(request)

    // Wait for L1 transaction to be processed.
    const receipt = await publicClientL1.waitForTransactionReceipt({ hash })

    return receipt
  }

  /**
   * Deposit native To
   * 
   * @param amount 
   * @param recipient 
   */
  async depositOASTo(amount: string, recipient: Address): Promise<TransactionReceipt> {
    const l1StandardBridgeAddr = L2Chain.contracts.l1StandardBridge[L1Chain.id].address
    const parsedAmount = parseUnits(amount ?? '0', 18)
    // get address from wallet
    const [account] = await this.walletClient.getAddresses()

    const { request } = await publicClientL1.simulateContract({
      address: l1StandardBridgeAddr,
      value: parsedAmount,
      abi: l1StandardBridgeAbi,
      functionName: 'depositETHTo',
      args: [recipient, parseUnits('2', 6), '0x'],
      account,
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
    const [account] = await this.walletClient.getAddresses()

    // simulate contract write
    const { request } = await publicClientL1.simulateContract({
      address: l1StandardBridgeAddr, //'0x',
      abi: l1StandardBridgeAbi,
      functionName: 'depositERC20',
      args: [l1ContractAddr, l2ContractAddr, parsedAmount, parseUnits('2', 6), '0x'],
      account,
    })

    // execute contract write
    const hash = await this.walletClient.writeContract(request)

    // Wait for L1 transaction to be processed.
    const receipt = await publicClientL1.waitForTransactionReceipt({ hash })

    return receipt
  }

  /**
   * Deposit ERC20 To
   * 
   * @param l1ContractAddr 
   * @param l2ContractAddr 
   * @param amount 
   * @param recipient
   */
  async depositERC20To(l1ContractAddr: Address, l2ContractAddr: Address, amount: string, recipient: Address): Promise<TransactionReceipt> {
    const l1StandardBridgeAddr = L2Chain.contracts.l1StandardBridge[L1Chain.id].address
    const parsedAmount = parseUnits(amount ?? '0', 18)
    // get address from wallet
    const [account] = await this.walletClient.getAddresses()

    // simulate contract write
    const { request } = await publicClientL1.simulateContract({
      address: l1StandardBridgeAddr, //'0x',
      abi: l1StandardBridgeAbi,
      functionName: 'depositERC20To',
      args: [l1ContractAddr, l2ContractAddr, recipient, parsedAmount, parseUnits('2', 6), '0x'],
      account,
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
   * @returns 
   */
  async withdrawOAS(amount: string): Promise<TransactionReceipt> {
    return this.withdraw(amount)
  }

  /**
   * Withdraw native
   * 
   * @param amount 
   * @param recipient 
   * @returns 
   */
  async withdrawOASTo(amount: string, recipient: Address): Promise<TransactionReceipt> {
    return this.withdrawTo(amount, recipient)
  }

  /**
   * Withdraw (both native and ERC20)
   * 
   * @param amount
   * @param l2TokenAddr 
   * @returns 
   */
  async withdraw(amount: string, l2TokenAddr?: Address): Promise<TransactionReceipt> {
    const parsedAmount = parseUnits(amount ?? '0', 18)
    const isNative = !l2TokenAddr
    l2TokenAddr = l2TokenAddr || l2OASLegacyAddr
    // get address from wallet
    const [account] = await this.walletClient.getAddresses()

    // in case native token and verse v1, need to pass value, otherwise 0
    const value = (isNative && L2Chain.version) ? parsedAmount : BigInt(0)

    const { request } = await publicClientL2.simulateContract({
      address: chainConfig.contracts.l2StandardBridge.address,
      abi: l2StandardBridgeAbi,
      functionName: 'withdraw',
      value,
      args: [l2TokenAddr, parsedAmount, 0, '0x'],
      account,
    })

    // execute contract write
    const hash = await this.walletClient.writeContract(request)

    const receipt = await publicClientL2.waitForTransactionReceipt({ hash })

    return receipt
  }

  /**
   * Withdraw (both native and ERC20)
   * 
   * @param amount 
   * @param recipient 
   * @param l2TokenAddr 
   * @returns 
   */
  async withdrawTo(amount: string, recipient: Address, l2TokenAddr?: Address): Promise<TransactionReceipt> {
    const parsedAmount = parseUnits(amount ?? '0', 18)
    const isNative = !l2TokenAddr
    l2TokenAddr = l2TokenAddr || l2OASLegacyAddr
    // get address from wallet
    const [account] = await this.walletClient.getAddresses()

    // in case native token and verse v1, need to pass value, otherwise 0
    const value = (isNative && L2Chain.version) ? parsedAmount : BigInt(0)

    const { request } = await publicClientL2.simulateContract({
      address: chainConfig.contracts.l2StandardBridge.address,
      abi: l2StandardBridgeAbi,
      functionName: 'withdrawTo',
      value,
      args: [l2TokenAddr, recipient, parsedAmount, 0, '0x'],
      account,
    })

    // execute contract write
    const hash = await this.walletClient.writeContract(request)

    const receipt = await publicClientL2.waitForTransactionReceipt({ hash })

    return receipt
  }

  async waitForDepositL2Tx(txReceipt: TransactionReceipt, amount: string): Promise<`0x${string}`> {
    const value = parseUnits(amount ?? '0', 18)

    return waitForRelayedMessage(publicClientL2 as PublicClient, chainConfig.contracts.l2CrossDomainMessenger.address, txReceipt, value)
  }

  async waitForWithdrawalL1Tx(txReceipt: TransactionReceipt, amount: string): Promise<`0x${string}`> {
    const l1CrossDomainMessengerAddr = L2Chain.contracts.l1CrossDomainMessenger[L1Chain.id].address
    const value = parseUnits(amount ?? '0', 18)

    return waitForRelayedMessage(publicClientL1 as PublicClient, l1CrossDomainMessengerAddr, txReceipt, value)
  }
}
