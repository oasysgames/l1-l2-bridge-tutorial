import { Address, createPublicClient, createWalletClient, custom, erc20Abi, erc721Abi, formatEther, http, parseUnits, PublicClient, TransactionReceipt, WalletClient } from 'viem'
import { publicActionsL1, publicActionsL2 } from 'viem/op-stack'

import * as Chains from './chains'
import { l1StandardBridgeAbi, l1Erc721BridgeAbi, l2StandardBridgeAbi, l2Erc721BridgeAbi } from './abis'
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

/**
 * 
 * @param client
 * @param tokenAddr
 * @param addr
 * @returns
 */
async function getErc721Balance(client: PublicClient, tokenAddr: Address, addr: Address): Promise<string> {
  const data = await client.readContract({
    abi: erc721Abi,
    address: tokenAddr,
    functionName: 'balanceOf',
    args: [addr || '0x'],
  })

  const amount = data.toString()

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

  async getErc721Balances(l1Account: Address, l2Account: Address, l1ContractAddr: Address, l2ContractAddr: Address): Promise<{l1: string, l2: string}> {
    const balances = {l1: '', l2: ''}

    balances.l1 = await getErc721Balance(publicClientL1 as PublicClient, l1ContractAddr, l1Account)
    balances.l2 = await getErc721Balance(publicClientL2 as PublicClient, l2ContractAddr, l2Account)

    return balances
  }

  /**
   * Deposit native
   * 
   * @param amount
   */
  async depositOas(amount: string): Promise<TransactionReceipt> {
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
  async depositOasTo(amount: string, recipient: Address): Promise<TransactionReceipt> {
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
  async approveErc20(l1ContractAddr: Address, amount: string): Promise<TransactionReceipt> {
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
  async depositErc20(l1ContractAddr: Address, l2ContractAddr: Address, amount: string): Promise<TransactionReceipt> {
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
  async depositErc20To(l1ContractAddr: Address, l2ContractAddr: Address, amount: string, recipient: Address): Promise<TransactionReceipt> {
    const l1StandardBridgeAddr = L2Chain.contracts.l1StandardBridge[L1Chain.id].address
    const parsedAmount = parseUnits(amount ?? '0', 18)
    // get address from wallet
    const [account] = await this.walletClient.getAddresses()

    // simulate contract write
    const { request } = await publicClientL1.simulateContract({
      address: l1StandardBridgeAddr,
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
   * Approve ERC721
   * 
   * @param l1ContractAddr
   * @param tokenId
   */
  async approveErc721(l1ContractAddr: Address, tokenId: bigint): Promise<TransactionReceipt> {
    const l1Erc721BridgeAddr = L2Chain.contracts.l1Erc721Bridge[L1Chain.id].address
    const [account] = await this.walletClient.getAddresses()
    const { request } = await publicClientL1.simulateContract({
      address: l1ContractAddr,
      abi: erc721Abi,
      functionName: 'approve',
      args: [l1Erc721BridgeAddr, tokenId],
      account
    })

    const hash = await this.walletClient.writeContract(request)

    const receipt = await publicClientL1.waitForTransactionReceipt({ hash })

    return receipt
  }

  /**
   * Deposit ERC721
   * 
   * @param l1ContractAddr
   * @param l2ContractAddr
   * @param tokenId
   */
  async depositErc721(l1ContractAddr: Address, l2ContractAddr: Address, tokenId: bigint): Promise<TransactionReceipt> {
    const l1Erc721BridgeAddr = L2Chain.contracts.l1Erc721Bridge[L1Chain.id].address
    // get address from wallet
    const [account] = await this.walletClient.getAddresses()

    // simulate contract write
    const { request } = await publicClientL1.simulateContract({
      address: l1Erc721BridgeAddr,
      abi: l1Erc721BridgeAbi,
      functionName: 'bridgeERC721',
      args: [l1ContractAddr, l2ContractAddr, tokenId, parseUnits('2', 6), '0x'],
      account,
    })

    // execute contract write
    const hash = await this.walletClient.writeContract(request)

    // Wait for L1 transaction to be processed.
    const receipt = await publicClientL1.waitForTransactionReceipt({ hash })

    return receipt
  }

  /**
   * Deposit ERC721 To
   * 
   * @param l1ContractAddr
   * @param l2ContractAddr
   * @param tokenId
   * @param recipient
   */
  async depositErc721To(l1ContractAddr: Address, l2ContractAddr: Address, tokenId: bigint, recipient: Address): Promise<TransactionReceipt> {
    const l1Erc721BridgeAddr = L2Chain.contracts.l1Erc721Bridge[L1Chain.id].address
    // get address from wallet
    const [account] = await this.walletClient.getAddresses()

    // simulate contract write
    const { request } = await publicClientL1.simulateContract({
      address: l1Erc721BridgeAddr, //'0x',
      abi: l1Erc721BridgeAbi,
      functionName: 'bridgeERC721To',
      args: [l1ContractAddr, l2ContractAddr, recipient, tokenId, parseUnits('2', 6), '0x'],
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
  async withdrawOas(amount: string): Promise<TransactionReceipt> {
    return this.withdrawErc20(amount)
  }

  /**
   * Withdraw native To
   * 
   * @param amount
   * @param recipient
   * @returns
   */
  async withdrawOasTo(amount: string, recipient: Address): Promise<TransactionReceipt> {
    return this.withdrawErc20To(amount, recipient)
  }

  /**
   * Withdraw (both native and ERC20)
   * 
   * @param amount
   * @param l2ContractAddr
   * @returns
   */
  async withdrawErc20(amount: string, l2ContractAddr?: Address): Promise<TransactionReceipt> {
    const parsedAmount = parseUnits(amount ?? '0', 18)
    const isNative = !l2ContractAddr
    l2ContractAddr = l2ContractAddr || l2OASLegacyAddr
    // get address from wallet
    const [account] = await this.walletClient.getAddresses()

    // in case native token and verse v1, need to pass value, otherwise 0
    const value = (isNative && L2Chain.version) ? parsedAmount : BigInt(0)

    const { request } = await publicClientL2.simulateContract({
      address: L2Chain.contracts.l2StandardBridge.address,
      abi: l2StandardBridgeAbi,
      functionName: 'withdraw',
      value,
      args: [l2ContractAddr, parsedAmount, 0, '0x'],
      account,
    })

    // execute contract write
    const hash = await this.walletClient.writeContract(request)

    const receipt = await publicClientL2.waitForTransactionReceipt({ hash })

    return receipt
  }

  /**
   * Withdraw (both native and ERC20) To
   * 
   * @param amount
   * @param recipient
   * @param l2ContractAddr
   * @returns
   */
  async withdrawErc20To(amount: string, recipient: Address, l2ContractAddr?: Address): Promise<TransactionReceipt> {
    const parsedAmount = parseUnits(amount ?? '0', 18)
    const isNative = !l2ContractAddr
    l2ContractAddr = l2ContractAddr || l2OASLegacyAddr
    // get address from wallet
    const [account] = await this.walletClient.getAddresses()

    // in case native token and verse v1, need to pass value, otherwise 0
    const value = (isNative && L2Chain.version) ? parsedAmount : BigInt(0)

    const { request } = await publicClientL2.simulateContract({
      address: L2Chain.contracts.l2StandardBridge.address,
      abi: l2StandardBridgeAbi,
      functionName: 'withdrawTo',
      value,
      args: [l2ContractAddr, recipient, parsedAmount, 0, '0x'],
      account,
    })

    // execute contract write
    const hash = await this.walletClient.writeContract(request)

    const receipt = await publicClientL2.waitForTransactionReceipt({ hash })

    return receipt
  }

  /**
   * Withdraw ERC721
   * 
   * @param tokenId
   * @param l2ContractAddr
   * @param l1ContractAddr
   * @returns
   */
  async withdrawErc721(tokenId: bigint, l2ContractAddr: Address, l1ContractAddr: Address): Promise<TransactionReceipt> {
    // get address from wallet
    const [account] = await this.walletClient.getAddresses()

    const { request } = await publicClientL2.simulateContract({
      address: L2Chain.contracts.l2Erc721Bridge.address,
      abi: l2Erc721BridgeAbi,
      functionName: 'bridgeERC721',
      args: [l2ContractAddr, l1ContractAddr, tokenId, 0, '0x'],
      account,
    })

    // execute contract write
    const hash = await this.walletClient.writeContract(request)

    const receipt = await publicClientL2.waitForTransactionReceipt({ hash })

    return receipt
  }

  /**
   * Withdraw ERC721 To
   * 
   * @param tokenId
   * @param recipient
   * @param l2ContractAddr
   * @param l1ContractAddr
   * @returns 
   */
  async withdrawErc721To(tokenId: bigint, recipient: Address, l2ContractAddr: Address, l1ContractAddr: Address): Promise<TransactionReceipt> {
    // get address from wallet
    const [account] = await this.walletClient.getAddresses()

    const { request } = await publicClientL2.simulateContract({
      address: L2Chain.contracts.l2Erc721Bridge.address,
      abi: l2Erc721BridgeAbi,
      functionName: 'bridgeERC721To',
      args: [l2ContractAddr, l1ContractAddr, recipient, tokenId, 0, '0x'],
      account,
    })

    // execute contract write
    const hash = await this.walletClient.writeContract(request)

    const receipt = await publicClientL2.waitForTransactionReceipt({ hash })

    return receipt
  }

  async waitForDepositL2Tx(txReceipt: TransactionReceipt, amount: string): Promise<`0x${string}`> {
    const value = parseUnits(amount ?? '0', 18)

    return waitForRelayedMessage(publicClientL2 as PublicClient, L2Chain.contracts.l2CrossDomainMessenger.address, txReceipt, value)
  }

  async waitForWithdrawalL1Tx(txReceipt: TransactionReceipt, amount: string): Promise<`0x${string}`> {
    const l1CrossDomainMessengerAddr = L2Chain.contracts.l1CrossDomainMessenger[L1Chain.id].address
    const value = parseUnits(amount ?? '0', 18)

    return waitForRelayedMessage(publicClientL1 as PublicClient, l1CrossDomainMessengerAddr, txReceipt, value)
  }
}
