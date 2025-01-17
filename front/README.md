# Front

By running the server, you can interact with the bridge via the UI.

## Getting Started

Install dependencies:

```shell
yarn install
```

Edit the `L1Chain, L2Chain` at the start of the following file to suit your environment. 
- [SDK](./src/sdk.ts)

Add chains, modify the RPC endpoints and contract addresses in [chains](./src/chains/) folder.

For development:

```shell
yarn dev
```

For production, build frontend:

```shell
yarn build
```

To start the server, use the command:

```shell
yarn start
```
Access the server at http://127.0.0.1:8080.

