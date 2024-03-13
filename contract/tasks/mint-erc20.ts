import { task } from "hardhat/config";
import * as types from "hardhat/internal/core/params/argumentTypes";
import { parseUnits } from "ethers";
import { assertAddresse } from "./util";

task("mint20", "Mint ERC20")
  .addParam("address", "address of the token", undefined, types.string, false)
  .addParam("to", "address of recipient", undefined, types.string, false)
  .addParam("amount", "amount to mint(OAS)", undefined, types.string, false)

  .setAction(async (taskArgs, hre) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();

    if (hre.network.name !== "l1") {
      throw new Error("This task can only be executed on l1");
    }
    const address = assertAddresse(taskArgs.address);
    const to = assertAddresse(taskArgs.to);
    const amount = parseUnits(taskArgs.amount, "ether");
    const contract = await ethers.getContractAt("L1StandardERC20", address);

    const tx = await contract["mint(address,uint256)"](to, amount, {
      from: deployer,
    });
    console.log(`minting, tx: ${tx.hash}...`);

    await tx.wait();
    console.log(`minted, balance: ${await contract.balanceOf(to)}`);
  });
