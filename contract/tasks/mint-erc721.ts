import { task } from "hardhat/config";
import * as types from "hardhat/internal/core/params/argumentTypes";
import { assertAddresse } from "./util";

task("mint721", "Mint ERC721")
  .addParam("address", "address of the token", undefined, types.string, false)
  .addParam("to", "address of recipient", undefined, types.string, false)
  .addParam("tokenId", "id of token", undefined, types.int, false)

  .setAction(async (taskArgs, hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();

    if (hre.network.name !== "l1") {
      throw new Error("This task can only be executed on l1");
    }
    const address = assertAddresse(taskArgs.address);
    const to = assertAddresse(taskArgs.to);
    const contract = await ethers.getContractAt("L1StandardERC721", address);

    const tx = await contract["mint(address,uint256)"](to, taskArgs.tokenId, {
      from: deployer,
    });
    console.log(`minting, tx: ${tx.hash}...`);

    await tx.wait();
    console.log(`minted, balance: ${await contract.balanceOf(to)}`);
  });
