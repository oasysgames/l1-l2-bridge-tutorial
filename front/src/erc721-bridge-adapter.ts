/**
 * Bridge adapter for CrossChainMessenger to bridge ERC721 tokens.
 * Reference: https://github.com/ethereum-optimism/optimism/blob/bcdf5749da86bd41eb698f95c363adf02e9ff336/packages/sdk/src/adapters/standard-bridge.ts
 */

import {
  ethers,
  Contract,
  Overrides,
  Signer,
  BigNumber,
  CallOverrides,
} from "ethers";
import {
  IBridgeAdapter,
  NumberLike,
  AddressLike,
  TokenBridgeMessage,
  MessageDirection,
  CrossChainMessenger,
  toAddress,
} from "@eth-optimism/sdk";
import {
  TransactionRequest,
  TransactionResponse,
  BlockTag,
} from "@ethersproject/abstract-provider";
import { hexStringEquals } from "@eth-optimism/core-utils";
import l1ERC721BridgeArtifact from "@eth-optimism/contracts-bedrock/forge-artifacts/L1ERC721Bridge.sol/L1ERC721Bridge.json";
import l2ERC721BridgeArtifact from "@eth-optimism/contracts-bedrock/forge-artifacts/L2ERC721Bridge.sol/L2ERC721Bridge.json";
import optimismMintableERC721 from "@eth-optimism/contracts-bedrock/forge-artifacts/OptimismMintableERC721.sol/OptimismMintableERC721.json";

export class ERC721BridgeAdapter implements IBridgeAdapter {
  public messenger: CrossChainMessenger;
  public l1Bridge: Contract;
  public l2Bridge: Contract;

  constructor(opts: {
    messenger: CrossChainMessenger;
    l1Bridge: AddressLike;
    l2Bridge: AddressLike;
  }) {
    this.messenger = opts.messenger;
    this.l1Bridge = new Contract(
      toAddress(opts.l1Bridge),
      l1ERC721BridgeArtifact.abi,
      this.messenger.l1Provider,
    );
    this.l2Bridge = new Contract(
      toAddress(opts.l2Bridge),
      l2ERC721BridgeArtifact.abi,
      this.messenger.l2Provider,
    );
  }

  public async getDepositsByAddress(
    address: AddressLike,
    opts?: {
      fromBlock?: BlockTag;
      toBlock?: BlockTag;
    },
  ): Promise<TokenBridgeMessage[]> {
    const events = await this.l1Bridge.queryFilter(
      this.l1Bridge.filters.ERC721BridgeInitiated(
        undefined,
        undefined,
        address,
      ),
      opts?.fromBlock,
      opts?.toBlock,
    );

    return events
      .filter((event) => event.args?.localToken && event.args?.remoteToken)
      .map((event) => {
        return {
          direction: MessageDirection.L1_TO_L2,
          from: event.args!.from,
          to: event.args!.to,
          l1Token: event.args!.localToken,
          l2Token: event.args!.remoteToken,
          amount: event.args!.tokenId,
          data: event.args!.extraData,
          logIndex: event.logIndex,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        };
      })
      .sort((a, b) => {
        // Sort descending by block number
        return b.blockNumber - a.blockNumber;
      });
  }

  public async getWithdrawalsByAddress(
    address: AddressLike,
    opts?: {
      fromBlock?: BlockTag;
      toBlock?: BlockTag;
    },
  ): Promise<TokenBridgeMessage[]> {
    const events = await this.l2Bridge.queryFilter(
      this.l2Bridge.filters.ERC721BridgeInitiated(
        undefined,
        undefined,
        address,
      ),
      opts?.fromBlock,
      opts?.toBlock,
    );

    return events
      .filter((event) => event.args?.localToken && event.args?.remoteToken)
      .map((event) => {
        return {
          direction: MessageDirection.L2_TO_L1,
          from: event.args!.from,
          to: event.args!.to,
          l1Token: event.args!.localToken,
          l2Token: event.args!.remoteToken,
          amount: event.args!.tokenId,
          data: event.args!.extraData,
          logIndex: event.logIndex,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash,
        };
      })
      .sort((a, b) => {
        // Sort descending by block number
        return b.blockNumber - a.blockNumber;
      });
  }

  public async supportsTokenPair(
    l1Token: AddressLike,
    l2Token: AddressLike,
  ): Promise<boolean> {
    const contract = new Contract(
      toAddress(l2Token),
      optimismMintableERC721.abi,
      this.messenger.l2Provider,
    );

    // Make sure the L1 token matches.
    const remoteL1Token = await contract.remoteToken();

    if (!hexStringEquals(remoteL1Token, toAddress(l1Token))) {
      return false;
    }

    // Make sure the L2 bridge matches.
    const remoteL2Bridge = await contract.bridge();
    if (!hexStringEquals(remoteL2Bridge, this.l2Bridge.address)) {
      return false;
    }

    return true;
  }

  public async approval(
    l1Token: AddressLike,
    l2Token: AddressLike,
    signer: ethers.Signer,
  ): Promise<BigNumber> {
    throw new Error("ERC721BridgeAdapter: approval not supported");
  }

  public async approve(
    l1Token: AddressLike,
    l2Token: AddressLike,
    tokenId: NumberLike,
    signer: Signer,
    opts?: {
      overrides?: Overrides;
    },
  ): Promise<TransactionResponse> {
    return signer.sendTransaction(
      await this.populateTransaction.approve(l1Token, l2Token, tokenId, opts),
    );
  }

  public async deposit(
    l1Token: AddressLike,
    l2Token: AddressLike,
    tokenId: NumberLike,
    signer: Signer,
    opts?: {
      recipient?: AddressLike;
      l2GasLimit?: NumberLike;
      overrides?: Overrides;
    },
  ): Promise<TransactionResponse> {
    return signer.sendTransaction(
      await this.populateTransaction.deposit(l1Token, l2Token, tokenId, opts),
    );
  }

  public async withdraw(
    l1Token: AddressLike,
    l2Token: AddressLike,
    tokenId: NumberLike,
    signer: Signer,
    opts?: {
      recipient?: AddressLike;
      overrides?: Overrides;
    },
  ): Promise<TransactionResponse> {
    return signer.sendTransaction(
      await this.populateTransaction.withdraw(l1Token, l2Token, tokenId, opts),
    );
  }

  populateTransaction = {
    approve: async (
      l1Token: AddressLike,
      l2Token: AddressLike,
      tokenId: NumberLike,
      opts?: {
        overrides?: Overrides;
      },
    ): Promise<TransactionRequest> => {
      if (!(await this.supportsTokenPair(l1Token, l2Token))) {
        throw new Error(`token pair not supported by bridge`);
      }

      const token = new Contract(
        toAddress(l1Token),
        optimismMintableERC721.abi,
        this.messenger.l1Provider,
      );

      return token.populateTransaction.approve(
        this.l1Bridge.address,
        tokenId,
        opts?.overrides || {},
      );
    },

    deposit: async (
      l1Token: AddressLike,
      l2Token: AddressLike,
      tokenId: NumberLike,
      opts?: {
        recipient?: AddressLike;
        l2GasLimit?: NumberLike;
        overrides?: Overrides;
      },
    ): Promise<TransactionRequest> => {
      if (!(await this.supportsTokenPair(l1Token, l2Token))) {
        throw new Error(`token pair not supported by bridge`);
      }

      if (opts?.recipient === undefined) {
        return this.l1Bridge.populateTransaction.bridgeERC721(
          toAddress(l1Token),
          toAddress(l2Token),
          tokenId,
          opts?.l2GasLimit || 200_000, // Default to 200k gas limit.
          "0x", // No data.
          opts?.overrides || {},
        );
      } else {
        return this.l1Bridge.populateTransaction.bridgeERC721To(
          toAddress(l1Token),
          toAddress(l2Token),
          toAddress(opts.recipient),
          tokenId,
          opts?.l2GasLimit || 200_000, // Default to 200k gas limit.
          "0x", // No data.
          opts?.overrides || {},
        );
      }
    },

    withdraw: async (
      l1Token: AddressLike,
      l2Token: AddressLike,
      tokenId: NumberLike,
      opts?: {
        recipient?: AddressLike;
        overrides?: Overrides;
      },
    ): Promise<TransactionRequest> => {
      if (!(await this.supportsTokenPair(l1Token, l2Token))) {
        throw new Error(`token pair not supported by bridge`);
      }

      if (opts?.recipient === undefined) {
        return this.l2Bridge.populateTransaction.bridgeERC721(
          toAddress(l2Token),
          toAddress(l1Token),
          tokenId,
          0, // L1 gas not required.
          "0x", // No data.
          opts?.overrides || {},
        );
      } else {
        return this.l2Bridge.populateTransaction.bridgeERC721To(
          toAddress(l2Token),
          toAddress(l1Token),
          toAddress(opts.recipient),
          tokenId,
          0, // L1 gas not required.
          "0x", // No data.
          opts?.overrides || {},
        );
      }
    },
  };

  estimateGas = {
    approve: async (
      l1Token: AddressLike,
      l2Token: AddressLike,
      tokenId: NumberLike,
      opts?: {
        overrides?: CallOverrides;
      },
    ): Promise<BigNumber> => {
      return this.messenger.l1Provider.estimateGas(
        await this.populateTransaction.approve(l1Token, l2Token, tokenId, opts),
      );
    },

    deposit: async (
      l1Token: AddressLike,
      l2Token: AddressLike,
      tokenId: NumberLike,
      opts?: {
        recipient?: AddressLike;
        l2GasLimit?: NumberLike;
        overrides?: CallOverrides;
      },
    ): Promise<BigNumber> => {
      return this.messenger.l1Provider.estimateGas(
        await this.populateTransaction.deposit(l1Token, l2Token, tokenId, opts),
      );
    },

    withdraw: async (
      l1Token: AddressLike,
      l2Token: AddressLike,
      tokenId: NumberLike,
      opts?: {
        recipient?: AddressLike;
        overrides?: CallOverrides;
      },
    ): Promise<BigNumber> => {
      return this.messenger.l2Provider.estimateGas(
        await this.populateTransaction.withdraw(
          l1Token,
          l2Token,
          tokenId,
          opts,
        ),
      );
    },
  };
}
