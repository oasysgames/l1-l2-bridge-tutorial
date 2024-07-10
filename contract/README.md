# Contrct
By executing scripts, you can deploy and mint ERC20/ERC721 tokens.

## Getting Started
Install dependencies:
```console
yarn install
```
Set up the environment file. Private keys need to be funded on L1 and L2 beforehand. Please use the faucet to do this:
- [Faucet on L1 testnet](https://faucet.testnet.oasys.games/)
- [Faucet on L2 Sandverse V1](TODO)
```console
cp .env.sample .env
```

Compile contracts:
```shell
yarn compile
```

## Deploy
Deploy contracts on L1 and L2:
```sh
# Deploy ERC20 on L1
npx hardhat deploy20 --network l1 --name "Mock ERC20" --symbol MT20

# Deploy ERC20 on L2
# `--l1-token` option specifies the deployed address on L1 above
npx hardhat deploy20 --network l2 --name "Mock ERC20" --symbol MT20 --l1-token 0x00..

# Deploy ERC721 on L1
npx hardhat deploy721 --network l1 --name "Mock ERC721" --symbol MT721

# Deploy ERC721 on L2
# `--l1-token` option specifies the deployed address on L1 above
npx hardhat deploy721 --network l2 --name "Mock ERC721" --symbol MT721 --l1-token 0x00..

```

## Mint
Mint tokens on L1:
```sh
# Mint ERC20 on L1
# `--address` option specifies the ERC20 deployed address on L1
npx hardhat mint20 --network l1 --address 0x00.. --to 0x00.. --amount 123

# Mint ERC721 on L1
# `--address` option specifies the ERC721 deployed address on L1
npx hardhat mint721 --network l1 --address 0x00.. --to 0x00.. --token-id 123

```
