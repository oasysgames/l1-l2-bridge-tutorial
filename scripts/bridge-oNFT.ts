import hre from 'hardhat'
import { TransactionReceipt } from '@ethersproject/abstract-provider'
import {
  getCrossDomainMessageHashesFromTx,
  getTransactionReceiptFromMsgHash,
  switchNetwork,
  addresses,
  log,
} from './common'

// Get the token address on the Hub-Layer created by L1StandardERC721Factory.
const getL1ERC721AddressFromReceipt = (
  receipt: TransactionReceipt,
): undefined | string => {
  const logs = receipt.logs.filter(
    (x) =>
      x.address === addresses.l1.L1StandardERC721Factory &&
      x.topics[0] === hre.ethers.utils.id('ERC721Created(string,address)'),
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
  const oNFT_NAME = 'Test oNFT'
  const oNFT_SYMBOL = 'ToNFT'
  const oNFT_BASE_TOKEN_URI = 'https://example.com/'
  const oNFT_TOKEN_ID = 100

  // Get Hub-Layer pre-deployed contracts.
  switchNetwork('l1')
  const [signer] = await hre.ethers.getSigners()

  const l1StandardERC721Factory = (
    await hre.ethers.getContractFactory('L1StandardERC721Factory')
  ).attach(addresses.l1.L1StandardERC721Factory)

  const l1ERC721Bridge = await hre.ethers.getContractAt(
    'IL1ERC721Bridge',
    addresses.l1.Proxy__OVM_L1ERC721Bridge,
  )

  // Get Verse-Layer pre-deployed contracts.
  switchNetwork('l2')
  const L2StandardERC721 = await hre.ethers.getContractFactory(
    'L2StandardERC721',
  ) // Note: This is not pre-deployed contract.

  const l2ERC721Bridge = await hre.ethers.getContractAt(
    'IL2ERC721Bridge',
    addresses.l2.L2ERC721Bridge,
  )

  /**
   * Step 1
   */
  log('[Hub-Layer] Create oNFT using L1StandardERC721Factory...')

  switchNetwork('l1')
  const tx1 = await l1StandardERC721Factory.createStandardERC721(
    oNFT_NAME,
    oNFT_SYMBOL,
    oNFT_BASE_TOKEN_URI,
  )
  const receipt1 = await tx1.wait()
  const l1onft = await hre.ethers.getContractAt(
    'L1StandardERC721',
    getL1ERC721AddressFromReceipt(receipt1),
  )

  log(
    'done',
    `    tx: ${tx1.hash} (gas: ${receipt1.gasUsed})`,
    `    address: ${l1onft.address}\n\n`,
  )

  /**
   * Step 2
   */
  log('[Verse-Layer] Deploy oNFT using L2StandardERC721...')

  switchNetwork('l2')
  const l2onft = await L2StandardERC721.deploy(
    l2ERC721Bridge.address,
    l1onft.address,
    oNFT_NAME,
    oNFT_SYMBOL,
  )
  await l2onft.deployed()
  const receipt2 = await l2onft.deployTransaction.wait()

  log(
    'done',
    `    tx: ${receipt2.transactionHash} (gas: ${receipt2.gasUsed})`,
    `    address: ${l2onft.address}\n\n`,
  )

  const getOwners = async (): Promise<string[]> => {
    let l1Owner: string
    let l2Owner: string

    try {
      switchNetwork('l1')
      l1Owner = await l1onft.ownerOf(oNFT_TOKEN_ID)
    } catch (error) {
      l1Owner = '0x0000000000000000000000000000000000000000'
    }

    try {
      switchNetwork('l2')
      l2Owner = await l2onft.ownerOf(oNFT_TOKEN_ID)
    } catch (error) {
      l2Owner = '0x0000000000000000000000000000000000000000'
    }

    if (l1Owner === signer.address) l1Owner += ' (you)'
    else if (l1Owner === l1ERC721Bridge.address) l1Owner += ' (bridge)'

    if (l2Owner === signer.address) l2Owner += ' (you)'

    return [l1Owner, l2Owner]
  }

  /**
   * Step 3
   */
  log(`[Hub-Layer] Mint oNFT (id: ${oNFT_TOKEN_ID})...`)

  switchNetwork('l1')
  const tx3 = await l1onft.mint(signer.address, oNFT_TOKEN_ID)
  const receipt3 = await tx3.wait()

  let [l1Owner, l2Owner] = await getOwners()
  log(
    'done',
    `    tx: ${tx3.hash} (gas: ${receipt3.gasUsed})`,
    `    owner on Hub-Layer  : ${l1Owner}`,
    `    owner on Verse-Layer: ${l2Owner}\n\n`,
  )

  /**
   * Step 4
   */
  log('[Hub-Layer] Approve transferFrom of oNFT to L1ERC721Bridge...')

  switchNetwork('l1')
  const tx4 = await l1onft.approve(l1ERC721Bridge.address, oNFT_TOKEN_ID)
  const receipt4 = await tx4.wait()
  const spender = await l1onft.getApproved(oNFT_TOKEN_ID)

  log(
    'done',
    `    tx: ${tx4.hash} (gas: ${receipt4.gasUsed})`,
    `    spender: ${spender}\n\n`,
  )

  /**
   * Step 5
   */
  log('[Hub-Layer] Deposit and Lock oNFT to L1ERC721Bridge...')

  switchNetwork('l1')
  const tx5 = await l1ERC721Bridge.depositERC721(
    l1onft.address,
    l2onft.address,
    oNFT_TOKEN_ID,
    2_000_000,
    '0x',
  )
  const receipt5 = await tx5.wait()
  let start = new Date()
  ;[l1Owner, l2Owner] = await getOwners()
  log(
    'done',
    `    tx: ${tx5.hash} (gas: ${receipt5.gasUsed})`,
    `    owner on Hub-Layer  : ${l1Owner}`,
    `    owner on Verse-Layer: ${l2Owner}\n\n`,
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

  ;[l1Owner, l2Owner] = await getOwners()
  log(
    'done',
    `    elapsed: ${(new Date().getTime() - start.getTime()) / 1000} sec`,
    `    relayer tx: ${l2RelayTx.transactionHash} (gas: ${l2RelayTx.gasUsed})`,
    `    message hash: ${l1MsgHash}`,
    `    owner on Hub-Layer  : ${l1Owner}`,
    `    owner on Verse-Layer: ${l2Owner}\n\n`,
  )

  /**
   * Step 7
   */
  log(`[Verse-Layer] Burn and Withdraw oNFT using L2ERC721Bridge...`)

  switchNetwork('l2')
  const tx6 = await l2ERC721Bridge.withdraw(
    l2onft.address,
    oNFT_TOKEN_ID,
    2_000_000,
    '0x',
  )
  const receipt6 = await tx6.wait()
  start = new Date()
  ;[l1Owner, l2Owner] = await getOwners()
  log(
    'done',
    `    tx: ${tx6.hash} (gas: ${receipt6.gasUsed})`,
    `    owner on Hub-Layer  : ${l1Owner}`,
    `    owner on Verse-Layer: ${l2Owner}\n\n`,
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

  ;[l1Owner, l2Owner] = await getOwners()
  log(
    'done',
    `    elapsed: ${(new Date().getTime() - start.getTime()) / 1000} sec`,
    `    relayer tx: ${l1RelayTx.transactionHash} (gas: ${l1RelayTx.gasUsed})`,
    `    message hash: ${l2MsgHash}`,
    `    owner on Hub-Layer  : ${l1Owner}`,
    `    owner on Verse-Layer: ${l2Owner}`,
  )
}

main()
