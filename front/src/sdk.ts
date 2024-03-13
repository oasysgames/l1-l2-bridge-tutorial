import { Signer, providers } from "ethers";
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
import { ERC721BridgeAdapter } from "./erc721-bridge-adapter";
import { ZERO_ADDRESS, assertAddresse } from "./util";
import { L1BlockTimeSeconds, DepositConfirmationBlocks } from "./constants";

export class BridgeSDK {
  eProvider: Web3Provider;
  jProvider: JsonRpcProvider;
  isL1: boolean;

  messenger: CrossChainMessenger;
  private contracts: DeepPartial<OEContractsLike>;
  private l1StandardBridge: string;
  private l1ERC721Bridge: string;

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
    assertAddresse(addressManager);
    assertAddresse(l1CrossDomainMessenger);
    assertAddresse(l1StandardBridge);
    assertAddresse(l1ERC721Bridge);
    assertAddresse(portalAddress);
    assertAddresse(outputOracle);

    this.eProvider = new providers.Web3Provider(ethereum);
    this.jProvider = new JsonRpcProvider(rpc);
    this.isL1 = isL1;

    this.contracts = {
      l1: {
        AddressManager: addressManager,
        L1CrossDomainMessenger: l1CrossDomainMessenger,
        L1StandardBridge: l1StandardBridge, // dummy address
        StateCommitmentChain: ZERO_ADDRESS, // dummy address
        CanonicalTransactionChain: ZERO_ADDRESS, // dummy address
        BondManager: ZERO_ADDRESS, // dummy address
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
    }
    const erc721BridgeAdapter = {
        Adapter: ERC721BridgeAdapter,
        l1Bridge: this.l1ERC721Bridge,
        l2Bridge: "0x4200000000000000000000000000000000000014",
    }
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

  // async getTokenData(): Promise<{
  //   name: string;
  //   symbol: string;
  //   totalSupply: string;
  // }> {
  //   const name = await this.erc20.name();
  //   const symbol = await this.erc20.symbol();
  //   const totalSupply = await this.erc20.totalSupply();
  //   return { name, symbol, totalSupply };
  // }

  // async getUserBalance(userAddress: string): Promise<string> {
  //   return this.erc20.balanceOf(userAddress);
  // }

  // async mintTokens(
  //   account: string,
  //   amount: string,
  // ): Promise<ContractTransactionReceipt | null> {
  //   const amountWei = parseUnits(amount, 18);
  //   const tx: ContractTransactionResponse = await this.erc20.mint(
  //     account,
  //     amountWei,
  //   );
  //   return await tx.wait();
  // }
}
