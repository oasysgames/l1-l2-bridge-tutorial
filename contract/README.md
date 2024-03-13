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


## Deploy ERC20/721 Contracts
```console
npx hardhat deploy20 --network l1 --name "mock erc20" --symbol MT20
npx hardhat deploy20 --network l2 --name "mock erc20" --symbol MT20 --l1-token 0xDc3af65eCBD339309Ec55F109CB214E0325c5eD4

npx hardhat deploy721 --network l1 --name "mock erc721" --symbol MT721
npx hardhat deploy721 --network l2 --name "mock erc20" --symbol MT20 --l1-token 0x906F740aa0C7810c6b164d00d979425e3B074e85

npx hardhat mint20 --network l1 --address 0xb1B6755944e933e9a39d1c6Af068899FDB149336 --to 0xccf3e6b439D0B0546fc2ac48afb3f2Cac0c84d26 --amount 123

npx hardhat mint721 --network l1 --address 0x4688e596Fb8ffAa9F7c1f02985B44651CF642123 --to 0xccf3e6b439D0B0546fc2ac48afb3f2Cac0c84d26 --token-id 123
```