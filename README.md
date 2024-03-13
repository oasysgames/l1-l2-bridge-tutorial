# L1-L2 Bridge Tutorial
This repository primarily serves as a tutorial to demonstrate how the L1 <> L2 bidirectional bridge functions. Users can interact with a simple UI to execute the L1->L2 bridge (deposit) and L2->L1 bridge (withdraw) operations. In this context, L1 represents the [Testnet](https://docs.oasys.games/docs/staking/rpc-endpoint/1-1-rpc-endpoint#testnet-hub-layer), and L2 represents [Sandverse V1](TODO).

As this tutorial was originally designed for engineers, we have omitted detailed verbal explanations. Instead, users are encouraged to read the code, as we have included friendly instructions within.

Although the primary objective is to provide a tutorial, we also offer a useful [Bridge SDK](./front/src/sdk.ts). This SDK can be leveraged to facilitate integration with your own dApps.

## Steps to Execute Bidirectional Bridge
1. Deploy Contracts
The assets allowed to bridge are native tokens (OAS), ERC20, and ERC721(NFT). To bridge ERCs, you first need to deploy contracts on L1 and L2. To do this, please follow the instructions in the [contract](./contract) directory.

2. Execute Bridging
You can execute bridging using a simple UI. To start the UI, you need to build the code and run the server first. Please follow the instructions in the [front](./front) directory.
