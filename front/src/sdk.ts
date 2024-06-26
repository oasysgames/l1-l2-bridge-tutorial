import { Signer, providers, BigNumber, Contract } from "ethers";
import {
  ExternalProvider,
  Web3Provider,
  JsonRpcProvider,
} from "@ethersproject/providers";
import {
  CrossChainMessenger,
  DeepPartial,
  DEFAULT_L2_CONTRACT_ADDRESSES,
  OEContractsLike,
  StandardBridgeAdapter,
} from "@eth-optimism/sdk";
import { Network } from "@ethersproject/networks";
import { ERC721BridgeAdapter } from "./erc721-bridge-adapter";
import * as Util from "./util";
import { L1BlockTimeSeconds, DepositConfirmationBlocks } from "./constants";
import ERC20 from "./contracts/ERC20.json";
import ERC721 from "./contracts/ERC721.json";

export class BridgeSDK {
  eProvider: Web3Provider;
  jProvider: JsonRpcProvider;
  isL1: boolean;

  util = Util;
  messenger: CrossChainMessenger;

  private contracts: DeepPartial<OEContractsLike>;
  private l1StandardBridge: string;
  private l1ERC721Bridge: string;
  private MAX_RETRIES: number = 100;

  constructor(
    ethereum: ExternalProvider,
    rpc: string,
    isL1: boolean,
    addressManager: string,
    l1CrossDomainMessenger: string,
    l1StandardBridge: string,
    l1ERC721Bridge: string,
    portalAddress: string,
    outputOracle: string,
  ) {
    this.util.assertAddresse(addressManager);
    this.util.assertAddresse(l1CrossDomainMessenger);
    this.util.assertAddresse(l1StandardBridge);
    this.util.assertAddresse(l1ERC721Bridge);
    this.util.assertAddresse(portalAddress);
    this.util.assertAddresse(outputOracle);

    this.eProvider = new providers.Web3Provider(ethereum);
    this.jProvider = new JsonRpcProvider(rpc);
    this.isL1 = isL1;

    this.contracts = {
      l1: {
        AddressManager: addressManager,
        L1CrossDomainMessenger: l1CrossDomainMessenger,
        L1StandardBridge: l1StandardBridge, // dummy address
        StateCommitmentChain: this.util.ZERO_ADDRESS, // dummy address
        CanonicalTransactionChain: this.util.ZERO_ADDRESS, // dummy address
        BondManager: this.util.ZERO_ADDRESS, // dummy address
        OptimismPortal: portalAddress,
        L2OutputOracle: outputOracle,
      },
      l2: DEFAULT_L2_CONTRACT_ADDRESSES,
    };
    this.l1StandardBridge = l1StandardBridge;
    this.l1ERC721Bridge = l1ERC721Bridge;
  }

  async connectMetamask(): Promise<string[]> {
    const signer = this.eProvider.getSigner();
    const eChainId = (await this.eProvider.getNetwork()).chainId;
    const jChainId = (await this.jProvider.getNetwork()).chainId;

    const standardBridgeAdapter = {
      Adapter: StandardBridgeAdapter,
      l1Bridge: this.l1StandardBridge,
      l2Bridge: "0x4200000000000000000000000000000000000010",
    };
    const erc721BridgeAdapter = {
      Adapter: ERC721BridgeAdapter,
      l1Bridge: this.l1ERC721Bridge,
      l2Bridge: "0x6200000000000000000000000000000000000001",
    };
    this.messenger = new CrossChainMessenger({
      l1SignerOrProvider: this.isL1 ? signer : this.jProvider,
      l2SignerOrProvider: this.isL1 ? this.jProvider : signer,
      l1ChainId: this.isL1 ? eChainId : jChainId,
      l2ChainId: this.isL1 ? jChainId : eChainId,
      depositConfirmationBlocks: DepositConfirmationBlocks,
      l1BlockTimeSeconds: L1BlockTimeSeconds,
      contracts: this.contracts,
      bridges: { Standard: standardBridgeAdapter, ERC721: erc721BridgeAdapter },
      bedrock: true,
    });

    return this.eProvider.send("eth_requestAccounts", []);
  }

  async getNetwork(): Promise<Network> {
    return await this.eProvider.getNetwork();
  }

  async getBalances(address: string): Promise<{
    l1: BigNumber;
    l2: BigNumber;
  }> {
    const eBalance = await this.eProvider.getBalance(address);
    const jBalance = await this.jProvider.getBalance(address);
    return {
      l1: this.isL1 ? eBalance : jBalance,
      l2: this.isL1 ? jBalance : eBalance,
    };
  }

  async getERC20Balance(
    address: string,
    tokenL1: string,
    tokenL2: string,
  ): Promise<{
    l1: BigNumber;
    l2: BigNumber;
  }> {
    const L1Provider = this.isL1 ? this.eProvider : this.jProvider;
    const L2Provider = this.isL1 ? this.jProvider : this.eProvider;
    const l1Contract = new Contract(tokenL1, ERC20.abi, L1Provider);
    const l2Contract = new Contract(tokenL2, ERC20.abi, L2Provider);
    return {
      l1: await l1Contract.balanceOf(address),
      l2: await l2Contract.balanceOf(address),
    };
  }

  async getERC721Balance(
    address: string,
    tokenL1: string,
    tokenL2: string,
  ): Promise<{
    l1: BigNumber;
    l2: BigNumber;
  }> {
    const L1Provider = this.isL1 ? this.eProvider : this.jProvider;
    const L2Provider = this.isL1 ? this.jProvider : this.eProvider;
    const l1Contract = new Contract(tokenL1, ERC721.abi, L1Provider);
    const l2Contract = new Contract(tokenL2, ERC721.abi, L2Provider);
    return {
      l1: await l1Contract.balanceOf(address),
      l2: await l2Contract.balanceOf(address),
    };
  }

  async waitForMessageRelayed(
    txHash: string,
    retry: number = this.MAX_RETRIES,
  ): Promise<void> {
    const RELAYED = 6;
    const RETRY_DELAY_MS = 5000; // Delay between retries in milliseconds
    let attempts = 0;
    while (attempts < retry) {
      try {
        await this.messenger.waitForMessageStatus(txHash, RELAYED);
        return; // Success, exit the loop and function
      } catch (error: any) {
        if (
          typeof error.message === "string" &&
          error.message.includes("withdrawal index 0 out of bounds")
        ) {
          attempts++;
          console.log(
            `Attempt ${attempts}: Encountered a retryable error, retrying...`,
          );
          if (attempts >= retry) {
            throw new Error(
              `Retry limit reached with persistent errors. err: ${error.message}`,
            );
          }
          await this.util.sleep(RETRY_DELAY_MS); // Wait before retrying
        } else {
          // If error is not the one we're looking for, rethrow it
          throw error;
        }
      }
    }
  }
}
